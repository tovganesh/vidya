# Contributing to Vidya

Thank you for your interest in contributing to **Vidya — The Open School Operating System**! We welcome community contributions, bug reports, and enhancements.

---

## Code of Conduct

Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone.

---

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/vidya.git
   cd vidya
   ```

2. **Initialize configuration:**
   ```bash
   cp .env.example .env
   ```

3. **Start local database:**
   ```bash
   docker compose up -d
   ```

4. **Install workspace dependencies:**
   ```bash
   npm install
   ```

5. **Start dev servers:**
   ```bash
   npm run dev
   ```

---

## Testing & Quality Guidelines

Before opening a pull request, ensure all tests, typechecks, and linters pass:
```bash
npm run test
npm run typecheck
npm run lint
```

### Commit Guidelines
We follow standard Conventional Commits:
- `feat(module): add marks entry sheet`
- `fix(attendance): handle half-day roll call calculation`
- `docs: update domain model diagram`
- `test(auth): add TOTP challenge verification suite`
