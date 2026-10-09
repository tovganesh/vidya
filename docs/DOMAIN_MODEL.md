# Vidya — Domain Model & ERD Specification

> **Version:** 1.0.0  
> **Status:** Approved / Foundational  
> **Scope:** Relational Entity-Relationship Model, Indian School Domain Semantics  

---

## 1. Domain Philosophy & The Indian School Context

In traditional Western school software, a student is often modeled with a direct link to a single `grade_level` or `room`. In Indian education (CBSE, ICSE, and State Boards), this naive modeling breaks down immediately due to three institutional realities:

1. **Lifelong Academic Trajectory & Historical Immutability**:
   A student joins Nursery in 2020, progresses through Class 10 in 2032, and graduates Class 12 in 2034. During each academic year, the student is assigned to a specific **Academic Year**, **Class**, and **Section** (e.g., *2025-26: Class 9, Section B*). Historical report cards, attendance records, fee concessions, and behavioral marks from prior years must remain permanently preserved and immutable regardless of future promotions.
2. **Multi-Curricular & Board Structures**:
   Schools support diverse boards (CBSE, ICSE, State Boards, Cambridge/IB). Subjects are categorized into Core, Elective, Co-Scholastic, and Regional Languages.
3. **Indian Fee Structures & Challan Invoicing**:
   Fees are not simply monthly subscriptions. They consist of structured fee heads (Tuition Fee, Term Fee, Laboratory Fee, Transport Fee, Computer Fee, PTA Fund), broken into terms or quarterly installments, subject to customized caste/sibling/scholarship concessions, and recorded with formal numbered paper receipts.

---

## 2. Entity Relationship Overview

```mermaid
erDiagram
    ORGANIZATION ||--o{ SCHOOL : owns
    SCHOOL ||--o{ CAMPUS : has
    SCHOOL ||--o{ ACADEMIC_YEAR : operates
    SCHOOL ||--o{ USER : employs_or_registers
    
    ACADEMIC_YEAR ||--o{ CLASS : defines
    CLASS ||--o{ SECTION : divides_into
    CLASS ||--o{ SUBJECT : teaches
    
    STUDENT ||--o{ ENROLLMENT : tracks_history
    ACADEMIC_YEAR ||--o{ ENROLLMENT : spans
    CLASS ||--o{ ENROLLMENT : assigns_class
    SECTION ||--o{ ENROLLMENT : assigns_section
    
    STUDENT ||--o{ STUDENT_GUARDIAN : has
    GUARDIAN ||--o{ STUDENT_GUARDIAN : cares_for
    USER ||--o| GUARDIAN : links_account
    USER ||--o| STUDENT : links_account
    USER ||--o| TEACHER : links_account
    
    TEACHER ||--o{ TEACHER_ALLOCATION : assigned
    SECTION ||--o{ TEACHER_ALLOCATION : receives
    SUBJECT ||--o{ TEACHER_ALLOCATION : teaches
    ACADEMIC_YEAR ||--o{ TEACHER_ALLOCATION : valid_for
    
    ENROLLMENT ||--o{ ATTENDANCE_RECORD : logs
    
    ACADEMIC_YEAR ||--o{ EXAM_TERM : organizes
    EXAM_TERM ||--o{ EXAM : schedules
    EXAM ||--o{ ASSESSMENT : evaluates
    ENROLLMENT ||--o{ MARKS_RECORD : scores
    ASSESSMENT ||--o{ MARKS_RECORD : graded_in
    
    ACADEMIC_YEAR ||--o{ FEE_STRUCTURE : sets
    CLASS ||--o{ FEE_STRUCTURE : applies_to
    FEE_STRUCTURE ||--o{ FEE_COMPONENT : includes
    STUDENT ||--o{ STUDENT_FEE : owes
    FEE_STRUCTURE ||--o{ STUDENT_FEE : derived_from
    STUDENT_FEE ||--o{ FEE_PAYMENT : collects
    FEE_PAYMENT ||--|| RECEIPT : issues
    
    SCHOOL ||--o{ AUDIT_LOG : tracks
    USER ||--o{ AUDIT_LOG : executes
```

---

## 3. Core Entity Specifications

### 3.1 Organization & School Hierarchy

