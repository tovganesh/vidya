import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Health Check API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 OK and healthy status on GET /api/v1/health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.service).toBe('vidyasetu-api');
    expect(body.data.version).toBe('0.1.0');
    expect(typeof body.data.uptimeSeconds).toBe('number');
    expect(typeof body.data.timestamp).toBe('string');
    expect(body.data.database).toBeDefined();
    expect(body.data.database.status).toBe('connected');
    expect(typeof body.data.database.latencyMs).toBe('number');
  });

  it('should return 404 for unknown endpoints', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/unknown-endpoint',
    });

    expect(response.statusCode).toBe(404);
  });
});
