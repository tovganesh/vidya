import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { router } from '../src/router/index.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Router Navigation Guards & Authentication Flow', () => {
  beforeEach(async () => {
    // Stub window.scrollTo for JSDOM
    window.scrollTo = vi.fn();
    setActivePinia(createPinia());
    localStorage.clear();
    // Reset router navigation to login
    await router.push('/login');
  });

  it('redirects unauthenticated user from protected dashboard (/) to /login', async () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);

    await router.push('/');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/');
  });

  it('redirects unauthenticated user from /attendance to /login with redirect query', async () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);

    await router.push('/attendance');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/attendance');
  });

  it('allows authenticated user to navigate to / and internal screens', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'valid_mock_jwt_token';
    authStore.user = {
      id: 'usr_admin',
      email: 'admin@vidya.org',
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
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('redirects authenticated user away from /login to dashboard', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'valid_mock_jwt_token';
    authStore.user = {
      id: 'usr_teacher',
      email: 'teacher@vidya.org',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      primaryRole: 'TEACHER',
      isTotpEnabled: false,
      school: {
        id: 'sch_1',
        name: 'Vidya Academy',
        code: 'VS-01',
        board: 'CBSE',
      },
      permissions: ['attendance:mark'],
    };
    expect(authStore.isAuthenticated).toBe(true);

    await router.push('/');
    expect(router.currentRoute.value.name).toBe('dashboard');

    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