#### `organizations`
Represents the umbrella educational trust, society, or management committee (e.g., *"Vidya Bharati Trust"* or *"Delhi Public School Society"*).
- `id`: UUID (Primary Key)
- `name`: String
- `registration_number`: String (Charitable trust / society registration)
- `created_at`, `updated_at`: Timestamp

#### `schools`
The individual school unit holding distinct board affiliations.
- `id`: UUID (Primary Key)
- `organization_id`: UUID (Foreign Key -> `organizations.id`)
- `name`: String (e.g., *"Vidya Academy, Bengaluru"*)
- `code`: String (Unique school code)
- `board`: Enum (`CBSE`, `ICSE`, `STATE_BOARD`, `IB`, `CAMBRIDGE`, `OTHER`)
- `affiliation_number`: String (Official board affiliation code)
- `email`: String
- `phone`: String
- `address`: JSONB (street, city, state, postal_code, country)
- `currency`: String (Default: `'INR'`)
- `settings`: JSONB (academic start month, attendance type, notification defaults)
- `created_at`, `updated_at`, `deleted_at`: Timestamp

#### `campuses`
Physical branch or campus location for multi-campus schools.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `name`: String (e.g., *"South Campus - Indiranagar"*)
- `address`: JSONB

---

### 3.2 Academic Structure & Lifecycles

#### `academic_years`
The foundational temporal anchor of all school operations.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `name`: String (e.g., `"2025-2026"`, `"2026-2027"`)
- `start_date`: Date (e.g., `2026-06-01` for South India or `2026-04-01` for North India)
- `end_date`: Date (e.g., `2027-04-30` or `2027-03-31`)
- `status`: Enum (`PLANNING`, `ACTIVE`, `CONCLUDED`, `ARCHIVED`)
- `is_current`: Boolean (Exactly one active year per school at any time)

#### `classes` (Grades)
Standard school tiers (e.g., Pre-KG, LKG, UKG, Class 1 through Class 12).
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `name`: String (e.g., `"Class 10"`, `"Grade 5"`, `"LKG"`)
- `code`: String (e.g., `"STD-10"`, `"G-05"`)
- `stage`: Enum (`PRE_PRIMARY`, `PRIMARY`, `MIDDLE`, `SECONDARY`, `HIGHER_SECONDARY`)
- `order_index`: Integer (For sorting from lowest to highest grade)

#### `sections`
Subdivisions of a class for practical classroom operations.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `class_id`: UUID (Foreign Key -> `classes.id`)
- `name`: String (e.g., `"A"`, `"B"`, `"Rose"`, `"Lotus"`)
- `room_number`: String (Optional)
- `capacity`: Integer (Default: 40)

#### `subjects`
Academic courses taught across the curriculum.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `name`: String (e.g., `"Mathematics"`, `"Science"`, `"Social Science"`, `"Sanskrit"`, `"Kannada"`)
- `code`: String (e.g., `"MATH10"`, `"SCI10"`)
- `type`: Enum (`THEORY`, `PRACTICAL`, `CO_SCHOLASTIC`, `VOCATIONAL`)

---

### 3.3 People, Identity & Lifelong Enrollment

