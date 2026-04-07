# Casino Chat SaaS — Full Implementation Plan

> 100% functional project: Backend, Admin Panel, Widget SDK, Seeder, Tests
> Each phase has clear DONE criteria. Execute phases in order.
> After each phase — build, test, commit.

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (NestJS) | ~60% | 52 files, 8 modules, compiles but untested against real DB |
| Prisma Schema | Done | 15 models, 12 enums, needs migration |
| Shared Types | Done | Types, constants, utils packages |
| Docker Compose | Done | Postgres 16 + Redis 7 |
| Widget SDK (Preact) | 0% | Empty directory |
| Admin Panel (React) | 0% | Empty directory |
| Seed Data | Basic | Has 1 tenant, 5 players. No super_admin |
| Tests | 0% | Only empty e2e stub |
| Docs | Done | API.md, ARCHITECTURE.md, DATABASE.md, DEPLOYMENT.md |

---

## PHASE 1: Backend — Boot & Verify (Day 1)

Goal: Backend starts, connects to Postgres+Redis, all endpoints respond.

### 1.1 Infrastructure Up

```bash
cd casino-chat-saas
docker compose up -d
docker compose ps  # both healthy
```

### 1.2 Install & Generate

```bash
cd packages/backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

**DONE when:** `npx prisma generate` exits 0, `node_modules/.prisma/client` exists.

### 1.3 Run Migration

```bash
npx prisma migrate dev --name init
```

**DONE when:** All 15 tables visible in `npx prisma studio` (http://localhost:5555).

### 1.4 Build & Start

```bash
npm run build    # fix any TS errors
npm run start:dev
```

**DONE when:**
- Console shows "Casino Chat SaaS Backend running on port 3000"
- Console shows "Redis client connected"
- http://localhost:3000/api/docs loads Swagger UI
- No crash / no unhandled errors

### 1.5 Fix All Build Errors

Known issues to watch for:
- `src/` path imports — NestJS uses `src/` prefix in tsconfig paths, verify it resolves
- DTO `!` assertions — class-validator properties need definite assignment
- Prisma type imports — `MessageType`, `MessageSource` etc come from `@prisma/client`
- `@nestjs/bull` — config uses `redis: { host, port }`, not `url`

**DONE when:** `npm run build` exits with 0 errors. App starts clean.

---

## PHASE 2: Super Admin & Permissions System (Day 1-2)

Goal: Platform-level super admin who manages tenants. Tenant-level admins who manage their casino's chat.

### 2.1 Add SuperAdmin Model to Prisma Schema

```prisma
// Platform-level admin (manages all tenants)
model SuperAdmin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         SuperAdminRole @default(ADMIN)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@index([email])
}

enum SuperAdminRole {
  SUPER    // full platform access
  ADMIN    // can manage tenants, view analytics
  SUPPORT  // read-only, can view tenant issues
}
```

### 2.2 Add Permission System to TenantAdmin

```prisma
// Update TenantAdmin — replace Json permissions with enum-based
enum TenantPermission {
  MANAGE_CHANNELS
  MANAGE_PLAYERS
  MANAGE_MODERATION
  MANAGE_BANNED_WORDS
  VIEW_ANALYTICS
  MANAGE_PROMO
  MANAGE_RAIN
  MANAGE_TRIVIA
  MANAGE_SETTINGS
  MANAGE_ADMINS
}
```

Store as `String[]` field on TenantAdmin (array of enum values). OWNER gets all permissions.

### 2.3 Create SuperAdmin Module

```
packages/backend/src/modules/super-admin/
├── super-admin.module.ts
├── super-admin.controller.ts    # CRUD for super admins
├── super-admin.service.ts
├── super-admin-auth.controller.ts  # Login, separate from tenant auth
├── dto/
│   ├── create-super-admin.dto.ts
│   ├── update-super-admin.dto.ts
│   └── super-admin-login.dto.ts
└── guards/
    └── super-admin.guard.ts     # Checks JWT has superAdmin: true
