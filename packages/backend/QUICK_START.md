# Casino Chat Backend - Quick Start

## 🚀 Start in 2 Minutes

### Option 1: Docker (Recommended)

```bash
# Clone and navigate to backend
cd packages/backend

# Start services
docker-compose up

# In another terminal, setup database
docker-compose exec app npm run prisma:migrate

# Done! App runs at http://localhost:3000
```

### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start database (ensure PostgreSQL and Redis are running)
npm run prisma:migrate

# Start development server
npm run start:dev

# Visit http://localhost:3000
```

## 📚 Key URLs

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000/chat/{tenant_id}

## 🔑 First Steps

### 1. Get Admin Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@casinochat.com",
    "password": "password123"
  }'
```

Save the `accessToken` for other requests.

### 2. Create a Tenant

```bash
curl -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Casino",
    "domain": "mycasino.com",
    "adminEmail": "admin@mycasino.com",
    "adminPassword": "secure123",
    "tier": "STANDARD"
  }'
```

Save the `id` and `apiKey`.

### 3. Create a Channel

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

## 🔌 WebSocket Chat

```javascript
// Browser console
const socket = io('http://localhost:3000/chat/tenant-id-here', {
  auth: { token: 'jwt-token', tenantId: 'tenant-id' }
});

socket.on('connection:established', () => {
  socket.emit('channel:join', { channelId: 'channel-id' });
});

socket.on('message:received', (msg) => {
  console.log(msg.username, ':', msg.content.text);
});

// Send message
socket.emit('chat:message', {
  channelId: 'channel-id',
  text: 'Hello world!'
});
```

## 📝 Common Commands

```bash
# Development
npm run start:dev          # Watch mode
npm run lint              # Check code
npm run format            # Format code

# Testing
npm test                  # Unit tests
npm run test:e2e         # E2E tests

# Database
npm run prisma:studio    # GUI for database
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Add sample data

# Production
npm run build            # Build for production
npm run start:prod       # Run production build
```

## 🔍 Debugging

### Check API with Swagger
Visit: http://localhost:3000/api/docs

### Check Database Health
```bash
curl http://localhost:3000/self-test \
  -H "Authorization: Bearer {token}"
```

### View Logs
```bash
docker-compose logs -f app    # Docker
npm run start:dev             # Console output
```

## 📖 Important Files

- **Database Schema**: `prisma/schema.prisma`
- **Main Entry**: `src/main.ts`
- **Modules**: `src/modules/*/`
- **WebSocket**: `src/gateway/chat.gateway.ts`
- **API Guard**: `src/common/guards/api-key.guard.ts`

## 🚨 Troubleshooting

**Port 3000 in use?**
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

**Database error?**
```bash
# Reset database
docker-compose down -v
docker-compose up
docker-compose exec app npm run prisma:migrate
```

**WebSocket not connecting?**
- Check CORS_ORIGIN matches your client URL
- Verify JWT token is valid
- Check browser console for errors

## 📚 Full Documentation

See `SETUP.md` for complete setup instructions and API examples.

## 🎯 Architecture at a Glance

```
NestJS + Fastify
├── HTTP API (REST)
├── WebSocket (Socket.io)
├── Prisma ORM
├── PostgreSQL
└── Redis
```

## 🔐 Security Defaults

- JWT Secret: Set in `.env` (change in production!)
- CORS: Limited to `http://localhost:3001` by default
- Rate Limit: 10 messages per 60s per player
- Admin: Role-based access (OWNER, ADMIN, MODERATOR)

## ✅ Ready to Deploy?

1. Update `.env` with production values
2. Set strong `JWT_SECRET`
3. Configure PostgreSQL connection
4. Set up Redis
5. Run migrations: `npm run prisma:migrate`
6. Start: `npm run start:prod`

See `SETUP.md` for Docker and deployment options.

---

**Have questions?** Check the Swagger docs or review the code in `src/modules/`.
