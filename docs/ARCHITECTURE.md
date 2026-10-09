# Vidya — System Architecture Document

> **Version:** 1.0.0  
> **Status:** Approved / Foundational  
> **Author:** Vidya Core Architecture Team  
> **Scope:** Product Architecture, Modular Boundaries, Security & Deployment  

---

## 1. Executive Overview

**Vidya** is an open-source, modern School Operating System engineered specifically for the operational reality of Indian primary, secondary, and higher-secondary educational institutions (CBSE, ICSE, State Boards, and International curricula).

Unlike legacy school ERP systems characterized by clunky table dumps, archaic 2000s web interfaces, and rigid commercial lock-ins, Vidya is designed as a **modular monolith** with a web-first, mobile-responsive, role-adaptive UX. It is fully self-hostable using standard open-source technologies: **PostgreSQL**, **Node.js (TypeScript)**, and **Vue 3**.

---

## 2. High-Level Architecture

Vidya follows a strict **Modular Monolith** pattern. All business domains are organized as isolated functional modules that communicate through strictly typed contracts, in-memory event dispatching, and well-defined service interfaces. This delivers fast local development, single-binary container deployment, zero distributed systems operational overhead, and a clear migration path to microservices if multi-campus scaling demands it.

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Client Layer (Vue 3 + PWA)                        │
 │  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────────┐ │
 │  │ School Admin     │ │ Teacher Portal   │ │ Parent / Student Portal │ │
 │  │ Responsive Web   │ │ Mobile Web / PWA │ │ Mobile Web / PWA        │ │
 │  └─────────┬────────┘ └────────┬─────────┘ └────────────┬────────────┘ │
 └────────────┼───────────────────┼────────────────────────┼──────────────┘
              │                   │                        │
         HTTPS / REST API    HTTPS / REST API         HTTPS / REST API
              │                   │                        │
 ┌────────────▼───────────────────▼────────────────────────▼──────────────┐
 │               Edge & API Gateway Layer (Caddy / Nginx)                 │
 │       • TLS Termination  • Reverse Proxy  • Static Assets (PWA)        │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
 ┌───────────────────────────────────▼────────────────────────────────────┐
 │               Application Core (Node.js + Fastify + TS)                │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │                      Cross-Cutting Middleware                    │  │
 │  │  • Tenant Context    • JWT Auth & TOTP    • RBAC & Scope Guard   │  │
 │  │  • Rate Limiting     • Audit Interceptor  • RFC 7807 Error Map   │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     │                                  │
 │  ┌──────────────────────────────────▼───────────────────────────────┐  │
 │  │                        Modular Domains                           │  │
 │  │  ┌───────────────┐ ┌───────────────┐ ┌────────────────────────┐  │  │
 │  │  │ Core / School │ │ Auth & Users  │ │ Academics & Enrollment │  │  │
 │  │  ├───────────────┤ ├───────────────┤ ├────────────────────────┤  │  │
 │  │  │ Attendance    │ │ Timetable     │ │ Exams & Marks          │  │  │
 │  │  ├───────────────┤ ├───────────────┤ ├────────────────────────┤  │  │
 │  │  │ Fee & Finance │ │ Notifications │ │ Audit & Documents      │  │  │
 │  │  └───────────────┘ └───────────────┘ └────────────────────────┘  │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     │                                  │
 │  ┌──────────────────────────────────▼───────────────────────────────┐  │
 │  │                   Shared Infrastructure Services                 │  │
 │  │  • In-Memory Event Bus   • Web Push Engine  • Storage Abstraction│  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 └─────────────────────────────────────┼──────────────────────────────────┘
                                       │
 ┌─────────────────────────────────────▼──────────────────────────────────┐
 │                           Persistence Layer                            │
 │                                                                        │
 │  ┌─────────────────────────────────┐ ┌──────────────────────────────┐  │
 │  │      PostgreSQL 16 (Primary)    │ │ Valkey (Optional Cache /     │  │
 │  │   • Strict Foreign Keys         │ │         Rate Limits)         │  │
 │  │   • Tenant-Scoped Discriminator │ └──────────────────────────────┘  │
 │  │   • JSONB Audit Differentials   │ ┌──────────────────────────────┐  │
 │  │   • B-Tree & Compound Indexes   │ │ Local / S3 Object Storage    │  │
 │  └─────────────────────────────────┘ └──────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Major Functional Modules

