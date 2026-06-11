# Flutter Authentication

## Configuration

The restaurant app receives its API base URL at build or run time:

```powershell
flutter run --dart-define=API_BASE_URL=https://example.com/api/v1
```

No API host is embedded in source. Other Flutter applications can reuse the
same providers by overriding `apiClientConfigProvider`.

## Login Flow

1. `LoginScreen` validates email and password locally.
2. `AuthNotifier.login` calls `AuthRepository`.
3. `AuthRepositoryImpl` calls `POST /auth/login` through `AuthApiService`.
4. Access and refresh tokens are written to `flutter_secure_storage`.
5. The authenticated user and tokens enter Riverpod `AuthState`.
6. GoRouter redirects to the dashboard for the highest-priority backend role.

Passwords are never persisted.

## Session Restore

The app starts at `/splash`. `AuthNotifier.restoreSession` reads secure storage.
When both tokens exist it calls `GET /auth/me`. A valid response restores the
authenticated state. Missing or invalid credentials clear storage and redirect
to `/login`.

## Token Refresh

`AuthInterceptor` attaches the bearer access token to protected requests. On the
first `401` response it:

1. Serializes concurrent refresh attempts behind one completer.
2. Calls `POST /auth/refresh` with the stored refresh token using a separate Dio
   client.
3. Persists the rotated token pair.
4. Retries the original request once.

Refresh endpoints and retried requests cannot recursively refresh. A failed
refresh clears secure storage and resets Riverpod authentication state.

## Logout Flow

1. The dashboard calls `AuthNotifier.logout`.
2. The repository sends `POST /auth/logout` with the refresh token.
3. Secure storage is cleared even when the API is unavailable.
4. Auth state becomes unauthenticated.
5. GoRouter redirects to `/login`.

## Role Navigation

The app recognizes these backend roles:

| Role | Route |
|---|---|
| `SUPER_ADMIN` | `/dashboard/super-admin` |
| `TENANT_ADMIN` | `/dashboard/admin` |
| `MANAGER` | `/dashboard/manager` |
| `CASHIER` | `/dashboard/cashier` |
| `WAITER` | `/dashboard/waiter` |
| `KITCHEN_STAFF` | `/dashboard/kitchen` |
| `CUSTOMER` | `/dashboard/customer` |

Route guards prevent an authenticated user from opening another role's
dashboard. These client checks control presentation only; the NestJS backend
remains authoritative for authorization.
