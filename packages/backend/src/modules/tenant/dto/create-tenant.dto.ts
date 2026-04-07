import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantTier } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({
    example: 'My Casino',
    description: 'Tenant name',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'mycasino.com',
    description: 'Tenant domain',
  })
  @IsString()
  domain!: string;

  @ApiProperty({
    example: 'admin@mycasino.com',
    description: 'Admin email',
  })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Admin password',
  })
  @IsString()
  adminPassword!: string;

  @ApiProperty({
    enum: Object.values(TenantTier),
    example: 'STANDARD',
    description: 'Tenant tier',
  })
  @IsOptional()
  @IsEnum(TenantTier)
  tier?: TenantTier;

  @ApiProperty({
    example: 'https://webhook.example.com/events',
    description: 'Webhook URL for tenant events',
  })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({
    example: JSON.stringify({ primaryColor: '#FF0000' }),
    description: 'Branding configuration',
  })
  @IsOptional()
  branding?: Record<string, any>;
}
