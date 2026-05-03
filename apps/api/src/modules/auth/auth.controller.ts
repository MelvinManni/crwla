import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('signin')
  @HttpCode(200)
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.signin(dto.email, dto.password);
    res.cookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'), out.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * (this.config.get<number>('SESSION_DAYS', 14) ?? 14),
      secure: this.config.get<string>('NODE_ENV') === 'production',
    });
    return out;
  }

  @Post('signout')
  @HttpCode(200)
  signout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'));
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post('request-access')
  @HttpCode(200)
  async requestAccess(@Body() dto: RequestAccessDto) {
    const created = await this.prisma.accessRequest.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: this.auth.hashPassword(dto.password),
        team: dto.team ?? null,
        reason: dto.reason ?? null,
      },
    });
    return { ok: true, id: created.id };
  }
}
