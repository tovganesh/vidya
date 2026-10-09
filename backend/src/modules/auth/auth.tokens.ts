import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { UserRole } from '../../shared/types/index.js';

export interface TokenPayload {
  sub: string;
  email: string;
  schoolId: string | null;
  role: UserRole;
  permissions: string[];
}

export interface Temp2FAPayload {
  sub: string;
  email: string;
  is2FAChallenge: true;
}

// Access Token Lifetime (default 15m)
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Temporary 2FA Challenge Token (5 minutes lifetime)
export function generate2FAChallengeToken(userId: string, email: string): string {
  const payload: Temp2FAPayload = {
    sub: userId,
    email,
    is2FAChallenge: true,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
}

// Cryptographically random opaque Refresh Token (64-byte hex)
export function generateRefreshTokenString(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verify2FAChallengeToken(token: string): Temp2FAPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as Temp2FAPayload;
  if (!payload.is2FAChallenge) {
    throw new Error('Invalid 2FA challenge token');
  }
  return payload;
}

// ============================================================================
// TOTP Two-Factor Authentication (RFC 6238)
// ============================================================================

export function generateTOTPSecret(): string {
  return generateSecret();
}

export async function generateTOTPSetupData(
  email: string,
  secret: string,
  issuer = 'Vidya',
): Promise<{ otpauthUri: string; qrCodeDataUrl: string }> {
  const otpauthUri = generateURI({ secret, label: email, issuer });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
  return { otpauthUri, qrCodeDataUrl };
}

export function verifyTOTPCode(code: string, secret: string): boolean {
  try {
    const result = verifySync({ token: code.trim(), secret });
    return Boolean(result && (result as any).valid !== false);
  } catch {
    return false;
  }
}

// Generate 8 alphanumeric 8-digit emergency backup codes
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
