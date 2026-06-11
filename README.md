# Restaurant POS

Enterprise multi-tenant restaurant POS and management SaaS.

## Documentation

- [Enterprise system design](docs/specifications/enterprise-system-design.md)
- [Repository architecture audit](docs/architecture/repository-architecture-audit.md)
- [Repository restructuring plan](docs/architecture/repository-restructuring.md)
- [AI-friendly monorepo layout](docs/architecture/monorepo-layout.md)
- [Flutter frontend architecture](docs/architecture/frontend-architecture.md)

## Repository Structure

```text
apps/
  restaurant-app/    Flutter restaurant operations client
  admin/             Reserved tenant administration application
  super-admin/       Reserved platform administration application
  customer/          Future customer ordering application
  kitchen-display/   Future KDS application
packages/
  core/              Framework-independent foundations
  auth/              Authentication and authorization contracts
  api_client/        Dio transport and typed API services
  shared_models/     Backend-aligned shared models
  ui_kit/            Reusable Flutter presentation primitives
  analytics/         Privacy-safe analytics contracts
  common/            Small dependency-free shared utilities
backend/
  api/               Reserved NestJS application
  database/          Database design and policies
  migrations/        Ordered database migrations
  scripts/           Administrative and integrity tooling
docs/
infrastructure/
```

The target architecture, domain model, API surface, offline synchronization
strategy, security controls, deployment plan, and product roadmap are defined in
the system design document.

## Flutter Validation

Run from the repository root:

```powershell
flutter pub get
dart analyze
flutter analyze
flutter test apps/restaurant-app
```
