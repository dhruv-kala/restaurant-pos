# Flutter Standards

## Feature Layout

```text
features/<feature>/
  data/
    repositories and transport mapping
  domain/
    app-facing models, queries, and contracts when needed
  presentation/
    providers/
    screens/
    widgets/
```

Use the closest established feature as the implementation template.

## Dependency Direction

- Presentation depends on providers and domain contracts.
- Repositories depend on shared models and API clients.
- Widgets never call Dio, SQLite, secure storage, or sockets directly.
- Features do not import another feature's presentation layer.
- Shared packages never import an application.

## Riverpod

- Providers expose typed loading, data, and error states.
- Keep transport exceptions out of widgets; map them to safe failures.
- Invalidate or refresh only affected providers after mutations.
- Scope provider families by tenant/outlet/resource identifiers where needed.
- Do not duplicate server authorization logic in providers.

## Navigation

- Use GoRouter.
- Authentication guards control session navigation.
- Role/permission checks control presentation visibility only.
- Deep links must still be rejected by backend authorization when unauthorized.
- Keep route names and parameters stable.

## Widgets and Screens

- Support loading, error, empty, and populated states.
- Use `ui_kit` primitives where an established component exists.
- Keep forms typed and validate before submission without replacing server
  validation.
- Avoid eagerly constructing hidden screens that start network work.
- Keep large screens split into focused private or feature widgets.
- Preserve responsive Flutter Web behavior.

## Models and Clients

- Cross-application API models belong in `shared_models`.
- Dio endpoint behavior belongs in `api_client`.
- Application repositories adapt API clients to providers.
- Keep JSON parsing tolerant of additive fields but strict about required
  business data.

## Validation

Run for the affected app/package:

```powershell
flutter pub get
flutter analyze
flutter test
```

Run `flutter build web` when web composition, routing, or build compatibility
changes materially.

