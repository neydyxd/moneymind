# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MoneyMind** — AI-powered personal finance assistant built on PayloadCMS 3.x + Next.js 15 + MongoDB. Users track transactions via web dashboard or Telegram bot; an AI (OpenAI/YandexGPT/GigaChat) parses natural-language messages into structured transactions and serves as a financial advisor chat.

## Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run all tests (int + e2e)
pnpm test:int         # Integration tests (vitest)
pnpm test:e2e         # E2E tests (playwright, needs running dev server)
pnpm generate:types   # Regenerate payload-types.ts after schema changes
pnpm generate:importmap  # Regenerate import map after component changes
pnpm seed             # Seed database (tsx src/seed.ts)
```

Run a single integration test:
```bash
cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.config.mts tests/int/api.int.spec.ts
```

Run a single E2E test:
```bash
cross-env NODE_OPTIONS="--no-deprecation --import=tsx/esm" playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts
```

Type-check without emitting:
```bash
npx tsc --noEmit
```

Docker (MongoDB): `docker-compose up -d` — starts MongoDB on 27017.

## Architecture

### Route groups (Next.js App Router)

- `src/app/(frontend)/` — public web app: dashboard, login, register, API routes
- `src/app/(payload)/` — Payload admin panel (auto-generated routes)

### Collections (PayloadCMS, MongoDB)

| Collection | Slug | Purpose |
|---|---|---|
| Users | `users` | Auth-enabled, stores telegramId, currency, monthlyBudget, Telegram connect tokens |
| Media | `media` | File uploads |
| Categories | `categories` | Transaction categories (system-wide via `isDefault` or per-user) |
| Transactions | `transactions` | Income/expense records with AI source tracking |
| ChatHistory | `chat-history` | AI chat sessions (messages array per document) |
| FunnelEvents | `funnel-events` | Analytics events (registration, first_transaction, etc.) — append-only |

### Key modules

- `src/lib/ai.ts` — Multi-provider AI abstraction (OpenAI, YandexGPT, GigaChat). Provider selected via `AI_PROVIDER` env var.
- `src/lib/telegram.ts` — Telegraf bot: parses transactions from natural language, handles `/stats`, `/balance`, `/history` commands, AI chat. Uses in-memory maps for pending transactions and chat sessions. Telegram connect tokens stored in DB for serverless compatibility.
- `src/app/(frontend)/api/` — Frontend API routes: `/chat`, `/transactions`, `/stats`, `/parse-transaction`, `/telegram/*`

### Access control pattern

Owner-based: users can only read/update/delete their own data. Transactions, ChatHistory, FunnelEvents all use `{ user: { equals: user.id } }` query constraints. Categories are publicly readable.

### Environment variables

Required: `DATABASE_URL`, `PAYLOAD_SECRET`, `TELEGRAM_BOT_TOKEN`

AI provider (one set):
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
- YandexGPT: `AI_PROVIDER=yandexgpt`, `YANDEX_API_KEY`, `YANDEX_FOLDER_ID`
- GigaChat: `AI_PROVIDER=gigachat`, `GIGACHAT_CLIENT_ID` + `GIGACHAT_CLIENT_SECRET`

### Testing

- **Integration tests** (`tests/int/`): vitest with jsdom, file pattern `*.int.spec.ts`
- **E2E tests** (`tests/e2e/`): Playwright (Chromium), dev server auto-started, file pattern `*.e2e.spec.ts`
- **Helpers** in `tests/helpers/`: `seedUser.ts`, `login.ts`
- Test env config: `test.env`, setup: `vitest.setup.ts`

### Path aliases

- `@/*` → `./src/*`
- `@payload-config` → `./src/payload.config.ts`
