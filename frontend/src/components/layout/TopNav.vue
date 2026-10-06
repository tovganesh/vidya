<script setup lang="ts">
import { useSystemStore } from '@/stores/system.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const systemStore = useSystemStore();
</script>

<template>
  <header class="top-nav" id="app-top-nav">
    <div class="brand-section">
      <router-link to="/" class="brand-link">
        <div class="logo-box">
          <svg viewBox="0 0 48 48" class="logo-icon" fill="none">
            <rect width="48" height="48" rx="10" fill="#1e1b4b" />
            <circle cx="24" cy="18" r="5" fill="#f59e0b" />
            <path d="M10 34C15 26 21 24 24 24C27 24 33 26 38 34" stroke="#818cf8" stroke-width="3.5" stroke-linecap="round" />
            <path d="M14 38C18 31 22 30 24 30C26 30 30 31 34 38" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-title">VidyaSetu</span>
          <span class="brand-tagline">Open School OS</span>
        </div>
      </router-link>
    </div>

    <!-- Center Search & Context Indicator -->
    <div class="context-section">
      <div class="academic-badge" title="Active Academic Session">
        <span class="year-label">AY:</span>
        <span class="year-val">2026–27</span>
        <span class="board-val">CBSE</span>
      </div>

      <div class="search-bar" id="global-search-bar">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search students, admission no, teachers... (Ctrl+K)" readonly />
        <kbd>⌘K</kbd>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="controls-section">
      <router-link to="/health" class="health-indicator" title="System Diagnostic Health">
        <StatusBadge :status="systemStore.health.status" :label="systemStore.health.status" />
      </router-link>

      <button class="icon-btn" aria-label="Notifications" id="notifications-bell-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="notif-dot"></span>
      </button>

      <div class="user-pill" id="user-profile-pill">
        <div class="avatar">SA</div>
        <div class="user-meta">
          <span class="user-name">School Admin</span>
          <span class="user-role">SUPERVISOR</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  height: 64px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-backdrop);
  -webkit-backdrop-filter: var(--glass-backdrop);
  border-bottom: 1px solid var(--color-card-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.brand-section {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.logo-icon {
  width: 100%;
  height: 100%;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tagline {
  font-size: 0.68rem;
  color: var(--color-cyan-400);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.context-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.academic-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
}

.year-label {
  color: var(--text-muted);
}

.year-val {
  color: var(--color-primary-400);
}

.board-val {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.35rem 0.85rem;
  width: 320px;
  color: var(--text-secondary);
  transition: border-color var(--duration-fast);
}

.search-bar:focus-within {
  border-color: var(--color-primary-500);
}

.search-icon {
  width: 16px;
  height: 16px;
}

.search-bar input {
  background: none;
  border: none;
  outline: none;
  font-size: 0.85rem;
  color: var(--text-primary);
  width: 100%;
}

.search-bar kbd {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-raised);
  color: var(--text-secondary);
  transition: all var(--duration-fast);
}

.icon-btn:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
}

.icon-svg {
  width: 18px;
  height: 18px;
}

.notif-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
  background-color: var(--color-rose-500);
  border-radius: 50%;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.6rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-full);
  cursor: pointer;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-cyan-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: white;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.1;
}

.user-role {
  font-size: 0.65rem;
  color: var(--color-emerald-400);
  font-weight: 700;
  letter-spacing: 0.04em;
}

@media (max-width: 900px) {
  .search-bar, .academic-badge, .user-meta {
    display: none;
  }
}
</style>
