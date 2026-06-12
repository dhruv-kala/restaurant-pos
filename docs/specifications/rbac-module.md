# RBAC And User Management Specification

## Business Rules

- A global user may have memberships in multiple tenants.
- Tenant status changes affect only the selected membership.
- Every tenant user must have at least one role when created.
- Role and outlet assignments must belong to the same tenant as the membership.
- Custom role codes and names are unique per tenant.
- System roles cannot be deleted.
- Tenant administrators cannot edit system roles.
- Assigned custom roles cannot be deleted until users are reassigned.
- Tenant administrators may grant only permissions included in the tenant-admin
  system template.
- Managers have read-only access limited to their authenticated outlet.
- Password hashes and temporary reset secrets never leave the backend.

## Permission Matrix

Permissions use stable lowercase `module.action` codes. The UI groups rows by
module and presents common actions as view/read, create, update, delete, manage,
and special operations. The initial master catalog contains 184 permissions.

Role assignment is replacement-based: the submitted permission set becomes the
complete set for that custom role. Empty permission arrays are allowed.

## Admin UI

The admin application provides:

- User management dashboard and status metrics
- User directory, create/invite, edit, details, and reset foundation
- Role list, create, edit, and protected system-role display
- Permission catalog/matrix
- User-role assignment
- Role-permission assignment
- Single, multiple, and all-outlet assignment

The Access destination is visible only when the authenticated user is
`SUPER_ADMIN`, `TENANT_ADMIN`, or has `roles.update` or `users.update`.
Backend authorization remains authoritative.

## Super-Admin Boundary

The same shared models and `RbacApiService` support the future super-admin
application. Platform screens must require an explicit tenant selection before
tenant role/user creation and must not silently choose a tenant for a
multi-tenant identity.

## Deferred Work

Task 25 owns immutable audit events for user, role, permission, status,
password-reset, and outlet-access changes. SSO, OAuth, enterprise identity
providers, MFA, and biometric authentication remain out of scope.
