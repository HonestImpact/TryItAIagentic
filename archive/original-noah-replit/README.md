# Archive — original Noah (Replit build)

The first agentic build: TryIt-AI / Noah as built on Replit, superseded by this repo
(TryItAIagentic, live at tryitai.koyeb.app). Kept just in case; not expected to be used again.

## What's here
| File | What | Committed? |
|---|---|---|
| `noah-replit-neondb-2026-11-07.dump` | pg_dump custom format (restore with `pg_restore`) | **No** — gitignored |
| `noah-replit-neondb-2026-11-07.sql` | Same data as plain SQL (readable in any text editor) | **No** — gitignored |

The data files are gitignored on purpose: they hold real visitors' conversations with Noah.
They exist only on this drive. If the drive goes, they go.

## Source
- Taken 2026-11-07 from the Replit project's built-in PostgreSQL (Neon, PostgreSQL 16),
  database `neondb`, host `ep-tiny-glitter-adq52jtu`. Two old-Noah deployments existed on Replit —
  `tryit-ai-ig.replit.app` (the portfolio's "MVP Version" link) and `tryit-ai-v2-public.replit.app`;
  which of them used this database is not recorded. Exported with pg_dump 18,
  `--no-owner --no-privileges`.
- Code + commit history live in the `TryIt-AI-Replit` repo (Replit / GitHub) — not deleted.

## Contents at export (row counts)
| Table | Rows |
|---|---|
| conversations | 151 |
| messages | 294 |
| user_sessions | 19 |
| generated_tools | 47 |
| tool_usage_events | 47 |
| tool_reference | 21 |
| message_annotations | 0 |
| trust_events | 0 |

## Restore
```
createdb noah_replit
pg_restore --no-owner -d noah_replit noah-replit-neondb-2026-11-07.dump
```
