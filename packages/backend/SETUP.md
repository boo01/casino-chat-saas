# Casino Chat SaaS - Backend Setup Guide

This is a complete NestJS backend for the Casino Chat SaaS platform.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ (or use Docker)
- Redis 6+ (or use Docker)
- Docker and Docker Compose (recommended)

## Quick Start with Docker

The easiest way to get started is with Docker Compose:

```bash
# Start all services (PostgreSQL, Redis, and the NestJS app)
docker-compose up

# In another terminal, setup the database
docker-compose exec app npm run prisma:migrate

# Create a test tenant (optional)
docker-compose exec app npm run prisma:seed
```

The application will be available at `http://localhost:3000`.
Swagger docs: `http://localhost:3000/api/docs`

## Manual Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Change to a secure random string
- `CORS_ORIGIN`: Frontend URL

### 3. Setup Database

Generate Prisma client:
```bash
npm run prisma:generate
```

Run migrations:
```bash
npm run prisma:migrate
```

Seed sample data (optional):
```bash
npm run prisma:seed
```

### 4. Start Application

Development:
```bash
npm run start:dev
```

Production:
```bash
npm run build
npm run start:prod
```

## Development

### Run Tests

```bash
npm test                    # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests
```

### Code Quality

```bash
npm run lint              # Run ESLint
npm run format            # Format with Prettier
```

### Database Management

```bash
npm run prisma:studio    # Open Prisma Studio (GUI)
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Create and run migrations
```

## Project Structure

```
src/
├── common/              # Shared utilities
│   ├── filters/        # Exception filters
│   ├── guards/         # Auth guards (API Key, JWT, WebSocket)
│   ├── decorators/     # Custom decorators (@CurrentTenant, @CurrentPlayer)
│   ├── interceptors/   # Logging interceptor
│   ├── prisma/         # Prisma service & module
│   └── redis/          # Redis service & module
├── config/             # Configuration (env validation, factory)
├── modules/            # Feature modules
│   ├── auth/          # Admin authentication
│   ├── tenant/        # Tenant management (CRUD, API keys)
│   ├── channel/       # Channel management
│   ├── player/        # Player management & blocking
│   ├── chat/          # Message service (send, history, search)
│   ├── moderation/    # Banned words, moderation actions
│   ├── webhook/       # Incoming & outgoing webhooks
│   └── self-test/     # Integration health checks
├── gateway/           # WebSocket gateway (chat:message, channel:join, etc.)
├── main.ts           # Bootstrap with Fastify & Swagger setup
└── app.module.ts     # Root module

prisma/
├── schema.prisma     # Database schema (all models)
└── migrations/       # Database migration files

test/
├── app.e2e-spec.ts   # E2E tests
└── jest-e2e.json     # E2E test config
```

## Architecture Highlights

### 1. Multi-Tenant System
- Each tenant has isolated data with tenant_id foreign keys
- Tenant-scoped API keys for webhook authentication
- Per-tenant channels, players, and messages

### 2. Real-Time Chat
- Socket.io WebSocket gateway with Redis adapter for scaling
- Namespace-based isolation: `/{tenant_id}`
- Guest read-only connections (no JWT required)
- Message rate limiting in Redis

### 3. Authentication & Authorization
- JWT for admin authentication
- API Key + HMAC-SHA256 signature for webhooks
- WebSocket auth with JWT support

### 4. Message Caching
- Redis caching for recent messages (24h TTL)
- Message sequence numbers for ordering
- Full-text search support

### 5. Moderation System
- Banned word checking (EXACT, WILDCARD, REGEX)
- Player muting/banning with duration
- Moderation logs and action tracking

### 6. Webhook Integration
- Incoming webhooks: player updates, win events, rain triggers
- Outgoing webhooks: chat messages, moderation actions
- Configurable per-tenant

## API Examples

### Admin Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@casinochat.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

### Create Tenant

```bash
curl -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Casino",
    "domain": "mycasino.com",
    "adminEmail": "admin@mycasino.com",
    "adminPassword": "secure_password",
    "tier": "STANDARD"
  }'
```

### Create Channel

```bash
curl -X POST http://localhost:3000/channels \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "general",
    "emoji": "💬",
    "description": "General chat"
  }'
```

### WebSocket Connection

Connect to `ws://localhost:3000/chat/{tenant_id}` with:

```javascript
const socket = io('http://localhost:3000/chat/tenant-id-here', {
  auth: {
    token: 'jwt-token-here',
    tenantId: 'tenant-id-here'
  }
});

// Join a channel
socket.emit('channel:join', { channelId: 'channel-id' });

// Send a message
socket.emit('chat:message', {
  channelId: 'channel-id',
  text: 'Hello world!'
});

// Listen for messages
socket.on('message:received', (message) => {
  console.log(message);
});
```

### Incoming Webhook

```bash
curl -X POST http://localhost:3000/webhooks/casino \
  -H "X-Api-Key: {tenant_api_key}" \
  -H "X-Timestamp: {unix_timestamp}" \
  -H "X-Signature: {hmac_sha256_signature}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "player.win",
    "data": {
      "externalId": "player-123",
      "amount": 100.50,
      "game": "gates-of-olympus"
    }
  }'
```

### Self-Test Endpoint

```bash
curl -X GET http://localhost:3000/self-test \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "status": "healthy",
  "results": [
    { "name": "Database Connection", "passed": true, "message": "Database is accessible" },
    { "name": "Redis Connection", "passed": true, "message": "Redis is accessible" },
    ...
  ]
}
```

## Security Notes

1. Change `JWT_SECRET` in production to a strong random string
2. Use HTTPS in production
3. Set `ADMIN_API_KEY_HEADER` and signature validation headers
4. Implement rate limiting on the reverse proxy layer
5. Use strong tenant API secrets
6. Monitor webhook deliveries
7. Regularly update dependencies: `npm audit fix`

## Deployment

### Docker

Build image:
```bash
docker build -t casino-chat-backend:latest .
```

Run container:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="your-secret" \
  casino-chat-backend:latest
```

### Environment Variables (Production)

Ensure these are set:
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL URL
- `REDIS_URL` - Redis URL
- `JWT_SECRET` - Secure random string (min 32 chars)
- `CORS_ORIGIN` - Frontend domain
- `SOCKET_CORS_ORIGIN` - Frontend domain for WebSocket

### Performance Optimization

1. Enable Swagger only in development: `SWAGGER_ENABLED=false`
2. Use connection pooling for PostgreSQL
3. Configure Redis persistence
4. Use a reverse proxy (nginx) for load balancing
5. Monitor logs with centralized logging service

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL is running
- Run `npm run prisma:migrate` to create schema

### Redis Connection Error
- Check `REDIS_URL` environment variable
- Ensure Redis is running: `redis-cli ping`

### WebSocket Issues
- Check CORS configuration
- Verify `SOCKET_CORS_ORIGIN` matches client URL
- Check browser console for connection errors

### JWT Errors
- Verify `JWT_SECRET` is set
- Check token has not expired
- Ensure Authorization header format: `Bearer {token}`

## API Documentation

Full Swagger documentation available at:
`http://localhost:3000/api/docs`

## Support

For issues or questions:
1. Check Swagger docs at `/api/docs`
2. Review database schema at `prisma/schema.prisma`
3. Check logs for error messages
4. Run `/self-test` endpoint for health check
