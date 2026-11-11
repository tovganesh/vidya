# Vidya — The Open School Operating System

<div align="center">
  <img src="frontend/public/icon-512.svg" alt="Vidya Logo" width="96" height="96" />
  <h3>Connect. Manage. Educate.</h3>
  <p><strong>A modern, modular, open-source school operating system designed for Indian primary, secondary, and higher-secondary institutions.</strong></p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License: Apache 2.0" /></a>
    <img src="https://img.shields.io/badge/TypeScript-Strict%20Mode-3178c6.svg" alt="TypeScript Strict" />
    <img src="https://img.shields.io/badge/PWA-Offline%20Ready-6366f1.svg" alt="PWA Ready" />
    <img src="https://img.shields.io/badge/RBAC-11%20Roles-10b981.svg" alt="11 Roles" />
    <img src="https://img.shields.io/badge/Curriculum-CBSE%20%7C%20ICSE%20%7C%20State-f59e0b.svg" alt="Indian Curricula" />
    <img src="https://img.shields.io/badge/Milestones-1%20to%2010%20Complete-success.svg" alt="Milestones 10/10" />
  </p>
</div>

---

## 🎯 Vision

### **Free schools from WhatsApp dependence. Build an open digital foundation for Indian education.**

Indian schools increasingly depend on WhatsApp for everyday operations — announcements, homework, attendance updates, fee reminders, documents, parent communication and even critical school coordination.

It works, but it was never designed to be a school's operating system.

**Vidya exists to change that.**

Our vision is to provide every Indian school with a **complete, open, self-hostable, and community-developed School Operating System** that unifies administration, academics, communication, examinations, finance, and daily school operations into one cohesive platform.

- **100% Open Source**: No proprietary vendor lock-in; schools own and control their data forever.
- **Tailored for India**: Built for Indian educational realities — CBSE/ICSE grading, 10-point GPA, Indian rupee format (`₹1,39,200.00`), sequential receipt numbering (`REC-YYYY-XXXX`), sibling concessions, and multi-mode fees (UPI, Cash, NEFT, Cheque).
- **Web-First & PWA Enabled**: Instant access on any desktop, tablet, or smartphone browser with offline application shell caching and home-screen installability.
- **Zero SMS Fees**: Native Web Push Notifications (VAPID) eliminate recurring telecom SMS gateway costs.
- **Community & Partner Ecosystem**: Local IT consultants and technology partners can provide deployment, customization, and managed hosting within each district.

---

## 🌟 Feature Matrix across Milestones

| Milestone | Domain Module | Capabilities & Production Features | Status |
| :--- | :--- | :--- | :--- |
| **M1** | **Workspace & Environment** | Monorepo structure, TypeScript strict compilation, unified Docker Compose (PostgreSQL 16, Valkey 8), Fastify REST backend, Vue 3 Pinia frontend. | ✅ Full |
| **M2** | **Database & Seed Engine** | 37 relational models in Prisma with referential integrity, idempotent seed data engine for *Vidya Demo Academy* (CBSE). | ✅ Full |
| **M3** | **Auth, RBAC & 2FA** | JWT rotation, Bcrypt hashing, TOTP Two-Factor Authentication (RFC 6238), 11-role authorization matrix, and Audit Trail compliance ledger with JSON diff inspector. | ✅ Full |
| **M4** | **School & Academics** | Academic sessions, multi-campus governance, Class/Section hierarchy (Nursery–12), curriculum subject catalog, and Academic Setup Onboarding Wizard. | ✅ Full |
| **M5** | **People & Enrollment** | Student admissions (APAAR ID / PEN), guardian relationships (father, mother, legal guardian), staff directory, multi-year enrollment, and atomic Batch Student Promotion. | ✅ Full |
| **M6** | **Attendance & Timetable** | Mobile-friendly roll call, monthly attendance heatmap registers, weekly timetable grid with teacher conflict prevention engine, and Daily Diary homework feed. | ✅ Full |
| **M7** | **Communication & Alerts** | School notice board, role-targeted broadcasts, browser-native VAPID Web Push notifications (RFC 8292), in-app notification center with unread counters. | ✅ Full |
| **M8** | **Exams & Report Cards** | Examination terms, spreadsheet marks entry grid, cumulative GPA calculation (CBSE 10-point scale: A1–E), and printable A4 CBSE-standard report cards. | ✅ Full |
| **M9** | **Fees & Indian Receipts** | Modular fee plans (Tuition, Lab, Transport), student ledgers with concessions, POS fee collection (UPI, Cash, NEFT, Cheque), sequential receipts (`REC-YYYY-XXXX`), printable official receipts with ₹ format. | ✅ Full |
| **M10** | **Production, Profiles & PWA** | Web App Manifest, Service Worker caching shell, offline alert banner, multi-stage Alpine Docker images, unified `docker-compose.yml`, `manage.sh` lifecycle manager, institutional **School Deployment Profiles** (custom name, description, 6 theme palettes), public branding API, and E2E school lifecycle test suite. | ✅ Full |

