<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { useSystemStore } from '@/stores/system.js';
import { useCommunicationStore } from '@/stores/communication.js';
import { useDiaryStore } from '@/stores/diary.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const authStore = useAuthStore();
const systemStore = useSystemStore();
const commStore = useCommunicationStore();
const diaryStore = useDiaryStore();

const activeRole = computed(() => authStore.user?.primaryRole || null);

const isTeacher = computed(() => activeRole.value === 'TEACHER');
const isStudent = computed(() => activeRole.value === 'STUDENT');
const isParent = computed(() => activeRole.value === 'PARENT');
const isPrincipal = computed(() => activeRole.value === 'PRINCIPAL' || activeRole.value === 'VICE_PRINCIPAL');
const isAccountant = computed(() => activeRole.value === 'ACCOUNTANT');
const isAdmin = computed(() => activeRole.value === 'SUPER_ADMIN' || activeRole.value === 'SCHOOL_ADMIN');

onMounted(() => {
  systemStore.checkHealth();
  commStore.fetchAnnouncements();
  diaryStore.fetchEntries({ date: new Date().toISOString().slice(0, 10) }).catch(() => {});
});
</script>

<template>
  <div class="dashboard-page" id="dashboard-view">
    <!-- Loading skeleton when user profile is loading -->
    <div v-if="!activeRole" class="card dashboard-loading-box" id="dashboard-loading">
      <div class="loading-spinner-wrap">
        <div class="spinner"></div>
        <p class="text-secondary text-sm font-semibold">Loading institutional cockpit...</p>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 1. TEACHER DASHBOARD VIEW                                             -->
    <!-- ===================================================================== -->
    <template v-else-if="isTeacher">
      <header class="hero-banner teacher-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Faculty Desk</span>
            <span class="badge badge-emerald">Class Teacher: Class 10-A</span>
            <span class="user-code-pill font-mono">
              {{ authStore.user?.username || 'VIDYA-TECHR-0001' }}
            </span>
          </div>
          <h1 class="hero-title">Welcome back, {{ authStore.user?.firstName || 'Priya' }} Nair 📚</h1>
          <p class="hero-subtitle">
            Senior Secondary Mathematics Faculty • Academic Session 2026–27
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/attendance" class="btn btn-primary" id="teacher-hero-rollcall-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Take Class 10-A Roll Call
          </router-link>
          <router-link to="/exams" class="btn btn-secondary" id="teacher-hero-marks-btn">
            Enter Marks
          </router-link>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Today's Teaching Periods</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">4 Periods</div>
          <div class="metric-trend text-indigo">
            <span>Next: Period 3 (Class 9-B)</span>
            <span class="trend-sub">08:30 AM - 03:15 PM</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Class 10-A Attendance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">95.0%</div>
          <div class="metric-trend text-emerald">
            <span>38 / 40 Students Present</span>
            <span class="trend-sub">2 Absentees Flagged</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Assessments Grading</span>
            <div class="metric-icon-box bg-amber">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div class="metric-value">1 Pending</div>
          <div class="metric-trend text-amber">
            <span>Term 1 Periodic Test Math</span>
            <span class="trend-sub">Due in 3 days</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Department Notices</span>
            <div class="metric-icon-box bg-cyan">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <div class="metric-value">3 Active</div>
          <div class="metric-trend text-cyan">
            <span>CBSE Practical guidelines</span>
            <span class="trend-sub">From Principal Desk</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>Today's Teaching Schedule</h3>
              <p>Allocated timetable slots for Senior Secondary Mathematics</p>
            </div>
            <router-link to="/timetable" class="btn btn-secondary btn-sm">Full Timetable</router-link>
          </div>

          <div class="schedule-timeline">
            <div class="schedule-row done">
              <div class="time-col">
                <span class="time-main">08:30 AM</span>
                <span class="time-sub">Period 1</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Class 10-A • Mathematics</span>
                <span class="slot-meta">Room 204 • Real Numbers & Quadratic Polynomials</span>
              </div>
              <span class="badge badge-emerald">Completed</span>
            </div>

            <div class="schedule-row current">
              <div class="time-col">
                <span class="time-main">10:15 AM</span>
                <span class="time-sub">Period 3</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Class 9-B • Mathematics</span>
                <span class="slot-meta">Room 108 • Coordinate Geometry & Linear Equations</span>
              </div>
              <span class="badge badge-indigo">Next Up</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">12:30 PM</span>
                <span class="time-sub">Period 5</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Class 10-B • Mathematics</span>
                <span class="slot-meta">Room 206 • Arithmetic Progressions</span>
              </div>
              <span class="badge badge-amber">Upcoming</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">02:30 PM</span>
                <span class="time-sub">Period 7</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Class 10-A • Remedial Math Lab</span>
                <span class="slot-meta">Mathematics Lab • Problem Solving & Doubts</span>
              </div>
              <span class="badge badge-amber">Upcoming</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Class 10-A Quick Desk</h3>
              <p>Roll call monitoring & quick teaching workflows</p>
            </div>
          </div>

          <div class="quick-action-tiles">
            <router-link to="/attendance" class="action-tile">
              <div class="tile-icon bg-emerald">✓</div>
              <div class="tile-text">
                <span class="tile-title">Daily Roll Call</span>
                <span class="tile-sub">Submit today's period attendance</span>
              </div>
            </router-link>

            <router-link to="/exams" class="action-tile">
              <div class="tile-icon bg-indigo">✎</div>
              <div class="tile-text">
                <span class="tile-title">Marks Entry</span>
                <span class="tile-sub">Spreadsheet grade input for assessments</span>
              </div>
            </router-link>

            <router-link to="/attendance/register" class="action-tile">
              <div class="tile-icon bg-cyan">📋</div>
              <div class="tile-text">
                <span class="tile-title">Monthly Register</span>
                <span class="tile-sub">Review CBSE 75% attendance compliance</span>
              </div>
            </router-link>

            <router-link to="/timetable?tab=diary" class="action-tile">
              <div class="tile-icon bg-indigo">📖</div>
              <div class="tile-text">
                <span class="tile-title">Daily Diary Notes</span>
                <span class="tile-sub">Record today's classwork & homework</span>
              </div>
            </router-link>

            <router-link to="/communication" class="action-tile">
              <div class="tile-icon bg-amber">📢</div>
              <div class="tile-text">
                <span class="tile-title">Class Circular</span>
                <span class="tile-sub">Notify parents & students via web push</span>
              </div>
            </router-link>
          </div>

          <div class="alert-box-subtle mt-4">
            <span class="font-bold text-rose-400">Class 10-A Absences Today:</span>
            <p class="text-xs text-secondary mt-1">
              Rohan Varma (Unexcused • SMS sent to guardian) • Ananya Iyer (Excused medical leave).
            </p>
          </div>
        </section>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 2. STUDENT DASHBOARD VIEW                                             -->
    <!-- ===================================================================== -->
    <template v-else-if="isStudent">
      <header class="hero-banner student-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Student Portal</span>
            <span class="badge badge-emerald">Class 10-A • Roll No. 12</span>
            <span class="user-code-pill font-mono">
              {{ authStore.user?.username || 'VIDYA-STUD-0001' }}
            </span>
          </div>
          <h1 class="hero-title">Welcome back, {{ authStore.user?.firstName || 'Aarav' }} {{ authStore.user?.lastName || 'Sundaram' }} 🎓</h1>
          <p class="hero-subtitle">
            CBSE Secondary Candidate • APAAR ID: 9845-1234-5678 • Vidya Academy
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/exams" class="btn btn-primary" id="student-hero-results-btn">
            View Term 1 Report Card
          </router-link>
          <router-link to="/timetable" class="btn btn-secondary">
            Weekly Timetable
          </router-link>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">My Attendance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">96.4%</div>
          <div class="metric-trend text-emerald">
            <span>112 / 116 School Days</span>
            <span class="trend-sub">CBSE 75% Requirement Met ✅</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Academic CGPA</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div class="metric-value">9.2 / 10.0</div>
          <div class="metric-trend text-indigo">
            <span>Rank #3 in Class 10-A</span>
            <span class="trend-sub">Term 1 Periodic Assessment</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Next Class</span>
            <div class="metric-icon-box bg-cyan">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">Maths (P3)</div>
          <div class="metric-trend text-cyan">
            <span>Room 204 • 10:15 AM</span>
            <span class="trend-sub">Mrs. Priya Nair</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Fee Clearance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div class="metric-value">Cleared</div>
          <div class="metric-trend text-emerald">
            <span>Zero Dues Pending</span>
            <span class="trend-sub">Receipt #REC-2026-042</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>My Timetable for Today</h3>
              <p>Daily period breakdown for Class 10-A</p>
            </div>
            <router-link to="/timetable" class="btn btn-secondary btn-sm">Grid View</router-link>
          </div>

          <div class="schedule-timeline">
            <div class="schedule-row done">
              <div class="time-col">
                <span class="time-main">08:30 AM</span>
                <span class="time-sub">P1</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">English Literature</span>
                <span class="slot-meta">Mrs. Anjali Roy • First Flight Unit 3</span>
              </div>
              <span class="badge badge-emerald">Done</span>
            </div>

            <div class="schedule-row current">
              <div class="time-col">
                <span class="time-main">10:15 AM</span>
                <span class="time-sub">P3</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Mathematics</span>
                <span class="slot-meta">Mrs. Priya Nair • Room 204 • Quadratic Equations</span>
              </div>
              <span class="badge badge-indigo">Next</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">11:00 AM</span>
                <span class="time-sub">P4</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Computer Applications</span>
                <span class="slot-meta">Lab 2 • Python Data Structures & HTML5</span>
              </div>
              <span class="badge badge-amber">Upcoming</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">12:30 PM</span>
                <span class="time-sub">P5</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Science (Physics)</span>
                <span class="slot-meta">Mr. Rajiv Sharma • Light: Reflection & Refraction</span>
              </div>
              <span class="badge badge-amber">Upcoming</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Term 1 CBSE Academic Performance</h3>
              <p>Official 9-point grading scale results</p>
            </div>
            <router-link to="/exams" class="btn btn-secondary btn-sm">Report Card</router-link>
          </div>

          <div class="grades-list">
            <div class="grade-row">
              <div class="grade-sub">
                <span class="font-bold">Mathematics (Standard)</span>
                <span class="text-xs text-muted">Course Code: 041</span>
              </div>
              <div class="grade-score">
                <span class="score-val">96 / 100</span>
                <span class="badge badge-emerald">A1</span>
              </div>
            </div>

            <div class="grade-row">
              <div class="grade-sub">
                <span class="font-bold">Science</span>
                <span class="text-xs text-muted">Course Code: 086</span>
              </div>
              <div class="grade-score">
                <span class="score-val">92 / 100</span>
                <span class="badge badge-emerald">A1</span>
              </div>
            </div>

            <div class="grade-row">
              <div class="grade-sub">
                <span class="font-bold">English Language & Literature</span>
                <span class="text-xs text-muted">Course Code: 184</span>
              </div>
              <div class="grade-score">
                <span class="score-val">88 / 100</span>
                <span class="badge badge-indigo">A2</span>
              </div>
            </div>

            <div class="grade-row">
              <div class="grade-sub">
                <span class="font-bold">Social Science</span>
                <span class="text-xs text-muted">Course Code: 087</span>
              </div>
              <div class="grade-score">
                <span class="score-val">85 / 100</span>
                <span class="badge badge-indigo">A2</span>
              </div>
            </div>

            <div class="grade-row">
              <div class="grade-sub">
                <span class="font-bold">Hindi Course A</span>
                <span class="text-xs text-muted">Course Code: 002</span>
              </div>
              <div class="grade-score">
                <span class="score-val">90 / 100</span>
                <span class="badge badge-emerald">A1</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Student Daily Diary & Homework Section -->
      <section class="card mt-6" id="student-diary-preview">
        <div class="section-header">
          <div>
            <h3>Today's Classwork & Homework Notes 📖</h3>
            <p>Daily lessons taught and assignments due from your teachers</p>
          </div>
          <router-link to="/timetable?tab=diary" class="btn btn-secondary btn-sm" id="student-view-all-diary-btn">
            Full Calendar Diary →
          </router-link>
        </div>

        <div v-if="diaryStore.entries.length === 0" class="empty-box p-4 text-center text-sm text-muted">
          No classwork or homework notes recorded for today yet. Use the calendar to view past dates.
        </div>
        <div v-else class="diary-preview-grid">
          <div v-for="entry in diaryStore.entries.slice(0, 3)" :key="entry.id" class="diary-preview-card">
            <div class="preview-header">
              <span class="badge badge-indigo font-bold">{{ entry.subject.name }}</span>
              <span v-if="entry.dueDate" class="badge badge-emerald text-xs">Due: {{ entry.dueDate.slice(0, 10) }}</span>
            </div>
            <div class="preview-body">
              <p class="text-xs text-secondary"><strong>Classwork:</strong> {{ entry.classwork }}</p>
              <p v-if="entry.homework" class="text-xs text-primary mt-1 font-semibold"><strong>Homework:</strong> {{ entry.homework }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ===================================================================== -->
    <!-- 3. PARENT DASHBOARD VIEW                                              -->
    <!-- ===================================================================== -->
    <template v-else-if="isParent">
      <header class="hero-banner parent-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Parent & Guardian Desk</span>
            <span class="badge badge-emerald">Ward: Aarav Sundaram (Class 10-A)</span>
            <span class="user-code-pill font-mono">
              {{ authStore.user?.username || 'VIDYA-PRNT-0001' }}
            </span>
          </div>
          <h1 class="hero-title">Welcome, {{ authStore.user?.firstName || 'Priya' }} {{ authStore.user?.lastName || 'Sundaram' }} 👨‍👩‍👧</h1>
          <p class="hero-subtitle">
            Live attendance tracking, academic trajectory, and fee receipts for your child
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/finance/fees" class="btn btn-secondary" id="parent-hero-receipt-btn">
            Download Fee Receipt
          </router-link>
          <router-link to="/exams" class="btn btn-primary" id="parent-hero-reportcard-btn">
            View CBSE Report Card
          </router-link>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Today's Attendance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">Present</div>
          <div class="metric-trend text-emerald">
            <span>● Marked Present at 08:15 AM</span>
            <span class="trend-sub">School Gate Roll Call</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Yearly Attendance Streak</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">96.4%</div>
          <div class="metric-trend text-indigo">
            <span>112 / 116 Days Attended</span>
            <span class="trend-sub">4 Authorized Leaves</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Academic Standing</span>
            <div class="metric-icon-box bg-amber">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">9.2 CGPA</div>
          <div class="metric-trend text-amber">
            <span>90.2% Aggregate (Term 1)</span>
            <span class="trend-sub">Class Rank #3</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Term Fee Status</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹0 Due</div>
          <div class="metric-trend text-emerald">
            <span>All Installments Paid</span>
            <span class="trend-sub">Next Due: Nov 15, 2026</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>Ward's School Day Status</h3>
              <p>Aarav Sharma • Class 10-A • Class Teacher: Mrs. Priya Nair</p>
            </div>
          </div>

          <div class="schedule-timeline">
            <div class="schedule-row current">
              <div class="time-col">
                <span class="time-main">Current</span>
                <span class="time-sub">P3</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Mathematics in Progress</span>
                <span class="slot-meta">Mrs. Priya Nair • Room 204</span>
              </div>
              <span class="badge badge-emerald">In Class</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">11:00 AM</span>
                <span class="time-sub">P4</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">Computer Applications Practical</span>
                <span class="slot-meta">Computer Lab 2</span>
              </div>
              <span class="badge badge-indigo">Upcoming</span>
            </div>

            <div class="schedule-row upcoming">
              <div class="time-col">
                <span class="time-main">03:15 PM</span>
                <span class="time-sub">Dismissal</span>
              </div>
              <div class="slot-info">
                <span class="slot-class">School Gate Bus Departure</span>
                <span class="slot-meta">Route 14 • Indiranagar Drop</span>
              </div>
              <span class="badge badge-amber">Planned</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Parent Action Desk</h3>
              <p>Invoices, communication & teacher messaging</p>
            </div>
          </div>

          <div class="quick-action-tiles">
            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-emerald">🧾</div>
              <div class="tile-text">
                <span class="tile-title">Fee Invoices & Receipts</span>
                <span class="tile-sub">View breakdown & instant PDF receipt</span>
              </div>
            </router-link>

            <router-link to="/exams" class="action-tile">
              <div class="tile-icon bg-indigo">🎖️</div>
              <div class="tile-text">
                <span class="tile-title">CBSE Report Card</span>
                <span class="tile-sub">Download official signed term card</span>
              </div>
            </router-link>

            <router-link to="/communication" class="action-tile">
              <div class="tile-icon bg-cyan">💬</div>
              <div class="tile-text">
                <span class="tile-title">Noticeboard & Circulars</span>
                <span class="tile-sub">Review official school broadcasts</span>
              </div>
            </router-link>
          </div>
        </section>
      </div>

      <!-- Parent Ward Daily Diary & Homework Section -->
      <section class="card mt-6" id="parent-diary-preview">
        <div class="section-header">
          <div>
            <h3>Ward's Daily Classwork & Homework Diary 📖</h3>
            <p>Review what Aarav studied in class today and upcoming homework tasks</p>
          </div>
          <router-link to="/timetable?tab=diary" class="btn btn-secondary btn-sm" id="parent-view-all-diary-btn">
            Open Diary & Calendar →
          </router-link>
        </div>

        <div v-if="diaryStore.entries.length === 0" class="empty-box p-4 text-center text-sm text-muted">
          No classwork or homework notes recorded for today yet. Check previous dates in the Diary calendar.
        </div>
        <div v-else class="diary-preview-grid">
          <div v-for="entry in diaryStore.entries.slice(0, 3)" :key="entry.id" class="diary-preview-card">
            <div class="preview-header">
              <span class="badge badge-indigo font-bold">{{ entry.subject.name }}</span>
              <span v-if="entry.dueDate" class="badge badge-emerald text-xs">Due: {{ entry.dueDate.slice(0, 10) }}</span>
            </div>
            <div class="preview-body">
              <p class="text-xs text-secondary"><strong>Classwork:</strong> {{ entry.classwork }}</p>
              <p v-if="entry.homework" class="text-xs text-primary mt-1 font-semibold"><strong>Homework:</strong> {{ entry.homework }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ===================================================================== -->
    <!-- 4. PRINCIPAL / LEADERSHIP DASHBOARD VIEW                              -->
    <!-- ===================================================================== -->
    <template v-else-if="isPrincipal">
      <header class="hero-banner principal-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Academic Leadership</span>
            <span class="badge badge-emerald">Affiliation #830412</span>
            <span class="user-code-pill font-mono">principal@vidya.org</span>
          </div>
          <h1 class="hero-title">Principal's Executive Cockpit 🏛️</h1>
          <p class="hero-subtitle">
            Central Institutional Governance, Faculty Allocation & Real-time Operations
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/communication" class="btn btn-primary" id="principal-hero-circular-btn">
            Broadcast School Circular
          </router-link>
          <router-link to="/attendance/register" class="btn btn-secondary">
            Inspect Attendance
          </router-link>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Schoolwide Attendance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">94.8%</div>
          <div class="metric-trend text-emerald">
            <span>1,248 / 1,316 Students Present</span>
            <span class="trend-sub">1 Section Below 85%</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Faculty on Duty</span>
            <div class="metric-icon-box bg-cyan">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="metric-value">68 / 72</div>
          <div class="metric-trend text-cyan">
            <span>4 on Approved Leave</span>
            <span class="trend-sub">Substitutions Covered</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Term Fee Realization</span>
            <div class="metric-icon-box bg-amber">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹84.2 L</div>
          <div class="metric-trend text-amber">
            <span>88.6% of ₹95.0 L Demand</span>
            <span class="trend-sub">₹10.8 L Receivables</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">CBSE Compliance</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">100% Valid</div>
          <div class="metric-trend text-indigo">
            <span>APAAR Registry Synced</span>
            <span class="trend-sub">24 Classes Compliant</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>Section Attendance & Health Overview</h3>
              <p>Live status across academic divisions</p>
            </div>
            <router-link to="/attendance/register" class="btn btn-secondary btn-sm">Full Registers</router-link>
          </div>

          <div class="section-health-table">
            <div class="health-row">
              <span class="font-bold">Class 12-A</span>
              <span class="text-sm">49 / 50 Present</span>
              <div class="health-bar"><div class="bar-fill bg-emerald" style="width: 98%;"></div></div>
              <span class="badge badge-emerald">98.0%</span>
            </div>

            <div class="health-row">
              <span class="font-bold">Class 10-A</span>
              <span class="text-sm">38 / 40 Present</span>
              <div class="health-bar"><div class="bar-fill bg-emerald" style="width: 95%;"></div></div>
              <span class="badge badge-emerald">95.0%</span>
            </div>

            <div class="health-row">
              <span class="font-bold">Class 9-B</span>
              <span class="text-sm">33 / 35 Present</span>
              <div class="health-bar"><div class="bar-fill bg-emerald" style="width: 94%;"></div></div>
              <span class="badge badge-emerald">94.2%</span>
            </div>

            <div class="health-row alert-row">
              <span class="font-bold">Class 8-B</span>
              <span class="text-sm">29 / 36 Present</span>
              <div class="health-bar"><div class="bar-fill bg-amber" style="width: 81%;"></div></div>
              <span class="badge badge-amber">81.0% Flagged</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Institutional Action Center</h3>
              <p>Executive governance workflows</p>
            </div>
          </div>

          <div class="quick-action-tiles">
            <router-link to="/communication" class="action-tile">
              <div class="tile-icon bg-indigo">📢</div>
              <div class="tile-text">
                <span class="tile-title">Broadcast Circular</span>
                <span class="tile-sub">Emergency & academic announcements</span>
              </div>
            </router-link>

            <router-link to="/exams" class="action-tile">
              <div class="tile-icon bg-cyan">📊</div>
              <div class="tile-text">
                <span class="tile-title">Exam Cycle Audits</span>
                <span class="tile-sub">Term assessments & CBSE grade distributions</span>
              </div>
            </router-link>

            <router-link to="/people/promote" class="action-tile">
              <div class="tile-icon bg-emerald">🚀</div>
              <div class="tile-text">
                <span class="tile-title">Batch Promotion</span>
                <span class="tile-sub">Annual academic cohort transition</span>
              </div>
            </router-link>

            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-amber">💳</div>
              <div class="tile-text">
                <span class="tile-title">Fee Demand Analysis</span>
                <span class="tile-sub">Institutional revenue & concession audit</span>
              </div>
            </router-link>
          </div>
        </section>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 5. ACCOUNTANT DASHBOARD VIEW                                          -->
    <!-- ===================================================================== -->
    <template v-else-if="isAccountant">
      <header class="hero-banner accountant-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Finance & Cash Counter</span>
            <span class="badge badge-emerald">FY 2026–27</span>
            <span class="user-code-pill font-mono">
              {{ authStore.user?.username || 'VIDYA-ACCT-0001' }}
            </span>
          </div>
          <h1 class="hero-title">Finance & Accounts Desk 💳</h1>
          <p class="hero-subtitle">
            Fee Collection Terminal, Instant Invoicing, Dues Ledger & Bank Reconciliation
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/finance/fees" class="btn btn-primary" id="accountant-hero-collect-btn">
            Open Collection Terminal
          </router-link>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Today's Collections</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹1,45,000</div>
          <div class="metric-trend text-emerald">
            <span>14 Receipts Issued Today</span>
            <span class="trend-sub">Counter + UPI QR</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Month-to-Date Realized</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹18,60,000</div>
          <div class="metric-trend text-indigo">
            <span>92% of Monthly Target</span>
            <span class="trend-sub">October 2026</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Outstanding Receivables</span>
            <div class="metric-icon-box bg-rose">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹10.8 L</div>
          <div class="metric-trend text-rose">
            <span>68 Unpaid Student Ledgers</span>
            <span class="trend-sub">Term 1 Dues</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Critical Defaulters</span>
            <div class="metric-icon-box bg-amber">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">18 Students</div>
          <div class="metric-trend text-amber">
            <span>>30 Days Overdue</span>
            <span class="trend-sub">SMS Reminders Queued</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>Recent Fee Transactions</h3>
              <p>Live collection feed across school counters</p>
            </div>
            <router-link to="/finance/fees" class="btn btn-secondary btn-sm">All Ledgers</router-link>
          </div>

          <div class="recent-tx-list">
            <div class="tx-item">
              <div class="tx-avatar bg-emerald">₹</div>
              <div class="tx-details">
                <span class="font-bold">Aarav Sharma (Class 10-A)</span>
                <span class="text-xs text-muted">Receipt #REC-2026-042 • UPI / Instant QR</span>
              </div>
              <div class="tx-amount">
                <span class="font-mono font-bold text-emerald">+₹18,500</span>
                <span class="badge badge-emerald">Settled</span>
              </div>
            </div>

            <div class="tx-item">
              <div class="tx-avatar bg-indigo">₹</div>
              <div class="tx-details">
                <span class="font-bold">Priya Patel (Class 9-B)</span>
                <span class="text-xs text-muted">Receipt #REC-2026-041 • Net Banking</span>
              </div>
              <div class="tx-amount">
                <span class="font-mono font-bold text-indigo">+₹12,000</span>
                <span class="badge badge-emerald">Settled</span>
              </div>
            </div>

            <div class="tx-item">
              <div class="tx-avatar bg-cyan">₹</div>
              <div class="tx-details">
                <span class="font-bold">Rohan Varma (Class 10-A)</span>
                <span class="text-xs text-muted">Receipt #REC-2026-040 • Cash Counter</span>
              </div>
              <div class="tx-amount">
                <span class="font-mono font-bold text-cyan">+₹6,500</span>
                <span class="badge badge-emerald">Settled</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Accounts Workflows</h3>
              <p>Fee schedules & reconciliation tools</p>
            </div>
          </div>

          <div class="quick-action-tiles">
            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-emerald">💳</div>
              <div class="tile-text">
                <span class="tile-title">Fee Terminal</span>
                <span class="tile-sub">Collect student dues & print receipts</span>
              </div>
            </router-link>

            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-indigo">📑</div>
              <div class="tile-text">
                <span class="tile-title">Manage Fee Plans</span>
                <span class="tile-sub">Indian fee heads, tuition & lab components</span>
              </div>
            </router-link>

            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-cyan">👥</div>
              <div class="tile-text">
                <span class="tile-title">Batch Class Allocation</span>
                <span class="tile-sub">Enroll full class rosters to fee schedules</span>
              </div>
            </router-link>
          </div>
        </section>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 6. SUPER_ADMIN / SCHOOL_ADMIN DASHBOARD VIEW                          -->
    <!-- ===================================================================== -->
    <template v-else-if="isAdmin">
      <header class="hero-banner admin-hero">
        <div class="hero-content">
          <div class="hero-tags">
            <span class="badge badge-indigo">Academic Year 2026–27</span>
            <span class="badge badge-emerald">CBSE Affiliation #830412</span>
            <span class="user-code-pill font-mono">
              {{ authStore.user?.username || authStore.user?.email || 'admin@vidya.org' }}
            </span>
          </div>
          <h1 class="hero-title">Vidya Academy Operations Hub ⚡</h1>
          <p class="hero-subtitle">
            Central Administration, People Registry, Curriculum & Multi-Role Governance
          </p>
        </div>

        <div class="hero-actions">
          <router-link to="/health" class="btn btn-secondary" id="hero-diagnostic-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            API Diagnostics
          </router-link>
          <button class="btn btn-primary" id="hero-quick-action-btn" @click="systemStore.checkHealth()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Probe Health
          </button>
        </div>
      </header>

      <section class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Total Enrollment</span>
            <div class="metric-icon-box bg-indigo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">1,248</div>
          <div class="metric-trend text-emerald">
            <span>↑ 14 new admissions</span>
            <span class="trend-sub">Classes Nursery–12</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Today's Attendance</span>
            <div class="metric-icon-box bg-emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">94.6%</div>
          <div class="metric-trend text-emerald">
            <span>1,181 Present</span>
            <span class="trend-sub">67 Unexcused Absent</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Faculty & Staff</span>
            <div class="metric-icon-box bg-cyan">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="metric-value">72</div>
          <div class="metric-trend text-indigo">
            <span>68 On Duty</span>
            <span class="trend-sub">4 On Approved Leave</span>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-top">
            <span class="metric-label">Term Fee Collection</span>
            <div class="metric-icon-box bg-amber">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="metric-value">₹84.2 L</div>
          <div class="metric-trend text-amber">
            <span>88.4% of Demand</span>
            <span class="trend-sub">Term 1 Dues Pending</span>
          </div>
        </div>
      </section>

      <div class="content-split">
        <section class="card">
          <div class="section-header">
            <div>
              <h3>Platform Core Infrastructure</h3>
              <p>Operational health & database replication</p>
            </div>
            <StatusBadge :status="systemStore.health.status" />
          </div>

          <div class="system-grid">
            <div class="sys-item">
              <span class="sys-title">Backend API Engine</span>
              <span class="sys-detail">Node.js + Fastify + TypeScript (Port 4000)</span>
            </div>
            <div class="sys-item">
              <span class="sys-title">Client Web App</span>
              <span class="sys-detail">Vue 3 + Vite + Pinia + Token Engine</span>
            </div>
            <div class="sys-item">
              <span class="sys-title">Primary Database</span>
              <span class="sys-detail">PostgreSQL 16 (Multi-tenant isolation)</span>
            </div>
            <div class="sys-item">
              <span class="sys-title">Security & Session Cache</span>
              <span class="sys-detail">Valkey / Redis 7 + Argon2 + 2FA TOTP</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <span class="text-xs text-muted">Institutional Prefix: <strong class="text-primary">VIDYA-</strong></span>
            <router-link to="/health" class="btn btn-secondary btn-sm">Diagnostics Probe</router-link>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <div>
              <h3>Administrative Shortcuts</h3>
              <p>Master operational entry points</p>
            </div>
          </div>

          <div class="quick-action-tiles">
            <router-link to="/students" class="action-tile">
              <div class="tile-icon bg-indigo">👥</div>
              <div class="tile-text">
                <span class="tile-title">People & Admissions</span>
                <span class="tile-sub">Students 360, APAAR ID register, teachers</span>
              </div>
            </router-link>

            <router-link to="/classes" class="action-tile">
              <div class="tile-icon bg-cyan">🏛️</div>
              <div class="tile-text">
                <span class="tile-title">Classes & Curriculum</span>
                <span class="tile-sub">Campuses, academic years, sections & subjects</span>
              </div>
            </router-link>

            <router-link to="/timetable" class="action-tile">
              <div class="tile-icon bg-emerald">📅</div>
              <div class="tile-text">
                <span class="tile-title">Timetable Engine</span>
                <span class="tile-sub">7-period weekly matrix & collision detection</span>
              </div>
            </router-link>

            <router-link to="/finance/fees" class="action-tile">
              <div class="tile-icon bg-amber">💳</div>
              <div class="tile-text">
                <span class="tile-title">Finance & Fee Plans</span>
                <span class="tile-sub">Invoicing, concessions & cash desk receipts</span>
              </div>
            </router-link>
          </div>
        </section>
      </div>
    </template>

    <!-- 7. Fallback for unexpected or custom institutional roles -->
    <template v-else>
      <div class="card p-8 text-center" id="dashboard-role-fallback">
        <h2 class="text-xl font-bold">Welcome, {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</h2>
        <p class="text-secondary mt-2">Active Role: {{ activeRole }}</p>
        <p class="text-muted text-sm mt-1">Institutional member workspace for Vidya School OS.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* DASHBOARD LOADING STATE */
.dashboard-loading-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  background: var(--color-surface-raised);
}

.loading-spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* HERO BANNER */
.hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(30, 27, 75, 0.8) 100%);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

.hero-banner::after {
  content: '';
  position: absolute;
  right: -50px;
  top: -50px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%);
  pointer-events: none;
}

