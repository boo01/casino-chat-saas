# Casino Chat SaaS - System Architecture

## Overview

Casino Chat is a multi-tenant, real-time chat platform designed for online casinos. It provides players with a unified chat experience across all casino games while allowing casino operators to customize, moderate, and monetize the chat experience.

## Architecture Principles

- **Multi-tenancy**: Complete data isolation via `tenant_id` columns on all tables
- **Real-time**: WebSocket-based chat with Socket.io for low-latency communication
- **Scalability**: Stateless backend, Redis-backed session management
- **Persistence**: PostgreSQL for all operational and historical data
- **Flexibility**: Feature flags and tiered feature system for customization

## High-Level Components

```
┌─────────────────┐
│   Client Apps   │
│  (Web, Mobile)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Load Balancer / Reverse Proxy   │
│         (Traefik / Nginx)           │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ API  │  │  WS  │  (Node.js Servers - Stateless)
│Server│  │Server│
└──┬───┘  └──┬───┘
   │         │
   └────┬────┘
        ▼
   ┌─────────────────────────────────┐
   │   PostgreSQL 16 Primary DB      │
   │ (All operational & persistence) │
   └─────────────────────────────────┘
        │
        └─────────────────────────────┐
                                      ▼
                          ┌──────────────────────┐
                          │  Redis 7.x Cluster  │
                          │ (Pub/Sub + Cache)   │
                          └──────────────────────┘
```

## Multi-Tenancy Model

All tables include a `tenant_id` column that establishes complete data isolation:

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  -- additional columns
  UNIQUE(tenant_id, name)
);
```

Every API request validates the tenant context through:
1. **Casino Integration**: HMAC signature includes `casino_id` (maps to `tenant_id`)
2. **Admin API**: JWT includes `tenant_id` claim
3. **WebSocket**: Authentication handshake includes `tenant_id`

## WebSocket Architecture

### Lazy Connection Model

WebSocket connections are established **only when needed**:

1. **Connection Trigger**: User opens chat UI in game
2. **Handshake**: Client sends JWT + tenant_id
3. **Namespace Join**: Client joins `/tenants/{tenant_id}` namespace
4. **Buffering**: While disconnected, messages stored in Redis with TTL
5. **Reconnection**: Client receives buffered messages on reconnect

### Socket.io Namespaces

```
/tenants/{tenant_id}
  ├─ /channels/{channel_id}
  │   └─ Room: channel:{channel_id}
  ├─ /players/{player_id}
  │   └─ Room: player:{player_id} (for DMs, PM-only chat)
  └─ /rain
      └─ Room: rain:{tenant_id} (broadcast to all in tenant)
```

### Event Types

**Client → Server**:
- `chat:message` - Send message to channel
- `chat:typing` - User typing indicator
- `chat:read` - Mark messages as read
- `channel:join` - Join a channel
- `channel:leave` - Leave a channel
- `player:report` - Report a player/message

**Server → Client**:
- `chat:message:new` - New message arrived
- `chat:message:updated` - Message edited/deleted
- `chat:typing:active` - User typing
- `chat:user:joined` - Player joined channel
- `chat:user:left` - Player left channel
- `system:notification` - System events (rain, promotions, level-up)
- `player:blocked` - Player has been blocked by moderator
- `rain:event:active` - Rain event started
- `moderation:action` - Moderation action applied

## Message Processing Pipeline

```
1. Client sends message via WebSocket
   ↓
2. Server validates:
   - Player authentication
   - Tenant authorization
   - Channel permissions
   - Banned words / content
   ↓
3. Create message record in PostgreSQL
   - Store: id, tenant_id, channel_id, player_id, content, created_at
   - Generate unique message_id for idempotency
   ↓
4. Publish to Redis channel:
   - Key: messages:{tenant_id}:{channel_id}
   - Pattern: {message_object} as JSON
   ↓
5. WebSocket subscribers receive message
   - Via Socket.io pub/sub for all connected clients
   - Message cached in Redis for latecomers
   ↓
6. Moderation:
   - Background worker monitors Redis channel
   - Applies automod rules, word filters
   - Updates moderation_logs on violations
```

## Redis Data Structures

### Pub/Sub Channels
```
messages:{tenant_id}:{channel_id}
  - Subscribe: All clients in channel
  - Publish: New message events
  - Pattern: chat message objects

notifications:{tenant_id}
  - Subscribe: All clients in tenant
  - Publish: System events (rain, promo, level-up)

rain:{tenant_id}
  - Subscribe: Clients subscribed to rain events
  - Publish: Rain claim status updates
```

### Caches (with TTL)
```
player:{tenant_id}:{player_id}
  - Player profile data (name, level, badges, etc.)
  - TTL: 1 hour
  - Invalidated on player update

message:buffer:{tenant_id}:{channel_id}
  - List of recent messages (last 100)
  - TTL: 24 hours
  - Used for new/reconnecting clients

channel:{tenant_id}:{channel_id}:users
  - Set of active player_ids in channel
  - TTL: 30 seconds (heartbeat-based)
  - Used to track who's in channel

leaderboard:{tenant_id}:{period}
  - Sorted set of top players by points
  - TTL: Depends on period (hourly/daily/all-time)

rain:claims:{rain_event_id}
  - Set of player_ids who claimed
  - TTL: Until rain event expires
```

### Counters
```
messages:created:{tenant_id}:{date}
  - Atomic counter for daily message volume

players:active:{tenant_id}:{date}
  - HyperLogLog for unique active players
