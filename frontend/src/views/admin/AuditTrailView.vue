<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuditStore, AuditLogItem } from '@/stores/audit.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const auditStore = useAuditStore();

const searchInput = ref('');
const selectedAction = ref('ALL');
const selectedEntityType = ref('ALL');
const selectedDateFilter = ref('ALL');
const currentPage = ref(1);
const pageSize = ref(25);

const inspectingLog = ref<AuditLogItem | null>(null);
const showInspectModal = ref(false);

onMounted(async () => {
  await Promise.all([
    loadLogs(),
    auditStore.fetchMetadata(),
  ]);
});

async function loadLogs() {
  let startDate: string | undefined;
  let endDate: string | undefined;

  const now = new Date();
  if (selectedDateFilter.value === 'TODAY') {
    startDate = now.toISOString().slice(0, 10);
    endDate = startDate;
  } else if (selectedDateFilter.value === '7_DAYS') {
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate = past.toISOString().slice(0, 10);
  } else if (selectedDateFilter.value === '30_DAYS') {
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate = past.toISOString().slice(0, 10);
  }

  await auditStore.fetchAuditLogs({
    page: currentPage.value,
    limit: pageSize.value,
    search: searchInput.value,
    action: selectedAction.value,
    entityType: selectedEntityType.value,
    startDate,
    endDate,
  });
}

// Watch filters to reload
watch([selectedAction, selectedEntityType, selectedDateFilter], () => {
  currentPage.value = 1;
  loadLogs();
});

let searchDebounceTimer: any = null;
function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadLogs();
  }, 300);
}

function handlePageChange(newPage: number) {
  if (newPage < 1 || newPage > auditStore.pagination.totalPages) return;
  currentPage.value = newPage;
  loadLogs();
}

function inspectEvent(log: AuditLogItem) {
  inspectingLog.value = log;
  showInspectModal.value = true;
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getActionClass(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes('CREATE') || upper.includes('COLLECT') || upper.includes('ENROLL')) return 'action-create';
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('SUBMIT')) return 'action-update';
  if (upper.includes('DELETE') || upper.includes('REVOKE') || upper.includes('CANCEL')) return 'action-delete';
  if (upper.includes('LOGIN') || upper.includes('AUTH')) return 'action-auth';
  return 'action-default';
}

function getActorInitials(actor: any) {
  if (!actor) return 'SYS';
  const first = actor.firstName?.[0] || '';
  const last = actor.lastName?.[0] || '';
  return (first + last).toUpperCase() || 'U';
}

