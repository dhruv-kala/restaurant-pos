# Coding Standards

## General

- Follow existing module conventions before introducing a new pattern.
- Keep changes scoped to the active task.
- Prefer explicit names over abbreviations.
- Use ASCII unless an existing file requires another character set.
- Add comments only for non-obvious decisions or invariants.
- Do not combine feature work with unrelated formatting or refactoring.

## Naming

| Item | Convention |
|---|---|
| TypeScript files | `kebab-case.ts` with role suffixes such as `.service.ts` |
| TypeScript classes/types | `PascalCase` |
| TypeScript variables/functions | `camelCase` |
| Database models | Prisma `PascalCase`; mapped SQL `snake_case` |
| API JSON fields | `camelCase` |
| Dart files | `snake_case.dart` |
| Dart types | `PascalCase` |
| Dart members/providers | `lowerCamelCase` |
| Route paths | plural, lowercase, and stable |
| Permission keys | `<resource>.<action>` |

## NestJS

- Keep controllers thin.
- Validate external input with explicit DTOs.
- Keep authorization and transaction orchestration in services or shared guards.
- Do not expose raw Prisma records as permanent public contracts.
- Use domain-specific error codes where clients need deterministic branching.
- Keep a transaction around the full invariant-preserving operation.
- Add tests for tenant isolation, authorization, and destructive transitions.

## DTOs

- Separate create, update, query, and response contracts.
- Use allow-listed fields; never spread untrusted request objects into Prisma.
- Validate arrays element-by-element.
- Accept repository UUID versions, including UUIDv7.
- Treat payload `tenantId`, actor IDs, totals, permissions, and status as
  untrusted unless the contract explicitly permits them.

## Flutter

- Use feature-first `data/domain/presentation` folders.
- Repositories hide Dio and persistence.
- Providers own asynchronous state and invalidation.
- Widgets remain presentation-focused.
- Stable cross-application models belong in `shared_models`.
- HTTP behavior belongs in `api_client`.
- Reusable visual primitives belong in `ui_kit`.

## Quality

- Preserve backward compatibility unless the task approves a breaking change.
- Tests scale with risk and blast radius.
- Update API, database, specification, and AI status documents when their
  contracts change.

