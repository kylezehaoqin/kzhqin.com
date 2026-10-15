---
name: Determination Drill
year: 2026
period: Aug 2026–present
tags: [javascript, node]
summary: Sight-ID trainer for the CNPS Field Botanist exam. 500 plants from photos, scored the way the Board scores.
repo: https://github.com/kylezehaoqin/cnps-drill
featured: true
order: 2
---
A sight-ID trainer for the California Native Plant Society's Field Botanist certification. It drills all 500 taxa on the Board of Certification's list from iNaturalist photos, and it scores typed answers the way the Board does: 1 point for the genus, 1 for the specific epithet.

I built it for one exam candidate. They used it for the 5 days before the exam and passed.

## Designing for a deadline

Normal spaced repetition schedules in days and weeks. Useless when the exam is days away.

So there's a cram interval ladder (1 minute up to 2 days), and a 100-taxon photo-only mock exam scored against the 75% pass mark, because the drill tally makes you look more ready than you are.

## One symptom, three bugs

Every answer scored 0/2, even a verbatim-correct one. The tests proved all 500 verbatim names score full, so the matcher couldn't be the cause.

It was the Check button. It passed its click event into the `skipped` argument, so every answer counted as skipped. Fixing that exposed 2 more: a typo rule too strict on the first 3 letters, and stale names. I audited all 500 against iNaturalist and Jepson and added 28 current-name synonyms.

## Typo tolerance vs collisions

Forgive typos, and one plant's typo can match another plant.

The matcher forgives 1 edit in the first 3 letters only when the typed word isn't itself a real name on the list. An exhaustive 500x500 cross-collision check makes sure no typo of one taxon scores as another.

## Zero dependencies

No npm install, no build step. It runs anywhere with Node 18.

The matcher and the scheduler are native ES modules that the browser and the tests both import. An 8-step check script covers syntax, scoring, dataset integrity, the DOM id contract, and a live server smoke test.

## Photo warming

Photos come from iNaturalist and get cached on disk. The warmer throttles API calls to about 1 a second but pulls image bytes from the CDN in parallel, since only the API is rate-limited.
