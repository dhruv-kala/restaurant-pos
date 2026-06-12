# Employee and Staff API

All endpoints require JWT authentication and use trusted tenant/outlet context.
Employee profiles reference existing `UserAccount`, tenant membership, role, and
outlet assignment records. This module does not create login identities.

## Employees

- `POST /api/v1/employees`
- `GET /api/v1/employees`
- `GET /api/v1/employees/dashboard`
- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`
- `DELETE /api/v1/employees/:id`
- `GET /api/v1/employees/:id/performance`

List filters include `page`, `limit`, `search`, `designation`, `department`,
`status`, `outletId`, and `shiftId`. Delete is a soft termination preserving
attendance, assignment, and performance history.

## Shifts

- `POST /api/v1/shifts`
- `GET /api/v1/shifts`
- `PATCH /api/v1/shifts/:id`
- `DELETE /api/v1/shifts/:id`
- `POST /api/v1/shifts/assign`

Assignments are effective-dated, same-tenant/same-outlet, and cannot overlap.
A shift with assignment history is deactivated instead of physically deleted.

## Attendance

- `POST /api/v1/attendance/check-in`
- `POST /api/v1/attendance/check-out`
- `GET /api/v1/attendance`
- `GET /api/v1/attendance/:employeeId`

Check-in requires an active shift assignment and is unique per employee and
attendance date. Check-out requires a prior check-in and calculates worked
minutes from UTC instants. Attendance stores business date, optional device ID,
optional captured location JSON, remarks, status, and recording actor.

## Performance

- `GET /api/v1/reports/employees/performance`

Daily projections are refreshed from orders, payments, refunds, bills, and
kitchen item transitions. Operational source workflows also refresh affected
employee projections automatically.

## Authorization

`SUPER_ADMIN` has platform access. `TENANT_ADMIN` and `HR_MANAGER` are tenant
scoped. `MANAGER` is outlet scoped. `EMPLOYEE` may read and record attendance
only for the profile linked to its authenticated user account.
