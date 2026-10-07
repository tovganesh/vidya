import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authService, ClientContext } from './auth.service.js';
import { authenticate, requireRole, requirePermission } from '../../middleware/auth.js';
import { ApiResponse } from '../../shared/types/index.js';
import { BadRequestError } from '../../shared/errors/index.js';

// Request Validation Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verify2FASchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(1),
  isBackupCode: z.boolean().optional().default(false),
});

const enable2FASchema = z.object({
  secret: z.string().min(1),
  code: z.string().min(1),
  backupCodes: z.array(z.string()).min(1),
});

const disable2FASchema = z.object({
  code: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

function getClientContext(request: any): ClientContext {
  return {
    ipAddress: request.ip || request.socket.remoteAddress,
    userAgent: request.headers['user-agent'],
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Login Endpoint
  fastify.post('/auth/login', async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      throw new BadRequestError('Invalid login payload', parse.error.format());
    }

    const { email, password } = parse.data;
    const context = getClientContext(request);
    const result = await authService.login(email, password, context);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 2. Verify 2FA Login
  fastify.post('/auth/2fa/verify', async (request, reply) => {
    const parse = verify2FASchema.safeParse(request.body);
    if (!parse.success) {
      throw new BadRequestError('Invalid 2FA verification payload', parse.error.format());
    }

    const { tempToken, code, isBackupCode } = parse.data;
    const context = getClientContext(request);
    const result = await authService.verify2FALogin(tempToken, code, isBackupCode, context);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 3. Initiate 2FA Setup (Authenticated)
  fastify.post(
    '/auth/2fa/setup',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const data = await authService.setup2FA(request.user.sub);
      return reply.status(200).send({
        success: true,
        data,
      });
    },
  );

  // 4. Confirm & Enable 2FA (Authenticated)
  fastify.post(
    '/auth/2fa/enable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parse = enable2FASchema.safeParse(request.body);
      if (!parse.success) {
        throw new BadRequestError('Invalid 2FA enable payload', parse.error.format());
      }

      const { secret, code, backupCodes } = parse.data;
      const context = getClientContext(request);
      await authService.enable2FA(request.user.sub, secret, code, backupCodes, context);

      return reply.status(200).send({
        success: true,
        data: { message: 'Two-factor authentication successfully enabled' },
      });
    },
  );

  // 5. Disable 2FA (Authenticated)
  fastify.post(
    '/auth/2fa/disable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parse = disable2FASchema.safeParse(request.body);
      if (!parse.success) {
        throw new BadRequestError('Invalid 2FA disable payload', parse.error.format());
      }

      const { code } = parse.data;
      const context = getClientContext(request);
      await authService.disable2FA(request.user.sub, code, context);

      return reply.status(200).send({
        success: true,
        data: { message: 'Two-factor authentication successfully disabled' },
      });
    },
  );

  // 6. Refresh Token
  fastify.post('/auth/refresh', async (request, reply) => {
    const parse = refreshSchema.safeParse(request.body);
    if (!parse.success) {
      throw new BadRequestError('Refresh token required', parse.error.format());
    }

    const { refreshToken } = parse.data;
    const context = getClientContext(request);
    const tokens = await authService.refreshTokens(refreshToken, context);

    return reply.status(200).send({
      success: true,
      data: tokens,
    });
  });

  // 7. Logout
  fastify.post(
    '/auth/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parse = logoutSchema.safeParse(request.body);
      if (parse.success && parse.data.refreshToken) {
        await authService.logout(parse.data.refreshToken);
      }

      return reply.status(200).send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    },
  );

  // 8. Get Authenticated User Profile
  fastify.get(
    '/auth/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = await authService.getMe(request.user.sub);
      return reply.status(200).send({
        success: true,
        data: user,
      });
    },
  );

  // 9. RBAC Test Endpoint (Guarded by Role)
  fastify.get(
    '/auth/role-test',
    { preHandler: [authenticate, requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          message: 'Access granted to administrative role',
          role: request.user.role,
        },
      });
    },
  );

  // 10. Permission Test Endpoint (Guarded by Permission)
  fastify.get(
    '/auth/permission-test',
    { preHandler: [authenticate, requirePermission('attendance:mark')] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          message: 'Access granted with attendance:mark permission',
          user: request.user.email,
        },
      });
    },
  );
};
