import { FastifyInstance } from 'fastify';
import { SubmitRunSchema, EquipCosmeticSchema } from '@skipay/shared';
import { prisma } from '../lib/db.js';

export async function gameRoutes(fastify: FastifyInstance) {
  /**
   * POST /runs
   * Submit a solo run
   */
  fastify.post('/runs', {
    onRequest: [fastify.authenticate],
    schema: {
      body: SubmitRunSchema,
    },
    handler: async (request, reply) => {
      const user = request.user as { sub: string };
      const runData = request.body as any;

      try {
        const run = await prisma.run.create({
          data: {
            userId: user.sub,
            mode: runData.mode,
            distance: runData.distance,
            score: runData.score,
            maxSpeed: runData.maxSpeed,
            obstaclesHit: runData.obstaclesHit,
            endedAt: new Date(),
            seed: runData.seed,
            durationMs: runData.durationMs,
            metadata: runData.metadata || {},
          },
        });

        return { success: true, runId: run.id };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to save run');
        return reply.code(500).send({ error: 'Failed to save run' });
      }
    },
  });

  /**
   * GET /leaderboard?range=daily|weekly|all
   * Get leaderboard
   */
  fastify.get('/leaderboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['daily', 'weekly', 'all'] },
        },
        required: ['range'],
      },
    },
    handler: async (request, _reply) => {
      const { range } = request.query as { range: 'daily' | 'weekly' | 'all' };

      let startDate: Date | undefined;
      const now = new Date();

      if (range === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === 'weekly') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      }

      // Get top runs
      const runs = await prisma.run.findMany({
        where: startDate ? { startedAt: { gte: startDate } } : undefined,
        orderBy: { score: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      // Group by user, taking best score
      const userBest = new Map<string, any>();

      for (const run of runs) {
        const existing = userBest.get(run.userId);
        if (!existing || run.score > existing.score) {
          userBest.set(run.userId, {
            userId: run.userId,
            displayName: run.user.displayName,
            score: run.score,
            distance: run.distance,
            createdAt: run.startedAt.toISOString(),
          });
        }
      }

      // Sort and rank
      const entries = Array.from(userBest.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((entry, index) => ({
          rank: index + 1,
          ...entry,
        }));

      // Find user's entry if authenticated
      let yourEntry;
      if (request.user) {
        const user = request.user as { sub: string };
        const userEntry = entries.find((e) => e.userId === user.sub);
        if (userEntry) {
          yourEntry = userEntry;
        }
      }

      return {
        range,
        entries,
        yourEntry,
      };
    },
  });

  /**
   * POST /cosmetics/equip
   * Equip a cosmetic
   */
  fastify.post('/cosmetics/equip', {
    onRequest: [fastify.authenticate],
    schema: {
      body: EquipCosmeticSchema,
    },
    handler: async (request, reply) => {
      const user = request.user as { sub: string };
      const { cosmeticId } = request.body as { cosmeticId: string };

      try {
        // Check if user owns this cosmetic
        const userCosmetic = await prisma.userCosmetic.findUnique({
          where: {
            userId_cosmeticId: {
              userId: user.sub,
              cosmeticId,
            },
          },
          include: { cosmetic: true },
        });

        if (!userCosmetic) {
          return reply.code(404).send({ error: 'Cosmetic not found or not owned' });
        }

        // Unequip all cosmetics of the same type
        await prisma.userCosmetic.updateMany({
          where: {
            userId: user.sub,
            cosmetic: { type: userCosmetic.cosmetic.type },
          },
          data: { equipped: false },
        });

        // Equip this one
        await prisma.userCosmetic.update({
          where: { id: userCosmetic.id },
          data: { equipped: true },
        });

        return { success: true };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to equip cosmetic');
        return reply.code(500).send({ error: 'Failed to equip cosmetic' });
      }
    },
  });

  /**
   * POST /matchmaking/quick
   * Find or create a quick match
   */
  fastify.post('/matchmaking/quick', {
    onRequest: [fastify.authenticate],
    handler: async (_request, reply) => {
      // This endpoint is simplified - actual matchmaking happens via WebSocket
      // This is just a placeholder to satisfy the API requirements

      return reply.code(501).send({
        error: 'Use WebSocket connection for matchmaking',
      });
    },
  });
}
