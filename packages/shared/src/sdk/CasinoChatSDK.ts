import { createHmac } from 'crypto';

export interface SDKConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export interface PlayerData {
  username: string;
  avatarUrl?: string;
  level?: number;
  vipStatus?: string;
  totalWagered?: number;
  favoriteGame?: string;
}

export interface WinEvent {
  externalPlayerId: string;
  game: string;
  amount: number;
  currency?: string;
  multiplier?: number;
}

export interface RainTrigger {
  channelId: string;
  totalAmount: number;
  perPlayerAmount: number;
  durationSeconds: number;
  minLevel?: number;
}

export class CasinoChatSDK {
  private config: SDKConfig;

  constructor(config: SDKConfig) {
    this.config = config;
  }

  /**
   * Generate HMAC signature for API requests
   */
  private sign(method: string, path: string, body: string = ''): { timestamp: string; signature: string } {
    const timestamp = Date.now().toString();
    const data = `${method}${path}${timestamp}${body}`;
    const signature = createHmac('sha256', this.config.apiSecret)
      .update(data)
      .digest('hex');
    return { timestamp, signature };
  }

  /**
   * Make authenticated API request
   */
  private async request(method: string, path: string, body?: any): Promise<any> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const { timestamp, signature } = this.sign(method, path, bodyStr);

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.config.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: body ? bodyStr : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`CasinoChat API error: ${error.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Create or update a player in the chat system
   */
  async createOrUpdatePlayer(externalId: string, data: PlayerData) {
    return this.request('POST', '/webhooks/casino', {
      event: 'player.updated',
      data: { externalId, ...data },
    });
  }

  /**
   * Push a win event to the chat
   */
  async pushWin(data: WinEvent) {
    return this.request('POST', '/webhooks/casino', {
      event: 'player.win',
      data,
    });
  }

  /**
   * Trigger a rain event in a channel
   */
  async pushRain(data: RainTrigger) {
    return this.request('POST', '/webhooks/casino', {
      event: 'rain.triggered',
      data,
    });
  }

  /**
   * Update player status (ban/unban from casino side)
   */
  async updatePlayerStatus(externalId: string, status: 'active' | 'banned') {
    return this.request('POST', '/webhooks/casino', {
      event: 'player.status',
      data: { externalId, status },
    });
  }

  /**
   * Generate a JWT token for the chat widget
   * NOTE: This should be done server-side only!
   */
  generateWidgetSnippet(tenantId: string, playerToken?: string): string {
    return `<script src="${this.config.baseUrl}/sdk/v1/casino-chat.js"></script>
<script>
  CasinoChat.init({
    tenantId: '${tenantId}',
    serverUrl: '${this.config.baseUrl}',
    ${playerToken ? `playerToken: '${playerToken}',` : '// playerToken: null, // guest mode'}
  });
</script>`;
  }

  /**
   * Verify webhook signature from CasinoChat
   */
  static verifyWebhookSignature(
    apiSecret: string,
    method: string,
    path: string,
    timestamp: string,
    body: string,
    signature: string,
  ): boolean {
    const data = `${method}${path}${timestamp}${body}`;
    const expected = createHmac('sha256', apiSecret).update(data).digest('hex');

    // Timing-safe comparison
    if (expected.length !== signature.length) return false;
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
}
