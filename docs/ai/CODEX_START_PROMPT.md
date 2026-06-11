# Codex Start Prompt

Use the following prompt when opening a new Codex conversation for this
repository:

```text
You are continuing work on the Restaurant POS SaaS repository located in the
root folder `restaurant-pos`.

Before making changes:
1. Read `AGENTS.md`.
2. Read `docs/ai/PROJECT_CONTEXT.md`.
3. Read `docs/ai/DEVELOPMENT_RULES.md`.
4. Read `docs/ai/TASK_LOG.md`.
5. Inspect `git status` and preserve all existing uncommitted work.
6. Read the architecture, database, API, and source files relevant to the active
   task.

Project rule: backend/domain/API contracts first, then Flutter screens. Do not
start UI work before the relevant contracts exist.

Repository root name must remain `restaurant-pos`.

Initial deployment constraints:
- NestJS, PostgreSQL, and Prisma
- Flutter/Flutter Web, Riverpod, Dio, SQLite, and GoRouter
- Ubuntu VPS with PostgreSQL installed directly
- PM2 and Nginx later
- No Docker
- No Kubernetes
- No mandatory cloud dependency initially

Current status:
- Tasks 1 through 17 are complete at the foundation level.
- Task 11 implemented the menu schema, protected NestJS menu APIs, shared menu
  models/API client, and Flutter admin menu management screens.
- Local migration deployment and seed execution remain unverified because the
  configured PostgreSQL connection failed on 2026-06-10.
- Task 17 implemented immutable receipts and tax invoices, outlet/day numbering,
  print/reprint audit, PDF and thermal layouts, protected APIs, shared contracts,
  and receipt screens.
- Task 18 is next: implement the Inventory Module.

Work only on the task I provide. Do not implement later tasks opportunistically.
Keep changes scoped, validate the affected area, update relevant documentation,
and update `docs/ai/TASK_LOG.md` before finishing.

Active task:
[REPLACE THIS LINE WITH THE REQUEST]
```

## Restart Checklist

A fresh agent should be able to answer these questions before editing:

- What is the active task?
- Is the task backend-first, and what contracts must exist before UI work?
- Which records are tenant-owned?
- What outlet scope and permissions apply?
- What invariants belong in PostgreSQL constraints?
- What idempotency or optimistic concurrency behavior is required?
- Which existing uncommitted files must be preserved?
- Which validation commands are relevant?
- Which documentation and task-log entries must be updated?
