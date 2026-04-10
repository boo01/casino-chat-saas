# Casino Chat SaaS - API Reference

## Overview

The API is divided into three main categories:
1. **Casino Integration API** - Server-to-server endpoints for casinos
2. **Admin API** - Management endpoints for tenant staff
3. **WebSocket Events** - Real-time messaging protocol

Base URL: `https://api.casino-chat.io/api/v1`

## Authentication

### Casino Integration API

Use HMAC-SHA256 signatures for server-to-server communication.

**Headers**:
```
X-Casino-ID: acme-casino
X-Timestamp: 2026-04-07T10:30:00Z
X-Signature: {hmac_sha256_signature}
```

**Signature Generation**:
```javascript
const crypto = require('crypto');

function generateSignature(payload, secret) {
  const message = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}
```

**Example Request**:
```bash
curl -X POST https://api.casino-chat.io/api/v1/events/win \
  -H "Content-Type: application/json" \
  -H "X-Casino-ID: acme-casino" \
  -H "X-Timestamp: 2026-04-07T10:30:00Z" \
  -H "X-Signature: abc123..." \
  -d '{
    "player_id": "player123",
    "casino_id": "acme-casino",
    "amount": 1500.00,
    "game_id": "slots-game-1"
  }'
```

### Admin API

Use JWT tokens for authenticated requests.

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**JWT Payload**:
```json
{
  "sub": "admin123",
  "tenant_id": "tenant-uuid",
  "role": "admin|moderator|analyst",
  "iat": 1712483400,
  "exp": 1712486400
}
```

### WebSocket Authentication

JWT token passed during connection handshake:

```javascript
const socket = io('https://api.casino-chat.io', {
  auth: {
    token: 'eyJhbGc...',
    tenant_id: 'tenant-uuid',
    player_id: 'player123'
  }
});
```

---

## Casino Integration API

### Events - Player Win

**POST** `/events/win`

Triggered when a player wins in a game.

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "amount": "number (cents)",
  "game_id": "string",
  "game_name": "string (optional)",
  "timestamp": "string (ISO 8601, optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message_id": "msg-uuid",
  "created_at": "2026-04-07T10:30:00Z"
}
```

**Side Effects**:
- Creates system message in global chat: "{player} won {amount}!"
- Triggers win card display in chat
- Awards points to player
- May trigger rain event if enabled
- Caches notification in Redis for 24h

### Events - Player Wager

**POST** `/events/wager`

Triggered when a player places a bet.

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "amount": "number (cents)",
  "game_id": "string",
  "multiplier": "number (optional, e.g., 2.5x)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "created_at": "2026-04-07T10:30:00Z"
}
```

**Notes**:
- Used for analytics and "wager gate" feature (chat locked until wager threshold)
- Increments daily wager counter in cache

### Events - Player Level Up

**POST** `/events/level-up`

