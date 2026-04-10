# Widget SDK Agent Context

You are working on the **Preact embeddable chat widget** (`packages/widget/`).

## Stack
- Preact + TypeScript
- Vite in library mode (UMD + ESM output)
- Socket.io-client for WebSocket
- Plain CSS (no framework) — dark theme

## Key Patterns
- Entry point: `src/index.ts` exports `CasinoChat.init(config)` for embedding
- Socket wrapper: `src/api/socket.ts` handles connection, auth, reconnection
- Components: ChatWidget (mode switcher), ChatPanel (layout), ChatHeader (channel selector), MessageList (multi-type), ChatMessage (avatars, VIP, badges), ChatInput (emoji picker), WinCard, RainEvent, TriviaCard, PromoCard, EmojiPicker, PlayerCard
- Styles: `src/styles/widget.css` (~500 lines, BetFury-style dark theme)
- Types: `src/types/index.ts` — ChatConfig, Player, ChatMessage (7 types), Channel, TenantFeatures
- Bundle: ~23KB gzipped JS + ~4KB gzipped CSS

## Widget Modes
- `floating` — bubble + popup (for small embeds on casino pages)
- `sidebar` — fills parent container height (for right-side panel like BetFury)
- `fullscreen` — fills viewport (for standalone chat page like stake.com/chat)
- Set via `config.mode`, default is `floating`
- `config.defaultOpen: true` opens immediately + auto-connects
- Target bundle size: ~21KB gzipped

## Embedding
```html
<script src="casino-chat.umd.js"></script>
<script>CasinoChat.init({ tenantId: '...', token: '...' })</script>
```

## Key Constraints
- Must work in iframe isolation (Shadow DOM)
- Guest mode (no JWT) = read-only
- Lazy WebSocket — connect only when chat opened, not on page load
- No external CSS frameworks — self-contained styles
- Target bundle: < 50KB gzipped

## Feature Tiers (widget auto-enables/disables UI based on tenant config)
- BASIC: Text chat, channels, moderation indicators
- SOCIAL: + Win cards, reactions, GIFs, emojis, player profiles
- ENGAGE: + Levels/badges, rain, promos, leaderboard, trivia
- MONETIZE: + Tipping

## WebSocket Events (client→server)
- `chat:message` → `{ channelId, text, replyTo? }`
- `chat:reaction` → `{ messageId, emoji }`
- `chat:typing` → `{ channelId }`
- `channel:join` → `{ channelId }`
- `channel:leave` → `{ channelId }`
- `rain:claim` → `{ rainEventId }`
- `trivia:answer` → `{ triviaId, answerIndex }`
- `tip:send` → `{ targetPlayerId, amount, currency }`

## WebSocket Events (server→client)
- `chat:message` → `{ id, channelId, player, type, content, timestamp }`
- `chat:delete` → `{ messageId }`
- `chat:reaction` → `{ messageId, emoji, count }`
- `player:join` → `{ channelId, player, onlineCount }`
- `player:leave` → `{ channelId, playerId, onlineCount }`
- `rain:start` → `{ id, amount, currency, duration, playerCount }`
- `rain:end` → `{ id, claimants, perPlayer }`
- `trivia:start` → `{ id, question, options, duration }`
- `trivia:end` → `{ id, correctIndex, winner }`
- `win:share` → `{ player, game, bet, win, multiplier, currency }`
- `config:update` → `{ features, channels, theme }`
- `error` → `{ code, message }`

## Connection Lifecycle
1. Client connects with JWT in handshake auth (or no JWT = guest)
2. Server validates, joins default channels (Socket.io rooms)
3. Server sends initial state: last 200 messages, online users, active rain/trivia
4. Bidirectional events via Redis pub/sub
5. Presence: heartbeat-based, 30s offline threshold

## Design System
- Background: #080C14 (page), #0d121d (chat), #111827 (cards)
- Input: #1F2937, hover: #1E293B
- Font: system stack, 13px base
- CSS bundled inside widget JS (no external stylesheet)
