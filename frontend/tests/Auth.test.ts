import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth.js';

describe('Frontend AuthStore (Milestone 3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with guest/unauthenticated state', () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.user).toBeNull();
    expect(authStore.userFullName).toBe('Guest');
    expect(authStore.userRole).toBe('GUEST');
    expect(authStore.requires2FA).toBe(false);
  });

  it('should clear tokens and user state on logout', () => {
    const authStore = useAuthStore();
    localStorage.setItem('vs_access_token', 'test_access_token');
    localStorage.setItem('vs_refresh_token', 'test_refresh_token');

    authStore.user = {
      id: 'usr_1',
      email: 'admin@vidya.org',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      primaryRole: 'SCHOOL_ADMIN',
      isTotpEnabled: false,
      school: {
        id: 'sch_1',
        name: 'Vidya Academy',
        code: 'VS-BLR-01',
        board: 'CBSE',
      },
      permissions: ['school:manage'],
    };

    expect(authStore.userFullName).toBe('Rajesh Kumar');
    expect(authStore.userRole).toBe('SCHOOL_ADMIN');

    authStore.logout();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.user).toBeNull();
    expect(localStorage.getItem('vs_access_token')).toBeNull();
  });
});
