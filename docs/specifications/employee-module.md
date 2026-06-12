# Employee and Staff Management Specification

## Identity Boundary

Task 23 manages restaurant workforce profiles. It deliberately does not
duplicate users or credentials. Employee creation accepts an existing `userId`
and validates active tenant membership, the selected `roleId`, and outlet
assignment. Task 24 owns user provisioning and general RBAC administration.

## Shift Workflow

1. An administrator creates an outlet shift with start/end wall-clock times,
   break duration, night-shift flag, and active state.
2. An administrator assigns an employee with an effective date range.
3. The API rejects cross-outlet assignments and overlapping ranges.
4. Assignment history is retained for attendance and payroll foundations.

## Attendance Workflow

1. The employee or authorized manager submits check-in.
2. The API verifies employee scope, active status, and an effective shift.
3. A single attendance record is created for the business date.
4. Check-out updates the same record and calculates elapsed worked minutes.
5. Device and location fields are optional integration foundations, not proof
   of presence by themselves.

## Performance Rules

- Waiter: non-cancelled assigned orders, order sales, distinct customers,
  quantities, discounts, and average ticket.
- Cashier: generated bills, successful collections net of refunds, and refund
  actions.
- Kitchen: ready-item quantities, average actual preparation time, and delayed
  item count.
- Manager: outlet-wide collections and productivity projection.
- Tips and customer rating are reserved fields until their source contracts
  exist.

Daily projections are idempotently upserted by employee and business date.
Order completion, successful/refunded payment, and kitchen-ready transitions
refresh the affected projection. Report reads also rebuild projections from
source facts to recover from missed events.

## Events

Typed placeholders exist for `EmployeeCreated`, `ShiftAssigned`,
`AttendanceCheckedIn`, `AttendanceCheckedOut`, and `PerformanceUpdated`.
Socket.IO delivery is intentionally deferred.

## Future Work

Payroll, incentives, leave approval, biometric verification, rota optimization,
tip allocation, ratings, and employee mobile self-service require dedicated
contracts and must not rewrite historical attendance or performance facts.
