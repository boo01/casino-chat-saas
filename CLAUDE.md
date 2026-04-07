# Casino Chat SaaS - Project Guide

## Project Overview

Casino Chat SaaS (CasinoChat Pro) is a real-time embeddable chat widget platform for online casino operators. Casino operators embed the widget on their sites via JavaScript SDK or iframe. The platform provides 18 features across 4 pricing tiers (Basic, Social, Engage, Monetize).

**Business Model:** SaaS sold to casino operators on tiered subscription.
**Target:** B2B — licensed online casino and iGaming operators.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | NestJS + Fastify adapter | TypeScript, monolith with clear module boundaries |
| Runtime | Node.js 22 LTS | |
| WebSocket | Socket.io via @nestjs/websockets | Redis adapter for horizontal scaling |
| Database | PostgreSQL 16 | Persistent data, full-text search via tsvector |
| Cache/PubSub | Redis 7 | Message buffers, pub/sub, rate limiting, presence |
| ORM | Prisma | Type-safe queries, migrations |
| Job Queue | BullMQ | Scheduled jobs (rain, trivia, analytics) |
| Frontend Widget | Preact + TypeScript | Embeddable, ~30KB gzipped, iframe isolation |
| Admin Panel | React + Vite + TailwindCSS | Operator dashboard |
| API Docs | Swagger via @nestjs/swagger | Auto-generated |
| Testing | Jest + Supertest | Unit + E2E tests |
| Bundler | Vite | Widget (library mode) + Admin SPA |

## Architecture

### Monorepo Structure (npm workspaces)

```
casino-chat-saas/
├── CLAUDE.md                    # This file
├── docs/                        # Architecture & API documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
├── packages/
│   ├── backend/                 # NestJS application
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/          # Configuration (env, validation)
│   │   │   ├── common/          # Shared guards, decorators, filters, pipes
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # JWT validation, tenant identification
│   │   │   │   ├── tenant/      # Tenant CRUD, feature flags, config
│   │   │   │   ├── chat/        # Core messaging logic
│   │   │   │   ├── channel/     # Channel CRUD, join/leave
│   │   │   │   ├── player/      # Player profiles, presence
│   │   │   │   ├── moderation/  # Banned words, mute/ban, reports
│   │   │   │   ├── webhook/     # Casino integration webhooks (in + out)
│   │   │   │   ├── rain/        # Rain event engine
│   │   │   │   ├── trivia/      # Trivia/challenge system
│   │   │   │   ├── promo/       # Promotional cards
│   │   │   │   ├── leaderboard/ # Top wagerers widget
│   │   │   │   ├── tipping/     # P2P tipping ledger
│   │   │   │   ├── premium/     # Paid chat privileges
│   │   │   │   ├── streamer/    # Streamer mode
│   │   │   │   ├── analytics/   # Engagement metrics, dashboards
│   │   │   │   └── admin/       # Platform admin (super-admin)
│   │   │   ├── gateway/         # WebSocket gateway
│   │   │   └── prisma/          # Schema + migrations
│   │   ├── test/                # E2E tests
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── widget/                  # Preact embeddable widget SDK
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── admin/                   # React admin panel
│   │   ├── src/
│   │   └── package.json
│   └── shared/                  # Shared TypeScript types & utils
│       ├── src/
│       │   ├── types/           # Shared interfaces (Message, Player, Channel, etc.)
│       │   ├── constants/       # Feature flags, tiers, event names
│       │   └── utils/           # Shared helpers
│       └── package.json
├── docker-compose.yml           # PostgreSQL + Redis + App
├── docker-compose.prod.yml      # Production overrides
├── .env.example
├── package.json                 # Monorepo root
└── turbo.json                   # Turborepo config (optional)
```

### Multi-Tenancy

- **Single deployment** serves all casino tenants
- Tenant isolation via Socket.io **namespaces** (one per casino)
- PostgreSQL uses `tenant_id` column on all tables
- Redis keys prefixed: `{tenant_id}:ch:{channel_id}:msgs`
- Feature flags per tenant stored in DB, cached in Redis (5-min TTL)

### WebSocket Connection Flow

1. Widget loads tiny loader script (~3KB) — renders chat icon only, NO WebSocket
2. Player clicks chat icon → widget establishes WS connection
3. WS handshake sends JWT (if authenticated) or connects as guest (read-only)
4. Server validates JWT signature against tenant's configured secret
5. Server checks local player_blocks table (Redis-cached)
6. Player joins default channels (Socket.io rooms)
7. Server sends initial state: last 200 messages, online count, active events

### Authentication

- Casino generates JWT signed with shared secret (configured in admin panel)
- JWT payload: { playerId, username, avatarUrl, level, vipStatus, isBlocked, tenantId, iat, exp }
- NestJS validates locally — no casino API call needed
- Real-time status changes (blocks, level-ups) pushed via casino webhook to our API
- Guest connections allowed (read-only, no JWT required)

