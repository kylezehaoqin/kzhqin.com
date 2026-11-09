---
name: Swingsmith
year: 2025
period: Sep 2025–present
tags: [typescript, react, trpc, postgresql]
summary: A tuning bench for tennis rackets. It plans lead and setup changes on deterministic physics and matches a set of frames to one.
featured: true
order: 1
---

A tuning bench for tennis rackets, for players and stringers who measure their own frames. Each frame keeps its measured specs and a history of changes. The goal is a workflow faster than the spreadsheet it replaces.

The physics is a measured baseline plus computed deltas. The app never estimates a missing spec.

## The app

- **Studio:** setup and lead rows on a canvas of the frame, with weight, balance, swing weight, and twist weight updated live. Each save goes to the frame's history with a note, and any save can be restored.
- **Match:** brings other frames to one reference frame, or to typed numbers. A result is the difference against the tolerance (1.5 g, 1.6 mm, 2 SW, 0.3 TW), marked ✓ or ✗.
- **Calculator:** tries lead on any frame without an account.

It is a TypeScript monorepo: a React 19 app, a Fastify and tRPC API, and PostgreSQL through Drizzle. One shared package holds the Zod schemas, the physics, and the matcher, so Studio and Match compute from the same code. The first version ran the physics in a separate Python service. A match result from that service did not agree with Studio, so I retired it.

## Matching a set

The matcher writes each problem as a linear program and solves it with HiGHS (WASM) in a Web Worker. It adds lead places by column generation on a 0.1 cm grid, and a small integer program rounds each row to 0.1 g. Every plan is then checked with the forward physics, and its label comes from that check, not from the solver. One frame solves in under 50 ms (median); a shared target for 20 frames takes under 1 s.

## Next

Put it online. The deploy pipeline is built: it pushes both images and deploys through a gate that rolls back on a failed health check.