```

Endpoints:
- `POST /api/super-admin/auth/login` — Super admin login
- `GET /api/super-admin/tenants` — List all tenants with stats
- `POST /api/super-admin/tenants` — Create tenant
- `PATCH /api/super-admin/tenants/:id` — Update tenant (tier, status, etc.)
- `DELETE /api/super-admin/tenants/:id` — Disable tenant
- `GET /api/super-admin/tenants/:id/stats` — Tenant metrics
- `GET /api/super-admin/dashboard` — Platform-wide stats

### 2.4 Update TenantAdmin Controller with Permission Checks

Add a `@RequirePermission(TenantPermission.MANAGE_CHANNELS)` decorator that:
1. Reads JWT to get admin ID and tenant ID
2. Loads TenantAdmin from DB (or Redis cache)
3. Checks if their permissions array includes the required permission
4. OWNER role bypasses all checks

### 2.5 Migrate & Test

```bash
npx prisma migrate dev --name add-super-admin-and-permissions
npm run build
npm run start:dev
# Test: POST /api/super-admin/auth/login with seeded credentials
```

**DONE when:**
- Super admin can login, get JWT, list tenants
- Tenant admin permissions are enforced on all module endpoints
- OWNER can do everything, MODERATOR can only moderate

---

## PHASE 3: Complete Seeder (Day 2)

Goal: One command creates full test environment with realistic data.

### 3.1 Rewrite `prisma/seed.ts`

The seed must create:

**Platform Level:**
- 1 Super Admin: `super@casinochat.com` / `SuperAdmin123!` (SUPER role)
- 1 Platform Admin: `admin@casinochat.com` / `Admin123!` (ADMIN role)

**Test Casino 1 — "Lucky Star Casino" (MONETIZE tier, all features):**
- Tenant with API key + secret (print to console after seed)
- Domain: `luckystar.test`
- Webhook URL: `http://localhost:4000/webhooks` (mock)
- 3 Admins:
  - owner@luckystar.test / Owner123! (OWNER)
  - mod@luckystar.test / Mod123! (MODERATOR)
  - support@luckystar.test / Support123! (ADMIN, limited permissions)
- 5 Channels: English 🇬🇧, Russian 🇷🇺, Turkish 🇹🇷, VIP Lounge 👑 (min_level: 10), High Rollers 💰 (wager-gated)
- 20 Players with varied levels, VIP statuses, premium styles:
  - CryptoKing (Lv 42, DIAMOND, premium gradient)
  - SlotQueen (Lv 28, GOLD)
  - PokerFace (Lv 15, SILVER)
  - LuckyDice (Lv 8, BRONZE)
  - ... 16 more with realistic names and stats
- 10 Banned words (mix of EXACT, WILDCARD, REGEX)
- 5 Promo cards (active promotions)
- 10 Trivia questions (gambling/casino themed)
- 50 Seed messages across channels (mix of TEXT, WIN, SYSTEM types)
- 3 Sample leaderboard entries

**Test Casino 2 — "Bet Royal" (BASIC tier, minimal features):**
- Tenant with separate API key
- Domain: `betroyal.test`
- 1 Admin (OWNER)
- 2 Channels: English, Spanish
- 5 Players

### 3.2 Create Seed Runner

```bash
# In package.json scripts:
"prisma": { "seed": "ts-node prisma/seed.ts" }

# Run:
npx prisma db seed
```

### 3.3 Seed Output

After seeding, print to console:
```
=== SEED COMPLETE ===

Super Admin Login:
  Email: super@casinochat.com
  Password: SuperAdmin123!

Lucky Star Casino (MONETIZE tier):
  API Key: ccs_xxxxxxxxxxxx
  API Secret: xxxxxxxxxxxxxxxxx (save this — shown only once)
  Admin: owner@luckystar.test / Owner123!
  Channels: 5 | Players: 20 | Messages: 50

Bet Royal (BASIC tier):
  API Key: ccs_yyyyyyyyyyyy
  API Secret: yyyyyyyyyyyyyyyyy
  Admin: owner@betroyal.test / Owner123!
  Channels: 2 | Players: 5
```

**DONE when:** `npx prisma db seed` runs clean, all data visible in Prisma Studio.

---

## PHASE 4: Backend API Completion (Day 2-3)

Goal: Every endpoint works end-to-end with real data.

### 4.1 Fix & Complete Existing Controllers

Go through each controller and verify:

