import { Autowired, Controller, Get, Post, reply, type Ctx } from '@forinda/kickjs'
import { ApiBearerAuth, ApiTags } from '@forinda/kickjs-swagger'
import { LoadUser } from '@/contributors/load-user.contributor'
import { LoginBody, RegisterBody } from './auth.dto'
import { AuthService } from './auth.service'

@ApiTags('Auth')
@Controller()
export class AuthController {
  @Autowired() private readonly authService!: AuthService

  @Post('/register', { body: RegisterBody, name: 'RegisterRequest' })
  async register(ctx: Ctx<KickRoutes.AuthController['register']>) {
    return reply(201, await this.authService.register(ctx.body))
  }

  @Post('/login', { body: LoginBody, name: 'LoginRequest' })
  login(ctx: Ctx<KickRoutes.AuthController['login']>) {
    return this.authService.login(ctx.body)
  }

  @ApiBearerAuth()
  @LoadUser
  @Get('/me')
  me(ctx: Ctx<KickRoutes.AuthController['me']>) {
    return this.authService.me(ctx.require('user').id)
  }
}
