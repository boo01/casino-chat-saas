import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyType } from '@prisma/client';

export class UpdateCurrencyDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'US Dollar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '$' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ enum: CurrencyType })
  @IsOptional()
  @IsEnum(CurrencyType)
  type?: CurrencyType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
