# Security Policy

The Vidya project is dedicated to protecting student records, financial transactions, and school identity data.

---

## Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 1.0.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |

---

## Security Architecture & Defenses

Vidya implements defense-in-depth security across all architectural layers:

1. **Authentication & Session Security**:
   - Short-lived JSON Web Tokens (JWT) signed with HMAC-SHA256.
   - Refresh token rotation with cryptographic revocation.
   - Sensitive administrative operations require TOTP Two-Factor Authentication (RFC 6238).

2. **Password & Credential Hashing**:
   - High-entropy password hashing using Argon2id and Bcrypt with appropriate salt rounds.
   - Backup recovery codes stored using salted hashes.

3. **Role-Based Access Control (RBAC)**:
   - Granular, least-privilege permission authorization enforced at the Fastify pre-handler level.
   - Strict tenant and school isolation guarantees.

4. **Immutable Audit Logging**:
   - Administrative and financial mutations are captured with actor metadata, client IP address, and timestamp.

5. **Transport Security & HTTP Headers**:
   - Strict Transport Security (HSTS), X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`), and Content-Security-Policy (CSP) headers applied via `@fastify/helmet` and Nginx.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in Vidya, **please DO NOT create a public GitHub issue**.

Report vulnerabilities privately via email to:
**security@vidya.org**

### What to Include in Your Report:
- Detailed description of the vulnerability.
- Step-by-step reproduction instructions or minimal proof-of-concept.
- Affected endpoints, modules, or dependencies.
- Potential impact on student privacy, financial ledgers, or school tenant isolation.

### Our Commitment:
- We will acknowledge receipt of your report within **48 hours**.
- We will provide regular updates as we investigate and develop a security patch.
- We will coordinate public disclosure after a patch has been merged and released.