| Module | Scope & Responsibilities | Key Entities Handled |
| :--- | :--- | :--- |
| **`core-school`** | Multi-campus, organization, school profile, affiliation numbers (CBSE/ICSE/State), settings. | `organizations`, `schools`, `campuses`, `school_settings` |
| **`identity-access`**| Authentication, JWT lifecycle, password hashing (Argon2id), 2FA TOTP, RBAC permissions, audit logger. | `users`, `roles`, `permissions`, `role_permissions`, `sessions`, `audit_logs` |
| **`academics`** | Academic year boundaries, grade tiers (Nursery–12), sections, subject registry, class-subject linkages. | `academic_years`, `classes`, `sections`, `subjects`, `class_subjects` |
| **`people`** | Profiles for students, parents/guardians, teachers, staff; addresses, blood group, emergency contacts. | `students`, `guardians`, `student_guardians`, `teachers`, `staff` |
| **`enrollment`** | Year-bound student-to-section placement; preserves lifelong historical academic trajectories. | `enrollments`, `enrollment_history` |
| **`attendance`** | Daily/session attendance recording, late/excused tracking, holiday calendars, automated absenteeism events. | `attendance_records`, `academic_calendars`, `holidays` |
| **`timetable`** | Period schedule, room allocation, teacher load balancing, class timetable generation & conflict detection. | `periods`, `timetables`, `timetable_slots`, `teacher_allocations` |
| **`examinations`**| Exam terms (Term 1, Term 2, Pre-Boards), grading scales, subject assessments, marks entry, report card cards. | `exam_terms`, `exams`, `assessments`, `marks`, `grading_scales` |
| **`fee-finance`** | Fee structures, installment schedules, student fee demands, fee concessions, Indian GST/receipt generation. | `fee_categories`, `fee_structures`, `fee_components`, `student_fees`, `fee_payments`, `receipts` |
| **`notifications`**| Web Push (VAPID), in-app notification inbox, event dispatcher, subscription registry, email hooks. | `push_subscriptions`, `notifications`, `notification_templates` |
| **`audit`** | System-wide append-only audit trail capturing actor, action, diff (before/after), client IP, user agent. | `audit_logs` |

---

## 4. Frontend Architecture

### 4.1 Framework & Core Tooling
- **Vue 3**: Leveraging the Composition API with `<script setup>` syntax for strict type safety and modular logic reuse.
- **TypeScript**: Strict mode enabled across all components, composables, and stores.
- **Vite**: Ultra-fast build times, Hot Module Replacement (HMR), and optimized production rollups.
- **Vue Router**: Dynamic route loading with nested layouts (`AppShell`, `AuthLayout`), client-side role guards, and scroll restoration.
- **Pinia**: Lightweight, type-safe state management split by domain (`useAuthStore`, `useTenantStore`, `useNotificationStore`).

### 4.2 Design System & Aesthetics
- **Bespoke Design Token System**: Modern custom CSS variables (`--color-surface`, `--color-primary-600`, `--color-accent`, `--radius-md`, `--shadow-sm`).
- **Typography**: Clean, readable modern typography stack (Inter / Plus Jakarta Sans) tuned for data clarity and administrative efficiency.
- **Visual Feel**: Calm, high-contrast, professional, responsive interface. Designed with purposeful whitespace, subtle borders, card elevations, and tactile feedback.
- **Accessibility (WCAG 2.1 AA)**: Semantic HTML elements (`main`, `nav`, `section`, `dialog`), keyboard navigation focus rings (`:focus-visible`), aria labels on icon-only actions, and color contrast exceeding 4.5:1.

