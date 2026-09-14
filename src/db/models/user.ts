import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true, versionKey: false },
)

export type User = InferSchemaType<typeof userSchema>

// HMR-safe: reuse the compiled model on reload, otherwise OverwriteModelError.
export const MountUserModel = (connection: typeof mongoose) =>
  (connection.models.User || connection.model('User', userSchema)) as Model<User>
