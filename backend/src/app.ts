import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { AppError } from './shared/errors/index.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { schoolRoutes } from './modules/schools/schools.routes.js';
import { academicRoutes } from './modules/academics/academics.routes.js';
import { peopleRoutes } from './modules/people/people.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { timetableRoutes } from './modules/timetable/timetable.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    trustProxy: true,
  });

  // Register Security Plugins
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.CORS_ORIGIN : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(sensible);

  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Central Error Handler
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    const fastifyErr = error as FastifyError;

    // Fastify schema validation error
    if (fastifyErr.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload validation failed',
          details: fastifyErr.validation,
        },
      });
    }

    // Fallback unhandled internal error
    const statusCode = fastifyErr.statusCode ?? 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: fastifyErr.code || 'INTERNAL_SERVER_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : error.message,
      },
    });
  });

  // Register API Routes
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(schoolRoutes, { prefix: '/api/v1' });
  await app.register(academicRoutes, { prefix: '/api/v1' });
  await app.register(peopleRoutes, { prefix: '/api/v1' });
  await app.register(attendanceRoutes, { prefix: '/api/v1' });
  await app.register(timetableRoutes, { prefix: '/api/v1' });

  return app;
}