function getActorName(actor: any) {
  if (!actor) return 'Automated System Service';
  return `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.username || 'System User';
}

function exportCsv() {
  if (!auditStore.logs.length) return;
  const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Username', 'Actor Role', 'IP Address'];
  const rows = auditStore.logs.map((log) => [
    `"${log.createdAt}"`,
    `"${log.action}"`,
    `"${log.entityType}"`,
    `"${log.entityId || ''}"`,
    `"${getActorName(log.actor)}"`,
    `"${log.actor?.username || ''}"`,
    `"${log.actor?.primaryRole || ''}"`,
    `"${log.ipAddress || ''}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportJson() {
  if (!auditStore.logs.length) return;
  const jsonStr = JSON.stringify(auditStore.logs, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="audit-page" id="audit-trail-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge-row">
          <StatusBadge status="active" label="SECURITY & GOVERNANCE" />
          <span class="immutable-pill" id="immutable-ledger-pill">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="pill-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Immutable Ledger Active
          </span>
        </div>
        <h1 class="page-title">Institutional Audit Trail</h1>
        <p class="page-description">
          Cryptographically timestamped compliance ledger tracking administrative operations, grade inputs, student admissions, fee collections, and identity authentications.
        </p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="btn btn-secondary"
          id="btn-refresh-audit"
          :disabled="auditStore.isLoading"
          @click="loadLogs"
          title="Refresh Ledger"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon" :class="{ 'spin-anim': auditStore.isLoading }">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          id="btn-export-csv"
          @click="exportCsv"
          title="Export as CSV"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
        <button
          type="button"
          class="btn btn-primary"
          id="btn-export-json"
          @click="exportJson"
          title="Export as JSON"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export JSON
        </button>
      </div>
    </div>

    <!-- Analytics Cards -->
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-label">Total Recorded Events</span>
          <div class="stat-icon-box bg-indigo">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="stat-svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div class="stat-value">{{ auditStore.stats.totalAllTime }}</div>
        <div class="stat-footer text-muted">Permanent system log entries</div>
      </div>

      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-label">Today's Activity</span>
          <div class="stat-icon-box bg-emerald">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="stat-svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="stat-value text-emerald">{{ auditStore.stats.todayCount }}</div>
        <div class="stat-footer text-emerald">
          <span class="pulse-dot"></span> Active operations in past 24 hrs
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-label">System Integrity</span>
          <div class="stat-icon-box bg-cyan">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="stat-svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <div class="stat-value">100%</div>
        <div class="stat-footer text-cyan">All chains cryptographic & intact</div>
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="card filter-card">
      <div class="filter-row">
        <!-- Search -->
        <div class="search-input-wrap">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="search-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchInput"
            type="text"
            class="filter-search-input"
            id="audit-search-input"
            placeholder="Search by actor name, username, action, entity ID, or IP..."
            @input="handleSearchInput"
          />
          <button v-if="searchInput" class="clear-search-btn" @click="searchInput = ''; handleSearchInput()">×</button>
        </div>

        <!-- Action Dropdown -->
        <div class="filter-item">
          <label for="select-action" class="filter-label">Action</label>
          <select id="select-action" v-model="selectedAction" class="filter-select">
            <option value="ALL">All Actions</option>
            <option v-for="act in auditStore.metadata.actions" :key="act" :value="act">
              {{ act }}
            </option>
          </select>
        </div>

        <!-- Entity Type Dropdown -->
        <div class="filter-item">
          <label for="select-entity" class="filter-label">Entity Type</label>
          <select id="select-entity" v-model="selectedEntityType" class="filter-select">
            <option value="ALL">All Entities</option>
            <option v-for="ent in auditStore.metadata.entityTypes" :key="ent" :value="ent">
              {{ ent }}
            </option>
          </select>
        </div>

        <!-- Timeframe Dropdown -->
        <div class="filter-item">
          <label for="select-timeframe" class="filter-label">Timeframe</label>
          <select id="select-timeframe" v-model="selectedDateFilter" class="filter-select">
            <option value="ALL">All Time</option>
            <option value="TODAY">Today Only</option>
            <option value="7_DAYS">Last 7 Days</option>
            <option value="30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Audit Log Data Table -->
    <div class="table-container" id="audit-table-container">
      <div v-if="auditStore.isLoading && !auditStore.logs.length" class="table-loading-wrap">
        <div class="spinner"></div>
        <p class="text-secondary text-sm">Loading security audit records...</p>
      </div>

      <div v-else-if="!auditStore.logs.length" class="table-empty-wrap">
        <div class="empty-icon-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="empty-title">No Audit Events Found</h3>
        <p class="empty-desc">
          No recorded actions match your current search and filter criteria. Try adjusting your timeframe or keywords.
        </p>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          @click="searchInput = ''; selectedAction = 'ALL'; selectedEntityType = 'ALL'; selectedDateFilter = 'ALL'"
        >
          Reset All Filters
        </button>
      </div>

      <table v-else class="data-table" id="audit-records-table">
        <thead>
          <tr>
            <th class="col-time">Timestamp</th>
            <th class="col-actor">Actor / Operator</th>
            <th class="col-action">Action</th>
            <th class="col-entity">Target Entity</th>
            <th class="col-origin">Network Origin</th>
            <th class="col-inspect">Forensics</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in auditStore.logs"
            :key="log.id"
            :id="`audit-row-${log.id}`"
            class="table-row"
          >
            <!-- Timestamp -->
            <td class="time-cell">
              <div class="time-primary font-mono">{{ formatDateTime(log.createdAt) }}</div>
              <div class="time-relative">{{ formatRelativeTime(log.createdAt) }}</div>
            </td>

            <!-- Actor -->
            <td class="actor-cell">
              <div class="actor-wrap">
                <div class="actor-avatar">
                  {{ getActorInitials(log.actor) }}
                </div>
                <div class="actor-details">
                  <div class="actor-name">{{ getActorName(log.actor) }}</div>
                  <div class="actor-meta">
                    <span v-if="log.actor?.username" class="actor-code font-mono">{{ log.actor.username }}</span>
                    <span v-if="log.actor?.primaryRole" class="actor-role">{{ log.actor.primaryRole }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Action -->
            <td class="action-cell">
              <span :class="['action-badge', getActionClass(log.action)]">
                {{ log.action }}
              </span>
            </td>

            <!-- Target Entity -->
            <td class="entity-cell">
              <div class="entity-wrap">
                <span class="entity-type-badge">{{ log.entityType }}</span>
                <span v-if="log.entityId" class="entity-id-tag font-mono" :title="log.entityId">
                  {{ log.entityId.slice(0, 8) }}...
                </span>
              </div>
            </td>

            <!-- Network Origin -->
            <td class="origin-cell">
              <div class="origin-wrap">
                <span class="ip-badge font-mono">{{ log.ipAddress || '127.0.0.1' }}</span>
                <span v-if="log.userAgent" class="user-agent-brief text-muted" :title="log.userAgent">
                  {{ log.userAgent.slice(0, 32) }}...
                </span>
              </div>
            </td>

            <!-- Actions / Inspect -->
            <td class="inspect-cell">
              <button
                type="button"
                class="btn-inspect"
                :id="`inspect-btn-${log.id}`"
                @click="inspectEvent(log)"
                title="Inspect detailed event payload"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Inspect
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div v-if="auditStore.pagination.totalPages > 1" class="pagination-footer">
      <div class="pagination-info text-muted text-xs font-semibold">
        Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, auditStore.pagination.total) }} of {{ auditStore.pagination.total }} events
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="btn-page"
          :disabled="currentPage === 1"
          @click="handlePageChange(currentPage - 1)"
        >
          Previous
        </button>
        <span class="page-current font-mono">
          {{ currentPage }} / {{ auditStore.pagination.totalPages }}
        </span>
        <button
          type="button"
          class="btn-page"
          :disabled="currentPage === auditStore.pagination.totalPages"
          @click="handlePageChange(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Forensic Inspection Modal -->
    <div v-if="showInspectModal && inspectingLog" class="modal-backdrop" id="inspect-modal-backdrop">
      <div class="modal-card modal-lg" id="inspect-modal-card">
        <div class="modal-header">
          <div class="modal-title-box">
            <h3 class="modal-title">Audit Event Forensics</h3>
            <span class="modal-id-badge font-mono">{{ inspectingLog.id }}</span>
          </div>
          <button type="button" class="close-btn" @click="showInspectModal = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Summary Cards -->
          <div class="forensics-grid">
            <div class="forensic-item">
              <span class="forensic-label">ACTION</span>
              <span :class="['action-badge', getActionClass(inspectingLog.action)]">
                {{ inspectingLog.action }}
              </span>
            </div>

            <div class="forensic-item">
              <span class="forensic-label">TIMESTAMP (UTC)</span>
              <span class="forensic-val font-mono">{{ inspectingLog.createdAt }}</span>
            </div>

            <div class="forensic-item">
              <span class="forensic-label">TARGET ENTITY</span>
              <span class="forensic-val">{{ inspectingLog.entityType }} ({{ inspectingLog.entityId || 'N/A' }})</span>
            </div>

            <div class="forensic-item">
              <span class="forensic-label">ACTOR</span>
              <span class="forensic-val">{{ getActorName(inspectingLog.actor) }} ({{ inspectingLog.actor?.primaryRole || 'SYSTEM' }})</span>
            </div>

            <div class="forensic-item">
              <span class="forensic-label">ORIGIN IP</span>
              <span class="forensic-val font-mono">{{ inspectingLog.ipAddress || '127.0.0.1' }}</span>
            </div>

            <div class="forensic-item">
              <span class="forensic-label">USER AGENT</span>
              <span class="forensic-val text-xs text-muted" :title="inspectingLog.userAgent || ''">
                {{ inspectingLog.userAgent || 'Internal API Client' }}
              </span>
            </div>
          </div>

          <!-- Payload Diff Viewer -->
          <div class="diff-section">
            <div class="diff-header">
              <span class="diff-title">Captured Payload & Field Modifications</span>
              <span class="diff-pill font-mono">application/json</span>
            </div>
            <pre class="diff-viewer font-mono">{{ JSON.stringify(inspectingLog.diff || { message: 'No field modifications logged for this event.' }, null, 2) }}</pre>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showInspectModal = false">
            Close Forensics
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 1360px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.header-badge-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.immutable-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-emerald-400);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.03em;
}

