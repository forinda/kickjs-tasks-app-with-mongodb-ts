import { defineModule } from '@forinda/kickjs'
import { AuthController } from './auth.controller'

export const AuthModule = defineModule({
  name: 'AuthModule',
  build: () => ({
    routes() {
      return { path: '/auth', controller: AuthController }
    },
  }),
})
