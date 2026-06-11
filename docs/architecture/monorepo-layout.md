# AI-Friendly Monorepo Layout

## Deployable Applications

| Path | Ownership |
|---|---|
| `apps/restaurant-app` | Cashier, waiter, kitchen, and outlet operations |
| `apps/admin` | Restaurant owner and tenant administration |
| `apps/super-admin` | Platform tenant, subscription, support, and billing administration |
| `apps/customer` | Customer ordering, loyalty, rewards, wallet, and referrals |
| `apps/kitchen-display` | Future dedicated KDS client |

Only `apps/restaurant-app` currently contains executable application code.

## Workspace Packages

| Package | Current content |
|---|---|
| `restaurant_pos_core` | App configuration, errors, results, and utilities |
| `restaurant_pos_shared_models` | Backend-aligned shared transport models |
| `restaurant_pos_ui_kit` | Theme, navigation, and reusable widgets |
| `restaurant_pos_auth` | Session, token, role, and repository contracts |
| `restaurant_pos_api_client` | Dio transport, interceptors, and typed services |
| `restaurant_pos_analytics` | Privacy-safe analytics contracts |
| `restaurant_pos_common` | Governed cross-domain utilities |

The repository root `pubspec.yaml` defines the Dart workspace. Local packages use
`resolution: workspace`, and the root `pubspec.lock` is the reproducible
dependency lock.

## Dependency Rules

```mermaid
flowchart LR
    APPS[Applications] --> CORE[restaurant_pos_core]
    APPS --> MODELS[restaurant_pos_shared_models]
    APPS --> UI[restaurant_pos_ui_kit]
    APPS --> AUTH[restaurant_pos_auth]
    APPS --> API[restaurant_pos_api_client]
    APPS --> ANALYTICS[restaurant_pos_analytics]
    UI --> CORE
    API --> CORE
```

- Packages never import application code.
- One application never imports another application's `lib`.
- Shared models are transport-neutral and framework-independent.
- UI kit code contains no restaurant business logic.
- Firebase remains an application data-source implementation until NestJS auth
  provides a stable shared contract.
- Empty package boundaries must not accumulate unrelated utility functions.

## Backend Boundary

`backend/api/src/modules` documents the intended NestJS domain ownership. No
executable backend was generated because the repository has no existing backend
behavior or approved database migration to preserve.

## AI Navigation Order

For repository tasks, inspect in this order:

1. `docs/specifications/enterprise-system-design.md`
2. `docs/architecture/monorepo-layout.md`
3. The owning application or backend module README
4. Package public barrel files
5. Feature-level data/domain/presentation folders

This limits cross-boundary edits and keeps generated changes aligned with domain
ownership.
