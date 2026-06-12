# Super-Admin Audit Foundation

Task 25 provides platform-authorized audit APIs and shared Flutter contracts.
The tenant admin application contains the first explorer UI.

When the super-admin portal is composed, it should reuse `AuditApiService` and
the shared audit models while adding:

- explicit tenant/platform scope selection
- impersonation actor/effective-actor presentation
- platform security filters
- export reason capture
- tenant-visible support activity

No separate audit storage or client-side authorization model should be created.

