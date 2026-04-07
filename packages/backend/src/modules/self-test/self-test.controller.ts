import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SelfTestService, SelfTestResponse } from './self-test.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentPlayer } from 'src/common/decorators/player.decorator';

@ApiTags('health')
@Controller('self-test')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class SelfTestController {
  constructor(private selfTestService: SelfTestService) {}

  @Get()
  @ApiOperation({ summary: 'Run integration self-test' })
  async runSelfTest(@CurrentPlayer() player: any): Promise<SelfTestResponse> {
    return this.selfTestService.runSelfTest(player.tenantId);
  }
}
