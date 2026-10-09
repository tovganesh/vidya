# Vidya — Comprehensive Risk Analysis & Mitigation Matrix

> **Version:** 1.0.0  
> **Status:** Active Reference  

---

## 1. Technical Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **High Concurrency during Morning Roll Call & Result Publishing** | Database connection starvation or high latency during peak morning attendance window (8:00 AM - 9:15 AM). | High | • Implement PostgreSQL connection pooling via PgBouncer / Prisma client pool tuning.<br>• Provide bulk attendance submission APIs (`POST /api/v1/attendance/batch`) to replace 40 individual HTTP requests with a single atomic batch payload.<br>• Implement optional Valkey caching for read-heavy public result boards. |
| **Database Migration Drifts in Self-Hosted Deployments** | Schools running outdated versions fail when upgrading multiple release versions. | Medium | • Use strict declarative Prisma migrations.<br>• Build automated pre-flight database schema verification script into the Docker entrypoint script.<br>• Version check on startup refusing to boot until migrations are clean. |
| **Low Network Bandwidth & Unstable Connectivity** | Semi-urban and rural schools experience frequent packet drops while teachers submit marks or attendance. | High | • PWA Service Worker caching for app shell and active class roster.<br>• Client-side optimistic UI state with retry queues in Pinia stores.<br>• Compact JSON payloads with gzip/brotli compression. |

---

## 2. Security Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Cross-Tenant Data Leakage** | A school administrator or teacher viewing or modifying data of another school in a multi-tenant deployment. | Critical | Low | • Enforce tenant verification at the HTTP pre-handler layer.<br>• Every database query is scoped by `school_id` resolved from the verified JWT `sub` and context.<br>• Automated integration tests specifically asserting cross-tenant ID rejection (HTTP 403 / 404). |
| **Privilege Escalation via Direct Object Reference (IDOR)** | A student or parent altering `student_id` in URL parameters to view another student's marks or personal records. | Critical | Medium | • All entity lookups perform ownership validation: parents can only query students where `student_guardians.guardian_id = auth.user.id`.<br>• Teachers can only enter marks for classes explicitly allocated in `teacher_allocations`. |
| **Credential Compromise of Administrative Accounts** | Unauthorized access to school fee collections or student records due to weak passwords. | High | High | • Mandatory Two-Factor Authentication (TOTP) for administrative roles (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `ACCOUNTANT`).<br>• Password complexity enforcement and rate-limiting on login endpoints (maximum 5 failed attempts per 15 minutes per IP/account).<br>• Secure token rotation and server-side token revocation. |

---

## 3. Scalability Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Growing File Attachment Storage (Student Photos, Transfer Certificates, Marksheets)** | PostgreSQL database bloating if documents are stored as bytea/blobs. | High | High | • Zero BLOB storage in PostgreSQL.<br>• Abstracted `StorageService` interface storing files in local filesystem (`/var/vidya/uploads`) or S3-compatible object storage (MinIO, AWS S3).<br>• PostgreSQL stores only secure metadata, content type, and SHA-256 hash. |
| **Unbounded Audit Log Table Growth** | `audit_logs` table growing into millions of rows degrading database backup and write performance. | Medium | High | • Partition `audit_logs` table by year/month.<br>• Provide automated archival commands to export aged audit logs to compressed parquet/JSON files. |

---

## 4. Domain-Model Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Student Promotion Breaks Historical Record Integrity** | Updating student class directly erases their historical attendance, marks, and fees from previous years. | Critical | High | • **Absolute Architectural Invariant**: Never link marks, attendance, or fees directly to a mutable `student.class_id`.<br>• All operational records link to the immutable `enrollments` table, which bridges `(student_id, academic_year_id, class_id, section_id)`.<br>• Changing academic years creates a new enrollment record, leaving historical years 100% intact. |
| **Complex Board-Specific Grading Systems (CBSE vs ICSE vs State)** | Inability to adapt to differing grading schemes (CBSE 8-point, ICSE percentage + internal assessment, State board grading). | High | Medium | • Decoupled `grading_scales` entity allowing schools to configure grading ranges (`91-100 = A1`, `81-90 = A2`, etc.) and weightings per subject. |

---

## 5. Indian-School-Specific Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Complex Indian Fee Concessions & Partial Installments** | Parents paying partial fees, demanding custom fee receipts, or disputing concessions (sibling discounts, staff child discount, RTE quotas). | High | High | • Model fee collection with a formal Double-Entry-style student fee ledger: `gross_fee - concessions = net_payable`.<br>• Support partial payment receipts with running dues balance.<br>• Issue immutable, sequential receipt numbers (`REC-2026-XXXX`). |
| **Digital Literacy Barriers Among Staff and Parents** | Teachers or parents struggling with complex, clutter-filled enterprise interfaces. | High | High | • "Three-Tap" UX philosophy for teachers: open roll call -> review absentees -> submit.<br>• Avoid enterprise jargon; use intuitive terminology ("Mark Attendance", "Collect Fees", "Issue Receipt").<br>• High-contrast typography, large touch targets, and mobile-first responsive screens. |
| **Data Protection Compliance (Digital Personal Data Protection Act - DPDPA 2023)** | Non-compliance with Indian student privacy laws regarding Aadhaar and minor personal data. | High | Medium | • Never store full 12-digit Aadhaar numbers in plaintext. Only store masked last 4 digits.<br>• Support APAAR ID (National Student ID).<br>• Data portability and export tools built into the administration panel. |

---

## 6. Open-Source & Community Risks

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **High Barrier to Contribution** | External contributors struggling to run the project locally. | Medium | High | • Single command onboarding (`npm install` & `docker compose up`).<br>• Complete automated seeding with realistic demo school data.<br>• Comprehensive documentation (`CONTRIBUTING.md`, `ARCHITECTURE.md`). |
| **Proprietary Feature Creep / Vendor Lock-in** | Features becoming dependent on proprietary paid cloud services (Firebase, AWS-only services). | High | Medium | • Adhere strictly to open standards (Web Push, standard PostgreSQL, standard Docker containers).<br>• Any external integration (SMS gateway, payment gateway) must be built as an optional swappable adapter. |
