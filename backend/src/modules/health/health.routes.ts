import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ApiResponse } from '../../shared/types/index.js';
import { env } from '../../config/env.js';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
}

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, reply): Promise<ApiResponse<HealthData>> => {
    return {
      success: true,
      data: {
        status: 'healthy',
        service: 'vidyasetu-api',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
      },
    };
  });
};
