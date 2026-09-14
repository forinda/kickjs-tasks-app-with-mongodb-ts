import { HttpException, Inject, Service, type ParsedQuery } from '@forinda/kickjs'
import { isValidObjectId } from 'mongoose'
import { DbToken, type Db } from '@/adapters/mongodb.adapter'
import type { CreateTaskInput, UpdateTaskInput } from './tasks.dto'

const notFound = () => HttpException.notFound('Task not found')

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const COMPARISON = {
  eq: '$eq',
  neq: '$ne',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
} as const

/** Translates one `?filter=field:op:value` item into a Mongo condition. */
function toCondition(operator: ParsedQuery['filters'][number]['operator'], raw: string) {
  const value = raw === 'null' ? null : raw
  switch (operator) {
    case 'in':
      return { $in: raw.split(',') }
    case 'between': {
      const [from, to] = raw.split(',')
      return { $gte: from, $lte: to }
    }
    case 'contains':
      return { $regex: escapeRegex(raw), $options: 'i' }
    case 'starts':
      return { $regex: `^${escapeRegex(raw)}`, $options: 'i' }
    case 'ends':
      return { $regex: `${escapeRegex(raw)}$`, $options: 'i' }
    default:
      return { [COMPARISON[operator]]: value }
  }
}

@Service()
export class TasksService {
  @Inject(DbToken)
  private readonly db!: Db

  async list(userId: string, parsed: ParsedQuery) {
    const filter: Record<string, any> = { userId }
    for (const { field, operator, value } of parsed.filters) {
      filter[field] = { ...filter[field], ...toCondition(operator, value) }
    }
    if (parsed.search) {
      const regex = { $regex: escapeRegex(parsed.search), $options: 'i' }
      filter.$or = [{ title: regex }, { description: regex }]
    }
    const sort = parsed.sort.length
      ? Object.fromEntries(
          parsed.sort.map((s) => [s.field, s.direction === 'desc' ? -1 : 1] as const),
        )
      : { createdAt: -1 as const }

    try {
      const [data, total] = await Promise.all([
        this.db.Task.find(filter)
          .sort(sort)
          .skip(parsed.pagination.offset)
          .limit(parsed.pagination.limit)
          .lean(),
        this.db.Task.countDocuments(filter),
      ])
      return { data, total }
    } catch (err) {
      // Bad filter values (e.g. `dueDate:gt:tomorrow`) fail Mongoose casting.
      if ((err as Error).name === 'CastError')
        throw HttpException.badRequest('Invalid filter value')
      throw err
    }
  }

  async get(userId: string, id: string) {
    if (!isValidObjectId(id)) throw notFound()
    const task = await this.db.Task.findOne({ _id: id, userId }).lean()
    if (!task) throw notFound()
    return task
  }

  async create(userId: string, input: CreateTaskInput) {
    await this.assertCategoryOwned(userId, input.categoryId)
    return (await this.db.Task.create({ ...input, userId })).toObject()
  }

  async update(userId: string, id: string, input: UpdateTaskInput) {
    if (!isValidObjectId(id)) throw notFound()
    await this.assertCategoryOwned(userId, input.categoryId)
    const task = await this.db.Task.findOneAndUpdate({ _id: id, userId }, input, {
      returnDocument: 'after',
      runValidators: true,
    }).lean()
    if (!task) throw notFound()
    return task
  }

  async remove(userId: string, id: string) {
    if (!isValidObjectId(id)) throw notFound()
    const { deletedCount } = await this.db.Task.deleteOne({ _id: id, userId })
    if (!deletedCount) throw notFound()
  }

  private async assertCategoryOwned(userId: string, categoryId: string | null | undefined) {
    if (!categoryId) return
    if (!(await this.db.Category.exists({ _id: categoryId, userId }))) {
      throw HttpException.badRequest('Category not found')
    }
  }
}
