# VidyaSetu — The Open School Operating System

<div align="center">
  <img src="frontend/public/favicon.svg" alt="VidyaSetu Logo" width="80" height="80" />
  <h3>Connect. Manage. Educate.</h3>
  <p>A modern, modular, open-source school operating system designed for Indian primary, secondary, and higher-secondary institutions.</p>
</div>

---

## 🌟 Overview

**VidyaSetu** is an open-source digital operating system for schools. Built from the ground up for the educational fabric of India (CBSE, ICSE, State Boards, and International curricula), it unites school administration, teachers, parents, students, accounts, academics, and operations into a cohesive, responsive web platform.

Unlike legacy school ERP software characterized by dated UI grids, proprietary vendor lock-in, and excessive per-student licensing costs, VidyaSetu is:
- **100% Open Source**: Built on standard PostgreSQL, Node.js (TypeScript), and Vue 3.
- **Web-First & Responsive**: Full desktop, tablet, and mobile support with zero reliance on proprietary native app stores.
- **Web Push Notifications**: Browser-native push alerts (VAPID) with no recurring SMS or proprietary push vendor fees.
- **Modular Monolith**: Run the whole system as a lightweight single container or scale modules independently.
- **Historically Immutable**: Preserves a student's lifelong academic trajectory across consecutive academic years.

---

## 🏗️ Architecture & Technology Stack

```text
 ┌────────────────────────────────────────────────────────┐
 │            Client Web Application (Vue 3 + PWA)        │
 │     • Responsive Web / Mobile    • Custom Tokens       │
 └───────────────────────────┬────────────────────────────┘
                             │ REST / HTTPS
 ┌───────────────────────────▼────────────────────────────┐
 │         Application Core (Node.js + Fastify + TS)      │
 │     • 11-Role RBAC               • JWT & 2FA (TOTP)    │
 │     • Domain Modules             • Audit Interceptor   │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │                  PostgreSQL 16 Engine                  │
 │     • Strict Relational Schema   • Tenant Partitioning │
 └────────────────────────────────────────────────────────┘
```

Detailed architectural blueprints and documentation:
- 📖 [System Architecture](docs/ARCHITECTURE.md)
- 📊 [Domain Model & ERD](docs/DOMAIN_MODEL.md)
- 🧭 [Implementation Roadmap](docs/ROADMAP.md)
- ⚖️ [Architecture Decision Records (ADRs)](docs/DECISIONS.md)
- 🛡️ [Risk Analysis & Mitigation Matrix](docs/RISKS.md)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ LTS (Node.js v24 supported)
- [Docker Engine & Docker Compose](https://docs.docker.com/compose/)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/vidyasetu/vidyasetu.git
cd vidyasetu
cp .env.example .env
```

### 2. Start PostgreSQL & Infrastructure
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Servers
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Health**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 🧪 Testing & Validation

```bash
# Run all automated tests (backend & frontend)
npm run test

# Type-check all workspaces
npm run typecheck

# Lint codebase
npm run lint
```

---

## 📄 License & Community

VidyaSetu is licensed under the [Apache 2.0 License](LICENSE).
Contributions, feedback, and suggestions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).
