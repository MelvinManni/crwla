import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateJobSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  country?: string;

  @IsOptional()
  @IsBoolean()
  remote?: boolean;
}
