<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSystemStore } from '@/stores/system.js';
import { useAuthStore } from '@/stores/auth.js';
import { useThemeStore } from '@/stores/theme.js';
import { useCommunicationStore } from '@/stores/communication.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const router = useRouter();
const systemStore = useSystemStore();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const commStore = useCommunicationStore();

const isNotifOpen = ref(false);
const notifDropdownRef = ref<HTMLElement | null>(null);

function toggleNotifDropdown() {
  isNotifOpen.value = !isNotifOpen.value;
  if (isNotifOpen.value && authStore.isAuthenticated) {
    commStore.fetchNotifications();
  }
}

function handleDocClick(e: MouseEvent) {
  if (notifDropdownRef.value && !notifDropdownRef.value.contains(e.target as Node)) {
    isNotifOpen.value = false;
  }
}

async function handleNotificationClick(notif: any) {
  await commStore.markNotificationAsRead(notif.id);
  isNotifOpen.value = false;
  if (notif.data?.link) {
    router.push(notif.data.link);
  }
}

async function handleMarkAllRead() {
  await commStore.markAllNotificationsAsRead();
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    commStore.fetchUnreadCount();
  }
  document.addEventListener('click', handleDocClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick);
});
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
          <span class="brand-title">Vidya</span>
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

      <!-- Global Theme Switcher (Dark / Light) -->
      <button
        class="icon-btn theme-toggle-btn"
        :aria-label="themeStore.isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
        :title="themeStore.isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
        id="theme-toggle-btn"
        @click="themeStore.toggleTheme"
      >
        <svg v-if="themeStore.isDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- Notifications Bell Drawer -->
      <div class="notif-wrapper" ref="notifDropdownRef">
        <button
          class="icon-btn"
          aria-label="Notifications"
          id="notifications-bell-btn"
          @click.stop="toggleNotifDropdown"
          :class="{ active: isNotifOpen }"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span v-if="commStore.unreadCount > 0" class="notif-badge" id="notif-unread-badge">
            {{ commStore.unreadCount > 9 ? '9+' : commStore.unreadCount }}
          </span>
        </button>

        <!-- Dropdown Card -->
        <div v-if="isNotifOpen" class="notif-dropdown" id="notifications-popover">
          <div class="notif-header">
            <div class="notif-title-row">
              <span class="notif-heading">Notifications</span>
              <span v-if="commStore.unreadCount > 0" class="notif-count-pill">{{ commStore.unreadCount }} new</span>
            </div>
            <button
              v-if="commStore.unreadCount > 0"
              class="notif-mark-all-btn"
              @click="handleMarkAllRead"
              id="notif-mark-all-read-btn"
            >
              Mark all read
            </button>
          </div>

          <div class="notif-list">
            <div v-if="commStore.notifications.length === 0" class="notif-empty">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="empty-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>No notifications yet</span>
            </div>

            <div
              v-for="notif in commStore.notifications"
              :key="notif.id"
              class="notif-item"
              :class="{ unread: !notif.isRead }"
              @click="handleNotificationClick(notif)"
            >
              <div class="notif-icon-col">
                <div class="notif-type-icon" :class="notif.type.toLowerCase()">
                  <svg v-if="notif.type === 'ATTENDANCE_ALERT'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
              </div>
              <div class="notif-content-col">
                <div class="notif-item-title">{{ notif.title }}</div>
                <div class="notif-item-body">{{ notif.body }}</div>
              </div>
              <span v-if="!notif.isRead" class="unread-dot"></span>
            </div>
          </div>

          <div class="notif-footer">
            <router-link to="/announcements" class="notif-view-all" @click="isNotifOpen = false">
              View Notice Board & Announcements &rarr;
            </router-link>
          </div>
        </div>
      </div>

      <!-- Authenticated User Pill -->
      <div v-if="authStore.isAuthenticated" class="user-pill-group">
        <router-link to="/security" class="user-pill" id="user-profile-pill">
          <div class="avatar">
            {{ authStore.user?.firstName?.charAt(0) || 'U' }}{{ authStore.user?.lastName?.charAt(0) || '' }}
          </div>
          <div class="user-meta">
            <span class="user-name">{{ authStore.userFullName }}</span>
            <span class="user-role">{{ authStore.userRole }}</span>
          </div>
        </router-link>
        <button class="sign-out-btn" title="Sign Out" @click="handleLogout" id="sign-out-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon-svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <!-- Guest Login Button -->
      <router-link v-else to="/login" class="btn btn-primary" id="top-nav-login-btn">
        Sign In
      </router-link>
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

.notif-wrapper {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--color-rose-500);
  color: white;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(244, 63, 94, 0.4);
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
  animation: slideDown 0.15s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notif-header {
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-card-border);
  background: var(--color-surface-raised);
}

.notif-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notif-heading {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.notif-count-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
  border-radius: var(--radius-full);
}

.notif-mark-all-btn {
  font-size: 0.75rem;
  color: var(--color-primary-400);
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast);
}

.notif-mark-all-btn:hover {
  color: var(--color-primary-300);
  background: var(--color-surface);
}

.notif-list {
  max-height: 340px;
  overflow-y: auto;
}

.notif-empty {
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.825rem;
}

.empty-icon {
  width: 32px;
  height: 32px;
  color: var(--text-muted);
  opacity: 0.6;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
  cursor: pointer;
  position: relative;
  transition: background var(--duration-fast);
}

.notif-item:hover {
  background: var(--color-surface-hover);
}

.notif-item.unread {
  background: rgba(99, 102, 241, 0.04);
}

.notif-icon-col {
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-type-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-raised);
  color: var(--text-secondary);
}

.notif-type-icon svg {
  width: 15px;
  height: 15px;
}

.notif-type-icon.announcement {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
}

.notif-type-icon.attendance_alert {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.notif-content-col {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.25;
  margin-bottom: 0.2rem;
}

.notif-item-body {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-400);
  flex-shrink: 0;
  margin-top: 6px;
}

.notif-footer {
  padding: 0.65rem 1rem;
  background: var(--color-surface-raised);
  border-top: 1px solid var(--color-card-border);
  text-align: center;
}

.notif-view-all {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary-400);
  text-decoration: none;
  display: inline-block;
  transition: color var(--duration-fast);
}

.notif-view-all:hover {
  color: var(--color-primary-300);
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

.user-pill-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sign-out-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-raised);
  color: var(--text-muted);
  transition: all var(--duration-fast);
}

.sign-out-btn:hover {
  background: rgba(244, 63, 94, 0.2);
  color: var(--color-rose-400);
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
