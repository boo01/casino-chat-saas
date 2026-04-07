import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VIPStatus, PremiumStyle } from '@prisma/client';

export class UpdatePlayerDto {
  @ApiProperty({ example: 'john_doe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ example: 5 })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiProperty({ enum: Object.values(VIPStatus) })
  @IsOptional()
  @IsEnum(VIPStatus)
  vipStatus?: VIPStatus;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiProperty({ enum: Object.values(PremiumStyle) })
  @IsOptional()
  @IsEnum(PremiumStyle)
  premiumStyle?: PremiumStyle;

  @ApiProperty({ example: 'gates-of-olympus' })
  @IsOptional()
  @IsString()
  favoriteGame?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isModerator?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isStreamer?: boolean;
}
