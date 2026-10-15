---
name: UTRTools
year: 2025
period: Sep 2025–present
tags: [python, rest apis]
summary: Scouting for my tennis league team. Match history and UTR lookups for about 200 players across 10 teams.
featured: true
order: 2
---
Scouting for my tennis league team. It automates the research captains do by hand for about 200 players across 10 teams a season: match history, opponent scouting, and UTR rating lookups across USTA and UTR.

4 of us on the team use it.

## Identity matching

Name matching broke on players who moved regions, or who used totally different names on the 2 platforms.

Now a UTR profile needs evidence: the player's own USTA matches (same date, same set scores) have to show up in its results. Unclear cases go to a person, not a guess.

## Never record a failure as "not found"

Every API call goes through one client with pacing, retries, a circuit breaker, and request budgets. So an incomplete lookup never gets saved as "player not found".