#### `users`
Unified authentication credentials and core security attributes.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Nullable for Super Admin; mandatory for school personnel)
- `email`: String (Unique)
- `phone`: String (Unique per school)
- `password_hash`: String (Argon2id)
- `primary_role`: Enum (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `ACCOUNTANT`, `LIBRARIAN`, `TRANSPORT_MANAGER`, `HR_MANAGER`, `PARENT`, `STUDENT`)
- `is_totp_enabled`: Boolean
- `totp_secret`: String (Encrypted)
- `status`: Enum (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- `last_login_at`: Timestamp
- `created_at`, `updated_at`: Timestamp

#### `students`
Permanent master record of an admitted student.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `user_id`: UUID (Foreign Key -> `users.id`, nullable if student has no portal login)
- `admission_number`: String (Unique per school, e.g. `"VS-2026-0142"`)
- `admission_date`: Date
- `first_name`: String
- `middle_name`: String (Optional)
- `last_name`: String
- `gender`: Enum (`MALE`, `FEMALE`, `OTHER`)
- `date_of_birth`: Date
- `blood_group`: Enum (`A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG`, `UNKNOWN`)
- `apaar_id`: String (Automated Permanent Academic Account Registry - National Student ID)
- `aadhaar_last_four`: String (Encrypted/Masked per UIDAI guidelines)
- `nationality`: String (Default: `"Indian"`)
- `religion`: String (Optional)
- `category`: Enum (`GENERAL`, `OBC`, `SC`, `ST`, `EWS`)
- `permanent_address`: JSONB
- `current_address`: JSONB
- `photo_url`: String
- `status`: Enum (`ENROLLED`, `ALUMNI`, `TRANSFERRED`, `WITHDRAWN`)
- `created_at`, `updated_at`, `deleted_at`: Timestamp

#### `guardians` (Parents)
Primary and secondary contact profiles for a student.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `user_id`: UUID (Foreign Key -> `users.id`, nullable until portal activated)
- `name`: String
- `relationship`: Enum (`FATHER`, `MOTHER`, `GUARDIAN`)
- `phone`: String (Primary communication number)
- `email`: String
- `occupation`: String
- `annual_income`: String (Optional, for scholarship determination)
- `address`: JSONB

#### `student_guardians` (Junction)
Associates parents to students with priority flags.
- `id`: UUID (Primary Key)
- `student_id`: UUID (Foreign Key -> `students.id`)
- `guardian_id`: UUID (Foreign Key -> `guardians.id`)
- `is_primary_contact`: Boolean
- `is_authorized_pickup`: Boolean
- `receives_notifications`: Boolean

#### `enrollments` (The Crucial Domain Bridge)
Represents a student's placement in a specific class and section for an academic year.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `student_id`: UUID (Foreign Key -> `students.id`)
- `academic_year_id`: UUID (Foreign Key -> `academic_years.id`)
- `class_id`: UUID (Foreign Key -> `classes.id`)
- `section_id`: UUID (Foreign Key -> `sections.id`)
- `roll_number`: Integer (e.g., `24`)
- `enrollment_date`: Date
- `status`: Enum (`ACTIVE`, `PROMOTED`, `RETAINED`, `TRANSFERRED_OUT`, `DROPPED`)
- `remarks`: String
- **Unique Constraint**: `(student_id, academic_year_id)` (A student can only have one active enrollment per academic year).

---

### 3.4 Teacher Allocations & Staff

#### `teachers`
Staff member instructional profile.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `user_id`: UUID (Foreign Key -> `users.id`)
- `employee_code`: String (Unique per school)
- `first_name`, `last_name`: String
- `qualification`: String (e.g., `"M.Sc, B.Ed"`)
- `specialization`: String
- `phone`: String
- `joining_date`: Date
- `status`: Enum (`ACTIVE`, `ON_LEAVE`, `RESIGNED`)

#### `teacher_allocations`
Assigns teachers to classes, sections, and subjects for an academic year.
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `teacher_id`: UUID (Foreign Key -> `teachers.id`)
- `academic_year_id`: UUID (Foreign Key -> `academic_years.id`)
- `class_id`: UUID (Foreign Key -> `classes.id`)
- `section_id`: UUID (Foreign Key -> `sections.id`)
- `subject_id`: UUID (Foreign Key -> `subjects.id`, nullable if purely class teacher)
- `is_class_teacher`: Boolean (Class teacher responsible for morning roll call & report cards)

---

### 3.5 Daily Attendance Records

#### `attendance_records`
- `id`: UUID (Primary Key)
- `school_id`: UUID (Foreign Key -> `schools.id`)
- `enrollment_id`: UUID (Foreign Key -> `enrollments.id`)
- `date`: Date
- `status`: Enum (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`)
- `remarks`: String
- `recorded_by`: UUID (Foreign Key -> `users.id`)
- `recorded_at`: Timestamp
- **Unique Constraint**: `(enrollment_id, date)`

---

### 3.6 Examinations & Marksheets

#### `exam_terms`
Major testing milestones (e.g., *"Term 1 (Half-Yearly)"*, *"Term 2 (Annual Examination)"*).
- `id`: UUID (Primary Key)
- `school_id`: UUID
- `academic_year_id`: UUID
- `name`: String
- `start_date`, `end_date`: Date

#### `assessments`
Specific test papers within an exam (e.g., *"Class 10 - Mathematics - Annual Exam"*).
- `id`: UUID (Primary Key)
- `exam_term_id`: UUID (Foreign Key -> `exam_terms.id`)
- `class_id`: UUID
- `subject_id`: UUID
- `max_marks`: Decimal(5, 2) (e.g., `100.00`)
- `pass_marks`: Decimal(5, 2) (e.g., `35.00`)
- `date`: Date

#### `marks_records`
Individual scored marks per student.
- `id`: UUID (Primary Key)
- `assessment_id`: UUID (Foreign Key -> `assessments.id`)
- `enrollment_id`: UUID (Foreign Key -> `enrollments.id`)
- `marks_obtained`: Decimal(5, 2) (Nullable if absent)
- `is_absent`: Boolean
- `grade`: String (Computed: `"A1"`, `"B2"`, etc.)
- `remarks`: String
- `entered_by`: UUID (Foreign Key -> `users.id`)

---

### 3.7 Indian School Fee & Finance Model

```text
 ┌──────────────────────┐
 │    Fee Structure     │  (e.g., Class 10 - 2026-27 CBSE Fee Plan)
 └──────────┬───────────┘
            │ 1:N
            ▼
 ┌──────────────────────┐
 │    Fee Components    │  (Tuition: ₹35,000 | Lab: ₹5,000 | Computer: ₹3,000 | Annual: ₹8,000)
 └──────────┬───────────┘
            │ Instantiated per Enrolled Student
            ▼
 ┌──────────────────────┐
 │     Student Fee      │  (Gross: ₹51,000 | Sibling Concession: -₹5,000 | Net Payable: ₹46,000)
 └──────────┬───────────┘
            │ 1:N Installment Collections
            ▼
 ┌──────────────────────┐
 │     Fee Payment      │  (₹23,000 collected via UPI/Demand Draft/Cash on 15-Jul-2026)
 └──────────┬───────────┘
            │ 1:1
            ▼
 ┌──────────────────────┐
 │    Payment Receipt   │  (Formal Receipt No: VS/2026/REC-0419 with GST breakdown)
 └──────────────────────┘
```

#### `fee_structures`
- `id`: UUID (Primary Key)
- `school_id`: UUID
- `academic_year_id`: UUID
- `class_id`: UUID
- `name`: String (e.g., `"Standard CBSE Fee Structure - 2026-27"`)

#### `fee_components`
- `id`: UUID (Primary Key)
- `fee_structure_id`: UUID
- `title`: String (e.g., `"Tuition Fee"`, `"Library & Digital Lab Fee"`, `"Sports Fee"`)
- `amount`: Decimal(10, 2)
- `frequency`: Enum (`ONE_TIME`, `ANNUAL`, `TERM_WISE`, `QUARTERLY`, `MONTHLY`)
- `due_date`: Date

#### `student_fees` (Student Ledger)
- `id`: UUID (Primary Key)
- `school_id`: UUID
- `enrollment_id`: UUID
- `fee_structure_id`: UUID
- `gross_amount`: Decimal(10, 2)
- `concession_amount`: Decimal(10, 2)
- `concession_reason`: String (e.g., `"Sibling Discount 10%"`, `"Merit Scholarship"`)
- `net_payable`: Decimal(10, 2)
- `paid_amount`: Decimal(10, 2)
- `due_amount`: Decimal(10, 2)
- `status`: Enum (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`)

#### `fee_payments` & `receipts`
- `id`: UUID (Primary Key)
- `student_fee_id`: UUID
- `receipt_number`: String (Unique per school, e.g. `"REC-2026-0814"`)
- `amount_paid`: Decimal(10, 2)
- `payment_mode`: Enum (`UPI`, `NEFT_RTGS`, `CASH`, `CHEQUE`, `DEMAND_DRAFT`, `CARD`)
- `transaction_reference`: String (UTR / Cheque number)
- `paid_on`: Date
- `collected_by`: UUID (Foreign Key -> `users.id`)

---

## 4. Integrity Invariants & Constraints

1. **Academic Year Uniqueness**:
   A school can only have **one** Academic Year marked `is_current = true`.
2. **Enrollment Uniqueness**:
   A `student_id` can be active in at most **one** `enrollment` record for any given `academic_year_id`.
3. **Attendance Single Log**:
   Only **one** attendance record can exist for a given `enrollment_id` on any `date`.
4. **Receipt Number Immutability**:
   `receipt_number` is sequentially generated, non-reusable, and once issued, the payment record cannot be updated or deleted (reversals are handled via credit adjustments).
5. **Multi-Tenant Partitioning**:
   Every operational table enforces an index on `school_id`. No entity query can resolve across school boundaries.
