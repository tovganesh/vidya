<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  useCommunicationStore,
  AnnouncementPriority,
  AnnouncementAudience,
} from '@/stores/communication.js';
import { useAuthStore } from '@/stores/auth.js';

const commStore = useCommunicationStore();
const authStore = useAuthStore();

// Filters & Search
const searchQuery = ref('');
const selectedPriority = ref<string>('ALL');
const selectedAudience = ref<string>('ALL');

// Modal State
const isModalOpen = ref(false);
const newTitle = ref('');
const newContent = ref('');
const newPriority = ref<AnnouncementPriority>('NORMAL');
const newAudience = ref<AnnouncementAudience>('ALL_SCHOOL');
const broadcastPush = ref(true);
const isSubmitting = ref(false);
const modalError = ref<string | null>(null);

// Push Status Feedback
const pushFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const canCreate = computed(() => {
  const role = authStore.user?.primaryRole;
  return (
    role === 'SUPER_ADMIN' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'PRINCIPAL' ||
    role === 'TEACHER' ||
    authStore.user?.permissions?.includes('school:manage')
  );
});

const filteredAnnouncements = computed(() => {
  return commStore.announcements.filter((ann) => {
    if (selectedPriority.value !== 'ALL' && ann.priority !== selectedPriority.value) {
      return false;
    }
    if (selectedAudience.value !== 'ALL' && ann.targetAudience !== selectedAudience.value) {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchContent = ann.content.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });
});

async function loadData() {
  await Promise.all([
    commStore.fetchAnnouncements(),
    commStore.fetchVapidPublicKey(),
  ]);
}

async function handleCreateAnnouncement() {
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    modalError.value = 'Please provide both title and content for the announcement.';
    return;
  }

  isSubmitting.value = true;
  modalError.value = null;

  try {
    await commStore.createAnnouncement({
      title: newTitle.value.trim(),
      content: newContent.value.trim(),
      priority: newPriority.value,
      targetAudience: newAudience.value,
      broadcastPush: broadcastPush.value,
    });

    isModalOpen.value = false;
    newTitle.value = '';
    newContent.value = '';
    newPriority.value = 'NORMAL';
    newAudience.value = 'ALL_SCHOOL';
    broadcastPush.value = true;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to publish announcement';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteAnnouncement(id: string) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  try {
    await commStore.deleteAnnouncement(id);
  } catch (err: any) {
    alert(err.message || 'Failed to delete announcement');
  }
}

async function handleEnablePush() {
  pushFeedback.value = null;
  try {
    await commStore.enablePushNotifications();
    pushFeedback.value = {
      type: 'success',
      message: 'Native Web Push notifications successfully registered for this device!',
    };
  } catch (err: any) {
    pushFeedback.value = {
      type: 'error',
      message: err.message || 'Failed to enable Web Push notifications.',
    };
  }
}