**TenantController:**
- `POST /api/tenants` — Create (protected by SuperAdmin guard)
- `GET /api/tenants/:id` — Get (protected by JWT, checks tenant ownership)
- `PATCH /api/tenants/:id` — Update
- `GET /api/tenants/:id/config` — Get tenant config
- `PATCH /api/tenants/:id/config` — Update config (feature flags, branding, etc.)

**ChannelController:**
- `POST /api/tenants/:tenantId/channels` — Create
- `GET /api/tenants/:tenantId/channels` — List
- `GET /api/tenants/:tenantId/channels/:id` — Get
- `PATCH /api/tenants/:tenantId/channels/:id` — Update
- `DELETE /api/tenants/:tenantId/channels/:id` — Soft delete

**PlayerController:**
- `GET /api/tenants/:tenantId/players` — List (paginated, filterable)
- `GET /api/tenants/:tenantId/players/:id` — Get player with stats
- `PATCH /api/tenants/:tenantId/players/:id` — Update (set moderator, VIP, etc.)
- `POST /api/tenants/:tenantId/players/:id/block` — Block player
- `DELETE /api/tenants/:tenantId/players/:id/block` — Unblock

**ModerationController:**
- `POST /api/tenants/:tenantId/moderation/action` — Mute/Ban/Warn/Unban/Unmute
- `GET /api/tenants/:tenantId/moderation/logs` — Moderation history (paginated)
- `POST /api/tenants/:tenantId/moderation/banned-words` — Add banned word
- `GET /api/tenants/:tenantId/moderation/banned-words` — List
- `DELETE /api/tenants/:tenantId/moderation/banned-words/:id` — Remove
- `GET /api/tenants/:tenantId/moderation/reports` — List reports
- `PATCH /api/tenants/:tenantId/moderation/reports/:id` — Review report

**ChatController (new — REST endpoints for messages):**
- `GET /api/tenants/:tenantId/channels/:channelId/messages` — History (paginated)
- `GET /api/tenants/:tenantId/messages/search?q=` — Search
- `DELETE /api/tenants/:tenantId/messages/:id` — Delete message (admin only)
- `POST /api/tenants/:tenantId/channels/:channelId/messages` — Send message via API (for system/operator messages)

**WebhookController:**
- `POST /api/webhooks/incoming` — Casino → Chat (protected by API key guard)
  - `player.updated` — Sync player data
  - `player.win` — Push win to chat
  - `rain.triggered` — Start rain event
  - `player.deposit` — Update wagering stats
  - `player.status` — Ban/unban from casino side

**PromoController (new):**
- `POST /api/tenants/:tenantId/promos` — Create promo card
- `GET /api/tenants/:tenantId/promos` — List
- `PATCH /api/tenants/:tenantId/promos/:id` — Update
- `DELETE /api/tenants/:tenantId/promos/:id` — Deactivate

**TriviaController (new):**
- `POST /api/tenants/:tenantId/trivia` — Create question
- `GET /api/tenants/:tenantId/trivia` — List
- `PATCH /api/tenants/:tenantId/trivia/:id` — Update
- `DELETE /api/tenants/:tenantId/trivia/:id` — Deactivate

**RainController (new):**
- `POST /api/tenants/:tenantId/rain` — Trigger rain event
- `GET /api/tenants/:tenantId/rain` — List rain history
- `GET /api/tenants/:tenantId/rain/:id` — Get rain details + claims

**LeaderboardController (new):**
- `GET /api/tenants/:tenantId/leaderboard?period=daily|weekly|monthly` — Get leaderboard

**AnalyticsController (new):**
- `GET /api/tenants/:tenantId/analytics/overview` — Messages/day, active users, etc.
- `GET /api/tenants/:tenantId/analytics/messages` — Message volume over time
- `GET /api/tenants/:tenantId/analytics/players` — Player activity stats

**SelfTestController (already exists):**
- `GET /api/tenants/:tenantId/self-test` — Run integration health check

### 4.2 Add Pagination DTO

