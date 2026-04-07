import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty({ example: 'general', description: 'Channel name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '💬', description: 'Channel emoji' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ example: 'en', description: 'Channel language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'General chat', description: 'Channel description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
