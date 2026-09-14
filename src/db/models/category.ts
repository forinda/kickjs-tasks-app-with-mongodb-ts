import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String },
  },
  { timestamps: true, versionKey: false },
)
categorySchema.index({ userId: 1, name: 1 }, { unique: true })

export type Category = InferSchemaType<typeof categorySchema>

export const MountCategoryModel = (connection: typeof mongoose) =>
  (connection.models.Category || connection.model('Category', categorySchema)) as Model<Category>