Create shared pagination:
```typescript
// packages/backend/src/common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() sortBy?: string = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### 4.3 Feature Gate Middleware

Create middleware that checks tenant tier before allowing feature-specific endpoints:
```typescript
// e.g., Rain endpoints only for ENGAGE+ tier
@UseGuards(FeatureGateGuard)
@RequireFeature(FeatureKey.RAIN_EVENTS)
```

### 4.4 Test Every Endpoint

For each controller, test with curl or Swagger:
1. Auth flow (login → get JWT)
2. CRUD operations
3. Validation errors (missing fields, wrong types)
4. Permission checks (moderator can't create channels, etc.)
5. Feature gates (BASIC tier can't access rain endpoints)

**DONE when:** All endpoints return correct data. Swagger shows all endpoints with examples.

---

## PHASE 5: WebSocket Gateway Completion (Day 3)

Goal: Real-time chat works end-to-end — connect, send, receive, disconnect.

### 5.1 Fix Gateway Authentication Flow

Current flow has gap — JWT is extracted but player isn't loaded from DB. Fix:

```typescript
async handleConnection(socket: Socket) {
  const { tenantId, token } = socket.handshake.auth;
  
  if (token) {
    // Verify JWT
    const payload = this.jwtService.verify(token);
    // Load player from DB
    const player = await this.playerService.getPlayerByExternalId(tenantId, payload.externalId);
    socket.data.player = player;
    socket.data.isGuest = false;
  } else {
    socket.data.isGuest = true;
  }
}
```

### 5.2 Add Missing WebSocket Events

```typescript
// Server → Client events:
'connection:established'    // After successful connection
'channel:joined'            // Channel history + presence
'message:received'          // New message
'message:deleted'           // Message removed by mod
'player:joined'             // User joined channel
'player:left'               // User left channel
'player:typing'             // Typing indicator
'player:presence'           // Online/offline status
'win:broadcast'             // Win card pushed to chat
'rain:started'              // Rain event begins
'rain:claimed'              // Player claimed rain
'rain:ended'                // Rain event over
'trivia:started'            // Trivia question
'trivia:answered'           // Someone answered
'trivia:ended'              // Trivia resolved
'promo:inserted'            // Promo card in feed
'system:message'            // System announcement
'moderation:action'         // Player muted/banned (to moderators)
'error'                     // Error message

// Client → Server events:
'channel:join'              // Join a channel
'channel:leave'             // Leave a channel
'chat:message'              // Send a message
'chat:typing'               // Typing indicator
'chat:reaction'             // Add reaction to message
'rain:claim'                // Claim rain drop
'trivia:answer'             // Submit trivia answer
'presence:update'           // Keep-alive ping
```

### 5.3 Implement Ban Check on Connection

```typescript
// In handleConnection, after loading player:
const isBanned = await this.moderationService.isPlayerBanned(tenantId, player.id);
if (isBanned) {
  socket.emit('error', { code: 'BANNED', message: 'You are banned from chat' });
  socket.disconnect();
  return;
}
```

### 5.4 Implement Rain Claim via WebSocket

```typescript
@SubscribeMessage('rain:claim')
async handleRainClaim(socket: Socket) {
  // Validate active rain, player eligibility, create claim
}
```

### 5.5 Test with Socket.io Client Script

Create `scripts/test-websocket.ts`:
- Connect as authenticated player
- Connect as guest (read-only)
- Join channel
- Send message → verify broadcast
- Test typing indicator
- Test rate limiting
- Test banned word rejection
- Test muted player can't send

**DONE when:** Two browser tabs can chat in real-time. Guest sees messages but can't send.

---

## PHASE 6: Widget SDK — Preact Embeddable Chat (Day 4-6)

Goal: Casino operators can embed chat with one line of JavaScript.

### 6.1 Setup Widget Package

```bash
cd packages/widget
npm init -y
npm install preact
npm install -D vite @preact/preset-vite typescript
```

### 6.2 Widget Architecture

```
packages/widget/
├── src/
│   ├── index.ts              # Entry point — CasinoChat.init()
│   ├── embed.ts              # Loader script (tiny, loads main bundle)
│   ├── App.tsx               # Main widget app
│   ├── store/
│   │   └── ChatStore.ts      # State management (preact signals or zustand)
│   ├── api/
│   │   ├── socket.ts         # Socket.io client wrapper
│   │   └── rest.ts           # REST API calls (optional)
│   ├── components/
│   │   ├── ChatWidget.tsx    # Main container (collapsed/expanded toggle)
│   │   ├── ChatHeader.tsx    # Channel selector, online count, minimize
│   │   ├── MessageList.tsx   # Virtual scroll message list
│   │   ├── ChatMessage.tsx   # Individual message (text, system)
│   │   ├── WinCard.tsx       # Win announcement card
│   │   ├── RainEvent.tsx     # Rain drop with claim button
│   │   ├── TriviaCard.tsx    # Interactive trivia
│   │   ├── PromoCard.tsx     # Promo with CTA
│   │   ├── ChatInput.tsx     # Input with emoji/gif pickers
│   │   ├── PlayerCard.tsx    # Player profile popup
│   │   ├── EmojiPicker.tsx   # Emoji picker
│   │   ├── GifPicker.tsx     # GIF picker (Tenor/GIPHY API)
│   │   ├── ReplyQuote.tsx    # Reply preview
│   │   ├── LeaderboardWidget.tsx
│   │   └── TipModal.tsx
│   ├── styles/
│   │   └── widget.css        # All CSS (injected into shadow DOM)
│   └── types/
│       └── index.ts          # Widget-specific types
├── vite.config.ts            # Library mode build config
├── tsconfig.json
└── package.json
```

### 6.3 SDK Integration API

The casino embeds like this:

```html
<!-- Option 1: Script tag -->
<script src="https://cdn.casinochat.com/sdk/v1/casino-chat.js"></script>
<script>
  CasinoChat.init({
    tenantId: 'cls_xxxxxxxxxxxx',
    containerId: 'chat-widget',          // optional — defaults to body overlay
    playerToken: '{{JWT_FROM_CASINO}}',  // null = guest mode
    theme: {
      primaryColor: '#FF6B6B',
      position: 'bottom-right',          // bottom-right | bottom-left | custom
      width: 380,
      height: 600,
    },
    locale: 'en',
    defaultChannel: 'english',
  });
