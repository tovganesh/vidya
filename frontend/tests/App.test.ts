import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StatusBadge from '../src/components/ui/StatusBadge.vue';
import App from '../src/App.vue';
import { router } from '../src/router/index.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('StatusBadge Component', () => {
  it('renders healthy status with proper class and label', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'healthy',
        label: 'OPERATIONAL',
      },
    });

    expect(wrapper.text()).toContain('OPERATIONAL');
    expect(wrapper.classes()).toContain('badge-emerald');
  });

  it('renders unhealthy status with proper class', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'unhealthy',
      },
    });

    expect(wrapper.text()).toContain('unhealthy');
    expect(wrapper.classes()).toContain('badge-rose');
  });
});

describe('App Layout Shell Switching (Authentication Boundaries)', () => {
  beforeEach(async () => {
    window.scrollTo = vi.fn();
    setActivePinia(createPinia());
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { status: 'healthy', service: 'vidyasetu-api' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ announcements: [], notifications: [], unreadCount: 0 }),
      });
    });
    await router.push('/login');
  });

  it('does NOT render Sidebar or TopNav on login screen for unauthenticated users', async () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await router.isReady();

    // Must render clean auth shell, without topnav or sidebar
    expect(wrapper.find('#vidya-auth-shell').exists()).toBe(true);
    expect(wrapper.find('#app-sidebar').exists()).toBe(false);
    expect(wrapper.find('#app-top-nav').exists()).toBe(false);
  });

  it('renders AppShell with Sidebar and TopNav when user is authenticated on dashboard', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'jwt_test_token';
    authStore.user = {
      id: 'usr_1',
      email: 'admin@vidyasetu.org',
      firstName: 'Admin',
      lastName: 'User',
      primaryRole: 'SCHOOL_ADMIN',
      isTotpEnabled: false,
      school: {
        id: 'sch_1',
        name: 'Vidya Academy',
        code: 'VS-01',
        board: 'CBSE',
      },
      permissions: ['school:manage'],
    };
    expect(authStore.isAuthenticated).toBe(true);

    await router.push('/');

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await router.isReady();

    // Must render app shell with sidebar and topnav
    expect(wrapper.find('#vidyasetu-root-app').exists()).toBe(true);
    expect(wrapper.find('#app-sidebar').exists()).toBe(true);
    expect(wrapper.find('#app-top-nav').exists()).toBe(true);
    expect(wrapper.find('#vidya-auth-shell').exists()).toBe(false);
  });
});
