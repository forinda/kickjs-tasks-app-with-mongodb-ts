import { getEnv } from '@forinda/kickjs'
import { SignJWT } from 'jose'

export const jwtSecret = () => new TextEncoder().encode(getEnv('JWT_SECRET'))

export const signToken = (userId: string) =>
  new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret())
