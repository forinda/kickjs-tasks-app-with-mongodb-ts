import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { MongodbAdapter } from './mongodb.adapter'
import { getEnv } from '@forinda/kickjs'

export const adapters = [
  SwaggerAdapter({
    info: {
      title: 'Todo App API',
      version: '1.0.0',
    }
  }),
  MongodbAdapter({
    uri: getEnv('MONGO_URL'),
    dbName: getEnv('DB_NAME'),
  }),
]
