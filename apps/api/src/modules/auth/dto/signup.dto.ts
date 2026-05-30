import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsStrongPasswordField } from '../../../common/validators/strong-password.decorator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsStrongPasswordField()
  password!: string;

  @IsOptional()
  @IsString()
  team?: string;

  /** reCAPTCHA v3 token from the client; verified by RecaptchaGuard. */
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
