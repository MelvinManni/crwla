import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TrackedCompanyStatus } from '@prisma/client';

export class CreateTrackedCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Free-form URL — accepts bare hostnames too (e.g. "stripe.com/jobs"). */
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  careerUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  selector?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10_080)
  crawlIntervalMin?: number;

  @IsOptional()
  @IsEnum(TrackedCompanyStatus)
  status?: TrackedCompanyStatus;
}

export class UpdateTrackedCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  careerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  selector?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10_080)
  crawlIntervalMin?: number;

  @IsOptional()
  @IsEnum(TrackedCompanyStatus)
  status?: TrackedCompanyStatus;

  /** Convenience flag — sets status to PAUSED or ACTIVE on save. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
