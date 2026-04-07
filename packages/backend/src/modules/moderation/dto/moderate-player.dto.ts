import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModerationAction } from '@prisma/client';

export class ModeratePlayerDto {
  @ApiProperty({
    enum: Object.values(ModerationAction),
    example: 'MUTE',
    description: 'Moderation action',
  })
  @IsEnum(ModerationAction)
  action!: ModerationAction;

  @ApiProperty({ example: 'Spamming chat' })
  @IsString()
  reason!: string;

  @ApiProperty({
    example: 'mod-player-123',
    description: 'ID of the moderator performing the action',
  })
  @IsOptional()
  @IsString()
  moderatorId?: string;

  @ApiProperty({
    example: 60,
    description: 'Duration in minutes (optional)',
  })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}
