# AI Prompt Template

Use this template instead of repeating repository architecture and standards.

```text
Read:

- AGENTS.md
- docs/ai/CURRENT_STATUS.md
- docs/ai/TASK_EXECUTION_RULES.md
- docs/specifications/<module>-module.md

Implement Task <number>: <task name>.

Objective:
<task-specific objective>

Acceptance criteria:
- <criterion unique to this task>
- <criterion unique to this task>

Constraints:
- Implement only this task.
- Do not modify unrelated modules.
- Follow the referenced repository standards.
- Update docs/ai/CURRENT_STATUS.md and docs/ai/TASK_LOG.md.
```

## Short Form

When the module specification already contains complete acceptance criteria:

```text
Read AGENTS.md, docs/ai/CURRENT_STATUS.md,
docs/ai/TASK_EXECUTION_RULES.md, and
docs/specifications/audit-module.md.

Implement Task 25. Do not start later tasks. Update current status and task log.
```

## Add Context Only When Needed

Reference, rather than paste:

- database work: `docs/ai/DATABASE_STANDARDS.md`
- API work: `docs/ai/API_STANDARDS.md`
- Flutter work: `docs/ai/FLUTTER_STANDARDS.md`
- security work: `docs/ai/SECURITY_RULES.md`
- tenancy work: `docs/ai/MULTI_TENANCY_RULES.md`
- cross-module work: `docs/ai/MODULE_DEPENDENCIES.md`

Do not repeat the architecture, stack, folder tree, generic output format, or
baseline validation commands unless the task intentionally changes them.

## Expected Reduction

A typical repeated 1,500-2,000-line architecture prompt can be reduced to
roughly 10-30 task-specific lines. Depending on acceptance-criteria size, this
is an estimated **70-90% reduction in user-provided prompt tokens**. Repository
inspection and implementation tokens still depend on task complexity.

