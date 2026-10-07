import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: string;
  isTotpEnabled: boolean;
  school: {
    id: string;
    name: string;
    code: string;
    board: string;
  } | null;
  permissions: string[];
}

export interface Setup2FAResult {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('vs_access_token'));
  const refreshToken = ref<string | null>(localStorage.getItem('vs_refresh_token'));

  // 2FA Challenge state
  const requires2FA = ref(false);
  const tempToken = ref<string | null>(null);

  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const userFullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}` : 'Guest'));
  const userRole = computed(() => user.value?.primaryRole || 'GUEST');

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem('vs_access_token', access);
    localStorage.setItem('vs_refresh_token', refresh);
  }

  function clearTokens() {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    requires2FA.value = false;
    tempToken.value = null;
    localStorage.removeItem('vs_access_token');
    localStorage.removeItem('vs_refresh_token');
  }

  /**
   * Helper for authenticated API calls with token injection
   */
  async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken.value) {
      headers['Authorization'] = `Bearer ${accessToken.value}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & try refresh
    if (response.status === 401 && refreshToken.value && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      try {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshToken.value }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            response = await fetch(url, { ...options, headers });
          }
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `Request failed with status ${response.status}`);
    }

    return data.data;
  }

  /**
   * Login
   */
  async function login(email: string, password: string): Promise<{ requires2FA: boolean }> {
    isLoading.value = true;
    errorMessage.value = null;
    requires2FA.value = false;
    tempToken.value = null;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }

      if (data.data.requires2FA) {
        requires2FA.value = true;
        tempToken.value = data.data.tempToken;
        return { requires2FA: true };
      }

      setTokens(data.data.accessToken, data.data.refreshToken);
      user.value = data.data.user;
      return { requires2FA: false };
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Verify 2FA Challenge
   */
  async function verify2FALogin(code: string, isBackupCode = false): Promise<void> {
    if (!tempToken.value) {
      throw new Error('No active 2FA challenge found');
    }

    isLoading.value = true;
    errorMessage.value = null;

    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: tempToken.value,
          code,
          isBackupCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      setTokens(data.data.accessToken, data.data.refreshToken);
      user.value = data.data.user;
      requires2FA.value = false;
      tempToken.value = null;
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : '2FA Verification failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch current authenticated user
   */
  async function fetchMe(): Promise<UserProfile | null> {
    if (!accessToken.value) return null;

    try {
      const data = await apiFetch('/api/v1/auth/me');
      user.value = data;
      return data;
    } catch {
      clearTokens();
      return null;
    }
  }

  /**
   * Setup 2FA
   */
  async function setup2FA(): Promise<Setup2FAResult> {
    return apiFetch('/api/v1/auth/2fa/setup', { method: 'POST' });
  }

  /**
   * Enable 2FA
   */
  async function enable2FA(secret: string, code: string, backupCodes: string[]): Promise<void> {
    await apiFetch('/api/v1/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, code, backupCodes }),
    });
    if (user.value) {
      user.value.isTotpEnabled = true;
    }
  }

  /**
   * Disable 2FA
   */
  async function disable2FA(code: string): Promise<void> {
    await apiFetch('/api/v1/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (user.value) {
      user.value.isTotpEnabled = false;
    }
  }

  /**
   * Logout
   */
  async function logout(): Promise<void> {
    try {
      if (refreshToken.value) {
        await apiFetch('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: refreshToken.value }),
        });
      }
    } catch {
      // Ignore errors on logout
    } finally {
      clearTokens();
    }
  }

  function hasPermission(permission: string): boolean {
    if (userRole.value === 'SUPER_ADMIN') return true;
    return user.value?.permissions?.includes(permission) ?? false;
  }

  function hasRole(role: string): boolean {
    return user.value?.primaryRole === role;
  }

  return {
    user,
    accessToken,
    refreshToken,
    requires2FA,
    tempToken,
    isLoading,
    errorMessage,
    isAuthenticated,
    userFullName,
    userRole,
    hasPermission,
    hasRole,
    login,
    verify2FALogin,
    fetchMe,
    setup2FA,
    enable2FA,
    disable2FA,
    logout,
    apiFetch,
  };
});
