---
name: XHS Knowledge Reader
year: 2026
period: Apr–Jul 2026
tags: [python, fastapi, sqlite, paddleocr]
summary: Makes saved Xiaohongshu posts searchable. OCR plus a full-text index over 700+ posts.
order: 3
---

A local search tool for saved Xiaohongshu posts. Most of their text is inside images, so PaddleOCR extracts it into a SQLite FTS5 trigram index over 700+ posts. A FastAPI service serves the index to a D3 graph view and a list reader, with request metrics, structured logs, and a benchmark CLI for p50, p95, and p99 latency. Each design decision is recorded as an ADR.

## Concurrency

The API and a background OCR worker share one SQLite database in WAL mode, with a single serialized write path. OCR progress streams to the browser over server-sent events.

## Next

Designed, not built: hybrid keyword and embedding retrieval with cited LLM answers, evaluated by recall@k on a labeled question set.
