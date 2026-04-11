import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyType } from '@prisma/client';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'US Dollar' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '$' })
  @IsString()
  symbol!: string;

  @ApiProperty({ enum: CurrencyType, example: 'FIAT' })
  @IsEnum(CurrencyType)
  type!: CurrencyType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
