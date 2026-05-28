import { IsIn, IsNumber, IsString, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../currency.service';

export class ConvertCurrencyDto {
  @IsNumber()
  @Min(0)
  amountUsd!: number;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  target!: string;
}
