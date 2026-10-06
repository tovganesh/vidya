import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface HealthState {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'checking';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database?: {
    status: 'connected' | 'disconnected';
    latencyMs: number;
    error?: string;
  };
  lastChecked: Date | null;
  errorMessage: string | null;
}

export const useSystemStore = defineStore('system', () => {
  const health = ref<HealthState>({
    status: 'checking',
    service: 'vidyasetu-api',
    version: '0.1.0',
    timestamp: '',
    uptimeSeconds: 0,
    environment: 'development',
    lastChecked: null,
    errorMessage: null,
  });

  const isChecking = ref(false);

  async function checkHealth() {
    isChecking.value = true;
    health.value.status = 'checking';
    health.value.errorMessage = null;

    try {
      const response = await fetch('/api/v1/health');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        health.value = {
          ...data.data,
          lastChecked: new Date(),
          errorMessage: null,
        };
      } else {
        throw new Error('Malformed response from health endpoint');
      }
    } catch (err: unknown) {
      health.value.status = 'unhealthy';
      health.value.errorMessage = err instanceof Error ? err.message : 'Failed to reach API server';
      health.value.lastChecked = new Date();
    } finally {
      isChecking.value = false;
    }
  }

  return {
    health,
    isChecking,
    checkHealth,
  };
});
