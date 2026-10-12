import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { usePwaStore } from '../src/stores/pwa.js';
import PwaBanner from '../src/components/common/PwaBanner.vue';

describe('PWA & Offline Readiness (Milestone 10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with clean default online state', () => {
    const store = usePwaStore();
    expect(store.isOnline).toBe(true);
    expect(store.isInstallable).toBe(false);
    expect(store.isInstalled).toBe(false);
    expect(store.updateAvailable).toBe(false);
    expect(store.deferredPrompt).toBeNull();
  });

  it('reacts dynamically to online and offline window events', () => {
    const store = usePwaStore();
    store.initPwa();

    // Trigger offline
    window.dispatchEvent(new Event('offline'));
    expect(store.isOnline).toBe(false);

    // Trigger online
    window.dispatchEvent(new Event('online'));
    expect(store.isOnline).toBe(true);
  });

  it('captures beforeinstallprompt event and marks app installable', () => {
    const store = usePwaStore();
    store.initPwa();

    const mockPromptEvent = new Event('beforeinstallprompt');
    (mockPromptEvent as any).prompt = vi.fn().mockResolvedValue(undefined);
    (mockPromptEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(mockPromptEvent);

    expect(store.isInstallable).toBe(true);
    expect(store.deferredPrompt).not.toBeNull();
  });

  it('handles user accepting installation prompt', async () => {
    const store = usePwaStore();
    store.initPwa();

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockPromptEvent = new Event('beforeinstallprompt');
    (mockPromptEvent as any).prompt = mockPrompt;
    (mockPromptEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(mockPromptEvent);

    const result = await store.promptInstall();
    expect(result).toBe(true);
    expect(mockPrompt).toHaveBeenCalled();
    expect(store.isInstallable).toBe(false);
    expect(store.deferredPrompt).toBeNull();
  });

  it('handles appinstalled event', () => {
    const store = usePwaStore();
    store.initPwa();

    window.dispatchEvent(new Event('appinstalled'));
    expect(store.isInstalled).toBe(true);
    expect(store.isInstallable).toBe(false);
  });

  it('renders offline alert banner in PwaBanner when disconnected', async () => {
    const store = usePwaStore();
    const wrapper = mount(PwaBanner);

    // Initially online, no banner visible
    expect(wrapper.find('.offline-banner').exists()).toBe(false);

    // Go offline
    store.isOnline = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.offline-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Offline Mode Active');
    expect(wrapper.text()).toContain('Retry Connection');
  });

  it('renders update banner when service worker update is ready', async () => {
    const store = usePwaStore();
    const wrapper = mount(PwaBanner);

    expect(wrapper.find('.update-banner').exists()).toBe(false);

    store.updateAvailable = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.update-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Update Ready');
    expect(wrapper.text()).toContain('Refresh & Update');
  });

  it('renders install banner when app is installable', async () => {
    const store = usePwaStore();
    const wrapper = mount(PwaBanner);

    expect(wrapper.find('.install-banner').exists()).toBe(false);

    store.isInstallable = true;
    store.isInstalled = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.install-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Install Vidya App');
  });
});
