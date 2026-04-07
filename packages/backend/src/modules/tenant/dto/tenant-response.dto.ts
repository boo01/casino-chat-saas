import { ApiProperty } from '@nestjs/swagger';
import { TenantTier } from '@prisma/client';

export class TenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty()
  apiKey!: string;

  @ApiProperty()
  tier!: TenantTier;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  webhookUrl!: string | null;

  @ApiProperty()
  allowedIps!: string[];

  @ApiProperty()
  branding!: Record<string, any>;

  @ApiProperty()
  config!: Record<string, any>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
