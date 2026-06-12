# Codex Start Prompt

Use this compact prompt for a new conversation:

```text
Repository: restaurant-pos

Read:

1. AGENTS.md
2. docs/ai/CURRENT_STATUS.md
3. docs/ai/TASK_EXECUTION_RULES.md
4. The specification for the requested module under docs/specifications/

Load only the concern-specific docs/ai standards needed by the task.
Inspect the worktree and preserve unrelated changes.
Implement only the explicitly requested task.
Follow backend/API contracts before Flutter UI.
Update docs/ai/CURRENT_STATUS.md and docs/ai/TASK_LOG.md after substantive work.

Active task:
[INSERT TASK REQUEST]
```

For a reusable detailed form, use `docs/ai/PROMPT_TEMPLATE.md`.

Current repository status is intentionally not duplicated here. It belongs in
`docs/ai/CURRENT_STATUS.md` so this prompt does not become stale.
