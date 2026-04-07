import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/prisma.service';
import axios from 'axios';

interface WebhookPayload {
  event: string;
  timestamp: number;
  data: Record<string, any>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {}

  async handleCasinoWebhook(tenantId: string, event: string, data: any) {
    this.logger.debug(
      `Processing casino webhook for tenant ${tenantId}: ${event}`,
    );

    switch (event) {
      case 'player.updated':
        await this.handlePlayerUpdated(tenantId, data);
        break;
      case 'player.win':
        await this.handlePlayerWin(tenantId, data);
        break;
      case 'rain.triggered':
        await this.handleRainTriggered(tenantId, data);
        break;
      default:
        this.logger.warn(`Unknown webhook event: ${event}`);
    }
  }

  async sendOutgoingWebhook(tenantId: string, event: string, data: any) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.webhookUrl) {
      this.logger.debug(`No webhook URL configured for tenant ${tenantId}`);
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      data,
    };

    try {
      const timeout = this.configService.get<number>(
        'webhooks.timeoutMs',
        5000,
      );

      await axios.post(tenant.webhookUrl, payload, {
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Casino-Event': event,
          'X-Tenant-ID': tenantId,
        },
      });

      this.logger.debug(
        `Webhook sent for ${event} to ${tenant.webhookUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send webhook for ${event}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // Webhook Event Handlers
  private async handlePlayerUpdated(tenantId: string, data: any) {
    const { externalId, username, avatarUrl } = data;

    await this.prismaService.player.updateMany({
      where: { tenantId, externalId },
      data: {
        username,
        avatarUrl,
      },
    });

    this.logger.debug(`Player updated: ${externalId}`);
  }

  private async handlePlayerWin(tenantId: string, data: any) {
    const { externalId, amount, game } = data;

    const player = await this.prismaService.player.findFirst({
      where: { tenantId, externalId },
    });

    if (player) {
      await this.prismaService.player.update({
        where: { id: player.id },
        data: {
          winCount: { increment: 1 },
          totalWagered: { increment: amount },
        },
      });

      // Send chat system message
      const channels = await this.prismaService.channel.findMany({
        where: { tenantId },
      });

      for (const channel of channels) {
        await this.sendOutgoingWebhook(tenantId, 'message.created', {
          type: 'WIN',
          playerId: player.id,
          username: player.username,
          amount,
          game,
          channel: channel.name,
        });
      }
    }

    this.logger.debug(`Player win recorded: ${externalId} - ${amount}`);
  }

  private async handleRainTriggered(tenantId: string, data: any) {
    const { channelId, amount, perPlayerAmount, durationSeconds } = data;

    const rainEvent = await this.prismaService.rainEvent.create({
      data: {
        tenantId,
        channelId,
        initiatedById: 'webhook',
        totalAmount: BigInt(Math.floor(amount * 100)) / 100n,
        perPlayerAmount: BigInt(Math.floor(perPlayerAmount * 100)) / 100n,
        durationSeconds,
      },
    });

    // Send outgoing webhook
    await this.sendOutgoingWebhook(tenantId, 'rain.started', {
      rainEventId: rainEvent.id,
      amount,
      perPlayerAmount,
      durationSeconds,
    });

    this.logger.debug(`Rain event created: ${rainEvent.id}`);
  }
}
