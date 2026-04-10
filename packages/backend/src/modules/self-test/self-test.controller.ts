import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SelfTestService, SelfTestResponse } from './self-test.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentPlayer } from 'src/common/decorators/player.decorator';

@ApiTags('health')
@Controller('api/self-test')
export class SelfTestController {
  constructor(
    private selfTestService: SelfTestService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt-auth')
  @ApiOperation({ summary: 'Run integration self-test' })
  async runSelfTest(@CurrentPlayer() player: any): Promise<SelfTestResponse> {
    return this.selfTestService.runSelfTest(player.tenantId);
  }

  @Post('player-token')
  @ApiOperation({ summary: 'Generate a player JWT for dev testing (dev only)' })
  async generatePlayerToken(
    @Body() body: { externalId: string; username?: string },
  ): Promise<{ token: string }> {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      throw new Error('This endpoint is disabled in production');
    }

    const token = this.jwtService.sign(
      {
        externalId: body.externalId,
        username: body.username || body.externalId,
      },
      {
        secret: this.configService.get<string>(
          'jwt.secret',
          'your-super-secret-key-change-in-production',
        ),
        expiresIn: '24h',
      },
    );

    return { token };
  }
}