---

## 🏗️ Architecture & Technology Stack

```text
 ┌────────────────────────────────────────────────────────┐
 │           Client Web Application (Vue 3 + Vite + PWA)  │
 │     • Responsive Layout (Mobile/Desktop) • Dark Mode    │
 │     • Service Worker Offline Cache       • Pinia Stores │
 └───────────────────────────┬────────────────────────────┘
                             │ HTTPS / REST API
 ┌───────────────────────────▼────────────────────────────┐
 │         Application Core (Node.js + Fastify + TS)      │
 │     • 11-Role RBAC Authorization • JWT Auth & TOTP 2FA │
 │     • Modular Domain Services    • Audit Logging       │
 │     • Prisma ORM Data Layer      • Pino Logging        │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │              PostgreSQL 16 Relational Engine           │
 │     • Strict Foreign Keys & Indexes • ACID Transactions│
 └────────────────────────────────────────────────────────┘
```

- 📖 **[System Architecture](docs/ARCHITECTURE.md)**: Deep architectural overview, modular boundaries, security and caching policies.
- 📊 **[Domain Model & ERD](docs/DOMAIN_MODEL.md)**: Relational schema diagrams, entities, enums, and lifecycle relationships.
- 🧭 **[Implementation Roadmap](docs/ROADMAP.md)**: Historical milestone specifications and verified acceptance criteria.
- ⚖️ **[Architecture Decision Records](docs/DECISIONS.md)**: Rationale for Fastify, Vue 3, Prisma, and Web Push.
- 🛡️ **[Risk & Security Matrix](docs/RISKS.md)**: Threat modeling, tenant isolation, and mitigation strategies.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ LTS
- [Docker Engine & Docker Compose](https://docs.docker.com/compose/)

### Option A: Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tovganesh/vidya.git
   cd vidya
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start PostgreSQL & Valkey:**
   ```bash
   ./manage.sh start dev
   # Or using docker compose directly: docker compose up -d
   ```

4. **Install workspace dependencies & seed demo database:**
   ```bash
   npm install
   npm run prisma:migrate --workspace=@vidya/backend
   npm run prisma:seed --workspace=@vidya/backend
   ```

5. **Start dev servers:**
   ```bash
   npm run dev
   ```
   - **Frontend App**: [http://localhost:5173](http://localhost:5173)
   - **Backend API & Health**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

### Option B: Production Container Deployment

Vidya includes multi-stage, hardened Docker builds for production deployment using a single unified `docker-compose.yml`:

```bash
# Using the management CLI:
./manage.sh start prod

# Or using docker compose directly with the prod profile:
docker compose --profile prod up -d --build
```

You can check status or stop containers anytime:
```bash
./manage.sh status prod
./manage.sh stop prod
```

- **Frontend Application (Nginx SPA + PWA)**: [http://localhost](http://localhost)
- **Backend API Engine**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

### Option C: Institutional School Deployment Profiles

When deploying Vidya for a specific school (e.g. Delhi Public School, St. Xavier's, etc.), create an isolated school deployment profile with custom branding, description, and visual theme selection:

```bash
# 1. Interactively create a profile (or pass CLI flags):
./manage.sh profile create dps-blr

# 2. Or create with non-interactive flags:
./manage.sh profile create st-xaviers \
  --name "St. Xavier's High School, Mumbai" \
  --desc "Affiliated with ICSE Board, Mumbai — Excellence Since 1984" \
  --theme emerald \
  --mode dark \
  --code STX-MUM-01 \
  --board ICSE \
  --http-port 8080 \
  --backend-port 4001

# 3. List and inspect configured profiles:
./manage.sh profile list
./manage.sh profile show st-xaviers

# 4. Deploy and launch that specific school:
./manage.sh start prod st-xaviers

# 5. Check status, inspect logs, or stop:
./manage.sh status prod st-xaviers
./manage.sh logs prod st-xaviers -f
./manage.sh stop prod st-xaviers
```

#### Available Theme Palettes:
- **`indigo`**: Signature Royal Indigo (Vidya Default)
- **`emerald`**: Forest & Nature Green (Growth / Modern / Ecology)
- **`ocean`**: Academic Deep Cyan (Clean / Technology / Contemporary)
- **`amber`**: Royal Heritage Gold (Excellence / Classic / Tradition)
- **`rose`**: Vibrant Crimson Rose (Prestigious / High Energy)
- **`slate`**: Minimalist Graphite Monochrome

---

### 🛠️ Container & Profile CLI Cheat Sheet

The executable `./manage.sh` CLI wraps Docker Compose with environment isolation, profile loading, and health validation:

| Command | Target / Arguments | Description |
| :--- | :--- | :--- |
| `./manage.sh start dev` | Local Dev | Starts PostgreSQL 16 & Valkey 8 dev infrastructure containers. |
| `./manage.sh start prod` | Production | Builds images & launches full production stack on port 80. |
| `./manage.sh start prod <slug>` | School Profile | Builds and launches full production stack for a specific school. |
| `./manage.sh stop [env\|slug]` | Dev / Prod / School | Stops running containers without removing state or volumes. |
| `./manage.sh restart [env\|slug]` | Dev / Prod / School | Restarts container services for the target environment. |
| `./manage.sh status` | Global | Inspects running containers across dev, prod, and active school profiles. |
| `./manage.sh status [env\|slug]` | Target Environment | Detailed container inspection, health checks, and port allocations. |
| `./manage.sh logs [env\|slug] -f` | Dev / Prod / School | Streams real-time container log output. |
| `./manage.sh down [env\|slug]` | Dev / Prod / School | Stops and destroys containers and virtual bridge networks. |
| `./manage.sh profile create [slug]` | School Profile | Interactive wizard or CLI flag creator for new school deployment profiles. |
| `./manage.sh profile list` | Profiles Directory | Tabulates all configured school deployment profiles and statuses. |
| `./manage.sh profile show <slug>` | School Profile | Prints configuration parameters (credentials securely masked). |
| `./manage.sh profile delete <slug>` | School Profile | Safely removes an inactive school deployment profile. |

---

## 👥 Demo Credentials (Seeded School)

All demo accounts share the default development password: `Vidya@2026`. Users can sign in using either their email address or their institutional short code:

| Role | Email Identifier | Institutional Code | Key Capabilities & Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@vidya.org` | — | Global multi-school control, trust governance, security audits |
| **School Admin** | `admin@vidya.org` | `VIDYA-ADMN-0001` | Full school administration, academic setup, staff registry |
| **Principal** | `principal@vidya.org` | — | Academic oversight, student 360 records, batch promotion approvals |
| **Accountant** | `accountant@vidya.org` | `VIDYA-ACCT-0001` | Fee structures, payment POS (UPI/Cash/NEFT), sequential receipts |
| **Teacher** | `teacher@vidya.org` | `VIDYA-TECHR-0001` | Mobile daily roll call, timetable slots, marks entry, daily diary |
| **Student** | `student@vidya.org` | `VIDYA-STUD-0001` | Student portal, report cards, class timetable, homework diary |
| **Parent** | `parent@vidya.org` | `VIDYA-PRNT-0001` | Fee ledger payments, attendance tracking, school broadcasts |

---

## 🔍 Detailed Milestone Implementation Analysis & Verification

A critical, evidence-based audit verifying what is fully implemented across each milestone:

### **M1: Workspace Architecture & Development Environment**
- **Status**: `Fully Implemented (100%)`
- **Backend Architecture**: Fastify 5 engine with `@fastify/cors`, `@fastify/helmet` CSP, `@fastify/rate-limit`, sensible error handling, and structured Pino logging.
- **Frontend Architecture**: Vue 3 SPA using Composition API (`<script setup lang="ts">`), Pinia reactive stores, Vue Router with role-based navigation guards, and modular design tokens (`tokens.css`).
- **Containerization**: Multi-stage Alpine Docker builds for backend and frontend Nginx, unified into a single `docker-compose.yml` with Compose Profiles (`dev` vs `prod`).
- **Verified Files**: `package.json`, `backend/src/app.ts`, `frontend/src/main.ts`, `docker-compose.yml`, `manage.sh`.

### **M2: Database Layer, Core Migrations & Seed Data Engine**
- **Status**: `Fully Implemented (100%)`
- **Data Model**: 37 relational models in PostgreSQL 16 via Prisma ORM, strictly enforcing foreign keys, cascade rules, composite indexes, and typed enums.
- **Seeding Engine**: Idempotent 1,729-line seed script (`backend/prisma/seed.ts`) populating a realistic Indian CBSE school (*Vidya Demo Academy*), including 11 user roles, campuses, academic years, classes Nursery to 12, subjects, students, teachers, timetables, exams, fees, and receipts.
- **Verified Files**: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/tests/database.test.ts`.

### **M3: Authentication, RBAC & Two-Factor Authentication (2FA)**
- **Status**: `Fully Implemented (100%)`
- **Security & Tokens**: Dual-token JWT rotation (15m Access Token, 30d revocable Refresh Token stored in database) with Bcrypt password hashing.
- **Two-Factor Authentication**: RFC 6238 TOTP engine generating QR codes and base32 secrets via `otplib`, with hashed single-use backup recovery codes.
- **Role-Based Access Control**: 11 distinct roles with granular permission-checking middleware (`requirePermission`, `requireRole`).
- **Audit Logging**: Immutable audit ledger (`audit_logs`) recording actor, action, entity diffs, client IP, and User-Agent, with frontend cockpit inspector.
- **APIs & Views**: `POST /auth/login`, `POST /auth/2fa/*`, `GET /audit/logs` → `LoginView.vue`, `SecuritySettingsView.vue`, `AuditTrailView.vue`.
- **Tests**: `backend/tests/auth.test.ts`, `backend/tests/audit.test.ts`, `frontend/tests/Auth.test.ts`, `frontend/tests/Audit.test.ts`.

### **M4: School Administration & Academic Setup**
- **Status**: `Fully Implemented (100%)`
- **School Governance**: Multi-campus profile management, academic year session activation/archival, and affiliation tracking.
- **Academic Hierarchy**: Class and Section structures (Nursery through Class 12, Sections A–D) with capacity limits and class teacher assignments.
- **Curriculum Master**: Subject master catalog specifying theory vs practical hours, elective groups, and credit weights.
- **Onboarding Wizard**: Guided multi-step academic setup wizard for configuring board, terms, and classes in minutes.
- **APIs & Views**: `/schools/profile`, `/schools/campuses`, `/academics/years`, `/academics/classes`, `/academics/subjects` → `SchoolProfileView.vue`, `AcademicYearsView.vue`, `ClassesSectionsView.vue`, `SubjectsView.vue`, `AcademicOnboardingView.vue`.
- **Tests**: `backend/tests/schools_and_academics.test.ts`, `frontend/tests/Academics.test.ts`.

### **M5: People Management & Academic Enrollment**
- **Status**: `Fully Implemented (100%)`
- **Student Admissions**: Comprehensive profile capture including national APAAR ID / PEN, admission numbers, category (General/OBC/SC/ST/EWS), blood group, and emergency contacts.
- **Guardian Relationships**: Multi-guardian junction (`StudentGuardian`) linking father, mother, or legal guardians with primary communication flags.
- **Staff Registry**: Employee code directory, academic qualifications, subject specializations, and departmental allocations.
- **Batch Promotion Engine**: Atomic database transaction promoting entire cohorts from one academic year/grade to the next (e.g. Class 9 to Class 10), handling section reassignment and retention.
- **APIs & Views**: `/people/students`, `/people/guardians`, `/people/teachers`, `POST /people/students/promote-batch` → `PeopleDirectoryView.vue`, `StudentProfileView.vue`, `BatchPromotionView.vue`.
- **Tests**: `backend/tests/people_and_enrollment.test.ts`, `frontend/tests/People.test.ts`.

### **M6: Core Operations — Attendance, Timetable & Daily Diary**
- **Status**: `Fully Implemented (100%)`
- **Attendance Roll Call**: Ultra-fast mobile interface for teachers with one-tap Present/Absent/Late toggles, bulk "Mark All Present", and sub-15-second completion.
- **Attendance Reporting**: Monthly heatmap registers, percentage analytics, and automatic flags for students below the statutory 75% attendance threshold.
- **Timetable Matrix**: Interactive weekly schedule grid (Monday–Saturday, 8 periods) with a **real-time conflict detection engine** preventing teacher double-booking.
- **Daily Diary**: Teacher-authored homework and classwork logs accessible directly in the student and parent portals.
- **APIs & Views**: `POST /attendance/batch`, `GET /attendance/reports/monthly`, `/timetable/slots`, `/diary/entries` → `RollCallView.vue`, `AttendanceRegisterView.vue`, `TimetableGridView.vue`.
- **Tests**: `backend/tests/attendance_and_timetable.test.ts`, `backend/tests/diary_and_push.test.ts`, `frontend/tests/Attendance.test.ts`, `frontend/tests/Timetable.test.ts`.

### **M7: Communication & Web Push Notification Engine**
- **Status**: `Fully Implemented (100%)`
- **Institutional Notice Board**: Targeted school broadcasts filtered by audience (`ALL_SCHOOL`, `STUDENTS_ONLY`, `TEACHERS_ONLY`, `PARENTS_ONLY`, specific Class) with priorities (`NORMAL`, `IMPORTANT`, `URGENT`).
- **Zero-Cost Web Push**: Standards-compliant RFC 8292 VAPID Web Push notifications via Service Worker, eliminating expensive recurring telecom SMS gateway fees.
- **In-App Notification Center**: Real-time notification drawer with unread badge counters and deep links to relevant modules.
- **APIs & Views**: `/communication/announcements`, `POST /communication/push/subscribe`, `/communication/notifications` → `AnnouncementsView.vue`, `TopNav.vue` dropdown, `sw.js`.
- **Tests**: `backend/tests/communication_and_webpush.test.ts`, `frontend/tests/Communication.test.ts`.

### **M8: Academics — Examinations, Grading & CBSE Report Cards**
- **Status**: `Fully Implemented (100%)`
- **Exam Framework**: Term structures (Term 1 / Half-Yearly, Term 2 / Annual, Unit Tests) with multi-component assessments (Theory, Practical, Internal, Viva).
- **Batch Marks Entry**: High-speed spreadsheet grid for teachers with keyboard navigation and automated max-marks validation.
- **GPA & Grading Engine**: Automated calculation of percentages, percentiles, and the official CBSE 8-grade scale (`A1` [91–100], `A2` [81–90], `B1`–`E`).
- **Printable A4 Report Cards**: Pixel-perfect, print-optimized (`@media print`) CBSE-standard report cards with school header, student particulars, attendance summary, subject marks breakdown, and signature stamp blocks.
- **APIs & Views**: `/exams/terms`, `POST /exams/marks/batch`, `GET /exams/report-card/:enrollmentId` → `ExamsView.vue` (Spreadsheet & Report Card mode).
- **Tests**: `backend/tests/exams_and_report_cards.test.ts`, `frontend/tests/Exams.test.ts`.

### **M9: Finance — Fee Structures, Invoicing & Indian Receipts**
- **Status**: `Fully Implemented (100%)`
- **Modular Fee Architect**: Customizable fee heads (Tuition, Laboratory, Transport, Development, Admission) assigned by class or academic year.
- **Ledger & Concessions**: Individual student ledger tracking with concessions (sibling discount, merit scholarships, staff ward subsidies).
- **Indian POS Fee Collection**: Instant payment collection supporting UPI, Cash, NEFT/RTGS, and Cheque with transaction reference logging.
- **Sequential Receipts**: Auto-generated sequential receipts conforming to Indian school audit standards (`REC-YYYY-XXXX`) with Indian Rupee formatting (`₹1,39,200.00`).
- **Printable Receipts**: Formal print-ready receipt view with school stamp, receipt number, student details, component breakdown, and payment mode.
- **APIs & Views**: `/fees/structures`, `/fees/student-fees`, `POST /fees/collect`, `GET /fees/receipts/:number` → `FeesView.vue` (Fee Structures, Ledgers, POS Modal, Printable Receipt).
- **Tests**: `backend/tests/fees_and_finance.test.ts`, `frontend/tests/Fees.test.ts`.

### **M10: Production Readiness, School Deployment Profiles & PWA**
- **Status**: `Fully Implemented (100%)`
- **PWA Capabilities**: W3C Web App Manifest (`manifest.json`), Service Worker (`sw.js`) with Cache-First asset strategy, offline detection with reactive alert banner (`PwaBanner.vue`), and home-screen installability.
- **Unified Docker Architecture**: Merged multi-stage Docker environment using Compose Profiles (`profiles: [prod, full]`), eliminating duplicate Compose files.
- **School Deployment Profiles**: Complete CLI wizard (`./manage.sh profile create`) allowing local IT partners to deploy isolated production stacks for any school with:
  - Custom School Name, Description, and Affiliation
  - Basic Theme Selection across 6 curated palettes (`indigo`, `emerald`, `ocean`, `amber`, `rose`, `slate`) in dark or light mode
  - Public Branding API (`GET /api/v1/schools/branding`) and dynamic frontend theme injection
  - Isolated database volumes, custom port bindings, and auto-generated secure secrets
- **Lifecycle Management CLI**: Executable [`manage.sh`](file:///Users/ganesh/Developer/vidya/manage.sh) supporting `start`, `stop`, `restart`, `status`, `logs -f`, `down`, and `profile` subcommands.
- **E2E School Lifecycle Validation**: End-to-end integration test (`e2e_school_lifecycle.test.ts`) validating the full operational lifecycle from health check, authentication, academic structure, enrollment, attendance, timetable, notices, CBSE report cards, to POS fee collection and sequential receipts.
- **Verified Files**: `manage.sh`, `docker-compose.yml`, `profiles/demo-academy.env`, `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/src/stores/theme.ts`, `frontend/src/styles/tokens.css`, `backend/tests/e2e_school_lifecycle.test.ts`.

---

## 🧪 Testing & Quality Assurance

Vidya enforces strict test validation across both backend and frontend layers:

```bash
# Run all 25 automated unit and integration test suites
npm test

# Type-check TypeScript across monorepo
npm run typecheck

# Production build verification
npm run build --workspaces
```

- **Backend Test Suite (12 suites)**:
  1. `health.test.ts` — API liveness and readiness probes
  2. `database.test.ts` — Prisma schema constraints and seed validation
  3. `auth.test.ts` — JWT rotation, bcrypt hashing, TOTP 2FA, backup codes
  4. `audit.test.ts` — Compliance audit logging and JSON diff recording
  5. `schools_and_academics.test.ts` — Campuses, academic sessions, classes, subjects
  6. `people_and_enrollment.test.ts` — Student admissions, guardians, batch promotion
  7. `attendance_and_timetable.test.ts` — Roll call, monthly registers, timetable conflict avoidance
  8. `diary_and_push.test.ts` — Daily homework diary and push event dispatching
  9. `communication_and_webpush.test.ts` — Targeted notices and VAPID push subscriptions
  10. `exams_and_report_cards.test.ts` — Marks spreadsheet, CBSE GPA grading, printable report cards
  11. `fees_and_finance.test.ts` — Fee structures, concessions, POS collection, sequential receipts
  12. `e2e_school_lifecycle.test.ts` — Full lifecycle end-to-end school journey
- **Frontend Test Suite (13 suites)**:
  1. `App.test.ts` — Root mounting, top navigation, layout responsiveness
  2. `NavigationGuards.test.ts` — Route authentication, role-based access restrictions
  3. `Auth.test.ts` — Login flow, credentials handling, 2FA challenge screens
  4. `Audit.test.ts` — Audit log tabular inspector and filter controls
  5. `Academics.test.ts` — Academic years, classes, sections, subject catalogs
  6. `People.test.ts` — People directory, student profile 360, batch promotion
  7. `Attendance.test.ts` — Fast roll call toggles, monthly heatmap calculations
  8. `Timetable.test.ts` — Weekly slot grid and period conflict highlights
  9. `Communication.test.ts` — Notice board filtering and notification drawer
  10. `Exams.test.ts` — Spreadsheet marks entry, GPA calculations, report card rendering
  11. `Fees.test.ts` — Fee ledgers, concession math, POS checkout modal, printed receipts
  12. `PwaAndOffline.test.ts` — PWA store state, online/offline detection, install prompt capture
  13. `Theme.test.ts` — Dark/light mode switcher, school palette token overrides (`data-theme-color`)

---

## 📱 Progressive Web App (PWA) Capabilities

- **Offline Application Shell**: Service Worker (`sw.js`) pre-caches core static assets and navigation shell.
- **Offline Banner**: Automatic connection monitoring with user-friendly alerts when network connectivity drops.
- **Installable**: Installable to desktop, iOS, and Android home screens with custom maskable icons.
- **Web Push Ready**: Standards-compliant VAPID push event listener integrated with school notice broadcasts.

---

## 📄 License & Contributing

Vidya is open-source software licensed under the **[Apache License 2.0](LICENSE)**.

- 🤝 **[Contributing Guidelines](CONTRIBUTING.md)**
- 🔒 **[Security Policy & Vulnerability Disclosure](SECURITY.md)**
- 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)**
