import { Controller, Get, Post, Param, Body, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RainService } from './rain.service';
import { ChatService } from 'src/modules/chat/chat.service';
import { ChatGateway } from 'src/gateway/chat.gateway';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FeatureGateGuard, RequireFeature, FeatureKey } from 'src/common/guards/feature-gate.guard';
import { CurrentUser } from 'src/common/decorators/current-player.decorator';
import { TenantPermission, MessageType, MessageSource } from '@prisma/client';

@ApiTags('Rain')
@Controller('api/tenants/:tenantId/rain')
@UseGuards(JwtAuthGuard, PermissionGuard, FeatureGateGuard)
@ApiBearerAuth('jwt-auth')
@RequireFeature(FeatureKey.RAIN_EVENTS)
export class RainController {
  constructor(
    private rainService: RainService,
    private chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  @Post()
  @RequirePermission(TenantPermission.MANAGE_RAIN)
  @ApiOperation({ summary: 'Trigger rain event' })
  async trigger(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const rain = await this.rainService.triggerRain(tenantId, {
      ...body,
      initiatedById: user.id,
      perPlayerAmount: body.perPlayerAmount || 0,
    });

    // Save rain as a chat message in the channel
    const message = await this.chatService.sendMessage({
      tenantId,
      channelId: body.channelId,
      playerId: null,
      type: MessageType.RAIN,
      source: MessageSource.SYSTEM,
      content: {
        rainId: rain.id,
        initiator: user.email?.split('@')[0] || 'Admin',
        amount: rain.totalAmount,
        currency: rain.currency || 'USD',
        duration: rain.durationSeconds,
        timeLeft: rain.durationSeconds,
        playerCount: 0,
        perPlayer: 0,
      },
    });

    // Broadcast via WebSocket
    this.chatGateway.broadcastMessage(body.channelId, {
      id: message.id,
      playerId: null,
      username: 'System',
      type: 'RAIN',
      content: message.content,
      createdAt: message.createdAt,
      sequenceNum: message.sequenceNum?.toString(),
    });

    return rain;
  }

  @Post(':id/cancel')
  @RequirePermission(TenantPermission.MANAGE_RAIN)
  @ApiOperation({ summary: 'Cancel an active rain event' })
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    const rain = await this.rainService.cancelRain(tenantId, id);

    // Broadcast cancellation system message to the channel
    const message = await this.chatService.sendMessage({
      tenantId,
      channelId: rain.channelId,
      playerId: null,
      type: MessageType.SYSTEM,
      source: MessageSource.SYSTEM,
      content: { text: 'Rain event cancelled by admin' },
    });

    this.chatGateway.broadcastMessage(rain.channelId, {
      id: message.id,
      playerId: null,
      username: 'System',
      type: 'SYSTEM',
      content: message.content,
      createdAt: message.createdAt,
      sequenceNum: message.sequenceNum?.toString(),
    });

    return rain;
  }

  @Get()
  @ApiOperation({ summary: 'List rain events' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.rainService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rain event details with claims' })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.rainService.findOne(tenantId, id);
  }
}
