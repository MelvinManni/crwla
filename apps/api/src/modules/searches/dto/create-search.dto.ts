import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CronPreset } from '@prisma/client';

export const VALID_CRON: ReadonlyArray<CronPreset> = ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'] as const;

export class CreateSearchDto {
  // Optional — when blank/missing the service derives a name from the
  // keywords. Clients no longer need to make the user type one.
  @IsOptional()
  @IsString()
  name?: string;

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

  @IsOptional()
  @IsBoolean()
  strict?: boolean;

  // `sources` is no longer accepted from the client — the API derives it
  // from the user's active plan + admin denylist at create time. Existing
  // searches keep whatever sources they were created with until edited.
}
