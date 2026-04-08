# Shared Package Agent Context

You are working on the **shared types & utils** (`packages/shared/`).

## Purpose
Shared TypeScript types, constants, and utilities used by backend, admin, and widget.

## Structure
- `src/types/` — Shared interfaces (Message, Player, Channel, Tenant, etc.)
- `src/constants/` — Feature flags, tier definitions, event names
- `src/utils/` — Shared helpers
- `src/sdk/` — CasinoChatSDK class for casino integration (HMAC-signed requests)

## Key Constraints
- No Node.js-only APIs — must work in browser and server
- Keep dependencies minimal
- Types should match Prisma schema but without Prisma dependency
- `crypto` is a Node built-in — do NOT add it as an npm dependency

## Build Order
This package is a dependency of backend, admin, and widget. When you change types or exports here:
1. Ensure the change compiles (`npx tsc --noEmit` from this directory)
2. Other packages import from `@casino-chat/shared` — any breaking change (renamed export, changed interface field) will break consumers
3. When adding new types for a cross-cutting feature, define the full interface here FIRST before other agents build on it
