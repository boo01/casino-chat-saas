import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BannedWordMatchType } from '@prisma/client';

export class BannedWordDto {
  @ApiProperty({ example: 'badword', description: 'The banned word' })
  @IsString()
  word!: string;

  @ApiProperty({
    enum: Object.values(BannedWordMatchType),
    example: 'EXACT',
    description: 'Match type: EXACT, WILDCARD, or REGEX',
  })
  @IsEnum(BannedWordMatchType)
  matchType!: BannedWordMatchType;
}
