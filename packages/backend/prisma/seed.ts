import { PrismaClient, TenantTier, VIPStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.playerBlock.deleteMany();
  await prisma.rainClaim.deleteMany();
  await prisma.rainEvent.deleteMany();
  await prisma.tipTransaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.moderationLog.deleteMany();
  await prisma.bannedWord.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.promoCard.deleteMany();
  await prisma.triviaQuestion.deleteMany();
  await prisma.player.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.tenantAdmin.deleteMany();
  await prisma.tenant.deleteMany();

  // --- Tenant ---
  const apiKey = 'test-api-key-' + uuidv4().slice(0, 8);
  const apiSecret = 'test-secret-' + uuidv4().slice(0, 8);
  const apiSecretHash = createHmac('sha256', 'api-secret-salt')
    .update(apiSecret)
    .digest('hex');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Lucky Star Casino',
      domain: 'luckystar.casino',
      apiKey,
      apiSecretHash,
      tier: TenantTier.ENGAGE,
      webhookUrl: 'https://luckystar.casino/api/webhooks/chat',
      branding: {
        primaryColor: '#FFD700',
        logoUrl: 'https://luckystar.casino/logo.png',
        chatTitle: 'Lucky Star Chat',
      },
      config: {
        messageRetentionDays: 30,
        maxMessageLength: 500,
        rateLimit: { messagesPerMinute: 10 },
      },
    },
  });

  console.log(`Tenant created: ${tenant.name} (${tenant.id})`);
  console.log(`  API Key: ${apiKey}`);
  console.log(`  API Secret: ${apiSecret}`);

  // --- Admin ---
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.tenantAdmin.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@luckystar.casino',
      passwordHash,
      role: 'OWNER',
    },
  });

  console.log(`Admin created: ${admin.email}`);

  // --- Channels ---
  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        tenantId: tenant.id,
        name: 'English',
        emoji: '🇬🇧',
        language: 'en',
        description: 'Main English chat room',
        sortOrder: 0,
      },
    }),
    prisma.channel.create({
      data: {
        tenantId: tenant.id,
        name: 'Russian',
        emoji: '🇷🇺',
        language: 'ru',
        description: 'Русский чат',
        sortOrder: 1,
      },
    }),
    prisma.channel.create({
      data: {
        tenantId: tenant.id,
        name: 'Turkish',
        emoji: '🇹🇷',
        language: 'tr',
        description: 'Turkce sohbet',
        sortOrder: 2,
      },
    }),
  ]);

  console.log(`Channels created: ${channels.map((c) => c.name).join(', ')}`);

  // --- Players ---
  const players = await Promise.all([
    prisma.player.create({
      data: {
        tenantId: tenant.id,
        externalId: 'ext-player-001',
        username: 'CryptoKing',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoKing',
        level: 42,
        vipStatus: VIPStatus.DIAMOND,
        isPremium: true,
        premiumStyle: 'NEON',
        totalWagered: 250000.0,
        favoriteGame: 'Blackjack',
        winCount: 1547,
      },
    }),
    prisma.player.create({
      data: {
        tenantId: tenant.id,
        externalId: 'ext-player-002',
        username: 'SlotQueen',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SlotQueen',
        level: 28,
        vipStatus: VIPStatus.GOLD,
        isPremium: true,
        premiumStyle: 'GRADIENT',
        totalWagered: 85000.0,
        favoriteGame: 'Slots',
        winCount: 892,
      },
    }),
    prisma.player.create({
      data: {
        tenantId: tenant.id,
        externalId: 'ext-player-003',
        username: 'PokerFace',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PokerFace',
        level: 15,
        vipStatus: VIPStatus.SILVER,
        totalWagered: 32000.0,
        favoriteGame: 'Poker',
        winCount: 421,
      },
    }),
    prisma.player.create({
      data: {
        tenantId: tenant.id,
        externalId: 'ext-player-004',
        username: 'LuckyDice',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuckyDice',
        level: 8,
        vipStatus: VIPStatus.BRONZE,
        totalWagered: 5200.0,
        favoriteGame: 'Dice',
        winCount: 167,
      },
    }),
    prisma.player.create({
      data: {
        tenantId: tenant.id,
        externalId: 'ext-player-005',
        username: 'NewbieGamer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieGamer',
        level: 1,
        vipStatus: VIPStatus.NONE,
        totalWagered: 100.0,
        favoriteGame: 'Roulette',
        winCount: 12,
      },
    }),
  ]);

  console.log(`Players created: ${players.map((p) => p.username).join(', ')}`);

  // --- Banned Words ---
  await prisma.bannedWord.createMany({
    data: [
      { tenantId: tenant.id, word: 'scam', matchType: 'EXACT' },
      { tenantId: tenant.id, word: 'hack', matchType: 'WILDCARD' },
      { tenantId: tenant.id, word: 'cheat', matchType: 'EXACT' },
    ],
  });

  console.log('Banned words created');

  console.log('\n--- Seed Complete ---');
  console.log(`Login: admin@luckystar.casino / admin123`);
  console.log(`API Key: ${apiKey}`);
  console.log(`API Secret: ${apiSecret}`);
  console.log(`Tenant ID: ${tenant.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
