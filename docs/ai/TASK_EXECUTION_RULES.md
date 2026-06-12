# Task Execution Rules

## Minimal Read Set

Before every task, read:

1. `AGENTS.md`
2. `docs/ai/CURRENT_STATUS.md`
3. `docs/ai/TASK_EXECUTION_RULES.md`
4. The relevant module specification under `docs/specifications`

Read these only when the task touches their concern:

- `PROJECT_CONTEXT.md`
- `ARCHITECTURE.md`
- `TECH_STACK.md`
- `CODING_STANDARDS.md`
- `DATABASE_STANDARDS.md`
- `API_STANDARDS.md`
- `FLUTTER_STANDARDS.md`
- `SECURITY_RULES.md`
- `MULTI_TENANCY_RULES.md`
- `MODULE_DEPENDENCIES.md`

Do not load the complete `TASK_LOG.md` unless historical detail is needed. Use
`CURRENT_STATUS.md` for routine starts.

## Execution Sequence

1. Confirm the requested task matches `CURRENT_STATUS.md` or is explicitly
   authorized by the user.
2. Inspect the worktree and preserve unrelated changes.
3. Inspect only relevant modules, manifests, tests, and documentation.
4. Define business rules, ownership, invariants, authorization, and API
   contracts before UI.
5. Implement the smallest complete vertical scope.
6. Add tests proportional to risk.
7. Run relevant validation commands.
8. Update module documentation.
9. Update `CURRENT_STATUS.md`, `TASK_LOG.md`, and restart context.
10. Report changes, validation, limitations, and the exact next task.

## Scope Rules

- Implement only the active task.
- Do not start later roadmap tasks opportunistically.
- Do not re-analyze the entire repository unless a cross-cutting decision
  requires it.
- Prefer existing conventions and helpers.
- Do not rename the repository or perform product-wide renames.
- Do not modify frontend when the active task is backend/documentation-only.
- Do not add infrastructure not approved by the task.
- Never revert unrelated user changes.

## Prompt Efficiency

Future prompts must reference repository documents instead of repeating:

- product vision
- folder structure
- technology stack
- coding conventions
- security rules
- multi-tenancy rules
- standard validation and output requirements

Prompts should provide only:

- task identifier and objective
- module specification path
- task-specific acceptance criteria
- explicit deviations from repository rules

## Validation

Run checks relevant to changed areas. Do not claim checks that were not run.
Database deployment requires a known target and valid credentials. Documentation
tasks require link/path checks, status consistency checks, and `git diff
--check`.

