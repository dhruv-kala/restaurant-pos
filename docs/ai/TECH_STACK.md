# Technology Stack

## Backend

| Concern | Technology |
|---|---|
| Language/runtime | TypeScript on Node.js |
| Framework | NestJS |
| ORM | Prisma |
| Validation/API documentation | NestJS DTO validation and Swagger |
| Authentication | JWT access tokens and rotating refresh tokens |
| Realtime | Socket.IO for approved operational workflows |
| Password hashing | Existing backend hashing implementation; never weaken parameters |
| Testing | Jest and NestJS end-to-end tests |

## Frontend

| Concern | Technology |
|---|---|
| Applications | Flutter and Flutter Web |
| State | Riverpod |
| HTTP | Dio |
| Navigation | GoRouter |
| Local operational storage | SQLite |
| Secure token storage | Flutter secure storage |
| Testing | Dart and Flutter test tooling |

## Database

- PostgreSQL
- Shared-schema multi-tenancy
- Prisma migrations
- UUIDv7 identifiers
- `timestamptz`/UTC instants
- PostgreSQL row-level security
- `citext` where case-insensitive identity is required

## Deployment

- Ubuntu VPS
- PostgreSQL installed directly on the VPS
- PM2 and Nginx are approved later-stage runtime components
- No Docker
- No Kubernetes
- No mandatory cloud dependency initially

## Repository Tooling

- npm for the NestJS backend
- Dart pub workspace for Flutter applications and packages
- ESLint, TypeScript compiler, Prisma validation, Dart analyzer, and test suites

Versions are defined by repository manifests and lockfiles. Agents must inspect
those files instead of guessing versions or upgrading dependencies
opportunistically.

