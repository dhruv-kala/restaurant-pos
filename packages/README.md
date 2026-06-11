# Workspace Packages

The root Dart pub workspace manages seven shared packages:

- `restaurant_pos_core`
- `restaurant_pos_auth`
- `restaurant_pos_api_client`
- `restaurant_pos_shared_models`
- `restaurant_pos_ui_kit`
- `restaurant_pos_analytics`
- `restaurant_pos_common`

See `docs/architecture/frontend-architecture.md` for ownership and dependency
rules. Shared packages never import application code.
