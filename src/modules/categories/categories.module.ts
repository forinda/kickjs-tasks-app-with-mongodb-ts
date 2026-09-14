import { defineModule } from '@forinda/kickjs'
import { CategoriesController } from './categories.controller'

export const CategoriesModule = defineModule({
  name: 'CategoriesModule',
  build: () => ({
    routes() {
      return { path: '/categories', controller: CategoriesController }
    },
  }),
})