### Message Flow

1. Client emits `chat:message` → server validates (rate limit, banned words, permissions)
2. Message assigned UUID + sequence number (Redis INCR)
3. Pushed to Redis list (LPUSH + LTRIM to 200 per channel)
4. Published via Redis pub/sub → all NestJS workers broadcast to Socket.io rooms
5. Background job batch-inserts to PostgreSQL every 60 seconds
6. Nightly cleanup job removes messages past retention period

### Casino Integration

- All casino→chat communication via REST API with HMAC signature
- Signature: `HMAC-SHA256(apiSecret, timestamp + method + path + body)`
- Headers: `X-Api-Key`, `X-Timestamp`, `X-Signature`
- Win events, rain triggers, player updates all use this pattern

## Implementation Plan

**SEE `IMPLEMENTATION_PLAN.md` for the full step-by-step guide with 10 phases.**

### Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Backend scaffold | ~60% | 52 TS files, 8 modules, compiles but needs testing against real DB |
| Prisma schema | Done | 15 models, 12 enums — needs SuperAdmin model added |
| Super Admin + Permissions | NOT STARTED | Phase 2 in plan |
| Seeder | Basic | Has 1 tenant, 5 players. Needs super_admin, 2nd test casino |
| Widget SDK (Preact) | NOT STARTED | Phase 6 in plan |
| Admin Panel (React) | NOT STARTED | Phase 7 in plan |
| Integration SDK | NOT STARTED | Phase 8 in plan |
| Tests | Minimal | Need unit + e2e tests |

### Phase Order
1. Boot & Verify Backend (fix build errors, run against real DB)
2. Super Admin & Permissions System
3. Complete Seeder (super_admin, test casino with full data)
4. Backend API Completion (all CRUD endpoints, pagination, feature gates)
5. WebSocket Gateway Completion (all events, ban checks, rain/trivia)
6. Widget SDK — Preact Embeddable Chat
7. Admin Panel — React Dashboard (same dark theme as prototype)
8. Casino Integration SDK & Docs
9. Testing (unit + e2e)
10. DevOps & Production Readiness

### Design Reference
The prototype at `casino-chat-simulator-main/` defines the UI design system:
- Dark theme: page=#080C14, chat=#0d121d, card=#111827, input=#1F2937
- Tier colors: basic=#22C55E, social=#3B82F6, engage=#F59E0B, monetize=#EF4444
- Font: system stack, 13px base
- Both widget AND admin panel use this same dark gaming aesthetic

## Key Design Decisions

1. **Monolith first** — one NestJS app, extract microservices only when needed
2. **Shared infra** — one PostgreSQL + Redis serves all tenants
3. **Lazy WS connections** — only when player opens chat, not on page load
4. **No money handling** — tips/rain create records, casino handles actual transfers
5. **Casino provides win data** — we don't generate win cards ourselves, casino pushes via API
6. **AI moderation as premium add-on** — optional, costs extra, can scan messages or be disabled
7. **Guest read-only mode** — no JWT = can see messages but can't send
8. **30-day default message retention** — configurable per tenant, PostgreSQL full-text search
9. **All admin actions available via API** — admin panel is just a React frontend for the same API

## Conventions

- **File naming:** kebab-case for files (`chat.gateway.ts`, `auth.guard.ts`)
- **Module structure:** Each NestJS module has: `module.ts`, `controller.ts`, `service.ts`, `*.dto.ts`, `*.entity.ts`
- **DTOs:** Use class-validator decorators for request validation
- **Tests:** Co-located with source (`chat.service.spec.ts` next to `chat.service.ts`)
- **E2E tests:** In `packages/backend/test/`
- **Environment:** All config via environment variables, validated at startup
- **Error handling:** Global exception filter, standardized error response format
- **Logging:** Pino logger (built into Fastify)

## Commands

```bash
# Development
npm run dev              # Start all packages in dev mode
npm run dev:backend      # Start backend only
npm run dev:widget       # Start widget dev server
npm run dev:admin        # Start admin panel dev server

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed development data
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:backend     # Run backend tests
npm run test:e2e         # Run E2E tests
npm run test:cov         # Run tests with coverage

# Build
npm run build            # Build all packages
npm run build:backend    # Build backend
npm run build:widget     # Build widget bundle

# Docker
docker-compose up -d     # Start dev environment (PostgreSQL + Redis)
docker-compose -f docker-compose.prod.yml up -d  # Production
```

## Environment Variables

See `.env.example` for all variables. Key ones:

```
DATABASE_URL=postgresql://casino_chat:dev_password_change_me@localhost:5434/casino_chat_dev
REDIS_URL=redis://localhost:6381
JWT_SECRET=fallback-secret-for-dev
PORT=3000
NODE_ENV=development
```
