import { IsString, IsOptional, IsBoolean, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantTier } from '@prisma/client';

export class UpdateTenantDto {
  @ApiProperty({
    example: 'My Casino Updated',
    description: 'Tenant name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'PREMIUM',
    enum: Object.values(TenantTier),
    description: 'Tenant tier',
  })
  @IsOptional()
  @IsEnum(TenantTier)
  tier?: TenantTier;

  @ApiProperty({
    example: true,
    description: 'Is tenant active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'https://webhook.example.com/events',
    description: 'Webhook URL',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiProperty({
    example: JSON.stringify({ primaryColor: '#FF0000' }),
    description: 'Branding configuration',
  })
  @IsOptional()
  branding?: Record<string, any>;

  @ApiProperty({
    example: ['192.168.1.1', '10.0.0.1'],
    description: 'Allowed IP addresses',
  })
  @IsOptional()
  allowedIps?: string[];
}
