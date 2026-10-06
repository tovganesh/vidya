import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { generateSync } from 'otplib';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('Authentication, RBAC & 2FA Engine (Milestone 3)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('1. Standard Password Login', () => {
    it('should successfully login as school admin and return tokens and user profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'admin@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.requires2FA).toBe(false);
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');
      expect(body.data.user.email).toBe('admin@vidyasetu.org');
      expect(body.data.user.primaryRole).toBe('SCHOOL_ADMIN');
      expect(body.data.user.permissions.length).toBeGreaterThan(0);
      expect(body.data.user.school).not.toBeNull();
      expect(body.data.user.school.code).toBe('VS-BLR-01');
    });

    it('should reject login with wrong password (401)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'admin@vidyasetu.org',
          password: 'WrongPassword123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email (401)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('2. User Profile (/api/v1/auth/me)', () => {
    it('should fetch profile when authenticated with Bearer token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'principal@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload).data;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const body = JSON.parse(meRes.payload);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('principal@vidyasetu.org');
      expect(body.data.primaryRole).toBe('PRINCIPAL');
    });

    it('should reject unauthenticated request without token (401)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('3. Token Refresh & Rotation Safeguards', () => {
    it('should refresh tokens and rotate refresh token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'teacher@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const initialTokens = JSON.parse(loginRes.payload).data;

      // Rotate
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: initialTokens.refreshToken,
        },
      });

      expect(refreshRes.statusCode).toBe(200);
      const refreshedTokens = JSON.parse(refreshRes.payload).data;
      expect(refreshedTokens.accessToken).toBeDefined();
      expect(refreshedTokens.refreshToken).toBeDefined();
      expect(refreshedTokens.refreshToken).not.toBe(initialTokens.refreshToken);

      // Attempting to reuse initialTokens.refreshToken must fail due to token reuse detection!
      const reuseRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: initialTokens.refreshToken,
        },
      });
      expect(reuseRes.statusCode).toBe(401);
      const reuseBody = JSON.parse(reuseRes.payload);
      expect(reuseBody.error.code).toBe('TOKEN_COMPROMISED');
    });
  });

  describe('4. RBAC & Granular Permission Enforcement', () => {
    it('should allow SCHOOL_ADMIN to access admin-scoped role-test endpoint', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'admin@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload).data;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/role-test',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.role).toBe('SCHOOL_ADMIN');
    });

    it('should forbid TEACHER from accessing admin-scoped role-test endpoint (403)', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'teacher@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload).data;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/role-test',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow user with attendance:mark permission to access permission-test endpoint', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'teacher@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload).data;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/permission-test',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should forbid user without attendance:mark permission (ACCOUNTANT) (403)', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'accountant@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload).data;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/permission-test',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).error.code).toBe('INSUFFICIENT_PERMISSION');
    });
  });

  describe('5. Two-Factor Authentication (2FA) Lifecycle', () => {
    it('should setup, enable, challenge, verify, and disable 2FA', async () => {
      // 1. Login as parent to test 2FA setup
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'parent@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      let token = JSON.parse(loginRes.payload).data.accessToken;

      // 2. Setup 2FA
      const setupRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/setup',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(setupRes.statusCode).toBe(200);
      const setupData = JSON.parse(setupRes.payload).data;
      expect(setupData.secret).toBeDefined();
      expect(setupData.qrCodeDataUrl).toContain('data:image/png;base64');
      expect(setupData.backupCodes.length).toBe(8);

      // 3. Enable 2FA with generated code
      const currentTotp = generateSync({ secret: setupData.secret });
      const enableRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/enable',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          secret: setupData.secret,
          code: currentTotp,
          backupCodes: setupData.backupCodes,
        },
      });
      expect(enableRes.statusCode).toBe(200);

      // 4. Next login requires 2FA!
      const login2FARes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'parent@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      expect(login2FARes.statusCode).toBe(200);
      const challengeBody = JSON.parse(login2FARes.payload).data;
      expect(challengeBody.requires2FA).toBe(true);
      expect(challengeBody.tempToken).toBeDefined();

      // 5. Complete 2FA login with fresh TOTP code
      const verifyTotp = generateSync({ secret: setupData.secret });
      const verifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/verify',
        payload: {
          tempToken: challengeBody.tempToken,
          code: verifyTotp,
        },
      });
      expect(verifyRes.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyRes.payload).data;
      expect(verifyBody.accessToken).toBeDefined();
      expect(verifyBody.user.isTotpEnabled).toBe(true);

      token = verifyBody.accessToken;

      // 6. Test backup code login
      const login2FARes2 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'parent@vidyasetu.org',
          password: 'VidyaSetu@2026',
        },
      });
      const challengeBody2 = JSON.parse(login2FARes2.payload).data;

      const firstBackupCode = setupData.backupCodes[0];
      const backupVerifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/verify',
        payload: {
          tempToken: challengeBody2.tempToken,
          code: firstBackupCode,
          isBackupCode: true,
        },
      });
      expect(backupVerifyRes.statusCode).toBe(200);

      // 7. Disable 2FA to leave user clean
      const disableTotp = generateSync({ secret: setupData.secret });
      const disableRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/disable',
        headers: { authorization: `Bearer ${token}` },
        payload: { code: disableTotp },
      });
      expect(disableRes.statusCode).toBe(200);
    });
  });
});
