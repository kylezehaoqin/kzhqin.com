---
name: ServiceBox
year: 2025
period: Sep 2025–present
tags: [typescript, fastapi, postgresql, react]
summary: Racket customization PWA on Rod Cross's swing-weight equations, with the physics in its own FastAPI service.
repo: https://github.com/kylezehaoqin/servicebox
featured: true
order: 1
---
A racket customization PWA with 3 tools: Spec Forecaster, Matching Planner, and Selection Helper. The math comes from Rod Cross's peer-reviewed swing-weight equations.

The app is TypeScript and tRPC, and the numeric work lives in its own FastAPI + NumPy/SciPy service. PostgreSQL on Supabase with row-level security, Redis + BullMQ for background jobs, and a React 19 PWA, shipped with Docker Compose and GitHub Actions.

## Splitting the service

The physics is CPU-bound. Running it in a separate Python service keeps Node's event loop free for I/O, and each side scales on its own. API responses stay under 10ms end to end.

## tRPC over REST and GraphQL

Frontend and backend ship together in one TypeScript monorepo. End-to-end type safety was worth more than client-side query flexibility.

## Supabase Auth over Auth0, Clerk, or custom JWT

No added cost on the PostgreSQL I already had, native row-level security (16 policies), no vendor lock-in, and about half the build time of custom JWT.
