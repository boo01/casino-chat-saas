# Claude Code — Casino Chat SaaS: Test & Fix Backend

## Context
Read CLAUDE.md first for full project context. This is a NestJS + Fastify + Prisma + Redis + Socket.io backend for a casino chat SaaS platform.

## What's Already Built
- 52 TypeScript source files in packages/backend/src/
- 8 NestJS modules: Auth, Tenant, Channel, Player, Chat, Moderation, Webhook, SelfTest
- WebSocket gateway with Socket.io + Redis adapter
- Prisma schema with 15 models, 12 enums
- Shared types package (packages/shared/)
- Docker compose with Postgres 16 + Redis 7
- Widget and Admin packages are empty (not started yet)

## What Needs To Be Done (Execute In Order)

### Step 1: Start Docker & Install Dependencies
```bash
cd casino-chat-saas
docker compose up -d
# Wait for healthy: docker compose ps
cd packages/backend
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Generate Prisma Client & Run Migration
```bash
cd packages/backend
npx prisma generate
npx prisma migrate dev --name init
```
After this step, verify:
- `npx prisma studio` opens and shows all 15 tables
- No migration errors

### Step 3: TypeScript Build
```bash
npm run build
```
Fix ALL TypeScript errors. Common issues to watch for:
- Prisma types not found → means prisma generate didn't run
- Import path issues (src/ prefix should work with tsconfig paths)
- DTO properties needing `!` non-null assertion with class-validator decorators

### Step 4: Start The App
```bash
npm run start:dev
```
Verify:
- App starts on port 3000
- Swagger UI accessible at http://localhost:3000/api/docs
- Console shows "Redis client connected"
- No unhandled errors in console

### Step 5: Test API Endpoints via curl or Swagger
Test flow:
1. Create a tenant via POST /api/tenants (this needs the self-test endpoint or direct Prisma)
2. Login via POST /api/auth/login
3. Create a channel via POST /api/channels
4. List channels via GET /api/channels

### Step 6: Test WebSocket Connection
Write a quick test script (test-ws.ts):
```typescript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000/chat', {
  auth: { tenantId: 'YOUR_TENANT_ID' },
  transports: ['websocket'],
});
socket.on('connection:established', (data) => console.log('Connected:', data));
socket.on('error', (err) => console.error('Error:', err));
```

### Step 7: Create Database Seed Script
Create `packages/backend/prisma/seed.ts` that:
1. Creates a test tenant with API key/secret
2. Creates an admin user for that tenant
3. Creates 3 default channels (English, Russian, Turkish)
4. Creates 5 test players

### Step 8: Write Unit Tests
Create tests for the most critical services:
- `chat.service.spec.ts` — message creation, rate limiting
- `moderation.service.spec.ts` — banned words, mute/ban
- `tenant.service.spec.ts` — CRUD, API key generation
- `api-key.guard.spec.ts` — HMAC signature validation

### Step 9: Commit & Push
```bash
git add -A
git commit -m "Phase 1: Backend MVP — tested and working"
git push origin main
```

## Important Notes

- `.env` file already exists in packages/backend/ with correct docker-compose credentials
- Prisma was downgraded from 7.7.0 to 5.22.0 (7.7 had CDN issues)
- `@nestjs/bull` uses `redis: { host, port }` config, NOT `url`
- Redis adapter needs SEPARATE pub/sub clients (already fixed in gateway)
- `chat.service.ts` search uses raw SQL ($queryRaw) for JSON content field — not Prisma's `search` filter
- The `moderatePlayer` DTO has a `moderatorId` field used when creating PlayerBlock records for bans
- PrismaService `enableShutdownHooks` was removed (deprecated in Prisma 5.x)

## Known Architecture Decisions
- Multi-tenancy via `tenantId` column on every table, not separate schemas
- Messages stored in both Postgres (persistent) and Redis (cache, 24h TTL)
- Rate limiting: 10 messages per 60 seconds per player (Redis INCR + EXPIRE)
- Guest mode: WS connection without JWT token = read-only access
- HMAC-SHA256 API authentication for casino-to-chat API calls (timing-safe comparison)
