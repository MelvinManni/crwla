import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString() @MinLength(1) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
  @IsOptional() @IsString() team?: string;
  @IsOptional() @IsIn(['admin', 'member']) role?: 'admin' | 'member';
}

class PatchUserDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(['admin', 'member']) role?: 'admin' | 'member';
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

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchUserDto) {
    return this.users.patch(id, dto);
  }
}
