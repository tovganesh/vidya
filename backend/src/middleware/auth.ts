import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/index.js';
import { verifyAccessToken, TokenPayload } from '../modules/auth/auth.tokens.js';
import { UserRole } from '../shared/types/index.js';

// Extend FastifyRequest type with authenticated user payload
declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
  }
}

/**
 * Authentication Pre-Handler
 * Validates Bearer Access JWT and attaches payload to request.user
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header', 'AUTH_REQUIRED');
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch (err: unknown) {
    throw new UnauthorizedError('Access token is invalid or expired', 'TOKEN_EXPIRED');
  }
}

/**
 * Role-Based Access Control Guard
 * Requires user's primaryRole to match one of the allowed roles
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Role ${request.user.role} does not have permission to access this resource`,
        'INSUFFICIENT_ROLE',
      );
    }
  };
}

/**
 * Granular Permission Guard
 * Requires user to have the specific permission code
 */
export function requirePermission(permissionCode: string) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    // SUPER_ADMIN has god-mode bypass
    if (request.user.role === 'SUPER_ADMIN') {
      return;
    }

    if (!request.user.permissions || !request.user.permissions.includes(permissionCode)) {
      throw new ForbiddenError(
        `Missing required permission: ${permissionCode}`,
        'INSUFFICIENT_PERMISSION',
      );
    }
  };
}