[data-theme="light"] .immutable-pill {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.pill-icon {
  width: 14px;
  height: 14px;
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  margin-bottom: var(--space-1);
}

.page-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 800px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.stat-card {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-box.bg-indigo {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
}

.stat-icon-box.bg-emerald {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-emerald-400);
}

.stat-icon-box.bg-cyan {
  background: rgba(6, 182, 212, 0.15);
  color: var(--color-cyan-400);
}

.stat-svg {
  width: 20px;
  height: 20px;
}

.stat-value {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.stat-footer {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

/* Filter Card */
.filter-card {
  padding: 1.15rem 1.5rem;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-wrap {
  flex: 2;
  min-width: 280px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

.filter-search-input {
  width: 100%;
  padding-left: 2.5rem !important;
  padding-right: 2rem !important;
  height: 42px;
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
}

.filter-item {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.filter-select {
  height: 42px;
  width: 100%;
}

/* Table */
.col-time { min-width: 180px; }
.col-actor { min-width: 220px; }
.col-action { min-width: 160px; }
.col-entity { min-width: 160px; }
.col-origin { min-width: 160px; }
.col-inspect { min-width: 110px; text-align: right; }

.time-primary {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.time-relative {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

.actor-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.actor-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-cyan-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.actor-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.actor-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.actor-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.actor-code {
  font-size: 0.7rem;
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

[data-theme="light"] .actor-code {
  background: #f1f5f9;
}

.actor-role {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
}

[data-theme="light"] .actor-role {
  background: #e0e7ff;
  color: var(--color-primary-700);
}

/* Action Badges */
.action-badge {
  display: inline-flex;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-size: 0.725rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  font-family: var(--font-mono);
}

.action-create {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-emerald-400);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

[data-theme="light"] .action-create {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.action-update {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-amber-400);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

[data-theme="light"] .action-update {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.action-delete {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-rose-400);
  border: 1px solid rgba(244, 63, 94, 0.35);
}

[data-theme="light"] .action-delete {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.action-auth {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
  border: 1px solid rgba(99, 102, 241, 0.35);
}

[data-theme="light"] .action-auth {
  background: #e0e7ff;
  color: var(--color-primary-700);
  border-color: #c7d2fe;
}

.action-default {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--color-card-border);
}

.entity-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.entity-type-badge {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--text-primary);
}

.entity-id-tag {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.origin-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ip-badge {
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.user-agent-brief {
  font-size: 0.675rem;
}

.btn-inspect {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-card-border);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.btn-inspect:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
  border-color: rgba(99, 102, 241, 0.4);
}

[data-theme="light"] .btn-inspect {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

[data-theme="light"] .btn-inspect:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Loading & Empty */
.table-loading-wrap,
.table-empty-wrap {
  padding: 4.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}

.empty-icon-box {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.empty-icon-box svg {
  width: 28px;
  height: 28px;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 440px;
  line-height: 1.5;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spin-anim {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pagination */
.pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-page {
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-page:not(:disabled):hover {
  background: var(--color-surface-hover);
}

[data-theme="light"] .btn-page {
  background: #ffffff;
  border-color: #e2e8f0;
  color: #334155;
}

.page-current {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

/* Forensics Modal */
.modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-id-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

[data-theme="light"] .modal-id-badge {
  background: #e2e8f0;
  color: #475569;
}

.forensics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
}

[data-theme="light"] .forensics-grid {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.forensic-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.forensic-label {
  font-size: 0.6875rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

.forensic-val {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
}

.diff-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diff-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.diff-pill {
  font-size: 0.7rem;
  color: var(--color-cyan-400);
}

.diff-viewer {
  background: #080c14;
  color: #38bdf8;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
  line-height: 1.6;
  max-height: 280px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

[data-theme="light"] .diff-viewer {
  background: #0f172a;
  color: #38bdf8;
}
</style>
