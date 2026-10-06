import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ApiResponse } from '../../shared/types/index.js';
import { env } from '../../config/env.js';
import { checkDatabaseConnection } from '../../database/db.js';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs: number;
    error?: string;
  };
}

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, reply): Promise<ApiResponse<HealthData>> => {
    const dbHealth = await checkDatabaseConnection();
    const isDegraded = !dbHealth.connected;

    if (isDegraded) {
      reply.status(503);
    }

    return {
      success: true,
      data: {
        status: isDegraded ? 'degraded' : 'healthy',
        service: 'vidyasetu-api',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        database: {
          status: dbHealth.connected ? 'connected' : 'disconnected',
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error,
        },
      },
    };
  });
};