</script>
<div id="chat-widget"></div>

<!-- Option 2: npm package -->
import { CasinoChat } from '@casino-chat/widget';
CasinoChat.init({ ... });
```

### 6.4 Widget Features by Tier

The widget automatically enables/disables UI based on tenant tier config received on connection:
- BASIC: Text chat, channels, moderation indicators
- SOCIAL: + Win cards, reactions, GIFs, emojis, player profiles
- ENGAGE: + Levels/badges, rain, promos, leaderboard, trivia
- MONETIZE: + Tipping, premium styles, streamer mode

### 6.5 Design Implementation

Port the dark theme from the prototype (casino-chat-simulator-main):
- Background: `#080C14` (page), `#0d121d` (chat), `#111827` (cards)
- Input: `#1F2937`, hover: `#1E293B`
- Font: system font stack, 13px base
- Animations: fade-in messages, rain pulse glow, rainbow premium text
- CSS is bundled inside the widget JS (no external stylesheet)

### 6.6 Shadow DOM Isolation

The widget renders inside Shadow DOM to prevent CSS conflicts:

```typescript
class CasinoChatWidget extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    // Inject styles
    const style = document.createElement('style');
    style.textContent = WIDGET_CSS; // bundled CSS string
    shadow.appendChild(style);
    // Render Preact app into shadow root
    render(h(App, { config }), shadow);
  }
}
customElements.define('casino-chat-widget', CasinoChatWidget);
```

### 6.7 Build Config

Vite library mode output:
- `casino-chat.js` — UMD bundle (CDN)
- `casino-chat.esm.js` — ESM (npm)
- `casino-chat.css` — extracted CSS (inline option for shadow DOM)
- Target: < 50KB gzipped

### 6.8 Test

- Embed in a plain HTML page
- Connect to running backend
- Send/receive messages
- Switch channels
- Test guest mode (no token)
- Test mobile responsive (320px - 768px)
- Test theme customization

**DONE when:** Widget loads on a test page, connects to backend, real-time chat works.

---

## PHASE 7: Admin Panel — React Dashboard (Day 6-9)

Goal: Full admin dashboard for casino operators + super admin portal.

### 7.1 Setup Admin Package

