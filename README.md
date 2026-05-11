# Emlak Pro

Real-time real estate operations platform for consultants who need to catch new listings quickly, match them against saved filters, and manage the follow-up workflow from web and mobile clients.

This repository is structured as a production-oriented monorepo. It demonstrates backend API design, real-time delivery, database modeling, and multi-platform client architecture.

## Why This Project Exists

Real estate consultants often monitor multiple listing filters manually and lose valuable time before a relevant listing is noticed. Emlak Pro is designed to automate that workflow:

- create saved listing bots/filters
- ingest and normalize listing data
- deduplicate listings from the source
- match listings to user-owned bots
- deliver matches instantly to web and mobile clients
- track listing state with notes, favorites, and workflow status

The first target source is Sahibinden. The ingestion strategy is treated as the riskiest part of the product and is documented separately under `docs/phase-0-validation.md`.

## Current Status

Active prototype / MVP foundation.

Implemented foundation includes:

- monorepo workspace with API, web, mobile, and shared config packages
- NestJS API modules for auth, identity, bots, listings, ingestion, and realtime events
- Prisma data model and initial migrations
- Socket.IO based realtime gateway
- Next.js web application shell
- Expo / React Native mobile application shell
- product and technical validation documentation

## Tech Stack

| Area | Technology |
| --- | --- |
| Monorepo | pnpm workspaces |
| API | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| Web | Next.js, React, TypeScript |
| Mobile | Expo, React Native, TypeScript |
| Local services | Docker Compose |

## Repository Structure

```text
apps/
  api/      NestJS backend, Prisma schema, migrations, realtime gateway
  web/      Next.js web dashboard
  mobile/   Expo / React Native mobile app
packages/
  config/   shared TypeScript configuration
docs/       product blueprint and validation notes
```

## Core Product Modules

- Authentication and identity with user-owned accounts
- Bot builder for saved real estate filters
- Listing ingestion and normalization pipeline
- Matching layer between listings, users, and bots
- Live feed for real-time listing delivery
- Listing workflow state: notes, favorites, and status tracking
- Future extension points for groups, push notifications, AI, automation, and analytics packs

## Backend Design Highlights

- Listings are stored as a single canonical source of truth.
- User/bot matches are modeled separately from the listing itself.
- User-specific workflow state is kept outside the listing entity.
- Realtime delivery is handled through Socket.IO gateway modules.
- Ingestion has its own guarded endpoint and adapter boundary.

This separation keeps listing identity, matching, and user workflow concerns independent from each other.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop or local PostgreSQL/Redis services

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Create an API environment file from the example:

```bash
cp apps/api/.env.example apps/api/.env
```

Update the values in `apps/api/.env` as needed:

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/emlak_pro
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
INGESTION_TOKEN=change-me-ingestion-token
SAHIBINDEN_COOKIE=
BRAVE_EXECUTABLE_PATH=/Applications/Brave Browser.app/Contents/MacOS/Brave Browser
```

### Run Local Services

```bash
docker compose up -d
```

### Generate Prisma Client

```bash
pnpm --filter api prisma:generate
```

### Start Applications

API:

```bash
pnpm dev:api
```

Web:

```bash
pnpm dev:web
```

Mobile:

```bash
pnpm dev:mobile
```

## Useful Scripts

```bash
pnpm lint
pnpm typecheck
pnpm --filter api build
pnpm --filter web build
```

## Documentation

- `docs/product-blueprint.md`: product scope, modules, data model principles, and release phases
- `docs/phase-0-validation.md`: validation plan for ingestion latency, duplicate detection, realtime delivery, and operational risks

## Notes For Reviewers

This repository is intended to show how I approach a real product from both product and engineering perspectives:

- I started with the highest-risk technical assumptions instead of only UI screens.
- The architecture separates API, web, mobile, data, and realtime concerns.
- The data model is designed around ownership, deduplication, and future collaboration features.
- The codebase is kept as a monorepo to make shared typing and cross-platform development easier.
