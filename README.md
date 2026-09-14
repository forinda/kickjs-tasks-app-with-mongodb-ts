# todo-app

A task tracking API built with [KickJS](https://kickjs.app/) and MongoDB. Users register, log in, and manage their own tasks grouped into categories.

The point of this project is **end-to-end type safety**: one definition per concept, and every layer — env, database models, dependency injection, request bodies, request context, responses, OpenAPI — derives its types from it. No hand-written interfaces that drift from the schema.

## Stack

- **KickJS** on the Express runtime — decorators, DI, typegen, Vite HMR
- **MongoDB** via **Mongoose** — wired through a custom `defineAdapter()`
- **Zod** — request and env schemas, wrapped with `fromZod()` from `@forinda/kickjs-schema`
- **jose** — JWT signing/verification; passwords hashed with `node:crypto` scrypt
- **Swagger** — `@forinda/kickjs-swagger`, served at `/docs`

## Getting started

Requires Node.js and a running MongoDB.

```bash
pnpm install
cp .env.example .env   # then set MONGO_URL and JWT_SECRET
kick dev
```

- API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs` (ReDoc at `/redoc`, spec at `/openapi.json`)

Generate a JWT secret with `openssl rand -hex 32`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `info` | Log level |
| `MONGO_URL` | — (required) | MongoDB connection string |
| `DB_NAME` | `mydatabase` | Database name |
| `JWT_SECRET` | — (required) | At least 32 characters |

The app refuses to boot if a required variable is missing or MongoDB is unreachable.

## How type safety flows end to end

```
Zod env schema ──────────────► getEnv('MONGO_URL')              typed + validated at boot
Mongoose schema ─► Model<T> ─► getModels() ─► Db ─► DbToken ─► @Inject(DbToken) db.Task.find()
Zod DTO ─► fromZod ─► @Post({ body }) ─► kick typegen ─► Ctx<KickRoutes.X['m']> ─► ctx.body
ContextMeta augmentation ─► LoadUser contributor ─► ctx.require('user')
handler return value ─► kick typegen ─► KickRoutes.Api (typed client) + OpenAPI schema
```

### 1. Environment — `src/config/index.ts`

The env schema is a Zod object. `kick typegen` reads it and types `getEnv()` / `@Value()`, and `loadEnvFromSchema` validates and coerces at startup.

```ts
const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    MONGO_URL: z.url(),
    DB_NAME: z.string().default('mydatabase'),
    JWT_SECRET: z.string().min(32),
  }),
)
export const env = loadEnvFromSchema(envSchema)
```

`getEnv('MONGO_URL')` is a `string`; `getEnv('MONGO_URLL')` is a compile error.

### 2. Database models — `src/db/models/*.ts`

The Mongoose schema is the single source of truth for document shape. The TypeScript type is inferred from it, never written by hand:

```ts
const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
)

export type Task = InferSchemaType<typeof taskSchema>

// HMR-safe: reuse the compiled model on reload
export const MountTaskModel = (connection: typeof mongoose) =>
  (connection.models.Task || connection.model('Task', taskSchema)) as Model<Task>
```

Enum values live in `as const` arrays (`TASK_STATUSES`) that both the Mongoose schema and the Zod DTOs import, so the database and the API can't disagree about valid values.

### 3. Models into DI — `src/db/index.ts` + `src/adapters/mongodb.adapter.ts`

All models are collected in one function, and its return type becomes the `Db` type behind a typed DI token:

```ts
// src/db/index.ts
export const getModels = (connection: typeof mongoose) => ({
  User: MountUserModel(connection),
  Category: MountCategoryModel(connection),
  Task: MountTaskModel(connection),
})

// src/adapters/mongodb.adapter.ts
export type Db = ReturnType<typeof getModels>
export const DbToken = createToken<Db>('app/DbModels')
```

The adapter connects in `beforeStart` and registers the models:

```ts
ctx.container.registerInstance(DbToken, getModels(client))
```

Services inject the whole model map. Adding a model to `getModels()` makes it available — typed — in every service, with no extra wiring:

```ts
@Service()
export class TasksService {
  @Inject(DbToken)
  private readonly db!: Db

  get(userId: string, id: string) {
    return this.db.Task.findOne({ _id: id, userId }).lean() // typed Task document
  }
}
```

### 4. Request bodies — `src/modules/*/*.dto.ts`

Each DTO is a Zod schema. The same schema validates at runtime, types the handler, and documents the endpoint:

```ts
const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullable().optional(),
})

export const CreateTaskBody = fromZod(createTaskSchema)
export type CreateTaskInput = z.infer<typeof createTaskSchema>
```

> Use ISO strings for dates in DTOs, not `z.coerce.date()`. A JS `Date` can't be expressed in JSON Schema, and the Swagger adapter silently drops the whole body from the spec. Mongoose casts the string to `Date` on write.

### 5. Controllers — `Ctx<KickRoutes...>`

Attach the schema to the route. `kick typegen` (run automatically by `kick dev`) generates `KickRoutes` in `.kickjs/types/`, so `ctx.body`, `ctx.params` and context keys are typed per handler:

```ts
@Post('/', { body: CreateTaskBody, name: 'CreateTaskRequest' })
async create(ctx: Ctx<KickRoutes.TasksController['create']>) {
  // ctx.body: { title: string; status?: 'todo' | 'in_progress' | 'done'; ... }
  return reply(201, await this.tasksService.create(ctx.require('user').id, ctx.body))
}

