# Casino Chat SaaS - Deployment Guide

## Development Environment

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and npm
- PostgreSQL 16 client tools
- Redis CLI

### Docker Compose Setup

**docker-compose.yml** (located in project root):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: casino-chat-postgres
    environment:
      POSTGRES_USER: casino_chat
      POSTGRES_PASSWORD: dev_password_change_me
      POSTGRES_DB: casino_chat_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U casino_chat"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: casino-chat-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: pgbouncer:latest
    container_name: casino-chat-pgbouncer
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: casino_chat
      DATABASES_PASSWORD: dev_password_change_me
      DATABASES_DBNAME: casino_chat_dev
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
    ports:
      - "6432:6432"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "psql", "-U", "casino_chat", "-d", "casino_chat_dev", "-c", "SELECT 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Getting Started

```bash
# Clone and setup
git clone https://github.com/casino-chat/saas.git
cd casino-chat-saas

# Install dependencies
npm install

# Start services
docker-compose up -d

# Verify services
docker-compose ps
docker-compose logs postgres
docker-compose logs redis

# Run migrations
npm run migrate:dev

# Start development servers
npm run dev
```

### Development Environment Variables

Create `.env.local`:

```
NODE_ENV=development
API_PORT=3000
WS_PORT=3001

# Database
DATABASE_URL=postgresql://casino_chat:dev_password_change_me@localhost:6432/casino_chat_dev

# Redis
REDIS_URL=redis://localhost:6379

# Security (use dummy values in dev)
JWT_SECRET=dev_jwt_secret_change_in_production
API_SIGNING_SECRET=dev_signing_secret_change_in_production

# Features
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## Production Environment - Hetzner Cloud

### Infrastructure Setup

#### Step 1: Create VPC and Servers

```bash
# Create VPC for network isolation
hcloud network create --name casino-chat-vpc --ip-range 10.0.0.0/8

# Create load balancer
hcloud load-balancer create \
  --type lb11 \
  --name casino-chat-lb \
  --network casino-chat-vpc \
  --algorithm round_robin

# Create database server (CCX63)
hcloud server create \
  --type ccx63 \
  --name casino-chat-db-primary \
  --network casino-chat-vpc \
  --image ubuntu-22.04 \
  --volumes 500 \
  --ssh-key your-ssh-key

# Create application servers (CCX41 x 3)
for i in {1..3}; do
  hcloud server create \
    --type ccx41 \
    --name casino-chat-api-$i \
    --network casino-chat-vpc \
    --image ubuntu-22.04 \
    --ssh-key your-ssh-key
done

# Create Redis servers (CCX31 x 2)
for i in {1..2}; do
  hcloud server create \
    --type ccx31 \
    --name casino-chat-redis-$i \
    --network casino-chat-vpc \
    --image ubuntu-22.04 \
    --ssh-key your-ssh-key
done
```

#### Step 2: Configure Database Server

```bash
#!/bin/bash
# Run on postgres server

# Update system
apt-get update && apt-get upgrade -y

# Install PostgreSQL 16
apt-get install -y postgresql-16 postgresql-contrib-16 pgbackrest

# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE USER casino_chat WITH PASSWORD '${POSTGRES_PASSWORD}';
CREATE DATABASE casino_chat_prod OWNER casino_chat;
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET work_mem = '40MB';
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 10;
EOF

systemctl restart postgresql

# Setup replication slot for standby
sudo -u postgres psql << EOF
SELECT * FROM pg_create_physical_replication_slot('standby_slot');
EOF

# Configure pgBackRest
mkdir -p /var/lib/pgbackrest
chown postgres:postgres /var/lib/pgbackrest
chmod 700 /var/lib/pgbackrest
```

#### Step 3: Configure Redis Cluster

```bash
#!/bin/bash
# Run on each Redis server

apt-get install -y redis-server

# Configure Redis
cat > /etc/redis/redis.conf << EOF
port 6379
cluster-enabled yes
cluster-config-file /var/lib/redis/nodes.conf
cluster-node-timeout 5000
appendonly yes
maxmemory 16gb
maxmemory-policy allkeys-lru
EOF

systemctl restart redis-server

