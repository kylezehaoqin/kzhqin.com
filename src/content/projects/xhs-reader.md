---
name: XHS Knowledge Reader
year: 2026
period: Apr 2026–present
tags: [python, fastapi, sqlite, paddleocr]
summary: Makes saved Xiaohongshu posts searchable. OCR plus a full-text index over 700+ posts.
order: 3
---
A local reader that makes saved Xiaohongshu posts searchable. A lot of the text in those posts sits inside images, so OCR pulls it out into a SQLite FTS5 (trigram) index over 700+ posts. FastAPI serves it, with a D3 graph and a list reader on top.

It has request metrics, structured JSON logs, a `/dashboard` page, and a benchmark CLI (p50/p95/p99). Every decision is written down as an ADR. The repo isn't public yet.

Next (designed, not built): hybrid keyword + embedding retrieval with cited LLM answers, measured by recall@k on a labeled question set.

## A silent failure

After a PaddleOCR 3.x API change, OCR results got stored as null. No error anywhere, because a bare `except` swallowed it. I fixed the call and cleared the poisoned cache.

## A 12GB memory spike

Re-queuing every post after that fix pushed memory to 12GB with the server-grade OCR model. I switched to the mobile model and made bulk OCR opt-in. It sits around 200MB at rest now.

## SQLite WAL

The API handlers and the background OCR worker both wrote to the database and hit `SQLITE_BUSY`. I went with WAL mode and one serialized write path instead of connection pooling.

OCR progress streams over server-sent events, since updates only go one way and the browser reconnects on its own.