```bash
cd packages/admin
npm create vite@latest . -- --template react-ts
npm install react-router-dom@6 @tanstack/react-query axios socket.io-client
npm install recharts date-fns lucide-react
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

### 7.2 Admin Panel Architecture

```
packages/admin/
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router + auth provider
│   ├── api/
│   │   ├── client.ts              # Axios instance with JWT interceptor
│   │   ├── auth.ts                # Login, logout, refresh
│   │   ├── tenants.ts             # Tenant API calls
│   │   ├── channels.ts
│   │   ├── players.ts
│   │   ├── moderation.ts
│   │   ├── analytics.ts
│   │   ├── promos.ts
│   │   ├── trivia.ts
│   │   ├── rain.ts
│   │   └── webhooks.ts
│   ├── store/
│   │   └── auth.ts                # Auth state (Zustand or context)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts        # Admin WS for live monitoring
│   │   └── usePermission.ts       # Check admin permissions
│   ├── layouts/
│   │   ├── DashboardLayout.tsx    # Sidebar + header + content
│   │   ├── AuthLayout.tsx         # Login page layout
│   │   └── Sidebar.tsx            # Navigation sidebar
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx       # Overview stats
│   │   ├── channels/
│   │   │   ├── ChannelListPage.tsx
│   │   │   └── ChannelEditPage.tsx
│   │   ├── players/
│   │   │   ├── PlayerListPage.tsx
│   │   │   └── PlayerDetailPage.tsx
│   │   ├── moderation/
│   │   │   ├── ModerationPage.tsx      # Live chat monitor
│   │   │   ├── BannedWordsPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   ├── promos/
│   │   │   ├── PromoListPage.tsx
│   │   │   └── PromoEditPage.tsx
│   │   ├── trivia/
│   │   │   ├── TriviaListPage.tsx
│   │   │   └── TriviaEditPage.tsx
│   │   ├── rain/
│   │   │   └── RainPage.tsx
│   │   ├── leaderboard/
│   │   │   └── LeaderboardPage.tsx
│   │   ├── analytics/
│   │   │   └── AnalyticsPage.tsx       # Charts + metrics
│   │   ├── settings/
│   │   │   ├── GeneralSettings.tsx     # Branding, webhook, domain
│   │   │   ├── FeatureSettings.tsx     # Feature flag toggles
│   │   │   ├── ApiSettings.tsx         # API key management
│   │   │   └── AdminSettings.tsx       # Team member management
│   │   └── super-admin/               # Super admin only
│   │       ├── TenantsPage.tsx         # All tenants overview
│   │       ├── TenantDetailPage.tsx    # Manage single tenant
│   │       └── PlatformSettingsPage.tsx
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx          # Sortable, paginated
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── charts/
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── StatCard.tsx
│   │   └── domain/
│   │       ├── ChatMonitor.tsx    # Live message stream
│   │       ├── PlayerBadge.tsx    # VIP/level display
│   │       └── TierBadge.tsx      # Tier indicator
│   └── styles/
│       └── globals.css            # Tailwind imports + custom styles
├── tailwind.config.js             # Same color palette as prototype
├── vite.config.ts
├── tsconfig.json
└── index.html
```

### 7.3 Design System (Matching Prototype)

Use the SAME dark theme from the simulator:

```javascript
// tailwind.config.js
colors: {
  page: '#080C14',
  chat: '#0d121d',
  card: '#111827',
  input: '#1F2937',
  hover: '#1E293B',
  'tier-basic': '#22C55E',
  'tier-social': '#3B82F6',
  'tier-engage': '#F59E0B',
  'tier-monetize': '#EF4444',
  border: '#374151',
  'text-primary': '#F9FAFB',
  'text-secondary': '#9CA3AF',
  'text-muted': '#6B7280',
}
```

### 7.4 Route Structure

```
/login                              # Auth
/dashboard                          # Overview stats
/channels                           # Channel management
/channels/:id                       # Edit channel
/players                            # Player list
/players/:id                        # Player detail + moderation
/moderation                         # Live chat monitor
/moderation/banned-words            # Word filter management
/moderation/reports                 # Player reports
/promos                             # Promo card management
/trivia                             # Trivia question management
/rain                               # Rain event management
/leaderboard                        # Leaderboard view
/analytics                          # Usage analytics
/settings                           # Tenant settings
/settings/features                  # Feature toggles
/settings/api                       # API credentials
/settings/team                      # Admin team management
/super-admin/tenants               # Super admin: all tenants
/super-admin/tenants/:id           # Super admin: tenant detail
/super-admin/platform              # Super admin: platform settings
```

### 7.5 Key Pages Detail

**Dashboard Page:**
- Stat cards: Online users, Messages today, Active channels, New players
- Chart: Messages per hour (last 24h)
- Chart: Active users per day (last 30d)
- Recent moderation actions
- Active rain events / upcoming trivia

**Moderation Page (Live Monitor):**
- Real-time message stream (WebSocket)
- Click message → quick actions (delete, mute user, ban user)
- Filter by channel
- Flagged messages highlighted
- Ban/mute history sidebar

**Players Page:**
- Sortable table: username, level, VIP, messages sent, last seen, status
- Filters: VIP status, level range, active/banned
- Click → detail page with full history

**Analytics Page:**
- Date range picker
- Messages: volume, peak hours, by channel
- Players: DAU, MAU, retention
- Features: most used, engagement by tier feature
- Export CSV

### 7.6 Admin Auth Flow

1. Admin navigates to admin panel URL
2. Login with email/password → gets JWT
3. JWT contains: `{ id, tenantId, role, permissions }`
4. Stored in httpOnly cookie or localStorage
5. Axios interceptor adds `Authorization: Bearer <token>`
6. Sidebar items visible based on permissions
7. API calls rejected if insufficient permissions

### 7.7 Build & Test

```bash
cd packages/admin
npm run dev  # runs on port 3001
```

**DONE when:**
- Login works for both tenant admin and super admin
- Dashboard shows real data from seeded DB
- CRUD on all entities works
- Live chat monitor shows real-time messages
- Permission-gated pages redirect unauthorized admins

---

## PHASE 8: Casino Integration SDK & Docs (Day 9-10)

Goal: Casino backend can integrate in 30 minutes.

### 8.1 SDK Package

Create integration helpers in shared package:

```typescript
// packages/shared/src/sdk/
├── CasinoChatSDK.ts       # Main SDK class
├── types.ts                 # SDK-specific types
└── webhooks.ts             # Webhook signature helpers
```

```typescript
class CasinoChatSDK {
  constructor(config: { apiKey: string; apiSecret: string; baseUrl: string });
  
