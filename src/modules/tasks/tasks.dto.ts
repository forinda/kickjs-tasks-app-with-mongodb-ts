import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/db/models/task'

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  // ISO string, not z.coerce.date(): Date can't be expressed in JSON Schema, which silently drops the body from OpenAPI. Mongoose casts it to Date.
  dueDate: z
    .union([z.iso.date(), z.iso.datetime({ offset: true })])
    .nullable()
    .optional(),
  categoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
    .nullable()
    .optional(),
})

const updateTaskSchema = createTaskSchema.partial()

export const CreateTaskBody = fromZod(createTaskSchema)
export const UpdateTaskBody = fromZod(updateTaskSchema)
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export const TASK_QUERY = {
  filterable: ['status', 'priority', 'categoryId', 'dueDate'],
  // ponytail: priority is a string enum, so sorting it would be alphabetical; add a numeric rank field if needed
  sortable: ['createdAt', 'updatedAt', 'dueDate'],
  searchable: ['title', 'description'],
}
