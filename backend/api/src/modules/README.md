# Backend Modules

Business modules expose application services and domain contracts. Controllers
must not access PostgreSQL directly or import another module's persistence layer.
