import { defineModules } from '@forinda/kickjs'
import { AuthModule } from './auth/auth.module'
import { CategoriesModule } from './categories/categories.module'
import { TasksModule } from './tasks/tasks.module'

export const modules = defineModules()
  .mount(AuthModule())
  .mount(TasksModule())
  .mount(CategoriesModule())
