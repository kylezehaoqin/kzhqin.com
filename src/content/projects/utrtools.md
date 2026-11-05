---
name: UTRTools
year: 2025
period: Sep 2025–present
role: Lead contributor, team project
tags: [python, rest apis]
summary: "Lineup scouting for my USTA league team's captains: opponents' ratings, past lineups, and doubles pairs for about 200 players a season."
featured: true
order: 2
---

A lineup-scouting tool for my USTA league team's captains. Before a match, it summarizes the opposing team from USTA, UTR, and TennisRecord data. In playoffs, it also shows each opponent's past lineups by position, stacking tendencies, and most frequent doubles pairs. It covers about 200 players across 10 teams a season.

It is a Python command-line tool built with teammates. I am the lead contributor (86 of 128 commits) and ship changes through pull requests.

## Player identity

Common names map to several UTR profiles. The matcher accepts a profile only when the player's own USTA matches, with the same dates and set scores, appear in its results, and it sends unclear cases to manual review. It scores 12 of 12 on a golden set of players with known UTR ids.

## API client and tests

All requests go through one client with pacing, retries, a circuit breaker, and request budgets, so a failed lookup is never saved as "not found". I used mutation testing (876 mutants) to find and close gaps in the test suite.