### 4.3 PWA & Web Push
- **Service Worker**: Caches app shell, static assets, and offline fallbacks.
- **Web Push API**: Standard browser-native push messaging using standard VAPID public/private key pairs. No Firebase or third-party native app bridge required.

### 4.4 Localization (i18n Ready)
- Architecture pre-configured for multi-lingual Indian deployments (`en`, `hi`, `ta`, `te`, `kn`, `mr`, `bn`).
- Localized formatters for Indian numbering (`1,00,000` Lakhs/Crores), INR currency (`₹`), and dates (`DD/MM/YYYY`).

---

## 5. Backend Architecture

### 5.1 Runtime & Framework
- **Runtime**: Node.js v20+ LTS (active environment: Node.js v24).
- **HTTP Server**: **Fastify** — chosen for its low overhead, schema-driven serialization, native plugin architecture (providing natural module encapsulation), and performance.
- **Validation**: Schema-based validation using **Zod** or Fastify's native **Ajv/TypeBox** ensuring 100% runtime validation for request parameters, query strings, headers, and payloads before reaching controller handlers.

### 5.2 Modular Encapsulation Pattern
Each module adheres to a clean layered internal structure:
```text
src/modules/<module-name>/
├── <module-name>.routes.ts       # HTTP endpoint definitions & schema binding
├── <module-name>.controller.ts   # Request extraction, response formatting
├── <module-name>.service.ts      # Pure business logic and orchestration
├── <module-name>.repository.ts   # Database access layer (Prisma queries)
├── <module-name>.schema.ts       # Zod validation schemas & TypeScript DTOs
└── <module-name>.events.ts       # Domain event publishers and listeners
```

### 5.3 Inter-Module Communication
- Modules must not execute direct cross-domain SQL joins or mutate foreign tables directly.
- Communication occurs via **direct typed service calls** or **asynchronous domain events** emitted to an in-memory `EventBus`.
- Example: When `AttendanceService` marks an unexcused absence, it emits `student.absent` with payload `{ studentId, date, period }`. The `NotificationsModule` subscribes to `student.absent` and triggers a Web Push notification to linked guardians.

---

## 6. Database Architecture

### 6.1 Database Engine
- **PostgreSQL 16+**: Chosen for relational integrity, JSONB support (for audit diffs and dynamic form attributes), transactional guarantees (ACID), and multi-tenant performance.
- **ORM & Migrations**: **Prisma ORM** — provides an expressive schema definition language, automated declarative migrations (`prisma migrate`), type-safe client generation, and great developer onboarding.

### 6.2 Multi-Tenancy Strategy
- **Shared Database, Discriminator Column (`school_id`)**:
  - Every tenant-bound table contains a mandatory indexed foreign key `school_id UUID REFERENCES schools(id)`.
  - Backend middleware automatically extracts the tenant context from the authenticated user token and injects it into request context.
  - Queries are enforced with `WHERE school_id = :schoolId`.
  - Avoids premature complexity of schema-per-tenant while keeping zero risk of data crosstalk.

### 6.3 Soft Deletion vs Hard Deletion
- **Soft Deletion (`deleted_at TIMESTAMP WITH TIME ZONE`)**: Used only for core record entities where historical referencing must be preserved (`students`, `teachers`, `classes`, `academic_years`, `fee_structures`).
- **Hard Deletion / Lifecycle Status**: Transient or state-machine entities (such as session tokens, push subscriptions, temporary allocations) use explicit status columns (`ACTIVE`, `REVOKED`, `EXPIRED`) or hard deletes when revoked.

---

## 7. Authentication, Authorization & Security Architecture

