import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export interface AuditActor {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  primaryRole: string;
}

export interface AuditLogItem {
  id: string;
  schoolId: string | null;
  actorId: string | null;
  actor: AuditActor | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditStats {
  totalAllTime: number;
  todayCount: number;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const useAuditStore = defineStore('audit', () => {
  const authStore = useAuthStore();

  const logs = ref<AuditLogItem[]>([]);
  const pagination = ref<AuditPagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const stats = ref<AuditStats>({
    totalAllTime: 0,
    todayCount: 0,
  });
  const metadata = ref<{ actions: string[]; entityTypes: string[] }>({
    actions: [],
    entityTypes: [],
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAuditLogs(params: AuditQueryParams = {}) {
    isLoading.value = true;
    error.value = null;
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', String(params.page));
      if (params.limit) searchParams.append('limit', String(params.limit));
      if (params.action && params.action !== 'ALL') searchParams.append('action', params.action);
      if (params.entityType && params.entityType !== 'ALL') searchParams.append('entityType', params.entityType);
      if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const response = await authStore.apiFetch(`/api/v1/audit${qs}`);

      logs.value = response.items || [];
      pagination.value = response.pagination || {
        page: 1,
        limit: 25,
        total: logs.value.length,
        totalPages: 1,
      };
      stats.value = response.stats || {
        totalAllTime: pagination.value.total,
        todayCount: 0,
      };
      return response;
    } catch (err: any) {
      error.value = err.message || 'Failed to load audit logs';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMetadata() {
    try {
      const response = await authStore.apiFetch('/api/v1/audit/metadata');
      metadata.value = response || { actions: [], entityTypes: [] };
      return response;
    } catch (err: any) {
      console.warn('Failed to fetch audit metadata:', err);
    }
  }

  return {
    logs,
    pagination,
    stats,
    metadata,
    isLoading,
    error,
    fetchAuditLogs,
    fetchMetadata,
  };
});
