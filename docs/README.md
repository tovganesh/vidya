# Vidya — Architecture & Engineering Master Plan

> **Vidya — The Open School Operating System**  
> *"Connect. Manage. Educate."*

---

## Documentation Navigation

This directory contains the foundational architectural blueprints, domain models, decisions, and execution roadmaps for **Vidya**.

| Document | Purpose & Contents |
| :--- | :--- |
| **[System Architecture](ARCHITECTURE.md)** | Product architecture, high-level topology, modular monolith boundaries, frontend/backend/database patterns, security, and deployment strategy. |
| **[Domain Model & ERD](DOMAIN_MODEL.md)** | Relational data model, Indian school domain analysis (CBSE/ICSE/State), lifelong enrollment integrity, fee ledger architecture, examination schemes, and entity specifications. |
| **[Architecture Decisions (ADRs)](DECISIONS.md)** | Formal records of critical technology and topological choices (Modular Monolith, Fastify, PostgreSQL/Prisma, Vue 3, Web Push, Multi-Tenancy). |
| **[Implementation Roadmap](ROADMAP.md)** | Phased milestones (M1 through M10) with exact objectives, database changes, backend/frontend changes, APIs, automated tests, and acceptance criteria. |
| **[Risk Analysis & Mitigation](RISKS.md)** | Evaluation of technical, security, scalability, domain, Indian regulatory (DPDPA 2023), and open-source risks with mitigation strategies. |

---

## Target Repository Structure

The Vidya repository is organized as a clean, modular monorepo using npm workspaces:

```text
vidya/
├── .github/                     # CI/CD workflows (lint, test, build)
├── docs/                        # Architecture, domain models, ADRs, roadmap
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── DOMAIN_MODEL.md
│   ├── DECISIONS.md
│   ├── ROADMAP.md
│   └── RISKS.md
├── backend/                     # Node.js + Fastify + TypeScript API
│   ├── Dockerfile
│   ├── prisma/                  # Schema, migrations & seeders
│   ├── src/
│   │   ├── config/              # Centralized environment & app config
│   │   ├── database/            # Prisma client instance & helpers
│   │   ├── middleware/          # Auth, RBAC, tenant resolution, error handling
│   │   ├── modules/             # Modular domain boundaries
│   │   │   ├── auth/            # JWT, TOTP 2FA, session lifecycle
│   │   │   ├── users/           # User administration
│   │   │   ├── schools/         # School profile, campuses, settings
│   │   │   ├── academics/       # Academic years, classes, sections, subjects
│   │   │   ├── students/        # Student directory & 360 profiles
│   │   │   ├── guardians/       # Parent/guardian profiles & linkages
│   │   │   ├── teachers/        # Teacher directory & qualifications
│   │   │   ├── enrollment/      # Year-based class/section placements
│   │   │   ├── attendance/      # Daily roll call & monthly registers
│   │   │   ├── timetable/       # Class timetable & period schedules
│   │   │   ├── exams/           # Exam terms, assessments & marks entry
│   │   │   ├── fees/            # Fee structures, student ledgers, receipts
│   │   │   ├── notifications/   # In-app notification inbox & Web Push VAPID
│   │   │   └── audit/           # Immutable audit logging
│   │   ├── shared/              # Event bus, types, utilities
│   │   ├── app.ts               # Fastify application factory
│   │   └── server.ts            # Entrypoint listener
│   ├── tests/                   # Unit & integration tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # Vue 3 + Vite + TypeScript web application
│   ├── Dockerfile
│   ├── public/                  # Manifest, service worker, icons
│   ├── src/
│   │   ├── assets/              # Logos, illustrations, branding
│   │   ├── components/          # Reusable UI primitives & layouts
│   │   │   ├── ui/              # Buttons, inputs, modals, data tables
│   │   │   └── layout/          # AppShell, Topbar, Sidebar, PageHeader
│   │   ├── composables/         # useAuth, useTenant, useApi, useNotification
│   │   ├── locales/             # i18n JSON translations (en, hi, ta, etc.)
│   │   ├── router/              # Navigation guards & lazy route declarations
│   │   ├── stores/              # Pinia domain stores
│   │   ├── styles/              # Design tokens, variables, responsive typography
│   │   ├── views/               # Module screens
│   │   ├── App.vue              # Root Vue component
│   │   └── main.ts              # App bootstrapping
│   ├── tests/                   # Vitest unit & component tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml           # Production/local docker compose setup
├── docker-compose.dev.yml       # Development database & services
├── .env.example                 # Environment variables template
├── .gitignore                   # Git exclusions
├── LICENSE                      # Open-source license (AGPLv3 or Apache 2.0)
├── README.md                    # Project landing documentation
└── package.json                 # Monorepo root workspace configuration
```
