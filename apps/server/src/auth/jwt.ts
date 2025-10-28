import { FastifyRequest } from 'fastify';

export interface JWTPayload {
  sub: string; // user ID
  jti: string; // JWT ID (for session tracking)
  email: string;
  iat: number;
  exp: number;
}

/**
 * Get user from JWT token in request
 */
export function getUserFromRequest(request: FastifyRequest): JWTPayload | null {
  try {
    const payload = request.user as JWTPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new Error('Unauthorized');
  }
}
