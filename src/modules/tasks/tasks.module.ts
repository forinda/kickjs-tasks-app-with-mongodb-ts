import { defineModule } from '@forinda/kickjs'
import { TasksController } from './tasks.controller'

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    routes() {
      return { path: '/tasks', controller: TasksController }
    },
  }),
})
