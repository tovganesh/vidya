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

| Milestone | Domain Module | Capabilities & Production Features |
| :--- | :--- | :--- |
| **M1** | **Workspace & Environment** | Monorepo structure, TypeScript strict compilation, Dockerized PostgreSQL 16 & Valkey 8, Fastify backend, Vue 3 Pinia frontend. |
| **M2** | **Database & Seed Engine** | Relational schema in Prisma with referential integrity, idempotent seed data engine for *Vidya Demo Academy* (CBSE). |
| **M3** | **Auth, RBAC & 2FA** | JWT rotation, Argon2id/Bcrypt hashing, TOTP Two-Factor Authentication (RFC 6238), 11-role authorization matrix, and audit logging. |
| **M4** | **School & Academics** | Academic sessions, multi-campus governance, Class/Section hierarchy, subject catalog with elective groups. |
| **M5** | **People & Enrollment** | Student admissions, guardian relationships (father, mother, guardian), staff directory, roll numbers, and historical enrollment tracking. |
| **M6** | **Attendance & Timetable** | Daily and period-level roll call, automated attendance analytics, weekly timetable matrix with period teacher conflicts prevention. |
| **M7** | **Communication & Alerts** | School notice board, role-targeted broadcasts, browser-native VAPID Web Push notifications, in-app notification center. |
| **M8** | **Exams & Report Cards** | Examination terms, marks entry spreadsheet grid, cumulative GPA calculation, and printable A4 CBSE-standard report cards. |
| **M9** | **Fees & Indian Receipts** | Modular fee plans (Tuition, Lab, Transport), student ledgers with concessions, POS fee collection (UPI/Cash/NEFT), sequential receipts (`REC-YYYY-XXXX`). |
| **M10** | **Production & PWA** | Web App Manifest, Service Worker caching shell, offline banner UI, multi-stage production Docker images, end-to-end integration tests. |

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

All accounts share the default development password: `Vidya@2026`

| Role | Email | Key Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@vidya.org` | Global system control, organizations, audit logs |
| **School Admin** | `admin@vidya.org` | Full school administration, academic setup, staff |
| **Principal** | `principal@vidya.org` | Academic oversight, student records, broad approvals |
| **Accountant** | `accountant@vidya.org` | Fee structures, payment collection, CBSE receipts |
| **Teacher** | `teacher@vidya.org` | Class attendance, marks entry, timetable viewing |
| **Student** | `student@vidya.org` | Student portal, report cards, class timetable |
| **Parent** | `parent@vidya.org` | Fee payment tracking, child attendance, notices |

---

## 🧪 Testing & Quality Assurance

Vidya enforces strict test validation across both backend and frontend layers:

```bash
# Run all unit and integration test suites
npm test

# Type-check TypeScript across monorepo
npm run typecheck

# Production build verification
npm run build --workspaces
```

- **Backend Test Suite**: 10 test suites covering Health, Database, Auth & 2FA, School Setup, People, Attendance & Timetable, Notices & Web Push, Exams & Report Cards, Fee Management, and End-to-End School Lifecycle.
- **Frontend Test Suite**: 12 test suites covering App Shell, Navigation Guards, Auth, Academics, People, Attendance, Timetable, Theme, Communication, Exams, Fees, and PWA & Offline Readiness.

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