@Get('/:id')
get(ctx: Ctx<KickRoutes.TasksController['get']>) {
  return this.tasksService.get(ctx.require('user').id, ctx.params.id) // params.id: string
}
```

Invalid bodies are rejected with `422` before the handler runs. `name` sets the OpenAPI component name — give every body route a unique PascalCase name, otherwise names derive from handler names and collide across controllers.

### 6. Authenticated user — `src/contributors/load-user.contributor.ts`

The current user is a typed context value, not an untyped `req.user`:

```ts
declare module '@forinda/kickjs' {
  interface ContextMeta {
    user: { id: string }
  }
}

export const LoadUser = defineHttpContextDecorator({
  key: 'user',
  beforeValidation: true, // 401 before 422, so anonymous callers don't see the schema
  resolve: async (ctx) => {
    // verify Bearer token → return { id } or throw 401
  },
})
```

Apply `@LoadUser` to a controller class or method, then read `ctx.require('user')` — typed `{ id: string }`, and it throws if the contributor isn't applied rather than returning `undefined`.

### 7. Responses and clients

Handlers return values instead of calling `res.json()`. `kick typegen` infers the response type of every route into `KickRoutes.Api`:

```ts
// .kickjs/types/kick__routes.ts (generated)
interface Api {
  'POST /tasks': TasksController['create']
  'GET /tasks/:id': TasksController['get']
}
```

That type can drive a fully typed frontend client via `@forinda/kickjs-client` (`createClient<KickApi>(...)`, not installed in this repo) — the response type traces all the way back to the Mongoose schema.

### Known gaps

- `?filter=field:op:value` values arrive as strings; Mongoose casts them, and bad values return `400`.
- Pass the `ctx.qs` config `as const` if you want filter/sort field names narrowed to literal unions.

## API

All routes are under `/api/v1`. Everything except register and login requires `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` → `201 { token, user }` |
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET` | `/auth/me` | Current user |
| `GET` | `/categories` | List own categories |
| `POST` | `/categories` | `{ name, color? }` |
| `GET` / `PATCH` / `DELETE` | `/categories/:id` | Delete leaves its tasks uncategorized |
| `GET` | `/tasks` | Paginated list |
| `POST` | `/tasks` | `{ title, description?, status?, priority?, dueDate?, categoryId? }` |
| `GET` / `PATCH` / `DELETE` | `/tasks/:id` | |

Task list query:

```
?filter=status:eq:done
?filter=categoryId:eq:null            # uncategorized
?filter=dueDate:lt:2026-10-01
?sort=dueDate:asc                     # createdAt | updatedAt | dueDate
?q=milk                               # searches title + description
?page=2&limit=20                      # limit capped at 100
```

### Errors

| Status | When |
|---|---|
| `401` | Missing, invalid or expired token; wrong credentials |
| `404` | Resource doesn't exist or belongs to another user |
| `400` | `categoryId` not owned by caller; invalid filter value |
| `409` | Email already registered; duplicate category name |
| `422` | Request body fails validation |

Other users' resources return `404`, not `403`, so ids can't be probed.

## Project structure

```
src/
├── index.ts                     # bootstrap — exports `app`
├── config/index.ts              # Zod env schema
├── adapters/
│   ├── index.ts                 # Swagger + MongoDB adapters
│   └── mongodb.adapter.ts       # connect, register DbToken, health check
├── contributors/
│   └── load-user.contributor.ts # Bearer token → ctx.require('user')
├── db/
│   ├── index.ts                 # getModels(), duplicate-key helper
│   └── models/                  # user, category, task schemas
└── modules/
    ├── index.ts                 # module registry
    ├── auth/                    # register, login, me, token signing
    ├── categories/
    └── tasks/
```

Each module is `<name>.module.ts` + controller + service + dto. The `.module.ts` suffix is required for Vite HMR.

## Scripts

| Command | Description |
|---|---|
| `kick dev` | Dev server with HMR + typegen |
| `kick typegen` | Regenerate `KickRoutes` / env types |
| `kick typecheck` | Type-check |
| `kick build` / `kick start` | Production build / run |
| `kick lint` / `kick format` | oxlint / oxfmt |
| `pnpm run test` | Vitest |

## Learn more

- [KickJS documentation](https://kickjs.app/)
- [Typegen guide](https://kickjs.app/guide/typegen)
- [Context decorators](https://kickjs.app/guide/context-decorators)
- [Mongoose TypeScript: schema inference](https://mongoosejs.com/docs/typescript/schemas.html)