Triggered when a player achieves a new level.

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "new_level": "number",
  "previous_level": "number (optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message_id": "msg-uuid"
}
```

**Side Effects**:
- Updates player_levels table
- Creates celebratory system message
- Awards bonus points
- May unlock new features (custom profile)

### Events - Rain Trigger

**POST** `/events/rain/trigger`

Initiated by casino or automated system to start a rain event.

**Request**:
```json
{
  "casino_id": "string",
  "event_id": "string (optional, generated if omitted)",
  "total_pool": "number (cents)",
  "duration_seconds": "number (default: 60)",
  "claim_window_seconds": "number (default: 120)",
  "min_wager_requirement": "number (cents, optional)",
  "metadata": {
    "title": "string (optional)",
    "description": "string (optional)"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "event_id": "rain-uuid",
  "total_pool": 10000,
  "duration_seconds": 60,
  "expires_at": "2026-04-07T10:31:00Z"
}
```

**Side Effects**:
- Creates rain_events record
- Publishes to Redis `rain:{tenant_id}` channel
- Broadcasts to all connected clients in tenant
- Sets TTL on rain claims tracking

### Players - Update Player

**POST** `/players/{id}/update`

Sync player data from casino system.

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "username": "string (optional)",
  "display_name": "string (optional)",
  "avatar_url": "string (optional, must be HTTPS)",
  "level": "number (optional)",
  "badges": ["string (optional)"],
  "is_premium": "boolean (optional)",
  "currency": "string (ISO 4217, optional)",
  "country": "string (ISO 3166-1 alpha-2, optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "updated_at": "2026-04-07T10:30:00Z"
}
```

**Notes**:
- Idempotent: safe to call multiple times
- Invalidates player cache in Redis
- Updates visible in next WebSocket message from player

### Players - Block Player

**POST** `/players/{id}/block`

Admin action to mute a player from chat.

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "reason": "string (optional)",
  "duration_minutes": "number (optional, default: permanent)",
  "admin_id": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "block_id": "block-uuid",
  "expires_at": "2026-04-07T11:30:00Z"
}
```

**Side Effects**:
- Creates player_blocks record
- Kicks player from all channels
- Prevents future messages
- Broadcasts moderation action via WebSocket

### Players - Grant Premium

**POST** `/players/{id}/premium`

Upgrade player to premium tier (if feature enabled).

**Request**:
```json
{
  "player_id": "string (uuid)",
  "casino_id": "string",
  "tier": "gold|platinum|vip",
  "expires_at": "string (ISO 8601, optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "tier": "gold",
  "features_unlocked": [
    "premium_emoji",
    "custom_color",
    "profile_badge",
    "priority_support"
  ]
}
```

---

## Admin API

All admin endpoints require JWT authentication with `role: admin` or `role: moderator`.

Base URL: `https://api.casino-chat.io/api/v1/admin`

### Channels

#### List Channels

**GET** `/channels`

**Query Parameters**:
```
?page=1&limit=20&sort=-created_at
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "channel-uuid",
      "name": "general",
      "description": "Main chat channel",
      "is_public": true,
      "requires_wager": false,
      "message_count": 15234,
      "active_users": 42,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85
  }
}
```

#### Create Channel

**POST** `/channels`

**Request**:
```json
{
  "name": "string",
  "description": "string (optional)",
  "is_public": "boolean (default: true)",
  "requires_wager": "boolean (default: false)",
  "min_level": "number (optional, default: 0)",
  "color": "string (hex code, optional)"
}
```

**Response** (201 Created):
```json
{
  "id": "channel-uuid",
  "name": "vip-lounge",
  "is_public": false,
  "created_at": "2026-04-07T10:30:00Z"
}
```

#### Update Channel

**PATCH** `/channels/{id}`

**Request** (same fields as create):
```json
{
  "description": "VIP players lounge"
}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

#### Delete Channel

**DELETE** `/channels/{id}`

**Response** (204 No Content)

### Moderators

#### List Moderators

**GET** `/moderators`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "admin-uuid",
      "email": "mod@example.com",
      "name": "John Moderator",
      "role": "moderator",
      "permissions": ["message:delete", "player:block"],
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Add Moderator

**POST** `/moderators`

**Request**:
```json
{
  "email": "string",
  "name": "string",
  "role": "moderator|analyst",
  "channels": ["channel-uuid (optional, empty = all)"]
}
```

**Response** (201 Created):
```json
{
  "id": "admin-uuid",
  "email": "mod@example.com",
  "role": "moderator",
  "invitation_sent": true
}
```

#### Remove Moderator

**DELETE** `/moderators/{id}`

**Response** (204 No Content)

### Banned Words

#### List Banned Words

**GET** `/banned-words`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "word-uuid",
      "pattern": "badword",
      "action": "block|replace|warn",
      "replacement": "***",
      "created_by": "admin-uuid",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Add Banned Word

**POST** `/banned-words`

**Request**:
```json
{
  "pattern": "string (regex supported)",
  "action": "block|replace|warn",
  "replacement": "string (required if action=replace)",
  "case_sensitive": "boolean (default: false)"
}
```

**Response** (201 Created):
```json
{
  "id": "word-uuid"
}
```

#### Delete Banned Word

**DELETE** `/banned-words/{id}`

**Response** (204 No Content)

### Promotions

#### List Promos

**GET** `/promos`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "promo-uuid",
      "title": "Welcome Bonus",
      "description": "Get 50% bonus on first deposit",
      "image_url": "https://...",
      "cta_url": "https://...",
      "is_active": true,
      "start_date": "2026-04-01T00:00:00Z",
      "end_date": "2026-04-30T23:59:59Z",
      "impressions": 5234,
      "clicks": 128
    }
  ]
}
```

