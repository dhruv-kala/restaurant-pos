# ServeIQ Flutter Application

Flutter client prototype for the restaurant POS platform.

## Architecture

The application is migrating incrementally to a feature-first clean architecture:

```text
presentation -> application/domain <- data
```

Authentication is the first layered feature. The outlet dashboard, POS, and table
service screens remain preserved prototypes. Shared identity, navigation, theme,
menu contracts, and POS cart rules have been extracted into workspace packages;
the remaining decomposition is tracked in the
[repository architecture audit](../../docs/architecture/repository-architecture-audit.md).

## Validation

```powershell
cd ../..
flutter pub get
cd apps/restaurant-app
flutter analyze
flutter test
flutter build web
```
