import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePwaStore = defineStore('pwa', () => {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const updateAvailable = ref(false);
  const deferredPrompt = ref<any>(null);
  const registration = ref<ServiceWorkerRegistration | null>(null);

  /**
   * Initialize online/offline listeners and PWA install prompt handler
   */
  function initPwa() {
    if (typeof window === 'undefined') return;

    // Online / Offline status
    window.addEventListener('online', () => {
      isOnline.value = true;
    });

    window.addEventListener('offline', () => {
      isOnline.value = false;
    });

    // Check if running as standalone PWA
    const isStandalone =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any)?.standalone === true;

    if (isStandalone) {
      isInstalled.value = true;
      isInstallable.value = false;
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt.value = e;
      isInstallable.value = true;
    });

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt.value = null;
    });

    // Register service worker if supported
    registerServiceWorker();
  }

  /**
   * Register the Service Worker
   */
  async function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      registration.value = reg;

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable.value = true;
            }
          });
        }
      });
    } catch {
      // Graceful fallback if SW registration is blocked in dev/test environment
    }
  }

  /**
   * Trigger native browser install dialog
   */
  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt.value) return false;

    try {
      await deferredPrompt.value.prompt();
      const choiceResult = await deferredPrompt.value.userChoice;
      deferredPrompt.value = null;
      isInstallable.value = false;
      return choiceResult.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  /**
   * Activate updated service worker
   */
  function applyUpdate() {
    if (registration.value?.waiting) {
      registration.value.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return {
    isOnline,
    isInstallable,
    isInstalled,
    updateAvailable,
    deferredPrompt,
    registration,
    initPwa,
    registerServiceWorker,
    promptInstall,
    applyUpdate,
  };
});
