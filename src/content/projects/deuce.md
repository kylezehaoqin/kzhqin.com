---
name: Deuce
year: 2026
period: Sep 2026–present
tags: [python, dbt, dagster, postgresql]
summary: "Tennis analytics on 1.9M shot-by-shot points: a tested PostgreSQL, dbt, and Dagster pipeline, with a text-to-SQL agent in progress."
repo: https://github.com/kylezehaoqin/deuce
featured: true
order: 1
---

An analytics pipeline for tactical tennis questions, such as where a player serves on break point. It models the Match Charting Project's shot-by-shot data: 1.9M points from 11.8K matches.

A Python loader validates the raw files and loads them into PostgreSQL. 19 dbt models with 88 tests turn the points into marts, and Dagster runs them as software-defined assets with partitioned backfill. A text-to-SQL agent on LangGraph, in progress, answers questions against the marts.

## Findings

The marts reproduce the real tours' hold rates: 80.2% for men and 66.5% for women. The "momentum" effect after a long rally is explained by rally length, and serve predictability under pressure is specific to each player.

## Data quality

The loader is idempotent. It rejects malformed rows, including column-shifted rows that pass per-field validation, and a reject-rate circuit breaker stops a bad file before it writes. The rally parser agrees with the dataset author's published stats on 90% of 2020s matches, and `dbt build` fails if that agreement drops.

## Indexes

Indexes are chosen from query plans. A partial index on a boolean flag replaced a 706 MB sequential scan and made a typical query 200x faster; an index on the most selective column gave 1.3x. The indexes are declared in the model config, and a test fails the build if a rebuild loses one.

## Agent safety

The agent's SQL runs as a PostgreSQL role that can only read the marts, with a statement timeout. sqlglot accepts exactly one read-only statement, and a server-side cursor caps each result at 200 rows. On 16 labeled questions, routing scores 4 without the schema, 8 with it, and 12 with routing rules (in-sample).

## Next

An answer step that cites the rows behind each answer, then an eval harness.