### 7.1 Authentication Lifecycle
1. **Password Hashing**: Passwords stored using **Argon2id** (memory cost 64MB, iterations 3) or **Bcrypt** (cost 12).
2. **Access Tokens**: Short-lived JWTs (15 minutes expiry) containing `sub` (userId), `schoolId`, `role`, and active `permissions`.
3. **Refresh Tokens**: Opaque cryptographically random tokens (30 days validity) stored in the database with device fingerprinting and family revocation (rotation on every use to detect token theft).
4. **Two-Factor Authentication (2FA)**: Mandatory or configurable for administrative roles (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `ACCOUNTANT`). Uses standard TOTP (RFC 6238, Google/Microsoft Authenticator) with encrypted secret keys and one-time emergency backup codes.

### 7.2 Authorization Matrix (RBAC + Scopes)
Eleven primary system roles:
1. `SUPER_ADMIN` (Multi-school platform manager)
2. `SCHOOL_ADMIN` (School IT / Management Head)
3. `PRINCIPAL` (Academic and operational supervisor)
4. `VICE_PRINCIPAL` (Academic administrator)
5. `TEACHER` (Classroom teacher / subject teacher)
6. `ACCOUNTANT` (Fee collection and financial books)
7. `LIBRARIAN` (Library management)
8. `TRANSPORT_MANAGER` (Buses and routes)
9. `HR_MANAGER` (Staff records and payroll)
10. `PARENT` (Guardian of one or more enrolled students)
11. `STUDENT` (Enrolled student)

**Scope Enforcement**:
- Roles define base capabilities (e.g. `attendance:mark`).
- Scope limits the execution boundary (e.g. Teacher can only mark attendance for classes assigned in `teacher_allocations`; Parent can only view records where `guardian_id = user.id`).

### 7.3 Audit Trail Architecture
Every mutating operation (POST, PUT, PATCH, DELETE) passes through an audit middleware capturing:
- `actor_id`: User performing the action.
- `school_id`: Tenant context.
- `action`: E.g., `STUDENT_ENROLLED`, `FEE_PAYMENT_COLLECTED`, `MARKS_UPDATED`.
- `entity_type`: Table / resource name.
- `entity_id`: Primary key of modified record.
- `diff`: JSONB containing `{ before: ..., after: ... }`.
- `client_info`: IP address, User-Agent, Request ID.

---

## 8. Notification Architecture

```text
 ┌──────────────────────┐
 │   Business Event     │ (e.g. Fee Paid, Attendance Marked, Exam Announced)
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │  NotificationDispatcher│
 └──────────┬───────────┘
            │
      ┌─────┴─────────────────────────────────────┐
      │                                           │
      ▼                                           ▼
 ┌─────────────────────────┐         ┌─────────────────────────┐
 │   In-App Notification   │         │    Web Push Dispatch    │
 │  • Stored in Database   │         │  • VAPID Cryptography   │
 │  • Real-time SSE / Poll │         │  • Sends to Push Service│
 │  • Badge counters       │         │  • Decrypted in SW      │
 └─────────────────────────┘         └─────────────────────────┘
```

- **Zero Vendor Lock-In**: Avoids Firebase Cloud Messaging native SDK lock-in. Uses open standard **RFC 8291 / RFC 8292 Web Push** via standard Node `web-push`.
- **Client Resilience**: The Service Worker captures push events in the background, displays rich native system notifications with school branding, and deep-links directly to the relevant view upon tap.

---

## 9. Deployment Architecture

### 9.1 Self-Hosting & Containerization
- **Single Command Bootstrapping**:
  ```bash
  git clone https://github.com/tovganesh/vidya.git
  cp .env.example .env
  docker compose up -d
  ```
- **Docker Compose Topology**:
  1. `vidya-db`: PostgreSQL 16 image with healthcheck.
  2. `vidya-api`: Node.js multi-stage production container running the Fastify backend.
  3. `vidya-web`: Lightweight Nginx container serving compiled Vue 3 SPA/PWA assets and proxying `/api` traffic.
  4. *(Optional)* `vidya-cache`: Valkey container for session caching and rate-limiting.

### 9.2 Zero-Downtime Migration Execution
- Database migrations execute during container startup (`prisma migrate deploy`) with backward-compatible additive changes.

---
