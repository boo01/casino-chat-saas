import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-player.decorator';
import { MessageType, MessageSource } from '@prisma/client';

@ApiTags('Chat')
@Controller('api/tenants/:tenantId/channels/:channelId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class ChatController {
  constructor(private chatService: ChatService) {}

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
    return this.chatService.sendMessage({
      tenantId,
      channelId,
      playerId: user?.id,
      type: (body.type as MessageType) || MessageType.TEXT,
      source: (body.source as MessageSource) || MessageSource.OPERATOR,
      content: { text: body.text },
    });
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
