import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('Audit Trail & Compliance Ledger API', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let schoolId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();

    // Login as Admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(adminLoginRes.statusCode).toBe(200);
    const adminData = JSON.parse(adminLoginRes.payload).data;
    adminToken = adminData.accessToken;
    schoolId = adminData.user.school.id;

    // Login as Teacher
    const teacherLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'teacher@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(teacherLoginRes.statusCode).toBe(200);
    const teacherData = JSON.parse(teacherLoginRes.payload).data;
    teacherToken = teacherData.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthorized teacher role without audit:read with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows administrator to fetch audit logs with pagination and stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.stats).toBeDefined();
    expect(typeof body.data.stats.totalAllTime).toBe('number');
  });

  it('supports filtering by search and pagination limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit?limit=5&page=1',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeLessThanOrEqual(5);
    expect(body.data.pagination.limit).toBe(5);
  });

  it('allows fetching audit metadata for filter options', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/metadata',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.actions)).toBe(true);
    expect(Array.isArray(body.data.entityTypes)).toBe(true);
  });

  it('also supports the /api/v1/admin/audit alias route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });
});
