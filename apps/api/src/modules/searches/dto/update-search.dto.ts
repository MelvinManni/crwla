import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CronPreset, SearchStatus } from '@prisma/client';
import { VALID_CRON } from './create-search.dto';

const UPDATABLE_STATUSES: ReadonlyArray<SearchStatus> = ['RUNNING', 'PAUSED'] as const;

export class UpdateSearchDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional() @IsIn(VALID_CRON as readonly string[]) cron?: CronPreset;

  @IsOptional() @IsString() filterPrompt?: string;

  // Owner toggle for the scheduled-crawl digest email. Only has an effect on
  // DAILY/WEEKLY crawls — HOURLY and MANUAL never send a digest.
  @IsOptional() @IsBoolean() digestEnabled?: boolean;

  @IsOptional() @IsIn(UPDATABLE_STATUSES as readonly string[]) status?: SearchStatus;

  @IsOptional() @IsArray() @IsString({ each: true }) locations?: string[];

  @IsOptional() @IsBoolean() strict?: boolean;

  // Owner-controlled public-share gate. Falsy means the /p/<slug> page
  // returns the limited-access view even if a slug exists. The entitlement
  // check happens in the service when toggling on.
  @IsOptional() @IsBoolean() publicAccess?: boolean;
  // `sources` is server-derived from the active plan; not accepted from clients.
}
