# Shared Packages

Reserved for versioned code and contracts that are genuinely shared between
multiple applications or backend components.

Do not place generic helpers here preemptively. A component should move into
`shared/` only after it has at least two real consumers and a stable ownership
boundary.
