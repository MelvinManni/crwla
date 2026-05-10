import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CronPreset } from '@prisma/client';

export const VALID_CRON: ReadonlyArray<CronPreset> = ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'] as const;

export class CreateSearchDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  keywords!: string[];

  @IsIn(VALID_CRON as readonly string[])
  cron!: CronPreset;

  @IsOptional()
  @IsString()
  filterPrompt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  // `sources` is no longer accepted from the client — the API derives it
  // from the user's active plan + admin denylist at create time. Existing
  // searches keep whatever sources they were created with until edited.
}
