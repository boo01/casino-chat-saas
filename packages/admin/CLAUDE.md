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

## Pages (Current)
- LoginPage, DashboardPage, ChannelListPage, PlayerListPage, ModerationPage, SettingsPage

## Pages (Planned — from IMPLEMENTATION_PLAN.md)
- channels/: ChannelListPage, ChannelEditPage
- players/: PlayerListPage, PlayerDetailPage
- moderation/: ModerationPage (live monitor), BannedWordsPage, ReportsPage
- promos/: PromoListPage, PromoEditPage
- trivia/: TriviaListPage, TriviaEditPage
- rain/: RainPage
- leaderboard/: LeaderboardPage
- analytics/: AnalyticsPage (charts + metrics)
- settings/: GeneralSettings, FeatureSettings, ApiSettings, AdminSettings
- super-admin/: TenantsPage, TenantDetailPage, PlatformSettingsPage

## API Routes (backend)
All tenant-scoped endpoints: `/api/tenants/:tenantId/<resource>`
Super admin endpoints: `/api/super-admin/...`
Auth: `/api/auth/login` (unified — handles TenantAdmin + SuperAdmin)
The admin panel gets tenantId from the logged-in user's JWT. Super admins (tenantId: null) see a platform-wide view.

## Common Gotchas
- `@vitejs/plugin-react` must be v4 (v6 incompatible with Vite 5)
- Vite `minify: true` (not `'terser'` — terser not installed)
- All API routes go through `/api` proxy — don't hardcode `localhost:3000`