.teacher-hero {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.9) 50%, rgba(30, 27, 75, 0.7) 100%);
}

.student-hero {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(6, 78, 59, 0.35) 100%);
}

.parent-hero {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(12, 74, 96, 0.35) 100%);
}

.principal-hero {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(49, 46, 129, 0.5) 100%);
}

.accountant-hero {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(67, 56, 202, 0.35) 50%, rgba(16, 185, 129, 0.2) 100%);
}

.hero-tags {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
  flex-wrap: wrap;
}

.user-code-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: var(--color-primary-400);
  letter-spacing: 0.05em;
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.375rem 0;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin: 0;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* METRICS GRID */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}

.metric-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.metric-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.metric-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon-box.bg-indigo { background: rgba(99, 102, 241, 0.15); color: var(--color-primary-400); }
.metric-icon-box.bg-emerald { background: rgba(16, 185, 129, 0.15); color: var(--color-emerald-400); }
.metric-icon-box.bg-cyan { background: rgba(6, 182, 212, 0.15); color: var(--color-cyan-400); }
.metric-icon-box.bg-amber { background: rgba(245, 158, 11, 0.15); color: var(--color-amber-400); }
.metric-icon-box.bg-rose { background: rgba(244, 63, 94, 0.15); color: var(--color-rose-400); }

