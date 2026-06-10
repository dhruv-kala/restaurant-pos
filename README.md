# Restaurant POS

Enterprise multi-tenant restaurant POS and management SaaS.

## Documentation

- [Enterprise system design](docs/enterprise-system-design.md)
- [Repository architecture audit](docs/repository-architecture-audit.md)
- [Repository restructuring plan](docs/repository-restructuring.md)

## Repository Structure

```text
apps/
  pos-app/           Flutter POS and operations client
  admin-panel/       Reserved administrative application
  customer-app/      Future customer ordering application
  kitchen-display/   Future KDS application
backend/
  api/               Reserved NestJS application
  database/          Database design and policies
  migrations/        Ordered database migrations
  scripts/           Administrative and integrity tooling
docs/
infrastructure/
shared/
```

The target architecture, domain model, API surface, offline synchronization
strategy, security controls, deployment plan, and product roadmap are defined in
the system design document.

## Flutter Validation

Run from `apps/pos-app`:

```powershell
flutter pub get
flutter analyze
flutter test
flutter build web
```
