# ServeIQ Auth

Contains shared authenticated-user and role semantics. JWT, session, tenant
membership, outlet scope, and permission contracts will join this package when
the NestJS identity contract exists.

Firebase-specific login is intentionally not extracted because it is temporary
infrastructure with one consumer.