.icon-svg {
  width: 20px;
  height: 20px;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.metric-trend {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.trend-sub {
  color: var(--text-muted);
  font-weight: 400;
}

.text-emerald { color: var(--color-emerald-400); }
.text-indigo { color: var(--color-primary-400); }
.text-cyan { color: var(--color-cyan-400); }
.text-amber { color: var(--color-amber-400); }
.text-rose { color: var(--color-rose-400); }

/* CONTENT SPLIT */
.content-split {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .content-split {
    grid-template-columns: 1fr;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-card-border);
}

.section-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.section-header p {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0.125rem 0 0 0;
}

/* SCHEDULE TIMELINE */
.schedule-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  transition: all var(--duration-fast);
}

.schedule-row:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(99, 102, 241, 0.3);
}

.schedule-row.current {
  border-color: var(--color-primary-500);
  background: rgba(99, 102, 241, 0.08);
}

.time-col {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}

.time-main {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.time-sub {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.slot-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 1rem;
}

.slot-class {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.slot-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* QUICK ACTION TILES */
.quick-action-tiles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.action-tile {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--duration-fast);
}

.action-tile:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.35);
  transform: translateX(3px);
}

.tile-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.tile-icon.bg-indigo { background: rgba(99, 102, 241, 0.2); color: var(--color-primary-400); }
.tile-icon.bg-emerald { background: rgba(16, 185, 129, 0.2); color: var(--color-emerald-400); }
.tile-icon.bg-cyan { background: rgba(6, 182, 212, 0.2); color: var(--color-cyan-400); }
.tile-icon.bg-amber { background: rgba(245, 158, 11, 0.2); color: var(--color-amber-400); }

