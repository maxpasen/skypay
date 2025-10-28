import { FastifyInstance } from 'fastify';
import { MagicLinkRequestSchema } from '@skipay/shared';
import { MagicLinkService } from '../auth/magic-link.js';
import { prisma } from '../lib/db.js';
import { nanoid } from 'nanoid';

export async function authRoutes(fastify: FastifyInstance) {
  const magicLinkService = new MagicLinkService();

  /**
   * POST /auth/magic-link
   * Request a magic link
   */
  fastify.post('/auth/magic-link', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Validate with Zod for runtime safety
      const result = MagicLinkRequestSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: 'Invalid email address' });
      }
      const { email } = result.data;

      try {
        await magicLinkService.sendMagicLink(email);
        return { success: true };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to send magic link');
        return reply.code(500).send({ error: 'Failed to send magic link' });
      }
    },
  });

  /**
   * GET /auth/callback?token=...
   * Verify magic link and set session cookie
   */
  fastify.get('/auth/callback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
        required: ['token'],
      },
    },
    handler: async (request, reply) => {
      const { token } = request.query as { token: string };

      try {
        const result = await magicLinkService.verifyToken(token);

        if (!result) {
          return reply.code(400).send({ error: 'Invalid or expired token' });
        }

        const { userId, email } = result;

        // Create session
        const jwtId = nanoid();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.session.create({
          data: {
            userId,
            jwtId,
            expiresAt,
            ipHash: request.ip,
          },
        });

        // Sign JWT
        const jwt = fastify.jwt.sign(
          {
            sub: userId,
            jti: jwtId,
            email,
          },
          {
            expiresIn: '7d',
          }
        );

        // Set cookie
        reply.setCookie('token', jwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        // Redirect to app
        return reply.redirect('/');
      } catch (error) {
        fastify.log.error({ error }, 'Auth callback error');
        return reply.code(500).send({ error: 'Authentication failed' });
      }
    },
  });

  /**
   * GET /me
   * Get current user info
   */
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { sub: string };

      const userData = await prisma.user.findUnique({
        where: { id: user.sub },
        include: {
          cosmetics: {
            include: {
              cosmetic: true,
            },
          },
        },
      });

      if (!userData) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return {
        id: userData.id,
        email: userData.email,
        displayName: userData.displayName,
        createdAt: userData.createdAt.toISOString(),
        cosmetics: userData.cosmetics.map((uc) => ({
          id: uc.cosmetic.id,
          key: uc.cosmetic.key,
          name: uc.cosmetic.name,
          type: uc.cosmetic.type,
          equipped: uc.equipped,
        })),
      };
    },
  });

  /**
   * POST /auth/logout
   * Invalidate session
   */
  fastify.post('/auth/logout', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { jti: string };

      // Delete session
      await prisma.session.deleteMany({
        where: { jwtId: user.jti },
      });

      // Clear cookie
      reply.clearCookie('token', { path: '/' });

      return { success: true };
    },
  });
}
