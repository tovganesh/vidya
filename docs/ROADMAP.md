# VidyaSetu — Implementation Roadmap & Milestone Specifications

> **Version:** 1.0.0  
> **Status:** Active Execution  
> **Execution Strategy:** Incremental, Test-Validated, Production-Grade  

---

## Roadmap Overview

VidyaSetu is built in tightly scoped, independently verifiable milestones. Each milestone represents a complete, cohesive slice of functionality backed by automated tests, type validation, and clear acceptance criteria.

```text
  [M1: Workspace & Dev Env] ──► [M2: Database & Core Migrations] ──► [M3: Auth, RBAC & 2FA]
                                                                             │
  [M6: Attendance & Timetable] ◄── [M5: People & Enrollment] ◄── [M4: School & Academics]
            │
            ▼
  [M7: Web Push & Alerts] ──► [M8: Exams & Report Cards] ──► [M9: Fees & Indian Receipts]
                                                                             │
                                                                             ▼
                                                      [M10: Production Readiness & PWA]
```

---

## Milestone 1: Workspace Architecture & Development Environment

### 1.1 Objectives
- Initialize root monorepo using npm workspaces (`backend`, `frontend`).
- Set up Docker environment (`docker-compose.yml`, `Dockerfile`s) for PostgreSQL 16 and optional Valkey.
- Configure TypeScript strict compiler options, ESLint, Prettier, and environment variable templates (`.env.example`).
- Create working health check endpoint (`/api/v1/health`) in the Fastify backend and a responsive Vue 3 app shell with custom design token system.
- Establish automated lint, typecheck, and test runner scripts.

### 1.2 Database Changes
- None (PostgreSQL container provisioned and verified reachable via TCP probe).

### 1.3 Backend Changes
- Fastify server bootstrapping with TypeScript (`backend/src/server.ts`, `backend/src/app.ts`).
- Plugins registered: `@fastify/cors`, `@fastify/helmet`, `@fastify/sensible`.
- Health check router (`GET /api/v1/health` returning system timestamp, uptime, environment, and db connection status).
- Structured logging configuration via Pino.
- Centralized configuration loader with Zod validation (`backend/src/config/env.ts`).

### 1.4 Frontend Changes
- Vue 3 + Vite + TypeScript application scaffolding (`frontend/`).
- Baseline responsive styling foundation (`frontend/src/styles/tokens.css`, `main.css`) featuring custom CSS design tokens (calm slate/indigo palette, clean typography, WCAG AA contrast).
- Vue Router configuration with placeholder layout shells (`AppShell.vue`).
- Pinia store initialization (`frontend/src/stores/`).
- App health check view or status indicator validating backend API connectivity.

### 1.5 APIs
- `GET /api/v1/health` -> `{ status: "ok", timestamp: string, version: string }`

### 1.6 Automated Tests
- Backend: Supertest / Fastify `inject` test for health check endpoint.
- Frontend: Component mount smoke test via Vitest.
- Typecheck & Lint: `npm run typecheck`, `npm run lint` passing with zero errors.

### 1.7 Acceptance Criteria
- Running `docker compose up -d` starts PostgreSQL 16.
- Running `npm run dev` boots both backend (port 4000) and frontend (port 5173).
- Visiting `http://localhost:5173` renders the modern VidyaSetu shell and successfully queries the backend `/api/v1/health` endpoint.
- All lint, typecheck, and unit test commands exit with code 0.

---

## Milestone 2: Database Layer, Core Migrations & Seed Data Engine

### 2.1 Objectives
- Establish the PostgreSQL relational schema using Prisma ORM.
- Implement database migrations for Core, Identity, Academics, and People tables.
- Build an idempotent database seeder (`backend/prisma/seeds/seed.ts`) that populates a realistic Indian school: *"VidyaSetu Demo Academy"* (CBSE Board, 2026-27 Academic Year, Classes Nursery–12, Sections A/B, Subjects, Demo Users for all 11 roles).

### 2.2 Database Changes
- Tables created: `organizations`, `schools`, `campuses`, `academic_years`, `classes`, `sections`, `subjects`, `class_subjects`, `users`, `roles`, `permissions`, `role_permissions`, `audit_logs`.
- Indexes: B-Tree indexes on `school_id`, `(school_id, code)`, `(school_id, email)`.