.tile-text {
  display: flex;
  flex-direction: column;
}

.tile-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.tile-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* GRADES LIST */
.grades-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.grade-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
}

.grade-sub {
  display: flex;
  flex-direction: column;
}

.grade-score {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-val {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

/* SECTION HEALTH TABLE */
.section-health-table {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.health-row {
  display: grid;
  grid-template-columns: 90px 120px 1fr 100px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
}

.health-row.alert-row {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.05);
}

.health-bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
}

/* RECENT TRANSACTIONS */
.recent-tx-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
}

.tx-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.tx-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 1rem;
}

.tx-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

/* SYSTEM GRID */
.system-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.sys-item {
  display: flex;
  flex-direction: column;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-md);
}

.sys-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.sys-detail {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.alert-box-subtle {
  padding: 0.75rem 1rem;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.2);
  border-radius: var(--radius-md);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

/* LIGHT THEME OVERRIDES */
[data-theme="light"] .perspective-bar {
  background: #ffffff;
  border-color: #e2e8f0;
}

[data-theme="light"] .perspective-pill {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
}

[data-theme="light"] .hero-banner {
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border-color: #e2e8f0;
}

[data-theme="light"] .schedule-row,
[data-theme="light"] .action-tile,
[data-theme="light"] .grade-row,
[data-theme="light"] .health-row,
[data-theme="light"] .tx-item,
[data-theme="light"] .sys-item,
[data-theme="light"] .diary-preview-card {
  background: #f8fafc;
  border-color: #e2e8f0;
}

/* Diary Preview Grid */
.diary-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.diary-preview-card {
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  transition: transform var(--duration-fast);
}

.diary-preview-card:hover {
  transform: translateY(-2px);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  line-height: 1.45;
}
</style>
