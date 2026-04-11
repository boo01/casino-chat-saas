# CasinoChat Pro

Real-time embeddable chat widget platform for online casino operators. B2B SaaS — casino operators embed the widget on their sites via JavaScript SDK.

## Prerequisites

- **Node.js 22** LTS
- **pnpm** (`npm install -g pnpm`)
- **Docker** (for PostgreSQL + Redis)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd casino-chat-saas
pnpm install

# 2. Start PostgreSQL + Redis
docker compose up -d

# 3. Setup database
cd packages/backend
cp .env.example .env      # Only needed first time — defaults work out of the box
npx prisma db push
npx prisma db seed
cd ../..

# 4. Start everything
./dev.sh start
```

That's it. All 3 services start and logs stream to your terminal. Press `Ctrl+C` to detach (services keep running).

### Using Claude Code

If you're working with Claude Code, just say:

> "Start the dev environment"

Claude will run `./dev.sh start` which handles Docker, backend, admin panel, and widget automatically. The `CLAUDE.md` file at the project root contains all the context Claude needs — architecture, conventions, commands, module structure.

For working on specific packages:

> "Fix the rain event countdown in the widget"

> "Add a new API endpoint for player stats"

Claude reads `CLAUDE.md` files in each package directory for package-specific conventions.

## URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3000 | NestJS REST API + WebSocket gateway |
| Swagger Docs | http://localhost:3000/api/docs | Interactive API documentation |
| Admin Panel | http://localhost:3001 | Operator dashboard (React) |
| Widget Dev | http://localhost:3002 | Live chat widget test page |
| Health Check | http://localhost:3000/health | Service health status |

### Widget Dev Page (localhost:3002)

The widget dev page at **http://localhost:3002** is a test harness for the embeddable chat widget. It shows a login screen where you can:

- **Select a tenant** (Lucky Star Casino or Bet Royal) from a dropdown
- **Connect as guest** to see the chat in read-only mode

The widget loads in fullscreen mode, connected to your local backend via WebSocket. Use it to test:
- Real-time messaging
- Rain events, trivia, promos appearing in chat
- Guest restrictions (can't send, can't like, can't tip)
- Card rendering (win, rain, trivia, promo, tip)

To test as an **authenticated player**, generate a player token via the dev endpoint:

```bash
curl -X POST http://localhost:3000/api/self-test/player-token \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "TENANT_ID", "externalId": "player-1", "username": "TestPlayer"}'
```

Then pass the token in the widget config.

To test **admin messages appearing in widget**, open the Admin Panel (localhost:3001), go to Live Chat, and send a message — it appears instantly in the widget via WebSocket.

## Dev Commands

```bash
# All-in-one (recommended)
./dev.sh start           # Start everything (Docker + Backend + Admin + Widget)
./dev.sh stop            # Stop everything
./dev.sh restart         # Restart all
./dev.sh status          # Check what's running
./dev.sh logs            # Tail all service logs
./dev.sh seed            # Re-seed database

# Individual services
./dev.sh backend         # Restart backend only
./dev.sh admin           # Restart admin only
./dev.sh widget          # Restart widget only
./dev.sh db              # Restart Docker (PostgreSQL + Redis) only

# Manual pnpm commands
pnpm install                         # Install all dependencies
pnpm -r run build                    # Build all packages
pnpm -r run test                     # Run all tests
pnpm --filter casino-chat-saas-backend run prisma:studio  # Open Prisma Studio
```

## Test Logins

### Super Admins (platform-level)

| Email | Password |
|-------|----------|
| super@casinochat.com | SuperAdmin123! |
| admin@casinochat.com | Admin123! |

### Tenant Admins — Lucky Star Casino (tier: MONETIZE)

| Email | Password | Role |
|-------|----------|------|
| owner@luckystar.test | Owner123! | OWNER |
| mod@luckystar.test | Mod123! | MODERATOR |
| support@luckystar.test | Support123! | ADMIN |

### Tenant Admin — Bet Royal Casino (tier: BASIC)

| Email | Password | Role |
|-------|----------|------|
| owner@betroyal.test | Owner123! | OWNER |

## Architecture

```
casino-chat-saas/
├── packages/
│   ├── backend/       # NestJS + Fastify + Prisma + Socket.io
│   ├── admin/         # React + Vite + TailwindCSS (operator dashboard)
│   └── widget/        # Preact embeddable chat (~27KB gzipped)
├── docker-compose.yml # PostgreSQL 16 + Redis 7
├── dev.sh             # Dev environment manager
├── CLAUDE.md          # AI assistant context (architecture, conventions)
└── pnpm-workspace.yaml
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + Fastify, TypeScript |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache/PubSub | Redis 7 (messages, rate limiting, presence) |
| WebSocket | Socket.io with Redis adapter |
| Widget | Preact + TypeScript (~27KB gzipped) |
| Admin Panel | React 18 + Vite + TailwindCSS |
| Testing | Jest + Supertest (48 unit tests) |

### Multi-Tenancy

Single deployment serves all casino tenants. Isolation via:
- `tenant_id` column on all database tables
- Socket.io rooms per tenant/channel
- Redis keys prefixed by tenant ID
- Feature gating by tenant tier (BASIC / SOCIAL / ENGAGE / MONETIZE)

### Feature Tiers

| Tier | Monthly | Features |
|------|---------|----------|
| BASIC | - | Text chat, channels, moderation |
| SOCIAL | - | + Win cards, reactions, emojis, player profiles |
| ENGAGE | - | + Levels/badges, rain events, promos, leaderboard, trivia |
| MONETIZE | - | + Tipping (with casino webhook approval) |

## Ports

| Service | Port |
|---------|------|
| Backend API + WebSocket | 3000 |
| Admin Panel | 3001 |
| Widget Dev | 3002 |
| PostgreSQL | 5434 |
| Redis | 6381 |

## Environment Variables

The backend reads from `packages/backend/.env`. Defaults work for local dev:

```env
DATABASE_URL=postgresql://casino_chat:dev_password_change_me@localhost:5434/casino_chat_dev
REDIS_URL=redis://localhost:6381
JWT_SECRET=dev-only-secret-do-not-use-in-production
PORT=3000
```

See `.env.example` at the project root for all available variables.

## Troubleshooting

**Port already in use:**
```bash
./dev.sh stop            # Stops everything cleanly
# Or manually:
lsof -ti:3000 | xargs kill -9
```

**Database out of sync:**
```bash
cd packages/backend
npx prisma db push       # Sync schema
npx prisma db seed       # Re-seed data
```

**Docker containers not starting:**
```bash
docker compose down -v   # Remove volumes and start fresh
docker compose up -d
```

**Widget not connecting to backend:**
Make sure the backend is running on port 3000. The widget dev page connects to `http://localhost:3000` by default.
