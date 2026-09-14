import {
  ApiQueryParams,
  Autowired,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  reply,
  type Ctx,
} from '@forinda/kickjs'
import { ApiBearerAuth, ApiTags } from '@forinda/kickjs-swagger'
import { LoadUser } from '@/contributors/load-user.contributor'
import { CreateTaskBody, TASK_QUERY, UpdateTaskBody } from './tasks.dto'
import { TasksService } from './tasks.service'

@ApiTags('Tasks')
@ApiBearerAuth()
@LoadUser
@Controller()
export class TasksController {
  @Autowired() private readonly tasksService!: TasksService

  @ApiQueryParams(TASK_QUERY)
  @Get('/')
  list(ctx: Ctx<KickRoutes.TasksController['list']>) {
    const userId = ctx.require('user').id
    return ctx.paginate((parsed) => this.tasksService.list(userId, parsed), TASK_QUERY)
  }

  @Post('/', { body: CreateTaskBody, name: 'CreateTaskRequest' })
  async create(ctx: Ctx<KickRoutes.TasksController['create']>) {
    return reply(201, await this.tasksService.create(ctx.require('user').id, ctx.body))
  }

  @Get('/:id')
  get(ctx: Ctx<KickRoutes.TasksController['get']>) {
    return this.tasksService.get(ctx.require('user').id, ctx.params.id)
  }

  @Patch('/:id', { body: UpdateTaskBody, name: 'UpdateTaskRequest' })
  update(ctx: Ctx<KickRoutes.TasksController['update']>) {
    return this.tasksService.update(ctx.require('user').id, ctx.params.id, ctx.body)
  }

  @Delete('/:id')
  async remove(ctx: Ctx<KickRoutes.TasksController['remove']>) {
    await this.tasksService.remove(ctx.require('user').id, ctx.params.id)
    return reply.noContent()
  }
}
