import mongoose from 'mongoose'
import { MountCategoryModel } from './models/category'
import { MountTaskModel } from './models/task'
import { MountUserModel } from './models/user'

export const getModels = (connection: typeof mongoose) => ({
  User: MountUserModel(connection),
  Category: MountCategoryModel(connection),
  Task: MountTaskModel(connection),
})

export const isDuplicateKeyError = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000
