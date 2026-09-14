import { HttpException, Inject, Service } from '@forinda/kickjs'
import { isValidObjectId } from 'mongoose'
import { DbToken, type Db } from '@/adapters/mongodb.adapter'
import { isDuplicateKeyError } from '@/db'
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.dto'

const notFound = () => HttpException.notFound('Category not found')

@Service()
export class CategoriesService {
  @Inject(DbToken)
  private readonly db!: Db

  list(userId: string) {
    return this.db.Category.find({ userId }).sort({ name: 1 }).lean()
  }

  async get(userId: string, id: string) {
    if (!isValidObjectId(id)) throw notFound()
    const category = await this.db.Category.findOne({ _id: id, userId }).lean()
    if (!category) throw notFound()
    return category
  }

  async create(userId: string, input: CreateCategoryInput) {
    try {
      return (await this.db.Category.create({ ...input, userId })).toObject()
    } catch (err) {
      if (isDuplicateKeyError(err)) throw HttpException.conflict('Category name already exists')
      throw err
    }
  }

  async update(userId: string, id: string, input: UpdateCategoryInput) {
    if (!isValidObjectId(id)) throw notFound()
    try {
      const category = await this.db.Category.findOneAndUpdate({ _id: id, userId }, input, {
        returnDocument: 'after',
        runValidators: true,
      }).lean()
      if (!category) throw notFound()
      return category
    } catch (err) {
      if (isDuplicateKeyError(err)) throw HttpException.conflict('Category name already exists')
      throw err
    }
  }

  async remove(userId: string, id: string) {
    if (!isValidObjectId(id)) throw notFound()
    const { deletedCount } = await this.db.Category.deleteOne({ _id: id, userId })
    if (!deletedCount) throw notFound()
    await this.db.Task.updateMany({ userId, categoryId: id }, { categoryId: null })
  }
}
