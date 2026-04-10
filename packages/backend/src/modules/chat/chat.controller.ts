import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from 'src/gateway/chat.gateway';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-player.decorator';
import { MessageType, MessageSource } from '@prisma/client';

@ApiTags('Chat')
@Controller('api/tenants/:tenantId/channels/:channelId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class ChatController {
  constructor(
    private chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get channel message history' })
  async getMessages(
    @Param('tenantId') tenantId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chatService.getChannelHistory(tenantId, channelId, Number(limit) || 50, Number(offset) || 0);
  }

  @Post()
  @ApiOperation({ summary: 'Send message via REST API (system/operator)' })
  async sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('channelId') channelId: string,
    @Body() body: { text: string; type?: string; source?: string },
    @CurrentUser() user: any,
  ) {
    const source = (body.source as MessageSource) || MessageSource.OPERATOR;
    const isPlayerSource = source === MessageSource.PLAYER;

    const message = await this.chatService.sendMessage({
      tenantId,
      channelId,
      playerId: isPlayerSource ? user?.id : null,
      type: (body.type as MessageType) || MessageType.TEXT,
      source,
      content: { text: body.text },
    });

    // Broadcast via WebSocket so widget clients see it instantly
    this.chatGateway.broadcastMessage(channelId, {
      id: message.id,
      playerId: null,
      username: user?.email?.split('@')[0] || 'Admin',
      avatarUrl: null,
      level: 99,
      vipStatus: 'DIAMOND',
      isPremium: false,
      premiumStyle: null,
      isModerator: true,
      isStreamer: false,
      type: message.type,
      content: message.content,
      replyToId: null,
      createdAt: message.createdAt,
      sequenceNum: message.sequenceNum?.toString(),
    });

    return message;
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message (admin only)' })
  async deleteMessage(
    @Param('tenantId') tenantId: string,
    @Param('messageId') messageId: string,
  ) {
    await this.chatService.deleteMessage(tenantId, messageId);
    return { deleted: true };
  }
}
