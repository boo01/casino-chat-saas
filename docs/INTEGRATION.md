# Casino Chat SaaS — Integration Guide

## Quick Start (5 minutes)

### 1. Get Your API Credentials

After signing up, you'll receive:
- **API Key** — identifies your casino
- **API Secret** — used for signing requests (keep secret!)
- **Tenant ID** — your casino's unique identifier

### 2. Embed the Chat Widget

Add this snippet to your casino's HTML:

```html
<script src="https://cdn.casinochat.com/sdk/v1/casino-chat.js"></script>
<link rel="stylesheet" href="https://cdn.casinochat.com/sdk/v1/casino-chat.css">
<script>
  CasinoChat.init({
    tenantId: 'YOUR_TENANT_ID',
    serverUrl: 'https://api.casinochat.com',
    playerToken: null, // See step 3 for authenticated players
    theme: {
      primaryColor: '#6366F1',
      position: 'bottom-right',
    },
  });
</script>
```

### 3. Authenticate Players

Generate a JWT on your backend and pass it to the widget:

**Node.js Example:**
```javascript
const jwt = require('jsonwebtoken');

const playerToken = jwt.sign({
  externalId: 'your-player-id-123',
  username: 'PlayerName',
  avatarUrl: 'https://...',
  level: 10,
  vipStatus: 'GOLD',
}, 'YOUR_JWT_SECRET', { expiresIn: '24h' });

// Pass this token to your frontend
```

**PHP Example:**
```php
use Firebase\JWT\JWT;

$playerToken = JWT::encode([
    'externalId' => 'your-player-id-123',
    'username' => 'PlayerName',
    'level' => 10,
    'vipStatus' => 'GOLD',
    'iat' => time(),
    'exp' => time() + 86400,
], env('CASINO_CHAT_JWT_SECRET'), 'HS256');
```

Then in your frontend:
```javascript
CasinoChat.init({
  tenantId: 'YOUR_TENANT_ID',
  playerToken: playerTokenFromBackend,
});
```

## API Authentication

All server-to-server API calls use HMAC-SHA256 signature authentication.

### Headers Required

| Header | Description |
|--------|-------------|
| `X-Api-Key` | Your API key |
| `X-Timestamp` | Unix timestamp in milliseconds |
| `X-Signature` | HMAC-SHA256 signature |

### Signature Generation

```
signature = HMAC-SHA256(apiSecret, method + path + timestamp + body)
```

**Node.js:**
```javascript
const crypto = require('crypto');

function signRequest(apiSecret, method, path, body = '') {
  const timestamp = Date.now().toString();
  const data = `${method}${path}${timestamp}${body}`;
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(data)
    .digest('hex');
  return { timestamp, signature };
}
```

## Webhook Events (Casino → Chat)

Push events to `POST /webhooks/casino`:

### player.win — Share a win in chat
```json
{
  "event": "player.win",
  "data": {
    "externalPlayerId": "player-123",
    "game": "Blackjack",
    "amount": 1500.50,
    "currency": "USD",
    "multiplier": 3.5
  }
}
```

### rain.triggered — Start a rain event
```json
{
  "event": "rain.triggered",
  "data": {
    "channelId": "channel-id",
    "totalAmount": 100,
    "perPlayerAmount": 5,
    "durationSeconds": 60
  }
}
```

### player.updated — Sync player data
```json
{
  "event": "player.updated",
  "data": {
    "externalId": "player-123",
    "username": "NewUsername",
    "level": 15,
    "vipStatus": "GOLD"
  }
}
```

## Widget Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | string | required | Your tenant ID |
| `serverUrl` | string | production URL | API server URL |
| `playerToken` | string/null | null | JWT for authenticated players |
| `containerId` | string | auto-created | DOM element ID to mount widget |
| `theme.primaryColor` | string | #6366F1 | Brand color |
| `theme.position` | string | bottom-right | Widget position |
| `theme.width` | number | 380 | Widget width in pixels |
| `theme.height` | number | 600 | Widget height in pixels |
| `locale` | string | en | Language code |
| `defaultChannel` | string | - | Auto-join channel name |

## Pricing Tiers & Features

| Feature | Basic | Social | Engage | Monetize |
|---------|-------|--------|--------|----------|
| Text chat | ✅ | ✅ | ✅ | ✅ |
| Channels | ✅ | ✅ | ✅ | ✅ |
| Moderation | ✅ | ✅ | ✅ | ✅ |
| Win cards | | ✅ | ✅ | ✅ |
| Reactions | | ✅ | ✅ | ✅ |
| Rain events | | | ✅ | ✅ |
| Trivia | | | ✅ | ✅ |
| Leaderboard | | | ✅ | ✅ |
| Tipping | | | | ✅ |

## Support

- Documentation: https://docs.casinochat.com
- API Status: https://status.casinochat.com
- Email: support@casinochat.com
