<script setup lang="ts">
import { onMounted } from 'vue';
import { useSystemStore } from '@/stores/system.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const systemStore = useSystemStore();

onMounted(() => {
  systemStore.checkHealth();
});
</script>

<template>
  <div class="dashboard-page" id="dashboard-view">
    <!-- Welcome Header Banner -->
    <header class="hero-banner">
      <div class="hero-content">
        <div class="hero-tags">
          <span class="badge badge-indigo">Academic Year 2026–27</span>
          <span class="badge badge-emerald">CBSE Affiliation #830412</span>
        </div>
        <h1 class="hero-title">VidyaSetu Academy</h1>
        <p class="hero-subtitle">
          Open School Operating System — Central Administration & Operations Hub
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
          Probe Status
        </button>
      </div>
    </header>

    <!-- Key Metrics Grid -->
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

    <!-- Operational Split -->
    <div class="content-split">
      <!-- Left Column: Architecture & Foundation Status -->
      <section class="card status-section">
        <div class="section-header">
          <div>
            <h3>Platform Core Architecture</h3>
            <p>Milestone 1 — Workspace & Operational Engine Status</p>
          </div>
          <StatusBadge :status="systemStore.health.status" />
        </div>

        <div class="system-grid">
          <div class="sys-item">
            <span class="sys-title">Backend API Engine</span>
            <span class="sys-detail">Node.js + Fastify + TypeScript (Port 4000)</span>
          </div>
          <div class="sys-item">
            <span class="sys-title">Client Web App & PWA</span>
            <span class="sys-detail">Vue 3 + Vite + Pinia + Custom Tokens</span>
          </div>
          <div class="sys-item">
            <span class="sys-title">Primary Database</span>
            <span class="sys-detail">PostgreSQL 16 (Relational ACID & Tenant Isolation)</span>
          </div>
          <div class="sys-item">
            <span class="sys-title">Deployment Topology</span>
            <span class="sys-detail">Modular Monolith / Docker Compose</span>
          </div>
        </div>

        <div class="api-probe-box">
          <div class="probe-header">
            <span class="probe-title">Live API Health Probe:</span>
            <span class="probe-url">GET /api/v1/health</span>
          </div>
          <pre class="probe-code"><code>{{ JSON.stringify(systemStore.health, null, 2) }}</code></pre>
        </div>
      </section>

      <!-- Right Column: Quick Workflows & Architectural Roadmap -->
      <section class="card workflows-section">
        <h3>Operational Workflows</h3>
        <p>Core School Operating System Modules</p>

        <div class="workflow-list">
          <div class="workflow-item">
            <div class="wf-dot active"></div>
            <div class="wf-info">
              <span class="wf-name">M1: Core Workspace & Dev Environment</span>
              <span class="wf-desc">Fastify API, Vue 3 PWA Shell, Docker Compose & Diagnostics</span>
            </div>
            <span class="badge badge-emerald">Active</span>
          </div>

          <div class="workflow-item">
            <div class="wf-dot queued"></div>
            <div class="wf-info">
              <span class="wf-name">M2: Database Layer & Prisma Migrations</span>
              <span class="wf-desc">Schemas for Organizations, Schools, Academic Years, Users</span>
            </div>
            <span class="badge badge-indigo">Next</span>
          </div>

          <div class="workflow-item">
            <div class="wf-dot queued"></div>
            <div class="wf-info">
              <span class="wf-name">M3: Authentication & 2FA</span>
              <span class="wf-desc">Argon2id, JWT Rotation, 11-Role RBAC & Audit Interceptor</span>
            </div>
            <span class="badge badge-indigo">Queued</span>
          </div>

          <div class="workflow-item">
            <div class="wf-dot queued"></div>
            <div class="wf-info">
              <span class="wf-name">M4–M6: Academics, People & Attendance</span>
              <span class="wf-desc">Lifelong Enrollment, Roll Call, Timetable Conflict Avoidance</span>
            </div>
            <span class="badge badge-indigo">Planned</span>
          </div>

          <div class="workflow-item">
            <div class="wf-dot queued"></div>
            <div class="wf-info">
              <span class="wf-name">M7–M9: Web Push, Exams & Fees</span>
              <span class="wf-desc">VAPID Push, CBSE Report Cards, Indian Fee Receipts</span>
            </div>
            <span class="badge badge-indigo">Planned</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.hero-banner {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-md);
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hero-tags {
  display: flex;
  gap: 0.5rem;
}

.hero-title {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: 0.95rem;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.metric-icon-box {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-indigo { background: rgba(99, 102, 241, 0.18); color: var(--color-primary-400); }
.bg-emerald { background: rgba(16, 185, 129, 0.18); color: var(--color-emerald-400); }
.bg-cyan { background: rgba(6, 182, 212, 0.18); color: var(--color-cyan-400); }
.bg-amber { background: rgba(245, 158, 11, 0.18); color: var(--color-amber-400); }

.icon-svg {
  width: 20px;
  height: 20px;
}

.metric-value {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.metric-trend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
}

.trend-sub {
  color: var(--text-muted);
}

.text-emerald { color: var(--color-emerald-400); }
.text-indigo { color: var(--color-primary-400); }
.text-amber { color: var(--color-amber-400); }

/* Content Split */
.content-split {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.system-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sys-item {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  padding: 0.85rem;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sys-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.sys-detail {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.api-probe-box {
  background: #060911;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.probe-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--color-card-border);
  font-size: 0.75rem;
}

.probe-title {
  color: var(--text-muted);
}

.probe-url {
  font-family: var(--font-mono);
  color: var(--color-cyan-400);
}

.probe-code {
  padding: 0.85rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: #a5b4fc;
  overflow-x: auto;
}

/* Workflow List */
.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.25rem;
}

.workflow-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
}

.wf-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.wf-dot.active {
  background-color: var(--color-emerald-400);
  box-shadow: 0 0 8px var(--color-emerald-400);
}

.wf-dot.queued {
  background-color: var(--text-muted);
}

.wf-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.wf-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.wf-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .content-split {
    grid-template-columns: 1fr;
  }
  .hero-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
  }
}
</style>
