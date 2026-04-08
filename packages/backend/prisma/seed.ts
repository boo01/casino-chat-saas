import {
  PrismaClient,
  TenantTier,
  VIPStatus,
  MessageType,
  MessageSource,
  Difficulty,
  LeaderboardPeriod,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

function generateApiCredentials() {
  const apiKey = 'ccs_' + uuidv4().replace(/-/g, '').slice(0, 16);
  const apiSecret = uuidv4() + '-' + uuidv4();
  const apiSecretHash = createHmac('sha256', 'api-secret-salt')
    .update(apiSecret)
    .digest('hex');
  return { apiKey, apiSecret, apiSecretHash };
}

async function main() {
  console.log('🎰 Seeding Casino Chat SaaS database...\n');

  // Clean existing data in dependency order
  await prisma.rainClaim.deleteMany();
  await prisma.rainEvent.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.tipTransaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.moderationLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.playerBlock.deleteMany();
  await prisma.bannedWord.deleteMany();
  await prisma.promoCard.deleteMany();
  await prisma.triviaQuestion.deleteMany();
  await prisma.player.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.tenantAdmin.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.superAdmin.deleteMany();

  // ===== PLATFORM LEVEL =====

  const superHash = await bcrypt.hash('SuperAdmin123!', 10);
  const adminHash = await bcrypt.hash('Admin123!', 10);

  await prisma.superAdmin.create({
    data: { email: 'super@casinochat.com', passwordHash: superHash, name: 'Super Admin', role: 'SUPER' },
  });

  await prisma.superAdmin.create({
    data: { email: 'admin@casinochat.com', passwordHash: adminHash, name: 'Platform Admin', role: 'ADMIN' },
  });

  console.log('Platform admins created');

  // ===== TENANT 1: Lucky Star Casino (MONETIZE tier) =====

  const ls = generateApiCredentials();
  const ownerHash = await bcrypt.hash('Owner123!', 10);
  const modHash = await bcrypt.hash('Mod123!', 10);
  const supportHash = await bcrypt.hash('Support123!', 10);

  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Lucky Star Casino',
      domain: 'luckystar.test',
      apiKey: ls.apiKey,
      apiSecret: ls.apiSecret,
      apiSecretHash: ls.apiSecretHash,
      tier: TenantTier.MONETIZE,
      webhookUrl: 'http://localhost:4000/webhooks',
      branding: {
        primaryColor: '#FFD700',
        logoUrl: 'https://luckystar.test/logo.png',
        chatTitle: 'Lucky Star Chat',
      },
      config: {
        messageRetentionDays: 30,
        maxMessageLength: 500,
        rateLimit: { messagesPerMinute: 10 },
        features: {
          rain: true, trivia: true, tipping: true, premium: true,
          streamer: true, leaderboard: true, promos: true,
        },
      },
    },
  });

  // Tenant 1 Admins
  await prisma.tenantAdmin.createMany({
    data: [
      {
        tenantId: tenant1.id, email: 'owner@luckystar.test', passwordHash: ownerHash,
        role: 'OWNER', permissions: [],
      },
      {
        tenantId: tenant1.id, email: 'mod@luckystar.test', passwordHash: modHash,
        role: 'MODERATOR', permissions: ['MANAGE_MODERATION', 'MANAGE_BANNED_WORDS'],
      },
      {
        tenantId: tenant1.id, email: 'support@luckystar.test', passwordHash: supportHash,
        role: 'ADMIN', permissions: ['VIEW_ANALYTICS', 'MANAGE_PLAYERS', 'MANAGE_CHANNELS'],
      },
    ],
  });

  // Tenant 1 Channels
  const channels1 = await Promise.all([
    prisma.channel.create({
      data: { tenantId: tenant1.id, name: 'English', emoji: '🇬🇧', language: 'en', description: 'Main English chat room', sortOrder: 0 },
    }),
    prisma.channel.create({
      data: { tenantId: tenant1.id, name: 'Russian', emoji: '🇷🇺', language: 'ru', description: 'Русский чат', sortOrder: 1 },
    }),
    prisma.channel.create({
      data: { tenantId: tenant1.id, name: 'Turkish', emoji: '🇹🇷', language: 'tr', description: 'Turkce sohbet', sortOrder: 2 },
    }),
    prisma.channel.create({
      data: {
        tenantId: tenant1.id, name: 'VIP Lounge', emoji: '👑', language: 'en',
        description: 'VIP players only (Level 10+)', sortOrder: 3,
        settings: { minLevel: 10 },
      },
    }),
    prisma.channel.create({
      data: {
        tenantId: tenant1.id, name: 'High Rollers', emoji: '💰', language: 'en',
        description: 'For high wagering players', sortOrder: 4,
        settings: { minWagered: 50000 },
      },
    }),
  ]);

  // Tenant 1 Players (20)
  const playerData = [
    { ext: '001', username: 'CryptoKing', level: 42, vip: VIPStatus.DIAMOND, premium: true, pStyle: 'NEON' as const, wagered: 250000, game: 'Blackjack', wins: 1547, mod: false, streamer: false },
    { ext: '002', username: 'SlotQueen', level: 28, vip: VIPStatus.GOLD, premium: true, pStyle: 'GRADIENT' as const, wagered: 85000, game: 'Slots', wins: 892, mod: false, streamer: true },
    { ext: '003', username: 'PokerFace', level: 15, vip: VIPStatus.SILVER, premium: false, pStyle: 'NONE' as const, wagered: 32000, game: 'Poker', wins: 421, mod: true, streamer: false },
    { ext: '004', username: 'LuckyDice', level: 8, vip: VIPStatus.BRONZE, premium: false, pStyle: 'NONE' as const, wagered: 5200, game: 'Dice', wins: 167, mod: false, streamer: false },
    { ext: '005', username: 'NewbieGamer', level: 1, vip: VIPStatus.NONE, premium: false, pStyle: 'NONE' as const, wagered: 100, game: 'Roulette', wins: 12, mod: false, streamer: false },
    { ext: '006', username: 'RouletteRuler', level: 35, vip: VIPStatus.PLATINUM, premium: true, pStyle: 'HOLOGRAPHIC' as const, wagered: 180000, game: 'Roulette', wins: 1102, mod: false, streamer: false },
    { ext: '007', username: 'BaccaratBoss', level: 22, vip: VIPStatus.GOLD, premium: false, pStyle: 'NONE' as const, wagered: 67000, game: 'Baccarat', wins: 534, mod: false, streamer: false },
    { ext: '008', username: 'SpinMaster', level: 19, vip: VIPStatus.SILVER, premium: true, pStyle: 'GRADIENT' as const, wagered: 45000, game: 'Slots', wins: 678, mod: false, streamer: false },
    { ext: '009', username: 'AceHigh', level: 31, vip: VIPStatus.PLATINUM, premium: false, pStyle: 'NONE' as const, wagered: 120000, game: 'Poker', wins: 890, mod: false, streamer: true },
    { ext: '010', username: 'JackpotJane', level: 25, vip: VIPStatus.GOLD, premium: true, pStyle: 'NEON' as const, wagered: 78000, game: 'Slots', wins: 445, mod: false, streamer: false },
    { ext: '011', username: 'BlackjackPro', level: 38, vip: VIPStatus.DIAMOND, premium: true, pStyle: 'HOLOGRAPHIC' as const, wagered: 210000, game: 'Blackjack', wins: 1320, mod: false, streamer: false },
    { ext: '012', username: 'CasinoNova', level: 12, vip: VIPStatus.BRONZE, premium: false, pStyle: 'NONE' as const, wagered: 8500, game: 'Roulette', wins: 201, mod: false, streamer: false },
    { ext: '013', username: 'WagerWolf', level: 20, vip: VIPStatus.SILVER, premium: false, pStyle: 'NONE' as const, wagered: 42000, game: 'Dice', wins: 367, mod: false, streamer: false },
    { ext: '014', username: 'GoldenTouch', level: 45, vip: VIPStatus.DIAMOND, premium: true, pStyle: 'CUSTOM' as const, wagered: 300000, game: 'Baccarat', wins: 1890, mod: false, streamer: true },
    { ext: '015', username: 'BetBaron', level: 16, vip: VIPStatus.SILVER, premium: false, pStyle: 'NONE' as const, wagered: 28000, game: 'Sports', wins: 312, mod: false, streamer: false },
    { ext: '016', username: 'ChipChaser', level: 5, vip: VIPStatus.NONE, premium: false, pStyle: 'NONE' as const, wagered: 2500, game: 'Slots', wins: 89, mod: false, streamer: false },
    { ext: '017', username: 'DoubleDown', level: 10, vip: VIPStatus.BRONZE, premium: false, pStyle: 'NONE' as const, wagered: 12000, game: 'Blackjack', wins: 245, mod: false, streamer: false },
    { ext: '018', username: 'RiskyRita', level: 27, vip: VIPStatus.GOLD, premium: true, pStyle: 'GRADIENT' as const, wagered: 72000, game: 'Poker', wins: 567, mod: false, streamer: false },
    { ext: '019', username: 'MegaWinner', level: 33, vip: VIPStatus.PLATINUM, premium: false, pStyle: 'NONE' as const, wagered: 145000, game: 'Slots', wins: 1045, mod: false, streamer: false },
    { ext: '020', username: 'NightOwl', level: 7, vip: VIPStatus.NONE, premium: false, pStyle: 'NONE' as const, wagered: 3800, game: 'Roulette', wins: 134, mod: false, streamer: false },
  ];

  const players1 = await Promise.all(
    playerData.map((p) =>
      prisma.player.create({
        data: {
          tenantId: tenant1.id,
          externalId: `ext-player-${p.ext}`,
          username: p.username,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`,
          level: p.level,
          vipStatus: p.vip,
          isPremium: p.premium,
          premiumStyle: p.pStyle,
          totalWagered: p.wagered,
          favoriteGame: p.game,
          winCount: p.wins,
          isModerator: p.mod,
          isStreamer: p.streamer,
          lastSeenAt: new Date(Date.now() - Math.random() * 86400000),
        },
      }),
    ),
  );

  // Banned Words (10)
  await prisma.bannedWord.createMany({
    data: [
      { tenantId: tenant1.id, word: 'scam', matchType: 'EXACT' },
      { tenantId: tenant1.id, word: 'hack', matchType: 'WILDCARD' },
      { tenantId: tenant1.id, word: 'cheat', matchType: 'EXACT' },
      { tenantId: tenant1.id, word: 'rigged', matchType: 'EXACT' },
      { tenantId: tenant1.id, word: 'exploit', matchType: 'EXACT' },
      { tenantId: tenant1.id, word: 'bot.*detected', matchType: 'REGEX' },
      { tenantId: tenant1.id, word: 'free.*money', matchType: 'REGEX' },
      { tenantId: tenant1.id, word: 'deposit.*link', matchType: 'REGEX' },
      { tenantId: tenant1.id, word: 'casino.*alternative', matchType: 'WILDCARD' },
      { tenantId: tenant1.id, word: 'withdraw.*issue', matchType: 'WILDCARD' },
    ],
  });

  // Promo Cards (5)
  await prisma.promoCard.createMany({
    data: [
      {
        tenantId: tenant1.id, title: 'Welcome Bonus', subtitle: '100% up to $500',
        detailText: 'New players get a 100% match bonus on their first deposit!',
        ctaText: 'Claim Now', ctaUrl: 'https://luckystar.test/bonus',
        emoji: '🎁', accentColor: '#22C55E',
      },
      {
        tenantId: tenant1.id, title: 'Weekend Cashback', subtitle: '10% cashback every Sunday',
        detailText: 'Get 10% back on your weekend losses, credited every Monday.',
        ctaText: 'Learn More', ctaUrl: 'https://luckystar.test/cashback',
        emoji: '💰', accentColor: '#3B82F6',
      },
      {
        tenantId: tenant1.id, title: 'VIP Tournament', subtitle: 'Platinum+ only',
        detailText: '$50,000 prize pool tournament this Friday at 8PM UTC.',
        ctaText: 'Register', ctaUrl: 'https://luckystar.test/tournament',
        emoji: '🏆', accentColor: '#F59E0B',
      },
      {
        tenantId: tenant1.id, title: 'Refer a Friend', subtitle: 'Earn $25 per referral',
        detailText: 'Share your unique link and earn $25 for every friend who deposits.',
        ctaText: 'Get Link', ctaUrl: 'https://luckystar.test/referral',
        emoji: '🤝', accentColor: '#8B5CF6',
      },
      {
        tenantId: tenant1.id, title: 'Happy Hour Slots', subtitle: '2x points on slots',
        detailText: 'Every day from 6-8PM UTC, earn double loyalty points on all slot games.',
        ctaText: 'Play Now', ctaUrl: 'https://luckystar.test/slots',
        emoji: '🎰', accentColor: '#EF4444',
      },
    ],
  });

  // Trivia Questions (10)
  await prisma.triviaQuestion.createMany({
    data: [
      { tenantId: tenant1.id, question: 'What is the highest hand in poker?', options: ['Full House', 'Straight Flush', 'Royal Flush', 'Four of a Kind'], correctIndex: 2, rewardAmount: 5.0, difficulty: Difficulty.EASY },
      { tenantId: tenant1.id, question: 'How many numbers are on a standard roulette wheel (European)?', options: ['36', '37', '38', '39'], correctIndex: 1, rewardAmount: 10.0, difficulty: Difficulty.MEDIUM },
      { tenantId: tenant1.id, question: 'What card game has a house edge of about 1.06% on banker bet?', options: ['Blackjack', 'Poker', 'Baccarat', 'War'], correctIndex: 2, rewardAmount: 15.0, difficulty: Difficulty.HARD },
      { tenantId: tenant1.id, question: 'In blackjack, what is the value of an Ace?', options: ['1 only', '11 only', '1 or 11', '10'], correctIndex: 2, rewardAmount: 5.0, difficulty: Difficulty.EASY },
      { tenantId: tenant1.id, question: 'What does RTP stand for in slots?', options: ['Real Time Play', 'Return To Player', 'Random Token Prize', 'Reward Through Play'], correctIndex: 1, rewardAmount: 5.0, difficulty: Difficulty.EASY },
      { tenantId: tenant1.id, question: 'Which casino game was invented by Blaise Pascal?', options: ['Blackjack', 'Craps', 'Roulette', 'Slots'], correctIndex: 2, rewardAmount: 10.0, difficulty: Difficulty.MEDIUM },
      { tenantId: tenant1.id, question: 'What is the minimum number of decks used in baccarat?', options: ['4', '6', '8', '1'], correctIndex: 1, rewardAmount: 10.0, difficulty: Difficulty.MEDIUM },
      { tenantId: tenant1.id, question: 'What year was the first online casino launched?', options: ['1992', '1994', '1996', '1998'], correctIndex: 1, rewardAmount: 15.0, difficulty: Difficulty.HARD },
      { tenantId: tenant1.id, question: 'In craps, what is the come-out roll?', options: ['First roll of dice', 'Last roll', 'A roll of 7', 'A roll of 11'], correctIndex: 0, rewardAmount: 10.0, difficulty: Difficulty.MEDIUM },
      { tenantId: tenant1.id, question: 'What is the largest jackpot ever won on a slot machine?', options: ['$10M', '$20M', '$39.7M', '$50M'], correctIndex: 2, rewardAmount: 15.0, difficulty: Difficulty.HARD },
    ],
  });

  // Seed Messages (50 across channels)
  const messageTexts = [
    'Hey everyone! Just hit a nice win on blackjack! 🎉',
    'Anyone else playing slots tonight?',
    'GG on that hand!',
    'This chat is awesome, love the community here',
    'Just joined, whats up everyone?',
    'Been on a hot streak all day 🔥',
    'Any tips for roulette beginners?',
    'That jackpot was insane!!',
    'Who else is grinding the tournament?',
    'Good luck everyone! 🍀',
    'VIP lounge is where its at',
    'Just won 500x on a slot! Cannot believe it',
    'Anyone tried the new game they added?',
    'This community is the best part of the casino',
    'Cashback hit my account, nice!',
    'Going all in on this one, wish me luck',
    'Thanks for the rain drop earlier! 🌧️',
    'How do I get to VIP status?',
    'Love the trivia questions, keep them coming!',
    'Weekend sessions are always the best',
  ];

  let seqCounter = 0;
  const msgData = [];
  for (let i = 0; i < 50; i++) {
    const ch = channels1[i % 3]; // spread across first 3 channels
    const pl = players1[i % players1.length];
    seqCounter++;
    msgData.push({
      tenantId: tenant1.id,
      channelId: ch.id,
      playerId: pl.id,
      type: i % 10 === 0 ? MessageType.SYSTEM : i % 7 === 0 ? MessageType.WIN : MessageType.TEXT,
      source: i % 10 === 0 ? MessageSource.SYSTEM : MessageSource.PLAYER,
      content: i % 7 === 0
        ? { text: `${pl.username} won $${(Math.random() * 1000).toFixed(2)} on ${pl.favoriteGame}!`, game: pl.favoriteGame, amount: (Math.random() * 1000).toFixed(2) }
        : { text: messageTexts[i % messageTexts.length] },
      sequenceNum: BigInt(seqCounter),
      createdAt: new Date(Date.now() - (50 - i) * 60000),
    });
  }
  await prisma.message.createMany({ data: msgData });

  // Leaderboard entries
  const topPlayers = [...players1].sort((a, b) => Number(b.totalWagered) - Number(a.totalWagered)).slice(0, 5);
  await prisma.leaderboardEntry.createMany({
    data: topPlayers.map((p, i) => ({
      tenantId: tenant1.id,
      playerId: p.id,
      period: LeaderboardPeriod.WEEKLY,
      wagered: Number(p.totalWagered),
      rank: i + 1,
    })),
  });

  // ===== TENANT 2: Bet Royal (BASIC tier) =====

  const br = generateApiCredentials();
  const brOwnerHash = await bcrypt.hash('Owner123!', 10);

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Bet Royal',
      domain: 'betroyal.test',
      apiKey: br.apiKey,
      apiSecret: br.apiSecret,
      apiSecretHash: br.apiSecretHash,
      tier: TenantTier.BASIC,
      branding: {
        primaryColor: '#1E40AF',
        chatTitle: 'Bet Royal Chat',
      },
    },
  });

  await prisma.tenantAdmin.create({
    data: { tenantId: tenant2.id, email: 'owner@betroyal.test', passwordHash: brOwnerHash, role: 'OWNER' },
  });

  await Promise.all([
    prisma.channel.create({ data: { tenantId: tenant2.id, name: 'English', emoji: '🇬🇧', language: 'en', sortOrder: 0 } }),
    prisma.channel.create({ data: { tenantId: tenant2.id, name: 'Spanish', emoji: '🇪🇸', language: 'es', sortOrder: 1 } }),
  ]);

  const brPlayerNames = ['RoyalFlush', 'BetKing', 'SpinnerPro', 'LuckyAce', 'CasinoFan'];
  await Promise.all(
    brPlayerNames.map((name, i) =>
      prisma.player.create({
        data: {
          tenantId: tenant2.id,
          externalId: `br-player-${i + 1}`,
          username: name,
          level: Math.floor(Math.random() * 20) + 1,
          totalWagered: Math.floor(Math.random() * 50000),
        },
      }),
    ),
  );

  // ===== OUTPUT =====

  console.log('\n=== SEED COMPLETE ===\n');

  console.log('Super Admin Login:');
  console.log(`  Email: super@casinochat.com`);
  console.log(`  Password: SuperAdmin123!\n`);

  console.log(`Lucky Star Casino (MONETIZE tier):`);
  console.log(`  Tenant ID: ${tenant1.id}`);
  console.log(`  API Key: ${ls.apiKey}`);
  console.log(`  API Secret: ${ls.apiSecret}`);
  console.log(`  Owner: owner@luckystar.test / Owner123!`);
  console.log(`  Moderator: mod@luckystar.test / Mod123!`);
  console.log(`  Support: support@luckystar.test / Support123!`);
  console.log(`  Channels: 5 | Players: 20 | Messages: 50\n`);

  console.log(`Bet Royal (BASIC tier):`);
  console.log(`  Tenant ID: ${tenant2.id}`);
  console.log(`  API Key: ${br.apiKey}`);
  console.log(`  API Secret: ${br.apiSecret}`);
  console.log(`  Owner: owner@betroyal.test / Owner123!`);
  console.log(`  Channels: 2 | Players: 5`);
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
