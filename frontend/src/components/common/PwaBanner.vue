<script setup lang="ts">
import { ref } from 'vue';
import { usePwaStore } from '../../stores/pwa.js';

const pwaStore = usePwaStore();
const dismissedInstall = ref(false);

async function handleInstall() {
  await pwaStore.promptInstall();
}

function dismissInstallBanner() {
  dismissedInstall.value = true;
}

function handleReload() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
</script>

<template>
  <div class="pwa-banners-container" id="vidya-pwa-banners">
    <!-- Offline Indicator Banner -->
    <transition name="slide-down">
      <div v-if="!pwaStore.isOnline" class="pwa-banner offline-banner" role="alert">
        <div class="banner-content">
          <span class="banner-icon">📡</span>
          <div class="banner-text">
            <strong>Offline Mode Active:</strong> You are currently disconnected. Vidya is operating using cached application shell data.
          </div>
        </div>
        <button class="banner-btn retry-btn" @click="handleReload">
          Retry Connection
        </button>
      </div>
    </transition>

    <!-- App Update Available Banner -->
    <transition name="slide-down">
      <div v-if="pwaStore.updateAvailable" class="pwa-banner update-banner" role="status">
        <div class="banner-content">
          <span class="banner-icon">⚡</span>
          <div class="banner-text">
            <strong>Update Ready:</strong> A new version of Vidya has been installed in the background.
          </div>
        </div>
        <button class="banner-btn update-btn" @click="pwaStore.applyUpdate">
          Refresh & Update
        </button>
      </div>
    </transition>

    <!-- PWA Install Prompt Banner -->
    <transition name="slide-down">
      <div
        v-if="pwaStore.isInstallable && !dismissedInstall && !pwaStore.isInstalled"
        class="pwa-banner install-banner"
      >
        <div class="banner-content">
          <img src="/favicon.svg" alt="Vidya" class="banner-app-icon" width="24" height="24" />
          <div class="banner-text">
            <strong>Install Vidya App:</strong> Install on your device for quick launch and offline capabilities.
          </div>
        </div>
        <div class="banner-actions">
          <button class="banner-btn install-btn" @click="handleInstall">
            Install
          </button>
          <button class="banner-btn dismiss-btn" @click="dismissInstallBanner" aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.pwa-banners-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.pwa-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1.25rem;
  font-size: 0.875rem;
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
  animation: fadeIn 0.3s ease;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.banner-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
}

.banner-app-icon {
  flex-shrink: 0;
  border-radius: 4px;
}

.banner-text {
  color: inherit;
  line-height: 1.4;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.banner-btn {
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8125rem;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm, 6px);
  transition: all 0.2s ease;
}

/* Offline Banner: Amber/Warning */
.offline-banner {
  background-color: #78350f;
  color: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.retry-btn {
  background-color: #f59e0b;
  color: #78350f;
}
.retry-btn:hover {
  background-color: #fbbf24;
}

/* Update Banner: Indigo/Primary */
.update-banner {
  background-color: #1e1b4b;
  color: #e0e7ff;
  border-left: 4px solid #6366f1;
}

.update-btn {
  background-color: #6366f1;
  color: #ffffff;
}
.update-btn:hover {
  background-color: #4f46e5;
}

/* Install Banner: Slate / Card */
.install-banner {
  background-color: var(--color-surface, #1e293b);
  color: var(--text-primary, #f8fafc);
  border: 1px solid var(--border-color, #334155);
}

.install-btn {
  background-color: var(--color-primary, #4f46e5);
  color: #ffffff;
}
.install-btn:hover {
  background-color: #4338ca;
}

.dismiss-btn {
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  padding: 0.35rem 0.5rem;
}
.dismiss-btn:hover {
  color: var(--text-primary, #f8fafc);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
