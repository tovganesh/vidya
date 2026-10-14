import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useAuditStore } from '../src/stores/audit.js';
import { useAuthStore } from '../src/stores/auth.js';
import { router } from '../src/router/index.js';
import AuditTrailView from '../src/views/admin/AuditTrailView.vue';

describe('Audit Trail Store & Views', () => {
  beforeEach(async () => {
    window.scrollTo = vi.fn();
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes audit store with default state', () => {
    const auditStore = useAuditStore();
    expect(auditStore.logs).toEqual([]);
    expect(auditStore.pagination.page).toBe(1);
    expect(auditStore.isLoading).toBe(false);
    expect(auditStore.error).toBeNull();
  });

  it('fetches audit logs and populates store state', async () => {
    const authStore = useAuthStore();
    const mockResponse = {
      items: [
        {
          id: 'log-1',
          schoolId: 'sch-1',
          actorId: 'usr-1',
          actor: {
            id: 'usr-1',
            firstName: 'Ramesh',
            lastName: 'Sharma',
            username: 'VIDYA-PRIN-0001',
            email: 'principal@vidya.org',
            primaryRole: 'PRINCIPAL',
          },
          action: 'AUTH_LOGIN',
          entityType: 'User',
          entityId: 'usr-1',
          diff: { ip: '127.0.0.1' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 Chrome',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      },
      stats: {
        totalAllTime: 1,
        todayCount: 1,
      },
    };

    authStore.apiFetch = vi.fn().mockResolvedValue(mockResponse);

    const auditStore = useAuditStore();
    await auditStore.fetchAuditLogs();

    expect(authStore.apiFetch).toHaveBeenCalledWith('/api/v1/audit');
    expect(auditStore.logs.length).toBe(1);
    expect(auditStore.logs[0]!.action).toBe('AUTH_LOGIN');
    expect(auditStore.stats.totalAllTime).toBe(1);
  });

  it('resolves /admin/audit and /audit routes via router', async () => {
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
      permissions: ['school:manage', 'audit:read'],
    };

    await router.push('/admin/audit');
    expect(router.currentRoute.value.name).toBe('admin-audit');

    await router.push('/audit');
    expect(router.currentRoute.value.name).toBe('admin-audit');
  });

  it('mounts AuditTrailView component and renders controls', async () => {
    const authStore = useAuthStore();
    authStore.apiFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/metadata')) {
        return Promise.resolve({ actions: ['AUTH_LOGIN'], entityTypes: ['User'] });
      }
      return Promise.resolve({
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
        stats: { totalAllTime: 0, todayCount: 0 },
      });
    });

    const wrapper = mount(AuditTrailView, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('#audit-trail-view').exists()).toBe(true);
    expect(wrapper.find('#audit-search-input').exists()).toBe(true);
    expect(wrapper.find('#btn-refresh-audit').exists()).toBe(true);
    expect(wrapper.find('#btn-export-csv').exists()).toBe(true);
  });
});