# Bootstrap cluster (run once on first node)
redis-cli --cluster create \
  10.0.1.5:6379 \
  10.0.1.6:6379 \
  10.0.1.7:6379 \
  --cluster-replicas 1
```

---

### Traefik Reverse Proxy

#### Installation on Load Balancer

```bash
#!/bin/bash

# Create Traefik user
useradd -r -s /bin/false traefik

# Download and install
wget https://github.com/traefik/traefik/releases/download/v3.0.0/traefik_v3.0.0_linux_amd64.tar.gz
tar -xzf traefik_v3.0.0_linux_amd64.tar.gz -C /usr/local/bin/
chmod +x /usr/local/bin/traefik

# Create configuration
mkdir -p /etc/traefik

cat > /etc/traefik/traefik.yml << 'EOF'
global:
  checkNewVersion: true
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

api:
  insecure: true
  dashboard: true

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: casino-chat-prod
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@casino-chat.io
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO
  filePath: /var/log/traefik/traefik.log
EOF

cat > /etc/traefik/dynamic.yml << 'EOF'
http:
  services:
    api-backend:
      loadBalancer:
        servers:
          - url: http://10.0.1.10:3000
          - url: http://10.0.1.11:3000
          - url: http://10.0.1.12:3000
        healthCheck:
          scheme: http
          path: /health
          interval: 30s
          timeout: 5s

    ws-backend:
      loadBalancer:
        servers:
          - url: http://10.0.1.10:3001
          - url: http://10.0.1.11:3001
          - url: http://10.0.1.12:3001

  routers:
    api:
      rule: "Host(`api.casino-chat.io`)"
      service: api-backend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    ws:
      rule: "Host(`ws.casino-chat.io`)"
      service: ws-backend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    dashboard:
      rule: "Host(`traefik.casino-chat.io`) && PathPrefix(`/dashboard`)"
      service: api@internal
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - auth

  middlewares:
    auth:
      basicAuth:
        users:
          - "admin:$2y$10$..."
EOF

# Create systemd service
cat > /etc/systemd/system/traefik.service << 'EOF'
[Unit]
Description=Traefik
After=network-online.target
Wants=network-online.target

[Service]
User=traefik
Type=notify
ExecStart=/usr/local/bin/traefik --configfile /etc/traefik/traefik.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable traefik
systemctl start traefik
```

---

## CI/CD Pipeline - GitHub Actions

### Deployment Workflow

**.github/workflows/deploy.yml**:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: ./packages/api
          push: true
          tags: ${{ steps.meta.outputs.tags }}-api
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push WebSocket image
        uses: docker/build-push-action@v5
        with:
          context: ./packages/ws
          push: true
          tags: ${{ steps.meta.outputs.tags }}-ws
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Hetzner
        env:
          HCLOUD_TOKEN: ${{ secrets.HCLOUD_TOKEN }}
          SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H api.casino-chat.io >> ~/.ssh/known_hosts

          # Deploy via Docker Compose
          ssh -i ~/.ssh/id_rsa deploy@api.casino-chat.io << 'DEPLOY_SCRIPT'
          set -e
          cd /opt/casino-chat

          # Pull latest images
          docker-compose pull

          # Run migrations
          docker-compose run --rm api npm run migrate:prod

          # Stop and start services
          docker-compose down
          docker-compose up -d --force-recreate

          # Verify health
          sleep 10
          curl -f http://localhost:3000/health || exit 1

          echo "Deployment successful"
          DEPLOY_SCRIPT

  monitoring:
    needs: deploy
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Monitor health
        env:
          UPTIME_KUMA_API: ${{ secrets.UPTIME_KUMA_API }}
        run: |
          # Trigger health check
          curl -X POST $UPTIME_KUMA_API/api/push/uptimeKumaServiceMonitor \
            -H "Content-Type: application/json" \
            -d '{"status":"ok","msg":"Deployment complete"}'
```

---

## Monitoring & Observability

### Uptime Kuma Setup

Uptime Kuma provides comprehensive monitoring and alerting.

