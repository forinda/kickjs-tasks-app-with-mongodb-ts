import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB')
    .optional(),
})

const updateCategorySchema = createCategorySchema.partial()

export const CreateCategoryBody = fromZod(createCategorySchema)
export const UpdateCategoryBody = fromZod(updateCategorySchema)
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
