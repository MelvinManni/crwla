import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../currency.service';

export class CreatePricingSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  productName!: string;

  /** ISO-3166 alpha-2. Free-form to keep the registry simple. */
  @IsOptional()
  @IsString()
  @MaxLength(4)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  maxPriceUsd?: number;
}
