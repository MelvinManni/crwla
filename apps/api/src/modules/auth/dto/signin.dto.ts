import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SigninDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** reCAPTCHA v3 token from the client; verified by RecaptchaGuard. */
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
