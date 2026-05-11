import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ContactPurpose } from '@prisma/client';

export class CreateContactSubmissionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ContactPurpose)
  @IsOptional()
  purpose?: ContactPurpose;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  volume?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string | null;
}
