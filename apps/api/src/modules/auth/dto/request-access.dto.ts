import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsStrongPasswordField } from '../../../common/validators/strong-password.decorator';

export class RequestAccessDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsStrongPasswordField()
  password!: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
