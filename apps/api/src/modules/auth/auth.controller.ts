import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() team?: string | null;
  @IsOptional() @IsString() currentPassword?: string;
  // newPassword requires currentPassword; the service rejects if it's missing.
  @ValidateIf((o: UpdateProfileDto) => typeof o.newPassword === 'string')
  @IsString()
  @MinLength(8)
  newPassword?: string;
}

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

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.auth.updateProfile(user.id, dto);
    return { user: updated };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(200)
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.softDeleteUser(user.id);
    res.clearCookie(this.config.get<string>('COOKIE_NAME', 'crwla_token'));
    return { ok: true };
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
