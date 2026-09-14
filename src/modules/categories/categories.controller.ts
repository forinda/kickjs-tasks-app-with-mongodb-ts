import { Autowired, Controller, Delete, Get, Patch, Post, reply, type Ctx } from '@forinda/kickjs'
import { ApiBearerAuth, ApiTags } from '@forinda/kickjs-swagger'
import { LoadUser } from '@/contributors/load-user.contributor'
import { CreateCategoryBody, UpdateCategoryBody } from './categories.dto'
import { CategoriesService } from './categories.service'

@ApiTags('Categories')
@ApiBearerAuth()
@LoadUser
@Controller()
export class CategoriesController {
  @Autowired() private readonly categoriesService!: CategoriesService

  @Get('/')
  list(ctx: Ctx<KickRoutes.CategoriesController['list']>) {
    return this.categoriesService.list(ctx.require('user').id)
  }

  @Post('/', { body: CreateCategoryBody, name: 'CreateCategoryRequest' })
  async create(ctx: Ctx<KickRoutes.CategoriesController['create']>) {
    return reply(201, await this.categoriesService.create(ctx.require('user').id, ctx.body))
  }

  @Get('/:id')
  get(ctx: Ctx<KickRoutes.CategoriesController['get']>) {
    return this.categoriesService.get(ctx.require('user').id, ctx.params.id)
  }

  @Patch('/:id', { body: UpdateCategoryBody, name: 'UpdateCategoryRequest' })
  update(ctx: Ctx<KickRoutes.CategoriesController['update']>) {
    return this.categoriesService.update(ctx.require('user').id, ctx.params.id, ctx.body)
  }

  @Delete('/:id')
  async remove(ctx: Ctx<KickRoutes.CategoriesController['remove']>) {
    await this.categoriesService.remove(ctx.require('user').id, ctx.params.id)
    return reply.noContent()
  }
}
