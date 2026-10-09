<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/', icon: 'dashboard' },
      { name: 'System Health', path: '/health', icon: 'activity', badge: 'API' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'Students', path: '/students', icon: 'users' },
      { name: 'Guardians / Parents', path: '/guardians', icon: 'heart' },
      { name: 'Teachers & Staff', path: '/teachers', icon: 'briefcase' },
      { name: 'Batch Promotion', path: '/people/promote', icon: 'trending-up' },
    ],
  },
  {
    title: 'ACADEMICS',
    items: [
      { name: 'Classes & Sections', path: '/classes', icon: 'grid' },
      { name: 'Subjects Master', path: '/admin/subjects', icon: 'book' },
      { name: 'Daily Roll Call', path: '/attendance', icon: 'check-circle' },
      { name: 'Monthly Register', path: '/attendance/register', icon: 'clipboard' },
      { name: 'Class Timetable', path: '/timetable', icon: 'calendar' },
      { name: 'Exams & Results', path: '/exams', icon: 'award' },
    ],
  },
  {
    title: 'FINANCE & FEES',
    items: [
      { name: 'Fee Structures', path: '/fees', icon: 'credit-card' },
      { name: 'Payment Receipts', path: '/receipts', icon: 'receipt' },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { name: 'Announcements', path: '/announcements', icon: 'bell' },
      { name: 'Web Push Alerts', path: '/notifications', icon: 'send' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'School Setup', path: '/admin/school', icon: 'settings' },
      { name: 'Academic Years', path: '/admin/academic-years', icon: 'clock' },
      { name: 'Setup Wizard', path: '/admin/onboarding', icon: 'activity', badge: 'NEW' },
      { name: 'Audit Trail', path: '/admin/audit', icon: 'shield' },
    ],
  },
];
</script>

<template>
  <aside class="sidebar" id="app-sidebar">
    <div class="nav-container">
      <div v-for="section in navigationSections" :key="section.title" class="nav-group">
        <div class="group-title">{{ section.title }}</div>
        <nav class="group-links">
          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: route.path === item.path }"
          >
            <!-- SVG Icon Helper -->
            <span class="icon-wrapper">
              <svg v-if="item.icon === 'dashboard'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <svg v-else-if="item.icon === 'activity'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <svg v-else-if="item.icon === 'users'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else-if="item.icon === 'grid'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <svg v-else-if="item.icon === 'check-circle'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else-if="item.icon === 'trending-up'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <svg v-else-if="item.icon === 'calendar'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <svg v-else-if="item.icon === 'clipboard'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <svg v-else-if="item.icon === 'award'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <svg v-else-if="item.icon === 'credit-card'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <svg v-else-if="item.icon === 'receipt'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="nav-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.badge" class="item-badge">{{ item.badge }}</span>
          </router-link>
        </nav>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-card-border);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  overflow-y: auto;
}

.nav-container {
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.group-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  padding: 0 0.75rem 0.4rem;
}

.group-links {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all var(--duration-fast);
}

.nav-link:hover {
  background: var(--color-surface-raised);
  color: var(--text-primary);
}

.nav-link.active {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
  font-weight: 600;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.item-name {
  flex: 1;
}

.item-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.2);
  color: var(--color-primary-400);
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
}
</style>
