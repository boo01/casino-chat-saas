import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableCurrencyDto {
  @ApiProperty({ description: 'ID of the master currency to enable' })
  @IsString()
  currencyId!: string;
}
