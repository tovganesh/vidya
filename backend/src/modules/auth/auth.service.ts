import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/db.js';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/index.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  generate2FAChallengeToken,
  verify2FAChallengeToken,
  generateTOTPSecret,
  generateTOTPSetupData,
  verifyTOTPCode,
  generateBackupCodes,
  TokenPayload,
} from './auth.tokens.js';
import { UserRole } from '../../shared/types/index.js';

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginSuccessResult {
  requires2FA: false;
  accessToken: string;
  refreshToken: string;
  user: AuthUserProfile;
}

export interface Login2FARequiredResult {
  requires2FA: true;
  tempToken: string;
  message: string;
}

export type LoginResult = LoginSuccessResult | Login2FARequiredResult;

export interface AuthUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: UserRole;
  isTotpEnabled: boolean;
  school: {
    id: string;
    name: string;
    code: string;
    board: string;
  } | null;
  permissions: string[];
}

export class AuthService {
  /**
   * Helper to extract flat list of unique permission codes for a user
   */
  private static extractPermissions(user: {
    roles: Array<{
      role: {
        permissions: Array<{
          permission: {
            code: string;
          };
        }>;
      };
    }>;
  }): string[] {
    const permSet = new Set<string>();
    for (const assignment of user.roles) {
      for (const rp of assignment.role.permissions) {
        permSet.add(rp.permission.code);
      }
    }
    return Array.from(permSet);
  }

  /**
   * Primary Login handler
   */
  async login(
    email: string,
    password: string,
    context: ClientContext,
  ): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        school: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is inactive or suspended', 'ACCOUNT_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // If Two-Factor Authentication is enabled, issue challenge token
    if (user.isTotpEnabled) {
      const tempToken = generate2FAChallengeToken(user.id, user.email);
      return {
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication code required',
      };
    }

    // Issue tokens directly
    const permissions = AuthService.extractPermissions(user);
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      schoolId: user.schoolId,
      role: user.primaryRole,
      permissions,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await this.createRefreshToken(user.id, context);

    // Update login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit event
    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        diff: { method: 'PASSWORD', email: user.email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return {
      requires2FA: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        primaryRole: user.primaryRole,
        isTotpEnabled: user.isTotpEnabled,
        school: user.school
          ? {
              id: user.school.id,
              name: user.school.name,
              code: user.school.code,
              board: user.school.board,
            }
          : null,
        permissions,
      },
    };
  }

  /**
   * Complete 2FA Login challenge with TOTP code or emergency backup code
   */
  async verify2FALogin(
    tempToken: string,
    code: string,
    isBackupCode: boolean,
    context: ClientContext,
  ): Promise<LoginSuccessResult> {
    let payload;
    try {
      payload = verify2FAChallengeToken(tempToken);
    } catch {
      throw new UnauthorizedError('2FA challenge token expired or invalid', 'INVALID_2FA_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        school: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isTotpEnabled || !user.totpSecret) {
      throw new UnauthorizedError('2FA is not enabled for this user', '2FA_NOT_ENABLED');
    }

    let isValid = false;

    if (isBackupCode) {
      // Check backup codes
      const storedCodes = (user.backupCodes as string[]) || [];
      const formattedCode = code.trim().toUpperCase();
      const codeIndex = storedCodes.indexOf(formattedCode);

      if (codeIndex !== -1) {
        isValid = true;
        // Consume backup code
        storedCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: storedCodes },
        });
      }
    } else {
      isValid = verifyTOTPCode(code, user.totpSecret);
    }

    if (!isValid) {
      throw new UnauthorizedError('Invalid two-factor authentication code', 'INVALID_2FA_CODE');
    }

    const permissions = AuthService.extractPermissions(user);
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      schoolId: user.schoolId,
      role: user.primaryRole,
      permissions,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await this.createRefreshToken(user.id, context);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: 'USER_LOGIN_2FA',
        entityType: 'User',
        entityId: user.id,
        diff: { method: isBackupCode ? 'BACKUP_CODE' : 'TOTP_CODE' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return {
      requires2FA: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        primaryRole: user.primaryRole,
        isTotpEnabled: user.isTotpEnabled,
        school: user.school
          ? {
              id: user.school.id,
              name: user.school.name,
              code: user.school.code,
              board: user.school.board,
            }
          : null,
        permissions,
      },
    };
  }

  /**
   * Setup 2FA: generates secret and QR code for an authenticated user
   */
  async setup2FA(userId: string): Promise<{
    secret: string;
    otpauthUri: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const secret = generateTOTPSecret();
    const { otpauthUri, qrCodeDataUrl } = await generateTOTPSetupData(user.email, secret);
    const backupCodes = generateBackupCodes();

    return {
      secret,
      otpauthUri,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Enable 2FA after user enters a test verification code
   */
  async enable2FA(
    userId: string,
    secret: string,
    code: string,
    backupCodes: string[],
    context: ClientContext,
  ): Promise<boolean> {
    const isValid = verifyTOTPCode(code, secret);
    if (!isValid) {
      throw new BadRequestError('Invalid verification code. Please check your authenticator app.');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isTotpEnabled: true,
        totpSecret: secret,
        backupCodes,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: '2FA_ENABLED',
        entityType: 'User',
        entityId: user.id,
        diff: { status: 'ENABLED' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return true;
  }

  /**
   * Disable 2FA with current code or password
   */
  async disable2FA(userId: string, code: string, context: ClientContext): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isTotpEnabled || !user.totpSecret) {
      throw new BadRequestError('2FA is not enabled');
    }

    const isValid = verifyTOTPCode(code, user.totpSecret);
    if (!isValid) {
      throw new BadRequestError('Invalid 2FA code to disable authentication');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isTotpEnabled: false,
        totpSecret: null,
        backupCodes: Prisma.DbNull,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        action: '2FA_DISABLED',
        entityType: 'User',
        entityId: user.id,
        diff: { status: 'DISABLED' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return true;
  }

  /**
   * Rotate Refresh Token and return fresh Access Token
   */
  async refreshTokens(
    refreshTokenStr: string,
    context: ClientContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Token reuse detection (compromise safeguard)
    if (existing.revokedAt) {
      // Revoke all tokens for this user immediately!
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Compromised refresh token reused. All sessions revoked.', 'TOKEN_COMPROMISED');
    }

    if (new Date() > existing.expiresAt) {
      throw new UnauthorizedError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Revoke used refresh token
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Create fresh tokens
    const permissions = AuthService.extractPermissions(existing.user);
    const tokenPayload: TokenPayload = {
      sub: existing.user.id,
      email: existing.user.email,
      schoolId: existing.user.schoolId,
      role: existing.user.primaryRole,
      permissions,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = await this.createRefreshToken(existing.user.id, context);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke session on logout
   */
  async logout(refreshTokenStr: string): Promise<void> {
    if (!refreshTokenStr) return;
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenStr },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get Current Authenticated User Profile
   */
  async getMe(userId: string): Promise<AuthUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    const permissions = AuthService.extractPermissions(user);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      primaryRole: user.primaryRole,
      isTotpEnabled: user.isTotpEnabled,
      school: user.school
        ? {
            id: user.school.id,
            name: user.school.name,
            code: user.school.code,
            board: user.school.board,
          }
        : null,
      permissions,
    };
  }

  private async createRefreshToken(userId: string, context: ClientContext): Promise<string> {
    const tokenStr = generateRefreshTokenString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await prisma.refreshToken.create({
      data: {
        userId,
        token: tokenStr,
        expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    });

    return tokenStr;
  }
}

export const authService = new AuthService();