  // Player management
  async createOrUpdatePlayer(externalId: string, data: PlayerData): Promise<Player>;
  async getPlayer(externalId: string): Promise<Player>;
  
  // Generate JWT for frontend widget
  generatePlayerToken(player: { externalId: string; username: string; ... }): string;
  
  // Push events
  async pushWin(data: WinEvent): Promise<void>;
  async pushRain(data: RainEvent): Promise<void>;
  async updatePlayerStatus(externalId: string, status: 'active' | 'banned'): Promise<void>;
  
  // Webhook verification
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
```

### 8.2 Integration Documentation

Create `docs/INTEGRATION.md`:
- Quick start (5 min setup)
- Full integration guide
- JWT generation examples (PHP, Node.js, Python)
- Webhook setup
- Widget embedding
- Feature configuration
- Troubleshooting

### 8.3 Example Integration (PHP/Laravel)

Create `examples/laravel-integration/`:
- Service provider
- CasinoChatService class
- Middleware for webhook verification
- Example controller with JWT generation
- README with step-by-step

**DONE when:** A developer could integrate using only the docs.

---

## PHASE 9: Testing (Day 10-11)

Goal: Core business logic is tested. Integration tests pass against real DB+Redis.

### 9.1 Unit Tests

```
packages/backend/src/modules/
├── auth/auth.service.spec.ts
├── tenant/tenant.service.spec.ts
├── channel/channel.service.spec.ts
├── player/player.service.spec.ts
├── chat/chat.service.spec.ts
├── moderation/moderation.service.spec.ts
├── webhook/webhook.service.spec.ts
└── super-admin/super-admin.service.spec.ts

packages/backend/src/common/guards/
├── api-key.guard.spec.ts
├── jwt-auth.guard.spec.ts
└── ws-auth.guard.spec.ts
```

### 9.2 E2E Tests

```
packages/backend/test/
├── auth.e2e-spec.ts           # Login flow
├── tenant.e2e-spec.ts         # Tenant CRUD
├── channel.e2e-spec.ts        # Channel CRUD
├── player.e2e-spec.ts         # Player management
├── chat.e2e-spec.ts           # Message send/receive via REST
├── moderation.e2e-spec.ts     # Ban/mute/banned words
├── webhook.e2e-spec.ts        # Incoming webhook processing
├── websocket.e2e-spec.ts      # Socket.io connect/send/receive
└── feature-gate.e2e-spec.ts   # Tier-based feature access
```

### 9.3 Widget Tests

```
packages/widget/src/__tests__/
├── connection.test.ts         # Socket connect/disconnect
├── message-send.test.ts       # Send and receive
├── guest-mode.test.ts         # Read-only guest
└── theme.test.ts              # Theme customization
```

### 9.4 Run All

```bash
# Backend unit
cd packages/backend && npm test

# Backend e2e (needs Docker)
npm run test:e2e

# Widget
cd packages/widget && npm test
```

**DONE when:** All tests green. Coverage > 70% on services.

---

## PHASE 10: DevOps & Production Readiness (Day 11-12)

### 10.1 Docker Production Setup

```yaml
# docker-compose.prod.yml
services:
  backend:
    build: ./packages/backend
    env_file: .env.production
    depends_on: [postgres, redis]
    restart: always
    
