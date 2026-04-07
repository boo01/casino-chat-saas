# Casino Chat SaaS - Database Schema

## PostgreSQL Schema

All tables use UUID primary keys and include `created_at` timestamps. Tenant isolation is enforced via `tenant_id` foreign keys on all tables.

### Core Tenant Tables

#### tenants

Represents a casino operator and their subscription.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  api_secret VARCHAR(512) NOT NULL,
  api_secret_rotated_at TIMESTAMP DEFAULT NOW(),
  subscription_tier ENUM('basic', 'social', 'engage', 'monetize') NOT NULL DEFAULT 'basic',
  subscription_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (api_secret IS NOT NULL AND LENGTH(api_secret) >= 32)
);

CREATE INDEX idx_tenants_casino_id ON tenants(casino_id);
CREATE INDEX idx_tenants_subscription_tier ON tenants(subscription_tier);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
```

#### tenant_admins

Staff members who manage a tenant.

```sql
CREATE TABLE tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role ENUM('admin', 'moderator', 'analyst') NOT NULL DEFAULT 'moderator',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_tenant_admins_tenant_id ON tenant_admins(tenant_id);
CREATE INDEX idx_tenant_admins_email ON tenant_admins(email);
```

#### tenant_features

Feature flags and tier configuration per tenant.

```sql
CREATE TABLE tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, feature_key)
);

CREATE INDEX idx_tenant_features_tenant_id ON tenant_features(tenant_id);
CREATE INDEX idx_tenant_features_feature_key ON tenant_features(feature_key);
```

---

### Chat Tables

#### channels

Channels within a tenant where players chat.

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  requires_wager BOOLEAN DEFAULT false,
  min_level INTEGER DEFAULT 0,
  color VARCHAR(7),
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, name),
  CHECK (min_level >= 0),
  CHECK (color IS NULL OR color ~ '^#[0-9A-F]{6}$')
);

CREATE INDEX idx_channels_tenant_id ON channels(tenant_id);
CREATE INDEX idx_channels_is_public ON channels(is_public);
CREATE INDEX idx_channels_created_at ON channels(created_at DESC);
```

#### messages

Immutable chat messages.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  content_type ENUM('text', 'system', 'win', 'rain', 'trivia', 'promo', 'tip') DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  deleted_reason VARCHAR(255),
  deleted_by_admin_id UUID REFERENCES tenant_admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000)
);

CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_player_id ON messages(player_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX idx_messages_tenant_channel ON messages(tenant_id, channel_id, created_at DESC);
```

#### message_edits

Edit history for transparency.

```sql
CREATE TABLE message_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by_player_id UUID REFERENCES players(id),
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_edits_message_id ON message_edits(message_id);
CREATE INDEX idx_message_edits_edited_at ON message_edits(edited_at DESC);
```

---

### Player Tables

#### players

Player profiles (synced from casino API).

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url VARCHAR(512),
  level INTEGER DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  premium_tier ENUM('gold', 'platinum', 'vip'),
  premium_expires_at TIMESTAMP,
  currency VARCHAR(3),
  country VARCHAR(2),
  is_blocked BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, username),
  CHECK (level >= 1),
  CHECK (avatar_url IS NULL OR avatar_url LIKE 'https://%')
);

CREATE INDEX idx_players_tenant_id ON players(tenant_id);
CREATE INDEX idx_players_level ON players(level DESC);
CREATE INDEX idx_players_is_premium ON players(is_premium);
CREATE INDEX idx_players_is_blocked ON players(is_blocked);
```

#### player_blocks

Block relationships between players.

```sql
CREATE TABLE player_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  blocked_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  duration_minutes INTEGER,
  expires_at TIMESTAMP,
  admin_id UUID REFERENCES tenant_admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, blocked_player_id)
);

CREATE INDEX idx_player_blocks_tenant_id ON player_blocks(tenant_id);
CREATE INDEX idx_player_blocks_blocked_player_id ON player_blocks(blocked_player_id);
CREATE INDEX idx_player_blocks_expires_at ON player_blocks(expires_at);
```

#### player_levels

Player progression tracking.

```sql
CREATE TABLE player_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  points_total BIGINT DEFAULT 0,
  level_up_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, player_id)
);

CREATE INDEX idx_player_levels_tenant_id ON player_levels(tenant_id);
CREATE INDEX idx_player_levels_player_id ON player_levels(player_id);
```

#### player_stats

Lifetime statistics per player.

```sql
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  messages_sent INTEGER DEFAULT 0,
  messages_deleted INTEGER DEFAULT 0,
  reports_filed INTEGER DEFAULT 0,
  times_reported INTEGER DEFAULT 0,
  times_blocked INTEGER DEFAULT 0,
  rain_events_won INTEGER DEFAULT 0,
  rain_total_won BIGINT DEFAULT 0,
  trivia_games_played INTEGER DEFAULT 0,
  trivia_correct_answers INTEGER DEFAULT 0,
  tips_given BIGINT DEFAULT 0,
  tips_received BIGINT DEFAULT 0,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, player_id)
);

CREATE INDEX idx_player_stats_tenant_id ON player_stats(tenant_id);
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);
```

---

### Moderation Tables

#### banned_words

Word filter list per tenant.

```sql
CREATE TABLE banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pattern VARCHAR(512) NOT NULL,
  action ENUM('block', 'replace', 'warn') DEFAULT 'block',
  replacement VARCHAR(512),
  case_sensitive BOOLEAN DEFAULT false,
  is_regex BOOLEAN DEFAULT false,
  created_by_admin_id UUID REFERENCES tenant_admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, pattern)
);

CREATE INDEX idx_banned_words_tenant_id ON banned_words(tenant_id);
```

#### moderation_logs

Audit trail of all moderation actions.

```sql
CREATE TABLE moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action_type ENUM('message_deleted', 'player_blocked', 'player_muted', 'word_filtered') NOT NULL,
  target_type ENUM('message', 'player') NOT NULL,
  target_id UUID NOT NULL,
  admin_id UUID REFERENCES tenant_admins(id),
  reason VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (reason IS NOT NULL)
);

CREATE INDEX idx_moderation_logs_tenant_id ON moderation_logs(tenant_id);
CREATE INDEX idx_moderation_logs_action_type ON moderation_logs(action_type);
CREATE INDEX idx_moderation_logs_target_type ON moderation_logs(target_type);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at DESC);
```

#### player_reports

Player-submitted reports.

```sql
CREATE TABLE player_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reported_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reporter_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason ENUM('harassment', 'spam', 'offensive', 'bot', 'other') NOT NULL,
  details TEXT,
  status ENUM('new', 'under_review', 'resolved', 'dismissed') DEFAULT 'new',
  moderator_id UUID REFERENCES tenant_admins(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_reports_tenant_id ON player_reports(tenant_id);
CREATE INDEX idx_player_reports_reported_player_id ON player_reports(reported_player_id);
CREATE INDEX idx_player_reports_status ON player_reports(status);
```

---

### Feature Engagement Tables

#### rain_events

Rain event definitions.

```sql
CREATE TABLE rain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total_pool BIGINT NOT NULL,
  remaining_pool BIGINT NOT NULL,
  duration_seconds INTEGER DEFAULT 60,
  claim_window_seconds INTEGER DEFAULT 120,
  min_wager_requirement BIGINT DEFAULT 0,
  claimed_count INTEGER DEFAULT 0,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (total_pool > 0),
  CHECK (remaining_pool >= 0),
  CHECK (duration_seconds > 0)
);

CREATE INDEX idx_rain_events_tenant_id ON rain_events(tenant_id);
CREATE INDEX idx_rain_events_status ON rain_events(status);
CREATE INDEX idx_rain_events_started_at ON rain_events(started_at DESC);
```

#### rain_claims

Player participation in rain events.

```sql
CREATE TABLE rain_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rain_event_id UUID NOT NULL REFERENCES rain_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount_won BIGINT NOT NULL,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(rain_event_id, player_id),
  CHECK (amount_won > 0)
);

CREATE INDEX idx_rain_claims_rain_event_id ON rain_claims(rain_event_id);
CREATE INDEX idx_rain_claims_player_id ON rain_claims(player_id);
```

#### promo_cards

Promotional content displayed in chat.

```sql
CREATE TABLE promo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  cta_url VARCHAR(512),
  cta_text VARCHAR(255) DEFAULT 'Learn More',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  target_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_by_admin_id UUID REFERENCES tenant_admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (end_date > start_date),
  CHECK (image_url IS NULL OR image_url LIKE 'https://%'),
  CHECK (cta_url IS NULL OR cta_url LIKE 'https://%')
);

CREATE INDEX idx_promo_cards_tenant_id ON promo_cards(tenant_id);
CREATE INDEX idx_promo_cards_is_active ON promo_cards(is_active);
CREATE INDEX idx_promo_cards_start_date ON promo_cards(start_date);
```

#### trivia_questions

Trivia game questions.

```sql
CREATE TABLE trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  point_value INTEGER DEFAULT 10,
  category VARCHAR(255),
  created_by_admin_id UUID REFERENCES tenant_admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (array_length(options, 1) >= 2 AND array_length(options, 1) <= 4),
  CHECK (correct_answer >= 0 AND correct_answer < array_length(options, 1))
);

CREATE INDEX idx_trivia_questions_tenant_id ON trivia_questions(tenant_id);
CREATE INDEX idx_trivia_questions_difficulty ON trivia_questions(difficulty);
```

#### trivia_answers

Player responses to trivia questions.

```sql
CREATE TABLE trivia_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trivia_question_id UUID NOT NULL REFERENCES trivia_questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (selected_answer >= 0)
);

CREATE INDEX idx_trivia_answers_trivia_question_id ON trivia_answers(trivia_question_id);
CREATE INDEX idx_trivia_answers_player_id ON trivia_answers(player_id);
```

#### tip_transactions

Tip/gift transactions between players.

```sql
CREATE TABLE tip_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  recipient_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  message VARCHAR(255),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (amount > 0),
  CHECK (sender_player_id != recipient_player_id)
);

CREATE INDEX idx_tip_transactions_tenant_id ON tip_transactions(tenant_id);
CREATE INDEX idx_tip_transactions_sender_player_id ON tip_transactions(sender_player_id);
CREATE INDEX idx_tip_transactions_recipient_player_id ON tip_transactions(recipient_player_id);
CREATE INDEX idx_tip_transactions_created_at ON tip_transactions(created_at DESC);
```

---

### Analytics Tables

#### message_metrics

Hourly aggregated message counts.

```sql
CREATE TABLE message_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  hour_timestamp TIMESTAMP NOT NULL,
  message_count INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  avg_response_time_ms FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, channel_id, hour_timestamp)
);

CREATE INDEX idx_message_metrics_tenant_id ON message_metrics(tenant_id);
CREATE INDEX idx_message_metrics_hour_timestamp ON message_metrics(hour_timestamp DESC);
```

#### user_engagement

Player engagement summaries.

```sql
CREATE TABLE user_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  channels_visited INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  session_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, player_id, date)
);

CREATE INDEX idx_user_engagement_tenant_id ON user_engagement(tenant_id);
CREATE INDEX idx_user_engagement_player_id ON user_engagement(player_id);
CREATE INDEX idx_user_engagement_date ON user_engagement(date DESC);
```

#### feature_usage

Feature adoption metrics.

```sql
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, feature_key, date)
);

CREATE INDEX idx_feature_usage_tenant_id ON feature_usage(tenant_id);
CREATE INDEX idx_feature_usage_feature_key ON feature_usage(feature_key);
```

---

## Redis Data Structures

All Redis keys are namespaced by tenant and environment:

```
{environment}:{tenant_id}:{structure_type}:{key}
```

### Pub/Sub Channels

```
messages:{tenant_id}:{channel_id}
  Type: Pub/Sub Channel
  Used by: WebSocket servers subscribe to broadcast messages

notifications:{tenant_id}
  Type: Pub/Sub Channel
  Used by: System events, rain, promotions

rain:{tenant_id}
  Type: Pub/Sub Channel
  Used by: Rain event updates and claims
```

### Lists (Message Buffers)

```
message:buffer:{tenant_id}:{channel_id}
  Type: List (FIFO)
  Content: Serialized message JSON
  TTL: 24 hours
  Max length: 100 items

  Example:
  LPUSH message:buffer:tenant-1:channel-1 '{"id":"msg-1","content":"hello"}'
  LRANGE message:buffer:tenant-1:channel-1 0 -1
```

### Sets (Active Users)

```
channel:{tenant_id}:{channel_id}:users
  Type: Set
  Content: Player UUIDs
  TTL: 30 seconds (renewed on activity)

  Used to track who's currently in a channel:
  SADD channel:tenant-1:channel-1:users player-uuid-1
  SMEMBERS channel:tenant-1:channel-1:users
```

### Hashes (Player Cache)

```
player:{tenant_id}:{player_id}
  Type: Hash
  Content: Player profile data
  TTL: 1 hour
  Fields: username, level, avatar_url, is_premium, badges

  HGETALL player:tenant-1:player-uuid-1
  HSET player:tenant-1:player-uuid-1 username "PlayerName" level 5
```

### Sorted Sets (Leaderboards)

```
leaderboard:{tenant_id}:{period}
  Type: Sorted Set
  Content: Player UUIDs as members, points as score
  TTL: Depends on period
    - hourly: 2 hours
    - daily: 7 days
    - all-time: None (persistent)

  ZADD leaderboard:tenant-1:daily player1-points player-uuid-1
  ZREVRANGE leaderboard:tenant-1:daily 0 99 WITHSCORES
```

### HyperLogLog (Unique Players)

```
players:active:{tenant_id}:{date}
  Type: HyperLogLog
  Content: Player UUIDs
  TTL: 90 days
  Used for: Unique active player counts without storing full set

  PFADD players:active:tenant-1:2026-04-07 player-uuid-1 player-uuid-2
  PFCOUNT players:active:tenant-1:2026-04-07
```

### Counters

```
messages:created:{tenant_id}:{date}
  Type: String (atomic counter)
  TTL: 7 days

  INCR messages:created:tenant-1:2026-04-07
  GET messages:created:tenant-1:2026-04-07

rain:claims:{rain_event_id}
  Type: Set
  Content: Player UUIDs who have claimed
  TTL: Until rain event expires
```

### Distributed Locks

```
lock:{tenant_id}:{resource_type}:{resource_id}
  Type: String
  TTL: 30 seconds (auto-expire to prevent deadlocks)

  Used for: Preventing race conditions on rain claims, message creation
```

---

## Database Performance & Constraints

### Indexes Strategy

**Primary Isolation Indexes**:
- `idx_*_tenant_id` - Every table has index on tenant_id for rapid isolation

**Query Pattern Indexes**:
- Messages: `(tenant_id, channel_id, created_at DESC)` for pagination
- Players: `(tenant_id, username)` for lookups
- Blocks: `(tenant_id, blocked_player_id)` for fast block checks

**Temporal Indexes**:
- `created_at`, `updated_at`, `started_at` - For time-range queries in analytics

### Connection Pooling

**PgBouncer Configuration**:
```
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 5
```

### Query Optimization

**Avoid N+1**:
- Batch player lookups with `IN (...)` clauses
- Use Redis cache for frequently accessed player data

**Message Pagination**:
```sql
SELECT * FROM messages
WHERE tenant_id = $1 AND channel_id = $2
ORDER BY created_at DESC
LIMIT 50
OFFSET (page - 1) * 50;
```

**Message Deletion Strategy**:
- Soft delete with `is_deleted` flag
- Hard deletion only in batch archival jobs

---

## Constraints & Validation

### Data Integrity

```sql
-- Enforce tenant isolation on all operations
ALTER TABLE messages
ADD CONSTRAINT fk_messages_channel_same_tenant
CHECK (EXISTS (
  SELECT 1 FROM channels
  WHERE channels.id = messages.channel_id
  AND channels.tenant_id = messages.tenant_id
));
```

### Referential Integrity

- `ON DELETE CASCADE` for child records when tenant deleted
- `ON DELETE SET NULL` for optional references (e.g., deleted messages)
- Foreign key constraints prevent orphaned records

### Column Constraints

- `NOT NULL` on required fields
- `CHECK` constraints for business logic (e.g., positive amounts, valid colors)
- `UNIQUE` constraints for uniqueness within tenant scope
- `ENUM` types for controlled vocabularies

---

## Backups & Recovery

### Backup Strategy

```
Daily full backup: midnight UTC (replicated to S3)
Hourly incremental WAL backups
WAL archive: 7 days retention

Recovery Time Objective (RTO): 15 minutes
Recovery Point Objective (RPO): 1 hour
```

### Archival Policy

```
Recent (0-90 days): Full resolution in PostgreSQL
Warm (90-365 days): Aggregated metrics, deleted raw messages
Cold (>365 days): S3 archived, accessible but slow query
```