### 2.3 Backend Changes
- Prisma Client singleton with connection pooling and query logging (`backend/src/database/db.ts`).
- Database health check integration in `/api/v1/health`.
- Seeding script with realistic Indian demographics, classes, and roles.

### 2.4 Frontend Changes
- Developer diagnostics dashboard or database status indicator in dev mode.

### 2.5 APIs
- `GET /api/v1/health` (enhanced with DB latency and migration status).

### 2.6 Automated Tests
- Integration tests validating Prisma connection, transaction rollback, and seed integrity.
- Tests ensuring foreign key constraints reject orphaned records.

### 2.7 Acceptance Criteria
- `npx prisma migrate dev` applies all migrations cleanly to empty database.
- `npx prisma db seed` successfully provisions all demo records without constraint violations.

---

## Milestone 3: Authentication, RBAC & Two-Factor Authentication (2FA)

### 3.1 Objectives
- Implement secure JWT-based authentication with token rotation and revocation.
- Enforce Role-Based Access Control (RBAC) across 11 standard roles with granular permission checks.
- Add TOTP-based Two-Factor Authentication (RFC 6238) for administrative accounts (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `ACCOUNTANT`).
- Implement immutable audit logging middleware capturing request actor, action, and payload diffs.

### 3.2 Database Changes
- Tables: `refresh_tokens`, `sessions`.
- Columns added to `users`: `totp_secret`, `is_totp_enabled`, `backup_codes`.

### 3.3 Backend Changes
- Authentication routes: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- 2FA routes: `POST /api/v1/auth/2fa/setup`, `POST /api/v1/auth/2fa/verify`, `POST /api/v1/auth/2fa/disable`.
- Password hashing using Argon2id.
- JWT verification pre-handler (`authenticate`) & permission guard (`authorize(['student:read'])`).
- Audit logging interceptor (`onResponse` hook).

### 3.4 Frontend Changes
- Auth pages: Login with email/phone, password, and TOTP 2FA prompt.
- Pinia `useAuthStore` managing token refresh and authenticated user state.
- Navigation guards in Vue Router redirecting unauthenticated or unauthorized requests.
- Modern User Profile & Security Settings view to enable/disable 2FA with QR Code.

