import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockPlayerDto {
  @ApiProperty({ example: 'player-id-to-block' })
  @IsString()
  playerId!: string;

  @ApiProperty({ example: 'Spamming chat' })
  @IsString()
  reason!: string;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'When the block expires (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  blockedUntil?: string;
}