  admin:
    build: ./packages/admin
    ports: ["3001:80"]
    
  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### 10.2 Environment Config

Create `.env.production.example`:
- Strong JWT_SECRET
- Postgres with SSL
- Redis with password
- CORS restricted to actual domain
- Swagger disabled

### 10.3 Database Migrations Strategy

```bash
# Production migration
npx prisma migrate deploy  # applies pending migrations, no interactive prompts
```

### 10.4 Health Check Endpoint

Already exists at `/api/tenants/:id/self-test`. Add a simpler:
- `GET /health` — returns `{ status: 'ok', uptime, version }`
- `GET /health/ready` — checks DB + Redis connection

### 10.5 Logging

- Structured JSON logs in production
- Request ID tracking (correlation)
- Error reporting (Sentry integration ready)

### 10.6 Rate Limiting (API Level)

Add global rate limiting to protect API:
- Default: 100 req/min per IP
- Auth endpoints: 10 req/min per IP
- WebSocket: already has per-player rate limiting

**DONE when:** `docker compose -f docker-compose.prod.yml up` starts everything.

---

## Execution Order Summary

| Phase | What | Est. Time | Depends On |
|-------|------|-----------|------------|
| 1 | Boot & Verify Backend | 0.5 day | Docker running |
| 2 | Super Admin & Permissions | 1 day | Phase 1 |
| 3 | Complete Seeder | 0.5 day | Phase 2 |
| 4 | Backend API Completion | 1.5 days | Phase 3 |
| 5 | WebSocket Gateway | 1 day | Phase 4 |
| 6 | Widget SDK (Preact) | 3 days | Phase 5 |
| 7 | Admin Panel (React) | 3 days | Phase 4 |
| 8 | Casino Integration SDK | 1 day | Phase 5 |
| 9 | Testing | 1.5 days | Phase 7 |
| 10 | DevOps & Production | 1 day | Phase 9 |
| **Total** | | **~14 days** | |

Note: Phase 6 (Widget) and Phase 7 (Admin) can run in parallel once Phase 5 is done.

---

## File Naming Conventions

- Files: `kebab-case.ts` (NestJS convention)
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Database columns: `snake_case` (Prisma @map)
- API URLs: `kebab-case`
- Environment vars: `SCREAMING_SNAKE_CASE`

## Commit Strategy

After each phase:
```bash
git add -A
git commit -m "Phase N: [description]"
git push origin main
```

## Port Allocation

| Service | Port |
|---------|------|
| Backend API | 3000 |
| Admin Panel (dev) | 3001 |
| PostgreSQL | 5434 |
| Redis | 6381 |
| Prisma Studio | 5555 |
| Adminer (debug) | 8080 |
