# CasinoChat Pro

Real-time embeddable chat widget for online casino operators.

## Quick Start

```bash
# 1. Start PostgreSQL + Redis
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Setup database
cd packages/backend
cp .env.example .env
npx prisma db push
npx prisma db seed
cd ../..

# 4. Run backend (watch mode)
cd packages/backend && npx nest start --watch

# 5. Run admin panel (separate terminal)
cd packages/admin && npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| Admin Panel | http://localhost:3001 |
| Health Check | http://localhost:3000/health |

## Test Logins

**Super Admins:**

| Email | Password |
|-------|----------|
| super@casinochat.com | SuperAdmin123! |
| admin@casinochat.com | Admin123! |

**Tenant Admins (Lucky Star Casino):**

| Email | Password | Role |
|-------|----------|------|
| owner@luckystar.test | Owner123! | OWNER |
| mod@luckystar.test | Mod123! | MODERATOR |
| support@luckystar.test | Support123! | ADMIN |

**Tenant Admin (Bet Royal Casino):**

| Email | Password | Role |
|-------|----------|------|
| owner@betroyal.test | Owner123! | OWNER |

## Ports

- PostgreSQL: 5434
- Redis: 6381
- Backend: 3000
- Admin Panel: 3001

## Kill Stuck Processes

```bash
lsof -ti:3000 | xargs kill -9
```
