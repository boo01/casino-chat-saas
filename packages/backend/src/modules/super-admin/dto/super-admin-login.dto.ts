import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuperAdminLoginDto {
  @ApiProperty({ example: 'super@casinochat.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SuperAdmin123!' })
  @IsString()
  @MinLength(6)
  password!: string;
}
