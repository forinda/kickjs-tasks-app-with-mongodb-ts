import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  password: z.string().min(8).max(200),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
})

export const RegisterBody = fromZod(registerSchema)
export const LoginBody = fromZod(loginSchema)
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
