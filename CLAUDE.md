# Casino Chat SaaS - Project Guide

## Agent System

When the user describes a task, automatically determine which part of the codebase is affected and spawn the appropriate specialist agent(s) using the Agent tool. Do NOT ask the user which agent to use — decide yourself.

**Routing rules:**
- **Backend agent** — NestJS code, API endpoints, services, guards, Prisma schema, database, Redis, WebSocket gateway, tests. Working dir: `packages/backend/`
- **Admin agent** — React admin panel, pages, components, routing, Tailwind styles, Vite config. Working dir: `packages/admin/`
- **Widget agent** — Preact chat widget, SDK, embeddable bundle, socket client. Working dir: `packages/widget/`
- **DevOps agent** — Docker, docker-compose, CI/CD, deployment, env config. Working dir: project root.

**How to delegate:**
1. Read the user's request and identify affected packages
2. If it touches ONE package → spawn one specialist agent
3. If it touches MULTIPLE packages → spawn agents in parallel, each scoped to its package
4. If it's cross-cutting (e.g. "add a new feature end-to-end") → break into sub-tasks, spawn agents in parallel where possible, coordinate results
5. After agents complete, verify the work compiles and summarize what was done

**Dependency ordering — when parallel is NOT safe:**
- If the task adds/changes **shared types** → finish shared first, then spawn backend + widget + admin
- If the task adds a **new API endpoint** that frontend consumes → finish backend first (define the API shape), then spawn widget/admin with the exact endpoint + payload spec
- If the task changes **Prisma schema** → finish backend (migrate + generate) before any agent that imports Prisma types
- Rule of thumb: if agent B needs to know something agent A produces (types, endpoint shape, DB schema), run A first and pass the result to B's prompt

**When spawning agents, always include in the prompt:**
- What to do (the specific task scoped to that package)
- Why (context from the user's request)
- Any constraints or dependencies on other agents' work
- "Read the CLAUDE.md in your working directory for conventions"

**Cross-cutting change rule:**
When a change affects shared contracts (API endpoints, WebSocket events, DB schema, shared types, auth flow, DTO shapes), EVERY agent whose package could be impacted MUST be informed — even if their package isn't being modified right now. Include in their prompt:
- What changed (exact field/endpoint/type name)
- How it affects their package (e.g., "the login response now includes `isSuperAdmin`, admin panel should check this")
- Whether they need to act on it now or just be aware
This prevents agents from building on stale assumptions. Examples:
- Backend changes a DTO → admin + widget agents must know the new response shape
- Shared types add a field → backend + admin + widget agents must know
- Auth flow changes → every agent that touches auth must be informed

**Do NOT delegate when:**
- The task is a simple question or explanation
- It's a one-file edit you can do directly
- The user is asking for advice, not implementation

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
│   └── casino-chat-simulator-main/  # ⚠️ NOT part of this project (see note below)
├── docker-compose.yml           # PostgreSQL + Redis + App
├── docker-compose.prod.yml      # Production overrides
├── pnpm-workspace.yaml          # pnpm workspace config
├── dev.sh                       # Dev environment manager script
├── .env.example
└── package.json                 # Monorepo root
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

### Current Status — ALL PHASES COMPLETE

| Component | Status | Details |
|-----------|--------|---------|
| Backend (NestJS) | DONE | 38 API endpoints, 16 modules, Fastify + Prisma + Redis |
| Prisma Schema | DONE | 16 models (incl. SuperAdmin), 14 enums |
| Super Admin + Permissions | DONE | SuperAdmin model, PermissionGuard, 10 granular permissions |
| Seeder | DONE | 2 super admins, 2 tenants (MONETIZE + BASIC), 25 players, 50 messages |
| Widget SDK (Preact) | DONE | ~21KB gzipped UMD, dark theme, guest/auth modes |
| Admin Panel (React) | DONE | React 18 + Vite + Tailwind, dark theme, 6 pages |
| Integration SDK | DONE | CasinoChatSDK class + INTEGRATION.md guide |
| Tests | DONE | 48 unit tests passing across 5 suites |
| Health Checks | DONE | /health + /health/ready (DB + Redis) |
| Docker Prod | DONE | docker-compose.prod.yml with Redis auth |

### Phase Completion
1. [x] Boot & Verify Backend
2. [x] Super Admin & Permissions System
3. [x] Complete Seeder
4. [x] Backend API Completion (38 endpoints)
5. [x] WebSocket Gateway Completion
6. [x] Widget SDK — Preact Embeddable Chat
7. [x] Admin Panel — React Dashboard
8. [x] Casino Integration SDK & Docs
9. [x] Testing (48 unit tests)
10. [x] DevOps & Production Readiness

### Design Reference — Casino Chat Simulator

**`packages/casino-chat-simulator-main/` is NOT part of this project.** It is a standalone React prototype built by a coworker that demonstrates the target UI/UX. Do NOT modify it, do NOT add it to workspaces, do NOT import from it.

**How to use it:** The widget (`packages/widget/`) should visually and functionally match 80-90% of the simulator. Use it as a design spec and feature reference:
- 18 tiered features: text chat, channels, win cards, reactions, emoji/GIF, player profiles, levels/badges, rain events, promo cards, leaderboard, trivia, tipping, premium styles, streamer mode
- Dark gaming theme: page=#080C14, chat=#0d121d, card=#111827, input=#1F2937
- Tier colors: basic=#22C55E, social=#3B82F6, engage=#F59E0B, monetize=#EF4444
- Font: system stack, 13px base
- Key components to reference: `ChatMessage.tsx` (message styling), `WinCard.tsx`, `RainEvent.tsx`, `TriviaCard.tsx`, `PromoCard.tsx`, `ReactionBar.tsx`, `PlayerCard.tsx`, `TipModal.tsx`, `EmojiPicker.tsx`, `LeaderboardWidget.tsx`
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

## Package Manager: pnpm

This project uses **pnpm** (not npm/yarn). Workspaces defined in `pnpm-workspace.yaml`.

## Commands

```bash
# Development (recommended — use dev.sh)
./dev.sh start           # Start everything (Docker + Backend + Admin + Widget)
./dev.sh stop            # Stop everything
./dev.sh restart         # Restart all
./dev.sh status          # Check what's running
./dev.sh logs            # Tail all service logs
./dev.sh seed            # Re-seed database

./dev.sh backend         # Restart backend only
./dev.sh admin           # Restart admin only
./dev.sh widget          # Restart widget only
./dev.sh db              # Restart Docker (PostgreSQL + Redis) only

# pnpm commands
pnpm install             # Install all dependencies
pnpm -r run build        # Build all packages
pnpm -r run test         # Run all tests
pnpm --filter casino-chat-saas-backend run prisma:seed    # Seed database
pnpm --filter casino-chat-saas-backend run prisma:studio  # Open Prisma Studio

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
