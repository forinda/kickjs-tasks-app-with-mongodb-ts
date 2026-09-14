import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { HttpException, Inject, Service } from '@forinda/kickjs'
import { DbToken, type Db } from '@/adapters/mongodb.adapter'
import { isDuplicateKeyError } from '@/db'
import type { LoginInput, RegisterInput } from './auth.dto'
import { signToken } from './auth.token'

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const expected = Buffer.from(hash, 'hex')
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

@Service()
export class AuthService {
  @Inject(DbToken)
  private readonly db!: Db

  async register(input: RegisterInput) {
    try {
      const doc = await this.db.User.create({
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      })
      const { passwordHash: _, ...user } = doc.toObject()
      return { token: await signToken(String(user._id)), user }
    } catch (err) {
      if (isDuplicateKeyError(err)) throw HttpException.conflict('Email already registered')
      throw err
    }
  }

  async login(input: LoginInput) {
    const doc = await this.db.User.findOne({ email: input.email.trim().toLowerCase() })
      .select('+passwordHash')
      .lean()
    // Same error for unknown email and wrong password.
    if (!doc || !(await verifyPassword(input.password, doc.passwordHash))) {
      throw HttpException.unauthorized('Invalid credentials')
    }
    const { passwordHash: _, ...user } = doc
    return { token: await signToken(String(user._id)), user }
  }

  async me(userId: string) {
    const user = await this.db.User.findById(userId).lean()
    if (!user) throw HttpException.unauthorized('User no longer exists')
    return user
  }
}
