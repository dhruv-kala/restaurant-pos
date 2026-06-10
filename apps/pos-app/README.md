# ServeIQ Flutter Application

Flutter client prototype for the restaurant POS platform.

## Architecture

The application is migrating incrementally to a feature-first clean architecture:

```text
presentation -> application/domain <- data
```

Authentication is the first layered feature. The admin, POS, and service screens
remain preserved prototypes. Shared navigation and POS cart rules have now been
extracted; the remaining decomposition is tracked in the
[repository architecture audit](../../docs/repository-architecture-audit.md).

## Validation

```powershell
flutter analyze
flutter test
```
