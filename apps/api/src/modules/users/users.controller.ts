import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { IsStrongPasswordField } from '../../common/validators/strong-password.decorator';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString() @MinLength(1) firstName!: string;
  @IsOptional() @IsString() lastName?: string;
  @IsEmail() email!: string;
  @IsStrongPasswordField() password!: string;
  @IsOptional() @IsString() team?: string;
  @IsOptional() @IsIn(['admin', 'member']) role?: 'admin' | 'member';
}

class PatchUserDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(['admin', 'member']) role?: 'admin' | 'member';
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(['news', 'social', 'forums', 'blogs'], { each: true })
  disabledSourceCategories?: string[];
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list().then((users) => ({ users }));
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchUserDto) {
    return this.users.patch(id, dto);
  }
}
