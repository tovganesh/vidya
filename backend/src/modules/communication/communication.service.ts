import { prisma } from '../../database/db.js';
import {
  AnnouncementPriority,
  AnnouncementAudience,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { WebPushService } from './webpush.service.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementAudience;
  targetClassIds?: string[];
  broadcastPush?: boolean;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export class CommunicationService {
  // ============================================================================
  // Announcements
  // ============================================================================

  static async createAnnouncement(
    schoolId: string,
    authorId: string,
    data: CreateAnnouncementInput,
  ) {
    if (!data.title?.trim() || !data.content?.trim()) {
      throw new BadRequestError('Announcement title and content are required');
    }

    const priority = data.priority || AnnouncementPriority.NORMAL;
    const targetAudience = data.targetAudience || AnnouncementAudience.ALL_SCHOOL;
    const targetClassIds = data.targetClassIds || [];

    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        authorId,
        title: data.title.trim(),
        content: data.content.trim(),
        priority,
        targetAudience,
        targetClassIds,
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryRole: true,
          },
        },
      },
    });

    // Auto-dispatch in-app notifications and web push if broadcast is requested or priority is URGENT
    if (data.broadcastPush || priority === AnnouncementPriority.URGENT || priority === AnnouncementPriority.EMERGENCY) {
      await this.dispatchAnnouncementNotifications(schoolId, announcement);
    }

    return announcement;
  }

  static async getAnnouncements(
    schoolId: string,
    params?: {
      priority?: AnnouncementPriority;
      targetAudience?: AnnouncementAudience;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.AnnouncementWhereInput = {
      schoolId,
      isPublished: true,
    };

    if (params?.priority) {
      where.priority = params.priority;
    }

    if (params?.targetAudience) {
      where.targetAudience = params.targetAudience;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              primaryRole: true,
            },
          },
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      prisma.announcement.count({ where }),
    ]);

    return { announcements, total };
  }

  static async getAnnouncementById(schoolId: string, id: string) {
    const announcement = await prisma.announcement.findFirst({
      where: { id, schoolId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryRole: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundError(`Announcement not found: ${id}`);
    }

    return announcement;
  }

  static async deleteAnnouncement(schoolId: string, id: string) {
    const announcement = await prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!announcement) {
      throw new NotFoundError(`Announcement not found: ${id}`);
    }

    await prisma.announcement.delete({ where: { id } });
    return { success: true, message: 'Announcement deleted' };
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  static async getUserNotifications(
    schoolId: string,
    userId: string,
    params?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ) {
    const where: Prisma.NotificationWhereInput = {
      schoolId,
      userId,
    };

    if (params?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params?.limit || 30,
        skip: params?.offset || 0,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { schoolId, userId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  static async getUnreadCount(schoolId: string, userId: string) {
    const count = await prisma.notification.count({
      where: { schoolId, userId, isRead: false },
    });
    return { unreadCount: count };
  }

  static async markNotificationAsRead(schoolId: string, userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, schoolId, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return updated;
  }

  static async markAllNotificationsAsRead(schoolId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: { schoolId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true, updatedCount: result.count };
  }

  // ============================================================================
  // Web Push Subscriptions
  // ============================================================================

  static async subscribePush(
    schoolId: string,
    userId: string,
    data: PushSubscriptionInput,
  ) {
    if (!data.endpoint || !data.p256dh || !data.auth) {
      throw new BadRequestError('Incomplete push subscription payload');
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        userId,
        schoolId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent || null,
      },
    });

    return { success: true, subscriptionId: subscription.id };
  }

  static async unsubscribePush(schoolId: string, userId: string, endpoint: string) {
    if (!endpoint) {
      throw new BadRequestError('Subscription endpoint is required');
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, schoolId, userId },
    });

    return { success: true, message: 'Unsubscribed from push notifications' };
  }

  static async sendTestPush(schoolId: string, userId: string) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { schoolId, userId },
    });

    if (subscriptions.length === 0) {
      throw new BadRequestError('No active push subscriptions found for user');
    }

    const results = await Promise.all(
      subscriptions.map((sub) =>
        WebPushService.sendNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: 'Vidya Test Alert',
            body: 'Native Web Push notifications are active and verified on your device.',
            tag: 'test-push',
          },
        ),
      ),
    );

    return { success: true, dispatched: results.length };
  }

  // ============================================================================
  // Dispatcher Engine
  // ============================================================================

  private static async dispatchAnnouncementNotifications(
    schoolId: string,
    announcement: { id: string; title: string; content: string; targetAudience: AnnouncementAudience },
  ) {
    // Determine target users based on audience
    let targetUsers: { id: string }[] = [];

    if (announcement.targetAudience === AnnouncementAudience.ALL_SCHOOL) {
      targetUsers = await prisma.user.findMany({
        where: { schoolId, status: 'ACTIVE' },
        select: { id: true },
        take: 200,
      });
    } else if (announcement.targetAudience === AnnouncementAudience.TEACHERS_ONLY) {
      targetUsers = await prisma.user.findMany({
        where: { schoolId, status: 'ACTIVE', primaryRole: 'TEACHER' },
        select: { id: true },
      });
    } else if (announcement.targetAudience === AnnouncementAudience.PARENTS_ONLY) {
      targetUsers = await prisma.user.findMany({
        where: { schoolId, status: 'ACTIVE', primaryRole: 'PARENT' },
        select: { id: true },
      });
    } else {
      // Default fallback
      targetUsers = await prisma.user.findMany({
        where: { schoolId, status: 'ACTIVE' },
        select: { id: true },
        take: 50,
      });
    }

    // Create in-app notifications
    const notificationsData = targetUsers.map((u) => ({
      schoolId,
      userId: u.id,
      title: `Notice: ${announcement.title}`,
      body: announcement.content.slice(0, 140),
      type: NotificationType.ANNOUNCEMENT,
      data: { announcementId: announcement.id, link: '/announcements' },
      isRead: false,
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    // Trigger push delivery to all registered subscriptions of target users
    const userIds = targetUsers.map((u) => u.id);
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { schoolId, userId: { in: userIds } },
    });

    for (const sub of subscriptions) {
      WebPushService.sendNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: announcement.title,
          body: announcement.content.slice(0, 100),
          data: { announcementId: announcement.id, link: '/announcements' },
        },
      ).catch(() => {});
    }
  }

  /**
   * Domain event: dispatches parent notification when attendance is marked absent/late
   */
  static async dispatchAttendanceAlert(
    schoolId: string,
    enrollmentId: string,
    status: string,
    date: Date,
  ) {
    if (status === 'PRESENT') return;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            guardians: {
              include: {
                guardian: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        class: true,
        section: true,
      },
    });

    if (!enrollment) return;

    const formattedDate = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;
    const className = `${enrollment.class.name}-${enrollment.section.name}`;
    const title = `Attendance Alert: ${status}`;
    const body = `${studentName} (${className}) was marked ${status} on ${formattedDate}.`;

    for (const sg of enrollment.student.guardians) {
      const parentUser = sg.guardian.user;
      if (parentUser) {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            schoolId,
            userId: parentUser.id,
            title,
            body,
            type: NotificationType.ATTENDANCE_ALERT,
            data: { link: '/attendance' },
            isRead: false,
          },
        });

        // Trigger Web Push
        const subs = await prisma.pushSubscription.findMany({
          where: { schoolId, userId: parentUser.id },
        });

        for (const sub of subs) {
          WebPushService.sendNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title,
              body,
              data: { link: '/attendance' },
            },
          ).catch(() => {});
        }
      }
    }
  }
}
