# Contributing to Vidya

Thank you for your interest in contributing to **Vidya — The Open School Operating System**! We welcome community contributions, bug fixes, feature enhancements, documentation improvements, and localization efforts.

---

## Code of Conduct

Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors and educators.

---

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/vidya.git
   cd vidya
   ```

2. **Initialize environment configuration:**
   ```bash
   cp .env.example .env
   ```

3. **Start local database & caching infrastructure:**
   ```bash
   docker compose up -d
   ```

4. **Install monorepo dependencies & seed demo school:**
   ```bash
   npm install
   npm run prisma:migrate --workspace=@vidya/backend
   npm run prisma:seed --workspace=@vidya/backend
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```
   - **Frontend Application**: `http://localhost:5173`
   - **Backend API & Health**: `http://localhost:4000/api/v1/health`

---

## Workflow & Branch Naming

All pull requests should target the `main` branch.

### Branch Conventions:
- `feat/feature-name` — New domain modules or UI views
- `fix/bug-description` — Defect remediation
- `docs/topic-name` — Documentation improvements
- `perf/area-name` — Performance optimizations

### Conventional Commits:
We enforce standard [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(exams): implement CBSE 10-point grading engine`
- `fix(fees): prevent payment over-allocation exceeding outstanding dues`
- `docs: update system architecture diagram and feature matrix`
- `test(auth): add TOTP two-factor challenge verification suite`

---

## Architecture & Code Guidelines

1. **Strict TypeScript**: Never use `any` when explicit types, interfaces, or generic parameters can be defined.
2. **Database Integrity**: All database alterations must be accompanied by Prisma migrations (`npx prisma migrate dev`). Always maintain foreign key constraints and cascade rules.
3. **Domain Boundary Isolation**: Backend domain logic belongs in `backend/src/modules/<domain>/` with dedicated `.service.ts` and `.routes.ts` files.
4. **RBAC Authorization**: Every authenticated endpoint must declare appropriate permission checks (e.g., `preHandler: [authenticate, authorize(['fee:collect'])]`).
5. **UI & Accessibility**:
   - Follow the calm slate / indigo design token system in `frontend/src/styles/tokens.css`.
   - Maintain high contrast ratios (WCAG AA).
   - Use custom SVG icons and avoid heavy third-party UI libraries.

---

## Testing & Verification

Every pull request must pass all automated test suites, typechecks, and linters before merging:

```bash
# Run unit and integration tests across monorepo
npm test

# Verify strict TypeScript compilation
npm run typecheck

# Verify frontend production build
npm run build --workspace=@vidya/frontend
```

Pull requests with broken tests or failing builds will not be merged.
