---
name: Determination Drill
year: 2026
period: Aug 2026–present
tags: [javascript, node]
summary: Sight-ID trainer for the California Native Plant Society's Field Botanist exam. 500 plants from photos, scored the way the exam is scored.
repo: https://github.com/kylezehaoqin/cnps-drill
featured: true
order: 2
---

A sight-identification trainer for the California Native Plant Society's Field Botanist certification. It drills all 500 taxa on the Board of Certification's list from iNaturalist photos and scores typed answers by the Board's rules: 1 point for the genus and 1 for the specific epithet. The candidate it was built for used it for the 5 days before the exam and passed.

It is a Node.js app with zero runtime dependencies, deployed by GitHub Actions to Docker behind nginx on my own server.

## Scheduling for a deadline

The scheduler uses a cram interval ladder from 1 minute to 2 days, sized for an exam days away. A 100-taxon, photo-only mock exam is scored against the 75% pass mark, and missed items return to the front of the queue.

## Answer matching

Typo tolerance never turns one plant into another: an exhaustive 500 × 500 check confirms that no typo of one taxon scores as another. I audited all 500 names against iNaturalist and Jepson and added 28 current-name synonyms.

## Offline use

Photos are limited to Creative Commons licenses and cached with photographer credit, so the app works offline. Progress is saved in the browser and mirrored to the server.