#### Create Promo

**POST** `/promos`

**Request**:
```json
{
  "title": "string",
  "description": "string",
  "image_url": "string",
  "cta_url": "string",
  "start_date": "string (ISO 8601)",
  "end_date": "string (ISO 8601)",
  "target_level": "number (optional, 0 = all)"
}
```

**Response** (201 Created):
```json
{
  "id": "promo-uuid"
}
```

#### Update Promo

**PATCH** `/promos/{id}`

**Response** (200 OK)

#### Delete Promo

**DELETE** `/promos/{id}`

**Response** (204 No Content)

### Trivia

#### List Trivia Questions

**GET** `/trivia/questions`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "question-uuid",
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": 1,
      "difficulty": "easy|medium|hard",
      "point_value": 10,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Trivia Question

**POST** `/trivia/questions`

**Request**:
```json
{
  "question": "string",
  "options": ["string"],
  "correct_answer": "number (index)",
  "difficulty": "easy|medium|hard",
  "point_value": "number"
}
```

**Response** (201 Created):
```json
{
  "id": "question-uuid"
}
```

#### Delete Trivia Question

**DELETE** `/trivia/questions/{id}`

**Response** (204 No Content)

### Settings

#### Get Tenant Settings

**GET** `/settings`

**Response** (200 OK):
```json
{
  "language": "en",
  "timezone": "UTC",
  "currency": "USD",
  "moderation_mode": "strict|moderate|lenient",
  "auto_delete_messages_after_days": 90,
  "rate_limit_messages_per_minute": 10,
  "feature_flags": {
    "GLOBAL_CHAT": true,
    "RAIN_EVENTS": true,
    "LEADERBOARD": true
  }
}
```

#### Update Settings

**PATCH** `/settings`

**Request**:
```json
{
  "moderation_mode": "strict",
  "auto_delete_messages_after_days": 180
}
```

**Response** (200 OK)

### Analytics

#### Get Message Metrics

**GET** `/analytics/messages`

**Query Parameters**:
```
?from=2026-04-01&to=2026-04-07&granularity=day&channel_id=uuid
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "timestamp": "2026-04-07",
      "total_messages": 15234,
      "unique_players": 342,
      "avg_response_time_ms": 45,
      "by_channel": [
        {
          "channel_id": "channel-uuid",
          "channel_name": "general",
          "count": 10234
        }
      ]
    }
  ]
}
```

#### Get Player Engagement

**GET** `/analytics/players`

**Query Parameters**:
```
?from=2026-04-01&to=2026-04-07&sort=-messages
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "player_id": "player-uuid",
      "username": "HighRoller42",
      "messages_sent": 342,
      "first_message": "2026-04-01T10:30:00Z",
      "last_message": "2026-04-07T22:15:00Z",
      "total_wager": 50000
    }
  ]
}
```

#### Get Feature Usage

**GET** `/analytics/features`

**Response** (200 OK):
```json
{
  "data": {
    "RAIN_EVENTS": {
      "total_events": 24,
      "total_claimed": 342,
      "total_distributed": 125000
    },
    "LEADERBOARD": {
      "views": 1543,
      "unique_viewers": 342
    },
    "TRIVIA": {
      "games_played": 456,
      "avg_score": 72.5
    }
  }
}
```

---

## WebSocket Events

### Client → Server

#### Chat - Send Message

**Event**: `chat:message`

**Payload**:
```json
{
  "channel_id": "channel-uuid",
  "content": "string",
  "reply_to_id": "message-uuid (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "message_id": "msg-uuid"
}
```

#### Chat - Typing Indicator

**Event**: `chat:typing`

**Payload**:
```json
{
  "channel_id": "channel-uuid",
  "is_typing": true
}
```

#### Chat - Mark as Read

**Event**: `chat:read`

**Payload**:
```json
{
  "message_ids": ["msg-uuid1", "msg-uuid2"]
}
```

#### Channel - Join

**Event**: `channel:join`

**Payload**:
```json
{
  "channel_id": "channel-uuid"
}
```

