import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SuperAdminRole } from '@prisma/client';

export class UpdateSuperAdminDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: SuperAdminRole, required: false })
  @IsOptional()
  @IsEnum(SuperAdminRole)
  role?: SuperAdminRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
