import { io, Socket } from 'socket.io-client';
import type { ChatConfig, ChatMessage, Channel } from '../types';

export class ChatSocket {
  private socket: Socket | null = null;
  private config: ChatConfig;

  // Event callbacks
  onConnected: ((data: any) => void) | null = null;
  onMessage: ((msg: ChatMessage) => void) | null = null;
  onChannelJoined: ((data: { channelId: string; channel: Channel; messages: ChatMessage[]; onlineCount: number }) => void) | null = null;
  onPlayerJoined: ((data: any) => void) | null = null;
  onPlayerLeft: ((data: any) => void) | null = null;
  onTyping: ((data: any) => void) | null = null;
  onError: ((error: any) => void) | null = null;
  onDisconnect: (() => void) | null = null;

  constructor(config: ChatConfig) {
    this.config = config;
  }

  connect() {
    const url = this.config.serverUrl || 'http://localhost:3000';
    this.socket = io(`${url}/chat`, {
      auth: {
        tenantId: this.config.tenantId,
        token: this.config.playerToken || undefined,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connection:established', (data) => this.onConnected?.(data));
    this.socket.on('message:received', (msg) => this.onMessage?.(msg));
    this.socket.on('channel:joined', (data) => this.onChannelJoined?.(data));
    this.socket.on('player:joined', (data) => this.onPlayerJoined?.(data));
    this.socket.on('player:left', (data) => this.onPlayerLeft?.(data));
    this.socket.on('player:typing', (data) => this.onTyping?.(data));
    this.socket.on('error', (err) => this.onError?.(err));
    this.socket.on('disconnect', () => this.onDisconnect?.());
  }

  joinChannel(channelId: string) {
    this.socket?.emit('channel:join', { channelId });
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('channel:leave', { channelId });
  }

  sendMessage(channelId: string, text: string, replyToId?: string) {
    this.socket?.emit('chat:message', { channelId, text, replyToId });
  }

  sendTyping(channelId: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { channelId, isTyping });
  }

  claimRain(rainId: string) {
    this.socket?.emit('rain:claim', { rainId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}
