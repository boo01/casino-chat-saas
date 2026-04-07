import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('api/tenants/:tenantId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('jwt-auth')
export class ChatSearchController {
  constructor(private chatService: ChatService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search messages' })
  async search(
    @Param('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('channelId') channelId?: string,
    @Query('limit') limit: number = 50,
  ) {
    if (!channelId) {
      return { data: [], message: 'channelId query parameter is required' };
    }
    return this.chatService.searchMessages(tenantId, channelId, query || '', limit);
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get message by ID' })
  async getMessage(
    @Param('tenantId') tenantId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.getMessageById(tenantId, messageId);
  }
}
