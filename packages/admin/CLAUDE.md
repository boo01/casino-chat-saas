# Admin Panel Agent Context

You are working on the **React admin panel** (`packages/admin/`).

## Stack
- React 18 + TypeScript
- Vite 5 (dev server on port 3001)
- TailwindCSS 3 with custom dark theme
- React Router 6
- Axios for API calls
- Lucide React for icons

## Key Patterns
- API client at `src/api/client.ts` — baseURL is `/api`, Vite proxies to backend on port 3000
- Auth store at `src/store/auth.ts` — React Context, token in `localStorage` as `admin_token`
- Login auto-detects tenant admin vs super admin (tries tenant first, falls back to super admin)
- All pages in `src/pages/`, layout in `src/components/layout/`
- Dark gaming theme: page=#080C14, card=#111827, input=#1F2937

## Design System
- Colors defined in `tailwind.config.js` as custom theme extensions
- Tier colors: basic=#22C55E, social=#3B82F6, engage=#F59E0B, monetize=#EF4444
- Font: system stack, 13px base
- Same dark aesthetic as the widget

## Pages (16 total — all implemented)
- auth/LoginPage — unified login (tenant admin + super admin)
- dashboard/DashboardPage — stats cards (tenant or super admin view)
- channels/ChannelListPage — full CRUD with modals
- players/PlayerListPage — list, search, expandable detail, block with duration
- moderation/ModerationPage — banned words CRUD + moderation logs
- promos/PromosPage — CRUD + "Send to Chat" (picks channel, sends as system message)
- trivia/TriviaPage — CRUD + "Start in Chat" (picks channel, sends formatted question)
- rain/RainPage — trigger rain (channel dropdown) + event history
- leaderboard/LeaderboardPage — period tabs + "Recalculate" button
- analytics/AnalyticsPage — overview stats, message bar chart, VIP distribution
- integration/IntegrationPage — SDK embed code, theme config, auth guide
- live-chat/LiveChatPage — real-time chat: send messages as admin, emoji picker, block/delete hover actions, REST polling + WebSocket broadcast
- chat-preview/ChatPreviewPage — visual SDK preview in iframe (color/position config only, NO messaging)
- settings/SettingsPage — tenant config, API keys (visible, copyable), regenerate
- super-admin/TenantsPage — tenant list with expandable stats
- super-admin/AdminsPage — super admin CRUD

## API Routes (backend)
All tenant-scoped endpoints: `/api/tenants/:tenantId/<resource>`
Super admin endpoints: `/api/super-admin/...`
Auth: `/api/auth/login` (unified — handles TenantAdmin + SuperAdmin)
The admin panel gets tenantId from the logged-in user's JWT. Super admins (tenantId: null) see a platform-wide view.

## Common Gotchas
- `@vitejs/plugin-react` must be v4 (v6 incompatible with Vite 5)
- Vite `minify: true` (not `'terser'` — terser not installed)
- All API routes go through `/api` proxy — don't hardcode `localhost:3000`
