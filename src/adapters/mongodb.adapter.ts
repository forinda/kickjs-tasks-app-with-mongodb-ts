import { defineAdapter, createToken, Logger } from '@forinda/kickjs'
import * as mongoose from 'mongoose'
import { getModels } from '../db'

const logger = Logger.for('MongooseAdapter')

export type Db = ReturnType<typeof getModels>
export const DbToken = createToken<Db>('app/DbModels')

export interface MongodbAdapterConfig {
  uri: string
  dbName?: string
}

/** Hide credentials so connection strings are safe to log. */
const redact = (uri: string) => uri.replace(/\/\/[^@/]*@/, '//***@')

export const MongodbAdapter = defineAdapter<MongodbAdapterConfig>({
  name: 'MongodbAdapter',
  build: (config) => {
    let client: typeof mongoose | null = null

    return {
      async beforeStart(ctx) {
        try {
          client = await mongoose.connect(config.uri, {
            dbName: config.dbName,
            // Fail boot fast instead of the 30s default when Mongo is unreachable.
            serverSelectionTimeoutMS: 5000,
          })
        } catch (error) {
          // Fail boot: without DbToken every request would crash instead.
          logger.error(`Failed to connect to MongoDB at ${redact(config.uri)}`, error)
          throw error
        }
        ctx.container.registerInstance(DbToken, getModels(client))
        logger.info(`Connected to MongoDB at ${redact(config.uri)}`)
      },

      async shutdown() {
        await client?.disconnect()
      },

      async onHealthCheck(): Promise<{ name: string; status: 'up' | 'down' }> {
        try {
          if (!client) return { name: 'mongodb', status: 'down' }
          await client.connection.db?.command({ ping: 1 })
          return { name: 'mongodb', status: 'up' }
        } catch {
          return { name: 'mongodb', status: 'down' }
        }
      },
    }
  },
})