async function handleTestPush() {
  pushFeedback.value = null;
  try {
    await commStore.sendTestPush();
    pushFeedback.value = {
      type: 'success',
      message: 'Test Web Push alert dispatched to your subscribed device!',
    };
  } catch (err: any) {
    pushFeedback.value = {
      type: 'error',
      message: err.message || 'Please enable Web Push notifications first.',
    };
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="announcements-page" id="announcements-page">
    <!-- Top Header Bar -->
    <div class="page-header">
      <div class="header-titles">
        <div class="badge-row">
          <span class="module-chip">COMMUNICATION ENGINE</span>
          <span class="session-chip">AY 2026–27</span>
        </div>
        <h1 class="page-title">Notice Board & Announcements</h1>
        <p class="page-subtitle">
          Broadcast official school notices, circulars, emergency weather advisories, and real-time Web Push notifications.
        </p>
      </div>

      <div class="header-actions">
        <!-- Web Push Controls -->
        <button
          class="btn btn-outline"
          @click="handleTestPush"
          title="Send test alert to this device"
          id="btn-test-push"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Test Push
        </button>

        <button
          class="btn btn-secondary"
          @click="handleEnablePush"
          id="btn-enable-push"
          :class="{ active: commStore.isPushSubscribed }"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {{ commStore.isPushSubscribed ? 'Push Active' : 'Enable Web Push' }}
        </button>

        <button
          v-if="canCreate"
          class="btn btn-primary"
          @click="isModalOpen = true"
          id="btn-new-announcement"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Notice
        </button>
      </div>
    </div>

    <!-- Push Notification Feedback Banner -->
    <div
      v-if="pushFeedback"
      class="feedback-banner"
      :class="pushFeedback.type"
      id="push-feedback-banner"
    >
      <span>{{ pushFeedback.message }}</span>
      <button class="banner-close" @click="pushFeedback = null">&times;</button>
    </div>

    <!-- Search & Filter Controls -->
    <div class="controls-card">
      <div class="search-input-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="search-svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter notices by keyword, title, or circular..."
          id="notices-search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">&times;</button>
      </div>

      <div class="filter-group">
        <span class="filter-label">Priority:</span>
        <div class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: selectedPriority === 'ALL' }"
            @click="selectedPriority = 'ALL'"
          >
            All
          </button>
          <button
            class="filter-pill urgent-pill"
            :class="{ active: selectedPriority === 'URGENT' }"
            @click="selectedPriority = 'URGENT'"
          >
            Urgent
          </button>
          <button
            class="filter-pill emergency-pill"
            :class="{ active: selectedPriority === 'EMERGENCY' }"
            @click="selectedPriority = 'EMERGENCY'"
          >
            Emergency
          </button>
          <button
            class="filter-pill normal-pill"
            :class="{ active: selectedPriority === 'NORMAL' }"
            @click="selectedPriority = 'NORMAL'"
          >
            Normal
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Audience:</span>
        <select v-model="selectedAudience" class="audience-select" id="audience-select-filter">
          <option value="ALL">All Audiences</option>
          <option value="ALL_SCHOOL">Entire School Community</option>
          <option value="TEACHERS_ONLY">Teachers & Faculty Only</option>
          <option value="PARENTS_ONLY">Parents & Guardians Only</option>
          <option value="STAFF_ONLY">Staff Only</option>
        </select>
      </div>
    </div>

    <!-- Announcements Feed -->
    <div class="announcements-container">
      <div v-if="commStore.loading && commStore.announcements.length === 0" class="loading-state">
        <div class="spinner"></div>
        <span>Loading notice board...</span>
      </div>

      <div v-else-if="filteredAnnouncements.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="empty-svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 class="empty-title">No notices match your criteria</h3>
        <p class="empty-desc">Try clearing your search terms or filter selections.</p>
      </div>

      <div v-else class="notices-grid">
        <article
          v-for="item in filteredAnnouncements"
          :key="item.id"
          class="notice-card"
          :class="item.priority.toLowerCase()"
          :id="'notice-' + item.id"
        >
          <!-- Card Header -->
          <div class="card-top">
            <div class="badge-cluster">
              <span class="priority-badge" :class="item.priority.toLowerCase()">
                <span v-if="item.priority === 'EMERGENCY'" class="pulsing-dot"></span>
                {{ item.priority }}
              </span>

              <span class="audience-badge">
                {{
                  item.targetAudience === 'ALL_SCHOOL'
                    ? 'All School'
                    : item.targetAudience === 'TEACHERS_ONLY'
                    ? 'Teachers'
                    : item.targetAudience === 'PARENTS_ONLY'
                    ? 'Parents'
                    : item.targetAudience
                }}
              </span>
            </div>

            <div class="time-meta">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="clock-svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ formatDate(item.publishedAt || item.createdAt) }}</span>
            </div>
          </div>

          <!-- Card Body -->
          <h2 class="notice-title">{{ item.title }}</h2>
          <p class="notice-body">{{ item.content }}</p>

          <!-- Card Footer -->
          <div class="card-footer">
            <div class="author-meta">
              <div class="author-avatar">
                {{ item.author?.firstName?.charAt(0) || 'A' }}
              </div>
              <div class="author-info">
                <span class="author-name">
                  {{ item.author ? `${item.author.firstName} ${item.author.lastName}` : 'Administration' }}
                </span>
                <span class="author-role">
                  {{ item.author?.primaryRole || 'STAFF' }}
                </span>
              </div>
            </div>

            <div class="card-actions">
              <button
                v-if="canCreate"
                class="delete-btn"
                @click="handleDeleteAnnouncement(item.id)"
                title="Delete Announcement"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="trash-svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Compose Modal -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
      <div class="modal-card" id="compose-announcement-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">Publish School Announcement</h2>
            <p class="modal-subtitle">Broadcast official notice to students, teachers, or parents.</p>
          </div>
          <button class="modal-close-btn" @click="isModalOpen = false">&times;</button>
        </div>

        <form @submit.prevent="handleCreateAnnouncement" class="modal-form">
          <div v-if="modalError" class="modal-error">
            {{ modalError }}
          </div>

          <div class="form-group">
            <label for="ann-title">Notice Title *</label>
            <input
              id="ann-title"
              v-model="newTitle"
              type="text"
              placeholder="e.g., Annual Sports Day 2026-27 Schedule & Registrations"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ann-priority">Priority Level</label>
              <select id="ann-priority" v-model="newPriority">
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent (Monsoon/Exam Alerts)</option>
                <option value="EMERGENCY">Emergency (Immediate Broadcast)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="ann-audience">Target Audience</label>
              <select id="ann-audience" v-model="newAudience">
                <option value="ALL_SCHOOL">All School (Staff, Students & Parents)</option>
                <option value="TEACHERS_ONLY">Teachers & Faculty Only</option>
                <option value="PARENTS_ONLY">Parents & Guardians Only</option>
                <option value="STAFF_ONLY">Staff Only</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="ann-content">Notice Content *</label>
            <textarea
              id="ann-content"
              v-model="newContent"
              rows="5"
              placeholder="Provide the complete circular details, timings, guidelines, and instructions..."
              required
            ></textarea>
          </div>

          <div class="form-checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="broadcastPush" />
              <span>Broadcast instant Web Push alert to all registered subscriber devices</span>
            </label>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-outline"
              @click="isModalOpen = false"
              :disabled="isSubmitting"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isSubmitting"
              id="btn-submit-announcement"
            >
              {{ isSubmitting ? 'Publishing...' : 'Publish Announcement' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.announcements-page {
  padding: 1.75rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.module-chip {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
}

.session-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--text-muted);
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  max-width: 650px;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.55rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast);
  border: 1px solid transparent;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-primary {
  background: var(--color-primary-600);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-500);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-secondary {
  background: var(--color-surface-raised);
  border-color: var(--color-card-border);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
}

.btn-secondary.active {
  border-color: var(--color-emerald-500);
  color: var(--color-emerald-400);
}

.btn-outline {
  background: transparent;
  border-color: var(--color-card-border);
  color: var(--text-secondary);
}

.btn-outline:hover {
  background: var(--color-surface);
  color: var(--text-primary);
}

/* Feedback Banner */
.feedback-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 500;
}

.feedback-banner.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--color-emerald-400);
}

