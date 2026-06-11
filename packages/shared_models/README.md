# Restaurant POS Shared Models

Stable cross-application value objects and transport-neutral contracts.

Models enter this package only when at least two deployable applications or a
client/server contract require the same semantics. Feature-specific state remains
inside its owning application.

The package currently contains authentication, tenant, outlet, status,
pagination, date conversion, and menu contracts.

```dart
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
```
