import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { config, isDev } from './lib/config.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/db.js';
import { authRoutes } from './routes/auth.js';
import { gameRoutes } from './routes/game.js';
import { WebSocketServerManager } from './ws/websocket-server.js';

// Create Fastify instance
const fastify = Fastify({
  logger: logger,
  trustProxy: true,
});

// Register plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: isDev ? false : undefined,
});

await fastify.register(fastifyCors, {
  origin: config.appOrigin,
  credentials: true,
});

await fastify.register(fastifyCookie);

await fastify.register(fastifyJwt, {
  secret: {
    private: config.jwt.privateKey,
    public: config.jwt.publicKey,
  },
  sign: {
    algorithm: 'RS256',
  },
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

await fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Swagger documentation
await fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'SkiPay API',
      description: 'API for SkiPay game',
      version: '1.0.0',
    },
    schemes: ['https', 'http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});

await fastify.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});

// Authentication decorator
fastify.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Routes
await fastify.register(authRoutes);
await fastify.register(gameRoutes);

// Health check
fastify.get('/healthz', async () => {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  return {
    ok: dbStatus === 'ok',
    commitSha: config.commitSha,
    uptime: process.uptime(),
    db: dbStatus,
  };
});

// Initialize WebSocket server
const wsServer = new WebSocketServerManager(fastify);

// Handle WebSocket upgrades
fastify.server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wsServer.handleUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Swagger docs: http://localhost:${config.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
