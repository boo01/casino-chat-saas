import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { CurrentTenant } from 'src/common/decorators/tenant.decorator';

interface CasinoWebhookPayload {
  event: string;
  data: Record<string, any>;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  @Post('casino')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key-auth')
  @ApiOperation({ summary: 'Receive casino webhook events' })
  async receiveCasinoWebhook(
    @CurrentTenant() tenant: any,
    @Body() payload: CasinoWebhookPayload,
  ) {
    const { event, data } = payload;
    await this.webhookService.handleCasinoWebhook(tenant.id, event, data);
    return { success: true };
  }
}
