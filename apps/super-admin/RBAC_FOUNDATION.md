# RBAC Foundation

The platform portal should reuse:

- `restaurant_pos_shared_models` RBAC models
- `restaurant_pos_api_client` `RbacApiService`
- JWT effective permissions
- `/api/v1/rbac` endpoints

Platform operations must select an explicit tenant for tenant-owned user and
role creation. The admin screens under `apps/admin/lib/features/rbac` establish
the presentation workflows, but super-admin navigation and tenant selection
remain owned by the future runnable super-admin application.