**Server Response** (`channel:joined`):
```json
{
  "channel_id": "channel-uuid",
  "recent_messages": [...],
  "active_users": 42
}
```

#### Channel - Leave

**Event**: `channel:leave`

**Payload**:
```json
{
  "channel_id": "channel-uuid"
}
```

#### Player - Report

**Event**: `player:report`

**Payload**:
```json
{
  "reported_player_id": "player-uuid",
  "message_id": "msg-uuid (optional)",
  "reason": "harassment|spam|offensive|other",
  "details": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "report_id": "report-uuid"
}
```

#### Rain - Claim

**Event**: `rain:claim`

**Payload**:
```json
{
  "rain_event_id": "rain-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "amount_won": 123
}
```

### Server → Client

#### Chat - New Message

**Event**: `chat:message:new`

**Payload**:
```json
{
  "id": "msg-uuid",
  "channel_id": "channel-uuid",
  "player_id": "player-uuid",
  "username": "PlayerName",
  "avatar_url": "https://...",
  "content": "string",
  "type": "text|system|win|rain|trivia|promo|tip",
  "metadata": {},
  "created_at": "2026-04-07T10:30:00Z"
}
```

#### Chat - Message Updated

**Event**: `chat:message:updated`

**Payload**:
```json
{
  "id": "msg-uuid",
  "channel_id": "channel-uuid",
  "content": "updated content",
  "edited_at": "2026-04-07T10:35:00Z"
}
```

#### Chat - Typing

**Event**: `chat:typing:active`

**Payload**:
```json
{
  "channel_id": "channel-uuid",
  "player_id": "player-uuid",
  "username": "PlayerName"
}
```

#### Chat - User Joined

**Event**: `chat:user:joined`

**Payload**:
```json
{
  "channel_id": "channel-uuid",
  "player_id": "player-uuid",
  "username": "PlayerName",
  "active_users": 42
}
```

#### Chat - User Left

**Event**: `chat:user:left`

**Payload**:
```json
{
  "channel_id": "channel-uuid",
  "player_id": "player-uuid",
  "username": "PlayerName",
  "active_users": 41
}
```

#### System - Notification

**Event**: `system:notification`

**Payload**:
```json
{
  "type": "level_up|wager_gate|premium_feature|feature_unlocked",
  "title": "string",
  "message": "string",
  "data": {},
  "timestamp": "2026-04-07T10:30:00Z"
}
```

#### Player - Blocked

**Event**: `player:blocked`

**Payload**:
```json
{
  "reason": "string (optional)",
  "expires_at": "2026-04-07T11:30:00Z (null = permanent)"
}
```

#### Rain - Event Active

**Event**: `rain:event:active`

**Payload**:
```json
{
  "event_id": "rain-uuid",
  "total_pool": 10000,
  "duration_seconds": 60,
  "expires_at": "2026-04-07T10:31:00Z",
  "min_wager_requirement": 0
}
```

#### Rain - Claims Updated

**Event**: `rain:claims:updated`

**Payload**:
```json
{
  "event_id": "rain-uuid",
  "total_claimed": 342,
  "claim_count": 127,
  "remaining_pool": 9658
}
```

#### Moderation - Action

**Event**: `moderation:action`

**Payload**:
```json
{
  "action_id": "action-uuid",
  "type": "message_deleted|player_blocked|player_muted",
  "target_id": "message-uuid|player-uuid",
  "reason": "string (optional)",
  "timestamp": "2026-04-07T10:30:00Z"
}
```

#### Trivia - Question

**Event**: `trivia:question`

**Payload**:
```json
{
  "question_id": "question-uuid",
  "question": "What is 2+2?",
  "options": ["3", "4", "5", "6"],
  "difficulty": "easy|medium|hard",
  "point_value": 10,
  "time_limit_seconds": 30
}
```

#### Trivia - Results

**Event**: `trivia:results`

**Payload**:
```json
{
  "question_id": "question-uuid",
  "correct_answer": 1,
  "leaderboard": [
    {
      "rank": 1,
      "player_id": "player-uuid",
      "username": "TopPlayer",
      "points": 10
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|RATE_LIMIT|INTERNAL_ERROR",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
