import { defineHttpContextDecorator, HttpException } from '@forinda/kickjs'
import { jwtVerify } from 'jose'
import { jwtSecret } from '@/modules/auth/auth.token'

declare module '@forinda/kickjs' {
  interface ContextMeta {
    user: { id: string }
  }
}

/** Verifies the bearer token and exposes `ctx.require('user')`. Rejects with 401 otherwise. */
export const LoadUser = defineHttpContextDecorator({
  key: 'user',
  // Answer 401 before body validation can leak the schema to anonymous callers.
  beforeValidation: true,
  resolve: async (ctx) => {
    const header = ctx.req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw HttpException.unauthorized('Missing bearer token')
    try {
      const { payload } = await jwtVerify(header.slice(7), jwtSecret(), { algorithms: ['HS256'] })
      if (!payload.sub) throw new Error('Token has no subject')
      return { id: payload.sub }
    } catch {
      throw HttpException.unauthorized('Invalid or expired token')
    }
  },
})