```

## PostgreSQL Schema Organization

### Core Tables (Data Isolation)
- `tenants` - Tenant metadata, subscription tier, settings
- `tenant_admins` - Admin users per tenant
- `tenant_features` - Feature flags and tier configuration per tenant

### Chat Tables
- `channels` - Channels within a tenant
- `messages` - Immutable message records
- `message_edits` - Edit history for transparency

### Player Management
- `players` - Player profiles (read from casino API, cached)
- `player_blocks` - Block relationships
- `player_levels` - Player progression data
- `player_stats` - Points, lifetime stats

### Moderation
- `banned_words` - Word filter list per tenant
- `moderation_logs` - Audit trail of moderation actions
- `player_reports` - Player-submitted reports
- `admin_actions` - Manual moderation actions by admins

### Features & Engagement
- `rain_events` - Rain event definitions
- `rain_claims` - Player participation in rain
- `promo_cards` - Promotional content
- `trivia_questions` - Trivia game questions
- `trivia_answers` - Player trivia responses
- `tip_transactions` - Tip/gift transactions between players

### Analytics
- `message_metrics` - Hourly message counts per channel
- `user_engagement` - Player activity summaries
- `feature_usage` - Feature adoption metrics

## Casino Integration

### HMAC-Signed Endpoints

Casino operators call endpoints like `POST /api/v1/events/win` with:

```
POST /api/v1/events/win
Content-Type: application/json
X-Casino-ID: acme-casino
X-Timestamp: 2026-04-07T10:30:00Z
X-Signature: hmac_sha256({payload}, secret)

{
  "player_id": "player123",
  "casino_id": "acme-casino",
  "amount": 1500,
  "game_id": "slots-game-1"
}
```

Signature calculation:
```
payload = JSON.stringify({player_id, casino_id, amount, game_id})
signature = HMAC-SHA256(payload, api_secret)
```

### Player State Sync

Casino calls `/api/v1/players/{id}/update` to sync:
- Username changes
- New levels/badges
- Multiplier status
- Premium subscription status

## Authentication Models

### Casino API (Server-to-Server)
- **Method**: HMAC-SHA256 signatures
- **Secret**: Stored in database, rotated periodically
- **Headers**: X-Casino-ID, X-Timestamp, X-Signature
- **Idempotency**: Idempotency-Key header for retries

### Player Authentication (Client)
- **JWT Token**: Issued by backend after casino validates player
- **Payload**:
  ```json
  {
    "sub": "player123",
    "tenant_id": "tenant-uuid",
    "casino_id": "acme-casino",
    "iat": 1712483400,
    "exp": 1712486400,
    "permissions": ["chat:write", "chat:read"]
  }
  ```
- **Validation**: Signature verified on WebSocket handshake

### Admin Authentication (Tenant Staff)
- **Method**: Email + password (salted bcrypt)
- **Session**: Secure HTTP-only cookie with CSRF token
- **MFA**: Optional TOTP for sensitive operations

## Guest Read-Only Mode

For unregistered visitors, the system provides:

```
1. Guest token issued without authentication
   - 1 hour TTL
   - Limited to tenant public channels

2. Guest can:
   - Read all public messages
   - See other players' activity
   - Receive rain/promo notifications
   - NOT send messages
   - NOT see private content

3. Auto-escalation:
   - When player logs in via casino, guest session replaced
   - Messages queued during guest session transferred to account
```

## Performance Optimizations

### Connection Pooling
- PgBouncer for PostgreSQL connection pooling
- Redis connection pool per Node.js worker

### Caching Strategy
- Redis for hot data (players, leaderboards, recent messages)
- Database query result caching (5-minute TTL)
- Client-side caching for channel metadata

### Message Buffering
- Messages stored in Redis list with 24-hour TTL
- Prevents N+1 queries on client reconnect
- Automatic cleanup of expired messages

### Database Indexes
```sql
-- Critical for tenant isolation
CREATE INDEX idx_channels_tenant_id ON channels(tenant_id);
CREATE INDEX idx_messages_tenant_id_channel ON messages(tenant_id, channel_id);
CREATE INDEX idx_players_tenant_id ON players(tenant_id);

-- Performance indexes
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_player_id ON messages(player_id);
CREATE INDEX idx_moderation_logs_tenant_id ON moderation_logs(tenant_id, created_at DESC);
CREATE INDEX idx_rain_claims_event_id ON rain_claims(rain_event_id);
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless API servers**: Add replicas without session affinity
- **WebSocket servers**: Load balance by tenant namespace
- **Database**: Read replicas for analytics, primary for writes
- **Redis**: Cluster mode for sharding by tenant_id

### Rate Limiting
- Per-player: 10 messages/minute
- Per-channel: 1000 messages/minute
- Per-tenant: Tier-dependent limits
- Enforced via Redis counters with sliding window

### Message Retention
- Recent messages (90 days): Full resolution in PostgreSQL
- Older messages: Archived to cold storage or deleted per policy
- Analytics data: Aggregated and deleted after 1 year

## Monitoring & Observability

### Metrics
- Message throughput per tenant
- WebSocket connection count per server
- Redis memory usage by tenant
- Database query performance (p50, p95, p99)
- Moderation action frequency

### Logging
- Structured JSON logging to ELK stack
- Audit trail for all moderation actions
- API request/response logging with sensitive field masking

### Alerting
- CPU/Memory alerts on API and WS servers
- Database query latency thresholds
- Redis eviction policy violations
- Message processing latency p95 > 100ms
