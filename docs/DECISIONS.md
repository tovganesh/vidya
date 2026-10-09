# Vidya — Architecture Decision Records (ADRs)

> **Document Status:** Active  
> **Repository:** `vidya`  

---

## ADR 001: System Topology — Modular Monolith vs Microservices

### Context
Schools require high reliability, predictable performance, and low hosting costs. A typical single-school deployment serves between 500 and 5,000 students, while a multi-campus deployment serves 10,000 to 50,000 students. Most schools lack dedicated DevOps engineers to maintain Kubernetes clusters, service meshes, distributed tracing, and event brokers.

### Options
1. **Microservices Architecture**: Separate services for Auth, Academics, Fees, Attendance, Notifications.
2. **Modular Monolith**: Single cohesive codebase organized into strict, decoupled domain modules with clear interfaces.
3. **Traditional Monolith**: Unstructured single-app codebase with ad-hoc cross-table joins.

### Recommendation
**Modular Monolith.**

### Reason
- Drastically simplifies local development, testing, and single-container Docker deployment (`docker compose up`).
- Zero network latency for inter-module operations (e.g., verifying student enrollment during attendance marking).
- Module boundaries are maintained using TypeScript interfaces and internal event publishers, allowing individual modules (such as Notifications or Fee Processing) to be cleanly extracted into independent microservices in the future if high scale warrants it.

---

## ADR 002: Backend Runtime & HTTP Framework — Fastify vs Express vs NestJS

### Context
The backend requires strict TypeScript type safety, high throughput, robust middleware support, schema-based request validation, and clean module encapsulation.

### Options
1. **Express**: The legacy industry standard, but lacks native async error handling in older patterns, has no built-in schema serialization, and provides no built-in encapsulation.
2. **NestJS**: Highly structured Angular-like framework with dependency injection; however, it introduces heavy boilerplate, large bundle footprints, and high cognitive overhead for open-source contributors.
3. **Fastify**: High-performance HTTP engine with a first-class plugin system that matches our modular architecture, native schema validation (Ajv/TypeBox/Zod), and low memory footprint.

### Recommendation
**Fastify + TypeScript.**

### Reason
- Fastify’s plugin model provides true module encapsulation (plugins can register their own scoped routes, decorators, and hooks without leaking state).
- Benchmark throughput is 2x–4x higher than Express with lower latency.
- Out-of-the-box JSON schema validation ensures 100% of payloads and parameters are validated before hitting controller code.

---

## ADR 003: Database Engine & ORM Layer — PostgreSQL + Prisma ORM

### Context
Vidya is a data-critical application requiring ACID transactions for financial ledgers (fees, payments, concessions) and strict relational foreign keys (enrollment, attendance, examinations).

### Options
1. **MongoDB / Document Store**: Flexible schema, but catastrophic for complex relational structures like academic lifecycles, and lacks native relational integrity.
2. **TypeORM**: Mature, but has long-standing bugs with complex migrations and relation queries.
3. **Drizzle ORM**: Extremely fast and lightweight SQL query builder; however, schema migrations and visual relational mapping are less accessible to general open-source contributors.
4. **Prisma ORM**: Declarative schema definition language (`schema.prisma`), fully type-safe generated client, automated database migrations (`prisma migrate`), and high readability for community developers.

### Recommendation
**PostgreSQL 16 + Prisma ORM.**

### Reason
- PostgreSQL provides battle-tested ACID compliance, JSONB indexing for custom forms/audit diffs, and solid performance.
- Prisma’s human-readable schema file serves as the definitive domain documentation for the entire open-source community.
- Automated migrations eliminate manual SQL drifting and ensure seamless updates across self-hosted instances.

---

## ADR 004: Frontend Architecture — Vue 3 (Composition API) + Vite + Pinia

### Context
The frontend needs to serve three distinct audiences: administrative desk staff (high information density, keyboard workflows), classroom teachers (mobile-first, fast tap interactions), and parents (accessible, clean mobile web portal).

### Options
1. **React / Next.js**: Common, but SSR adds operational hosting complexity for simple self-hosters; React state management often results in fragmented boilerplate.
2. **Svelte**: Clean, but smaller ecosystem for enterprise data grids and specialized components.
3. **Vue 3 + Vite + Pinia**: Clear separation of concerns, reactive Composition API, lightweight footprint, and intuitive ergonomics.

### Recommendation
**Vue 3 + TypeScript + Vite + Pinia.**

### Reason
- Matches user specification for Vue.
- Composition API enables reusable domain composables (`useEnrollment`, `useAttendance`, `useFeeCalculator`).
- Built as a Single Page Application (SPA) with PWA capabilities, requiring only a static web server (Nginx/Caddy) without Node SSR overhead in production.

---

## ADR 005: Notification Delivery — Native Web Push (VAPID) vs Native Apps

### Context
Schools typically spend excessive funds building or white-labeling native iOS and Android apps solely to push attendance alerts and fee reminders to parents.

### Options
1. **Native iOS & Android Apps with Firebase Cloud Messaging (FCM)**: High maintenance overhead, app store submission hurdles, proprietary Google/Apple developer accounts required.
2. **SMS Gateway Exclusive**: Expensive per-message pricing (₹0.15–₹0.30 per SMS in India via DLT templates) that causes high recurring bills for schools.
3. **Web Push Protocol (RFC 8291 / RFC 8292 with VAPID)**: Browser-native push notifications that work on modern Android (Chrome), Desktop (all browsers), and iOS 16.4+ (Safari Web Apps).

### Recommendation
**Web Push API as primary channel, with email & SMS hooks as optional adapters.**

### Reason
- Completely free of recurring per-notification SMS charges.
- No app store lock-in, zero app installation barrier; parents simply tap "Allow Notifications" in their mobile browser.
- Uses open standard cryptography (VAPID keys) without requiring Google Cloud or third-party proprietary SDKs.

---

## ADR 006: Multi-Tenancy Architecture — Shared Database with Discriminator Column

### Context
Vidya should support both standalone single-school installations and multi-school group deployments (e.g. 10 branch campuses).

### Options
1. **Database-Per-Tenant**: Highest isolation, but enormous DevOps overhead (managing hundreds of database instances, running migrations in loops).
2. **Schema-Per-Tenant**: Moderate isolation, but high PostgreSQL connection pool exhaustion and migration latency across thousands of schemas.
3. **Shared Database with Tenant Column (`school_id`)**: Single unified schema; all tenant-scoped tables indexed by `school_id`; enforced via application middleware and repository constraints.

### Recommendation
**Shared Database with `school_id` Discriminator Column.**

### Reason
- Easiest for community self-hosters to install, backup, and restore (`pg_dump` of a single database).
- Migration execution is instantaneous on system upgrades.
- Middleware guarantees every query includes the tenant boundary, preventing data leakage.
