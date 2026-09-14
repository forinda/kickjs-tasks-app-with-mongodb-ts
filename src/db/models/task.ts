import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
)
taskSchema.index({ userId: 1, status: 1 })

export type Task = InferSchemaType<typeof taskSchema>

export const MountTaskModel = (connection: typeof mongoose) =>
  (connection.models.Task || connection.model('Task', taskSchema)) as Model<Task>
