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

  @IsOptional() @IsIn(UPDATABLE_STATUSES as readonly string[]) status?: SearchStatus;

  @IsOptional() @IsArray() @IsString({ each: true }) locations?: string[];

  @IsOptional() @IsBoolean() strict?: boolean;
  // `sources` is server-derived from the active plan; not accepted from clients.
}
