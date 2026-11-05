---
name: ServiceBox
year: 2025
period: Sep 2025–present
tags: [typescript, fastapi, postgresql, react]
summary: Racket customization app with live swing weight, twist weight, and balance, backed by a separate Python physics service.
featured: true
order: 1
---

A racket customization app for tennis players and stringers. The goal is a much simpler interface than existing spec calculators, on a tested physics model.

The studio holds one racket's setup changes and lead placements in one list, with keyboard and touch editing, and updates swing weight, twist weight, and balance live. Collections hold racket groups with their specs and change history. The selection helper finds rackets to buy that reach a target spec with the least customization.

It is a TypeScript monorepo: a React 19 PWA, a Fastify and tRPC API, and Zod schemas shared by both sides. Data is in Supabase PostgreSQL. The numeric work runs in a separate Python service on FastAPI, NumPy, and SciPy.

## Set matching

The set matcher brings 2 to 20 rackets to one spec. A linear program picks the lightest shared target that every frame can reach, and an integer program per frame places tape strips at 6 positions. Each plan is checked again with the forward physics model, and plans that miss are dropped. All 200 simulated batches of 8 to 12 frames matched, in about 0.3 s each.

## Next

Merge the set matcher into the app and test it on measured frames.