.feedback-banner.error {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--color-rose-400);
}

.banner-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
}

/* Controls Card */
.controls-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  max-width: 450px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.4rem 0.8rem;
}

.search-svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.search-input-box input {
  background: none;
  border: none;
  outline: none;
  font-size: 0.85rem;
  color: var(--text-primary);
  width: 100%;
}

.clear-search {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-surface-raised);
  padding: 0.2rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-card-border);
}

.filter-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.filter-pill:hover {
  color: var(--text-primary);
}

.filter-pill.active {
  background: var(--color-primary-600);
  color: white;
}

.filter-pill.urgent-pill.active {
  background: #f59e0b;
  color: #111827;
}

.filter-pill.emergency-pill.active {
  background: var(--color-rose-500);
  color: white;
}

.audience-select {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
}

/* Notices Grid */
.notices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 1.25rem;
}

.notice-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast), border-color var(--duration-fast);
  position: relative;
  overflow: hidden;
}

.notice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.15);
  border-color: var(--color-primary-500);
}

.notice-card.urgent {
  border-left: 4px solid #f59e0b;
}

.notice-card.emergency {
  border-left: 4px solid var(--color-rose-500);
}

.notice-card.normal {
  border-left: 4px solid var(--color-primary-500);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.badge-cluster {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.priority-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.priority-badge.normal {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
}

.priority-badge.urgent {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.priority-badge.emergency {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-rose-400);
}

.pulsing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-rose-500);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

.audience-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--text-muted);
}

.time-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.clock-svg {
  width: 13px;
  height: 13px;
}

.notice-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  margin-bottom: 0.65rem;
}

.notice-body {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 1.25rem;
  flex: 1;
  white-space: pre-line;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-card-border);
}

.author-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.author-avatar {
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

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.1;
}

.author-role {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 500;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-btn {
  background: none;
  border: none;
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.delete-btn:hover {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-rose-400);
}

.trash-svg {
  width: 15px;
  height: 15px;
}

/* Empty & Loading States */
.loading-state,
.empty-state {
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-svg {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  padding: 1.5rem;
}

.modal-card {
  width: 100%;
  max-width: 600px;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: zoomIn 0.15s ease-out;
}

@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-card-border);
  background: var(--color-surface-raised);
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.modal-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.modal-error {
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--color-rose-400);
  font-size: 0.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--duration-fast);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--color-primary-500);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-checkbox-row {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-600);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

@media (max-width: 768px) {
  .announcements-page {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .controls-card {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input-box {
    max-width: none;
  }
  .notices-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
  }
}
</style>