### 3.5 APIs
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/2fa/setup`
- `POST /api/v1/auth/2fa/verify`

### 3.6 Automated Tests
- Unit tests: Argon2 hashing, JWT signing/verifying, TOTP token generation/validation.
- API tests: Login success, invalid credentials 401, token rotation, 2FA challenge flow, unauthorized 403.

### 3.7 Acceptance Criteria
- Logging in as `schooladmin@vidyasetu.org` returns tokens and requires 2FA if enabled.
- Accessing protected endpoints without token returns 401; with wrong permissions returns 403.
- Audit log entry is written for every state-changing authentication request.

---

## Milestone 4: School Administration & Academic Setup

### 4.1 Objectives
- Build administrative UI and APIs for School profile, Campuses, and Academic Years.
- Manage grade levels (`Classes`), `Sections`, and `Subjects`.
- Provide an intuitive onboarding wizard for configuring new academic sessions.

### 4.2 Database Changes
- Indices on `(academic_year_id, status)` and `(school_id, order_index)`.

### 4.3 Backend Changes
- Module `src/modules/schools/` and `src/modules/academics/`.
- CRUD endpoints with tenant scoping for Academic Years, Classes, Sections, Subjects.
- Logic enforcing that exactly one Academic Year has `is_current = true`.

### 4.4 Frontend Changes
- Administrative dashboard with navigation organized by intent.
- Academic Year management view (Planning, Activating, Archiving).
- Classes & Sections grid with capacity indicators and quick action menus.
- Subject master list with theory/practical tags.

### 4.5 APIs
- `GET/POST/PUT /api/v1/schools/profile`
- `GET/POST/PUT /api/v1/academics/years`
- `POST /api/v1/academics/years/:id/activate`
- `GET/POST/PUT/DELETE /api/v1/academics/classes`
- `GET/POST/PUT/DELETE /api/v1/academics/sections`
- `GET/POST/PUT/DELETE /api/v1/academics/subjects`

### 4.6 Automated Tests
- Unit & API tests for academic year transition rules and class-section uniqueness.

### 4.7 Acceptance Criteria
- School Admin can create a new academic year, configure classes (Nursery to 12), create sections, and assign subjects through a fast, responsive interface.

---

## Milestone 5: People Management & Academic Enrollment

### 5.1 Objectives
- Implement comprehensive master profiles for Students, Guardians/Parents, and Teachers.
- Model lifelong student enrollment (`enrollments`) by Academic Year, Class, and Section.
- Enable student promotion/transfer workflows and guardian linking.

### 5.2 Database Changes
- Tables: `students`, `guardians`, `student_guardians`, `teachers`, `enrollments`.
- Constraints: Unique `admission_number` per school, unique `(student_id, academic_year_id)`.

### 5.3 Backend Changes
- Modules: `students`, `guardians`, `teachers`, `enrollments`.
- Student admission API, guardian association, teacher onboarding.
- Promotion API: Batch promote students from Class N Section A (Year Y) to Class N+1 Section B (Year Y+1).

### 5.4 Frontend Changes
- People Directory with instant search, grade filters, and tabbed views (Students, Parents, Teachers).
- Comprehensive Student 360 Profile: Personal info, APAAR/Aadhaar details, guardians, enrollment history timeline.
- Student Admission modal with multi-step wizard (Personal -> Guardians -> Enrollment).
- Student Promotion tool with class-wise checklist.

### 5.5 APIs
- `GET/POST/PUT /api/v1/students`
- `GET /api/v1/students/:id`
- `POST /api/v1/students/:id/guardians`
- `GET/POST/PUT /api/v1/teachers`
- `POST /api/v1/enrollments/batch-promote`

### 5.6 Automated Tests
- Tests for student admission uniqueness, guardian relationship junction, and multi-year enrollment isolation.

### 5.7 Acceptance Criteria
- Admins can admit students, assign them to Class 1-A for 2026-27, link father and mother profiles, and verify that changing academic years preserves historical records.

---

## Milestone 6: Core Operations — Attendance, Timetable & Teacher Allocations

### 6.1 Objectives
- Daily attendance marking (fast mobile-friendly roll call for teachers).
- Attendance reporting (monthly registers, absenteeism percentages, low-attendance warnings).
- Weekly class timetable builder with period schedule and teacher conflict avoidance.

### 6.2 Database Changes
- Tables: `attendance_records`, `periods`, `timetables`, `timetable_slots`, `teacher_allocations`.

### 6.3 Backend Changes
- Modules: `attendance`, `timetable`.
- Bulk attendance recording endpoint with upsert semantics.
- Conflict detection engine for timetable slots (preventing a teacher from being scheduled in two rooms at the same period).

### 6.4 Frontend Changes
- Teacher Roll Call View: One-tap Present/Absent/Late toggle with "Mark All Present" shortcut.
- Attendance Register: Heatmap calendar and class-wise monthly attendance percentage.
- Timetable Visual Grid: Drag-and-drop or slot-based weekly timetable viewer and editor.

### 6.5 APIs
- `GET /api/v1/attendance/sheet?classId=...&sectionId=...&date=...`
- `POST /api/v1/attendance/batch`
- `GET /api/v1/attendance/reports/monthly`
- `GET/POST /api/v1/timetable/class/:sectionId`
- `POST /api/v1/timetable/allocations`

### 6.6 Automated Tests
- Concurrency test on attendance submission; timetable conflict validator test.

### 6.7 Acceptance Criteria
- Class teacher marks attendance in under 15 seconds for 40 students on mobile screen.

---

## Milestone 7: Communication & Web Push Notification Engine

### 7.1 Objectives
- Native browser Web Push implementation using RFC 8291 / RFC 8292 (VAPID).
- In-app notification center with read/unread tracking and real-time counter.
- Decoupled domain event dispatcher (`NotificationDispatcher`) for automated school events.

### 7.2 Database Changes
- Tables: `push_subscriptions`, `notifications`, `notification_templates`.

### 7.3 Backend Changes
- Module `notifications`: VAPID key generation and verification, subscription registry.
- Web Push sender using standard `web-push` library.
- Event subscribers for `student.absent`, `fee.received`, `announcement.published`.

### 7.4 Frontend Changes
- Service worker registration with `PushManager.subscribe()`.
- Notification Permission Banner & Settings toggle in user profile.
- Topbar Notification Bell with dropdown list and "Mark all as read" capability.
- In-app toast alerts for real-time notifications.

### 7.5 APIs
- `GET /api/v1/notifications/vapid-key`
- `POST /api/v1/notifications/subscribe`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

### 7.6 Automated Tests
- Unit test for VAPID payload signing and notification event dispatching.

### 7.7 Acceptance Criteria
- User receives native desktop/mobile push alert when an announcement is posted or attendance is marked absent.

---

## Milestone 8: Academics — Examinations, Grading & Report Cards

### 8.1 Objectives
- Exam term scheduling (Term 1, Term 2, Unit Tests).
- Marks entry sheet with validation against maximum subject marks.
- Automated grading rules (CBSE 8-point / 9-point scale or percentage-based).
- Printable, accessible digital Report Card cards for students and parents.

### 8.2 Database Changes
- Tables: `exam_terms`, `exams`, `assessments`, `marks_records`, `grading_scales`.

### 8.3 Backend Changes
- Module `exams`: Exam term scheduling, assessment definition per class-subject, marks ingestion.
- Report card calculation engine: Cumulative percentage, subject-wise grade calculation, GPA computation.

### 8.4 Frontend Changes
- Exam Schedule manager.
- Spreadsheet-like Marks Entry Grid with keyboard navigation (Enter/Tab to jump cells).
- Student Report Card View with high-fidelity print stylesheet (A4 format).

### 8.5 APIs
- `GET/POST /api/v1/exams/terms`
- `GET/POST /api/v1/exams/:id/assessments`
- `POST /api/v1/exams/assessments/:id/marks/batch`
- `GET /api/v1/exams/report-card/:enrollmentId`

### 8.6 Automated Tests
- Grading engine calculation tests; boundary tests on marks exceeding maximum limits.

### 8.7 Acceptance Criteria
- Teacher enters marks for 40 students; system automatically generates printable CBSE-style report cards with grades and rank indicators.

---

## Milestone 9: Finance — Fee Structures, Invoicing & Indian Receipts

### 9.1 Objectives
- Create modular Indian school fee structures (Tuition, Lab, Annual, Transport).
- Generate student fee ledgers with individual concessions (Sibling, Merit, Staff).
- Record payments across cash, UPI, cheque, and bank transfer.
- Issue numbered, tamper-proof payment receipts with formal school header and breakdown.

### 9.2 Database Changes
- Tables: `fee_categories`, `fee_structures`, `fee_components`, `student_fees`, `fee_payments`, `receipts`.

### 9.3 Backend Changes
- Module `fees`: Structure builder, batch fee allocation to classes, payment recording with transaction rollback.
- Receipt numbering sequence generator (`REC-YYYY-XXXX`).

### 9.4 Frontend Changes
- Fee Structure Configuration panel.
- Student Fee Collection terminal: Search student, view outstanding dues, input payment, generate receipt.
- Printable Official Fee Receipt view with QR code / verification code.
- Dues Collection Dashboard: Class-wise outstanding fees with export to CSV.

### 9.5 APIs
- `GET/POST /api/v1/fees/structures`
- `GET /api/v1/fees/student/:enrollmentId`
- `POST /api/v1/fees/payments/collect`
- `GET /api/v1/fees/receipts/:receiptNumber`

### 9.6 Automated Tests
- Financial ledger consistency tests; payment over-allocation prevention tests; receipt sequence test.

### 9.7 Acceptance Criteria
- Accountant records ₹25,000 UPI payment against student dues and instantly generates printable receipt `REC-2026-0001`.

---

## Milestone 10: Production Readiness, PWA & Open-Source Packaging

### 10.1 Objectives
- Finalize PWA capabilities (manifest, offline caching shell, icon set).
- Complete documentation (`README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `SECURITY.md`, `LICENSE`).
- Comprehensive end-to-end integration test suite covering the full school lifecycle.
- Production multi-stage Docker build verification.

### 10.2 Acceptance Criteria
- `docker compose -f docker-compose.prod.yml up` boots fully compiled system in production mode.
- Lighthouse PWA score >= 90; zero security vulnerabilities on dependency audit.