```bash
#!/bin/bash

# Install Uptime Kuma
docker run -d \
  --name uptime-kuma \
  -p 3002:3001 \
  -v uptime-kuma:/app/data \
  --restart always \
  louislam/uptime-kuma:latest
```

#### Monitors to Configure

```
1. API Health Check
   URL: https://api.casino-chat.io/health
   Method: GET
   Interval: 60s
   Timeout: 5s

2. WebSocket Health
   Type: TCP Ping
   Hostname: ws.casino-chat.io
   Port: 443
   Interval: 60s

3. Database Connectivity
   Type: PostgreSQL
   Hostname: db.casino-chat.io
   Port: 5432
   Interval: 300s

4. Redis Connectivity
   Type: Redis
   Hostname: redis.casino-chat.io
   Port: 6379
   Interval: 300s

5. Message Throughput
   Type: HTTP
   URL: https://api.casino-chat.io/admin/metrics/messages
   Interval: 300s
   Alert if: Response < 100 messages/min
```

#### Alert Channels

- Email: ops@casino-chat.io
- PagerDuty: Integration for critical incidents
- Slack: #ops channel for warnings

---

## Environment Variables - Production

Create `.env.production` with strong secrets:

```
NODE_ENV=production
API_PORT=3000
WS_PORT=3001
WORKERS_COUNT=4

# Database
DATABASE_URL=postgresql://casino_chat:${SECURE_POSTGRES_PASSWORD}@db.casino-chat.io:5432/casino_chat_prod
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_POOL_TIMEOUT=5000

# Redis
REDIS_URL=redis://redis.casino-chat.io:6379
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379
REDIS_POOL_SIZE=50

# Security
JWT_SECRET=${SECURE_JWT_SECRET}
JWT_EXPIRY=3600
API_SIGNING_SECRET=${SECURE_API_SIGNING_SECRET}
API_SIGNATURE_WINDOW=300

# TLS
TLS_CERT_PATH=/etc/tls/certs/casino-chat.io.crt
TLS_KEY_PATH=/etc/tls/certs/casino-chat.io.key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_RETENTION_DAYS=30

# CORS
CORS_ORIGIN=https://casino.example.com,https://api.casino-chat.io
CORS_CREDENTIALS=true

# Features
FEATURE_RAIN_EVENTS=true
FEATURE_LEADERBOARD=true
FEATURE_TRIVIA=true
FEATURE_TIPPING=true
FEATURE_PREMIUM_CHAT=true

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_MINUTE=10
RATE_LIMIT_API_REQUESTS_PER_MINUTE=100

# Backup
BACKUP_S3_BUCKET=casino-chat-backups
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

---

## Scaling Recommendations

### Horizontal Scaling Checklist

- [ ] Load balancer configured (Traefik)
- [ ] Stateless API servers (replicate 3+)
- [ ] Stateless WebSocket servers (replicate 3+)
- [ ] PostgreSQL read replicas for analytics
- [ ] Redis Cluster for sharding
- [ ] CDN for static assets
- [ ] Database query monitoring
- [ ] Cache hit rate monitoring (target: >85%)

### Capacity Planning

| Load | API Servers | WS Servers | Redis Memory | DB Pool |
|------|-------------|-----------|-------------|---------|
| 1K users | 2 | 2 | 4GB | 20 |
| 10K users | 3 | 4 | 16GB | 50 |
| 100K users | 6 | 8 | 64GB | 100 |
| 1M users | 12+ | 16+ | 256GB | 200+ |

---

## Disaster Recovery

### RTO/RPO Targets

- **Recovery Time Objective**: 15 minutes
- **Recovery Point Objective**: 1 hour

### Backup Automation

```bash
# Daily full backup with S3 replication
0 2 * * * /opt/scripts/backup-daily.sh

# Hourly WAL backups
0 * * * * /opt/scripts/backup-wal.sh

# Weekly integrity test
0 3 * * 0 /opt/scripts/test-restore.sh
```

### Failover Procedure

1. Detect primary database failure (Uptime Kuma alert)
2. Promote read replica to primary (5 min)
3. Update DNS to new primary (5 min)
4. Verify connectivity (5 min)
5. Run smoke tests (1 min)
6. Total RTO: ~15 minutes
