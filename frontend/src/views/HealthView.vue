<script setup lang="ts">
import { onMounted } from 'vue';
import { useSystemStore } from '@/stores/system.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const systemStore = useSystemStore();

onMounted(() => {
  systemStore.checkHealth();
});

function formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
</script>

<template>
  <div class="health-page" id="health-diagnostics-view">
    <div class="page-header">
      <div>
        <h1>System Health & API Diagnostics</h1>
        <p>Real-time telemetry and service heartbeat verification</p>
      </div>

      <button class="btn btn-primary" :disabled="systemStore.isChecking" @click="systemStore.checkHealth()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon" :class="{ spinning: systemStore.isChecking }">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ systemStore.isChecking ? 'Probing...' : 'Run Live Diagnostic' }}</span>
      </button>
    </div>

    <!-- Diagnostic Cards -->
    <div class="diagnostic-grid">
      <div class="card stat-card">
        <span class="stat-label">Core API Status</span>
        <div class="stat-body">
          <StatusBadge :status="systemStore.health.status" />
          <span class="stat-sub">{{ systemStore.health.service }}</span>
        </div>
      </div>

      <div class="card stat-card">
        <span class="stat-label">System Uptime</span>
        <div class="stat-value font-mono">{{ formatUptime(systemStore.health.uptimeSeconds) }}</div>
        <span class="stat-sub">Continuous Fastify runtime</span>
      </div>

      <div class="card stat-card">
        <span class="stat-label">PostgreSQL Database</span>
        <div class="stat-body">
          <StatusBadge
            :status="systemStore.health.database?.status === 'connected' ? 'healthy' : 'unhealthy'"
            :label="systemStore.health.database?.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'"
          />
          <span class="stat-sub font-mono" v-if="systemStore.health.database">
            {{ systemStore.health.database.latencyMs }}ms latency
          </span>
        </div>
      </div>

      <div class="card stat-card">
        <span class="stat-label">Platform Version</span>
        <div class="stat-value font-mono">v{{ systemStore.health.version }}</div>
        <span class="stat-sub">Milestone 2 (Database & Seeds)</span>
      </div>

      <div class="card stat-card">
        <span class="stat-label">Environment</span>
        <div class="stat-value uppercase font-mono">{{ systemStore.health.environment }}</div>
        <span class="stat-sub">Local Development</span>
      </div>
    </div>

    <!-- Telemetry Details -->
    <div class="card telemetry-card">
      <div class="telemetry-header">
        <h3>HTTP Endpoint Inspection</h3>
        <span class="endpoint-pill">GET /api/v1/health</span>
      </div>

      <div v-if="systemStore.health.errorMessage" class="error-banner">
        <strong>Probe Error:</strong> {{ systemStore.health.errorMessage }}
      </div>

      <div class="payload-box">
        <pre><code>{{ JSON.stringify(systemStore.health, null, 2) }}</code></pre>
      </div>

      <div class="timestamp-meta" v-if="systemStore.health.lastChecked">
        Last probed: {{ systemStore.health.lastChecked.toLocaleTimeString() }} ({{ systemStore.health.lastChecked.toLocaleDateString() }})
      </div>
    </div>
  </div>
</template>

<style scoped>
.health-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.stat-body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.font-mono {
  font-family: var(--font-mono);
}

.telemetry-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.telemetry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.endpoint-pill {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-sm);
  color: var(--color-cyan-400);
}

.error-banner {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.4);
  color: var(--color-rose-400);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.payload-box {
  background: #060911;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  overflow-x: auto;
}

.payload-box pre {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: #a5b4fc;
}

.timestamp-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
