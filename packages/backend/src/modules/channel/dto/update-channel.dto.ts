import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateChannelDto {
  @ApiProperty({ example: 'general-updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '🎉' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
