---
name: Deuce
year: 2026
period: Sep 2026–present
tags: [python, dbt, dagster, postgresql]
summary: Tennis analytics warehouse over 1.9M shot-by-shot points, with a text-to-SQL agent in progress.
repo: https://github.com/kylezehaoqin/deuce
featured: true
order: 1
---
A tennis analytics warehouse on the Match Charting Project's shot-by-shot data: 1.9M points, 2.6M serves, 11.8K matches. It's 19 dbt models, run as Dagster software-defined assets with partitioned backfill.

A text-to-SQL agent on top is next. It's in progress.

## Column-shifted rows

Pydantic checks every field. But a row whose columns shifted can pass every per-field check.

So there's a field-count check for those rows, and a reject-rate circuit breaker that stops the load when too many rows fail. A bad file writes nothing.

## Trusting the parser

I checked the rally parser against an independent implementation: 90.0% agreement on 2020s matches. The regression gates run inside `dbt build`, so a parser change that drops agreement fails the build.

## Measuring indexes

The most selective column got me a 1.3x speedup. That's it.

A partial index on a less selective boolean made a typical query 200x faster than the 706 MB sequential scan, because heap fetches were most of the cost. Lesson: read the query plan, don't guess from selectivity.

## SQL vs the LLM

Serve-direction entropy takes multi-pass SQL, the kind an LLM agent tends to get subtly wrong. So I precomputed it in a mart instead of leaving it to the agent.
