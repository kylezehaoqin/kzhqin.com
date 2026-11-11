---
name: Swingsmith
year: 2025
period: Sep 2025–present
tags: [typescript, react, trpc, postgresql]
summary: A racket customization app with visual lead editing, live specs, saved history, and set matching that keeps one frame's lead pattern.
featured: true
order: 1
live: https://swingsmith.solutions
---

A racket customization app for tennis players and stringers, built to be easier to use than the existing spec calculators. Each frame keeps its measured specs and a history of changes, and the app computes every new spec as a delta from that measured baseline.

In Studio, the user places lead and setup changes on a canvas of the frame with the mouse, keyboard, or touch. Weight, balance, swing weight, and twist weight update with each change. Each save goes to the frame's history with a note, and any earlier save can be restored. A calculator tries lead on any frame without an account.

Match brings other frames to one reference frame. It puts lead at the reference frame's lead positions, so each matched frame gets the same customization pattern along with the same specs. A frame that cannot reach the reference that way gets one more position, marked on its plan. Each frame's difference against the tolerance (1.5 g, 1.6 mm, 2 SW, 0.3 TW) shows as ✓ or ✗.

It is a TypeScript monorepo: a React 19 app, a Fastify and tRPC API, and PostgreSQL through Drizzle. A shared package holds the Zod schemas, the physics, and the matcher, so Studio and Match use one physics model.

## Matching a set

The matcher models each problem as a linear program and solves it with HiGHS, compiled to WASM, in a Web Worker. A small integer program rounds each lead row to 0.1 g, and every plan is recomputed with the forward physics model before the app shows it. One frame takes under 50 ms (median), and a shared target for 20 frames takes under 1 s.

The physics and the matcher first ran in a separate Python service on FastAPI, to solve the linear programs in parallel. One linear program for 20 frames solves in 0.8 ms, so the network round trip cost more than the parallel solves saved. I moved both into the shared TypeScript package.

## Next

Swing analysis from video, with a customization recommendation based on that analysis. Not built yet.
