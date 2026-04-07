import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SuperAdminRole } from '@prisma/client';

export class CreateSuperAdminDto {
  @ApiProperty({ example: 'admin@casinochat.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SuperAdmin123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John Admin' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: SuperAdminRole, example: 'ADMIN', required: false })
  @IsOptional()
  @IsEnum(SuperAdminRole)
  role?: SuperAdminRole;
}
