# Architecture Decision Records (ADRs)

## ADR 001: Asynchronous Web Framework Selection
* **Status**: Accepted
* **Decision**: Use FastAPI (Python) for core API service.
* **Context**: Need high concurrency for video streaming metadata, native OpenAPI generation, Pydantic type safety, and async I/O.
* **Consequences**: Fast response times, built-in Swagger/ReDoc, strict contract enforcement.

## ADR 002: Relational vs Document Store for Core Entities
* **Status**: Accepted
* **Decision**: PostgreSQL with SQLAlchemy 2.0.
* **Context**: User profiles, RBAC roles, video ownership, and audit views require ACID transactions, foreign keys, and relational indexes.
* **Consequences**: Rock-solid consistency, proven connection pooling, robust tooling.

## ADR 003: Stateless JWT Authentication & Role-Based Authorization
* **Status**: Accepted
* **Decision**: Signed HMAC-SHA256 (HS256) JSON Web Tokens with Bcrypt password hashing.
* **Context**: Backend microservices will scale horizontally via Kubernetes HPA. Stateful sessions (cookies/Redis session stores) add operational complexity.
* **Consequences**: Replicas can independently verify authentication signatures without central session lookup bottlenecks.

## ADR 004: Decoupled Health Probing (/live vs /ready)
* **Status**: Accepted
* **Decision**: Implement discrete endpoints for Liveness and Readiness.
* **Context**: A database hiccup should NOT cause Kubernetes to kill the application process (CrashLoop), but it MUST stop sending user traffic to that pod.
* **Consequences**: Zero user-facing 502/504 errors during transient downstream delays.
