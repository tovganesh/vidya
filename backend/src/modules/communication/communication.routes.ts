import { FastifyInstance } from 'fastify';
import { CommunicationService } from './communication.service.js';
import { WebPushService } from './webpush.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { AnnouncementPriority, AnnouncementAudience } from '@prisma/client';

export async function communicationRoutes(fastify: FastifyInstance) {
  // Public/Accessible endpoint to get active VAPID key
  fastify.get('/vapid-public-key', async (_request, reply) => {
    const publicKey = WebPushService.getPublicKey();
    return reply.send({ publicKey });
  });

  // ============================================================================
  // Announcements
  // ============================================================================

  fastify.get(
    '/announcements',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const query = request.query as {
        priority?: AnnouncementPriority;
        targetAudience?: AnnouncementAudience;
        search?: string;
        limit?: string;
        offset?: string;
      };

      const result = await CommunicationService.getAnnouncements(schoolId, {
        priority: query.priority,
        targetAudience: query.targetAudience,
        search: query.search,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
      });

      return reply.send(result);
    },
  );

  fastify.get(
    '/announcements/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };
      const announcement = await CommunicationService.getAnnouncementById(schoolId, id);
      return reply.send(announcement);
    },
  );

  fastify.post(
    '/announcements',
    {
      preHandler: [
        authenticate,
        requirePermission(['school:manage', 'attendance:mark']), // Admin, Principal, or Teacher
      ],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const body = request.body as {
        title: string;
        content: string;
        priority?: AnnouncementPriority;
        targetAudience?: AnnouncementAudience;
        targetClassIds?: string[];
        broadcastPush?: boolean;
      };

      const announcement = await CommunicationService.createAnnouncement(
        schoolId,
        userId,
        body,
      );

      return reply.status(201).send(announcement);
    },
  );

  fastify.delete(
    '/announcements/:id',
    {
      preHandler: [authenticate, requirePermission(['school:manage'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };
      const result = await CommunicationService.deleteAnnouncement(schoolId, id);
      return reply.send(result);
    },
  );

  // ============================================================================
  // In-App Notifications
  // ============================================================================

  fastify.get(
    '/notifications',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const query = request.query as {
        unreadOnly?: string;
        limit?: string;
        offset?: string;
      };

      const result = await CommunicationService.getUserNotifications(
        schoolId,
        userId,
        {
          unreadOnly: query.unreadOnly === 'true',
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          offset: query.offset ? parseInt(query.offset, 10) : undefined,
        },
      );

      return reply.send(result);
    },
  );

  fastify.get(
    '/notifications/unread-count',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const count = await CommunicationService.getUnreadCount(schoolId, userId);
      return reply.send(count);
    },
  );

  fastify.patch(
    '/notifications/:id/read',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const { id } = request.params as { id: string };
      const updated = await CommunicationService.markNotificationAsRead(
        schoolId,
        userId,
        id,
      );
      return reply.send(updated);
    },
  );

  fastify.post(
    '/notifications/read-all',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const result = await CommunicationService.markAllNotificationsAsRead(
        schoolId,
        userId,
      );
      return reply.send(result);
    },
  );

  // ============================================================================
  // Web Push Subscriptions
  // ============================================================================

  fastify.post(
    '/push/subscribe',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const body = request.body as {
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent?: string;
      };

      const result = await CommunicationService.subscribePush(
        schoolId,
        userId,
        body,
      );

      return reply.status(201).send(result);
    },
  );

  fastify.post(
    '/push/unsubscribe',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const body = request.body as { endpoint: string };
      const result = await CommunicationService.unsubscribePush(
        schoolId,
        userId,
        body.endpoint,
      );

      return reply.send(result);
    },
  );

  fastify.post(
    '/push/test',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const result = await CommunicationService.sendTestPush(schoolId, userId);
      return reply.send(result);
    },
  );
}
