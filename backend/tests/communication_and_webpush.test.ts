import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';
import { CommunicationService } from '../src/modules/communication/communication.service.js';

describe('Communication, Announcements & Web Push Notifications (Milestone 7)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let schoolId: string;
  let adminUserId: string;
  let parentUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminData = JSON.parse(adminLogin.payload).data;
    adminToken = adminData.accessToken;
    adminUserId = adminData.user.id;
    schoolId = adminData.user.school.id;

    // Authenticate Teacher
    const teacherLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'teacher@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(teacherLogin.statusCode).toBe(200);
    const teacherData = JSON.parse(teacherLogin.payload).data;
    teacherToken = teacherData.accessToken;

    // Authenticate Parent
    const parentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'parent@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(parentLogin.statusCode).toBe(200);
    const parentData = JSON.parse(parentLogin.payload).data;
    parentToken = parentData.accessToken;
    parentUserId = parentData.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. VAPID Configuration & Web Push Protocol
  // ============================================================================
  describe('VAPID Configuration & Push Subscriptions', () => {
    it('should expose the public VAPID key for browser subscription', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/vapid-public-key',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.publicKey).toBeDefined();
      expect(typeof body.publicKey).toBe('string');
      expect(body.publicKey.length).toBeGreaterThan(20);
    });

    it('should register a new browser Web Push subscription for authenticated user', async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/push/subscribe',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          endpoint,
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYOISxuj12ScpqqDTMR21WvKVW82K_6OO1aswQW7A',
          auth: 'tBHItJI5svbpez7KI4CCXg',
          userAgent: 'Chrome Test Suite 129',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.subscriptionId).toBeDefined();

      // Verify in DB
      const record = await prisma.pushSubscription.findUnique({
        where: { endpoint },
      });
      expect(record).not.toBeNull();
      expect(record?.userId).toBe(adminUserId);
    });

    it('should dispatch test push notification to user devices', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/push/test',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.dispatched).toBeGreaterThanOrEqual(1);
    });

    it('should unsubscribe and remove a registered push subscription', async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/test-delete-${Date.now()}`;
      await app.inject({
        method: 'POST',
        url: '/api/v1/communication/push/subscribe',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          endpoint,
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-secret',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/push/unsubscribe',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { endpoint },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      const check = await prisma.pushSubscription.findUnique({ where: { endpoint } });
      expect(check).toBeNull();
    });
  });

  // ============================================================================
  // 2. Announcements & Notice Board
  // ============================================================================
  describe('Announcements & Broadcast Engine', () => {
    it('should retrieve seeded announcements with author details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.announcements).toBeInstanceOf(Array);
      expect(body.announcements.length).toBeGreaterThanOrEqual(2);
      expect(body.total).toBeGreaterThanOrEqual(2);

      const first = body.announcements[0];
      expect(first.title).toBeDefined();
      expect(first.author).toBeDefined();
      expect(first.author.firstName).toBeDefined();
    });

    it('should allow teacher to create a class-targeted announcement', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          title: 'Mathematics Unit Test 3 Date Sheet',
          content: 'The 3rd Unit Test for Algebra and Geometry will be held on Monday.',
          priority: 'NORMAL',
          targetAudience: 'SPECIFIC_CLASSES',
          broadcastPush: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Mathematics Unit Test 3 Date Sheet');
      expect(body.priority).toBe('NORMAL');
      expect(body.targetAudience).toBe('SPECIFIC_CLASSES');
    });

    it('should reject creating an announcement with empty title or content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          title: '',
          content: '',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should allow school admin to delete an announcement', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: 'Temporary Notice To Delete',
          content: 'This will be deleted immediately in test.',
        },
      });
      const created = JSON.parse(createRes.body);

      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/communication/announcements/${created.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(delRes.statusCode).toBe(200);
      const delBody = JSON.parse(delRes.body);
      expect(delBody.success).toBe(true);

      // Verify 404 on re-fetch
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/v1/communication/announcements/${created.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(checkRes.statusCode).toBe(404);
    });

    it('should reject parent attempting to post an announcement (RBAC check)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${parentToken}` },
        payload: {
          title: 'Unauthorized Parent Announcement',
          content: 'This should fail with 403 Forbidden.',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // 3. In-App Notification Center
  // ============================================================================
  describe('In-App Notification Center', () => {
    it('should return unread count for current user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/notifications/unread-count',
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(typeof body.unreadCount).toBe('number');
      expect(body.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('should list notifications for current user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/notifications',
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.notifications).toBeInstanceOf(Array);
      expect(body.unreadCount).toBeGreaterThanOrEqual(1);

      const unread = body.notifications.find((n: { isRead: boolean }) => !n.isRead);
      expect(unread).toBeDefined();
    });

    it('should mark an individual notification as read', async () => {
      // Find an unread notification for parent
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/notifications?unreadOnly=true',
        headers: { authorization: `Bearer ${parentToken}` },
      });
      const listBody = JSON.parse(listRes.body);
      const unreadNotif = listBody.notifications[0];
      expect(unreadNotif).toBeDefined();

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communication/notifications/${unreadNotif.id}/read`,
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(patchRes.statusCode).toBe(200);
      const patchBody = JSON.parse(patchRes.body);
      expect(patchBody.isRead).toBe(true);
      expect(patchBody.readAt).not.toBeNull();
    });

    it('should mark all unread notifications as read', async () => {
      const readAllRes = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/notifications/read-all',
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(readAllRes.statusCode).toBe(200);
      const readAllBody = JSON.parse(readAllRes.body);
      expect(readAllBody.success).toBe(true);

      // Verify unread count is now 0
      const countRes = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/notifications/unread-count',
        headers: { authorization: `Bearer ${parentToken}` },
      });
      const countBody = JSON.parse(countRes.body);
      expect(countBody.unreadCount).toBe(0);
    });
  });

  // ============================================================================
  // 4. Domain Event Dispatcher: Attendance Alerts
  // ============================================================================
  describe('Domain Event Dispatcher', () => {
    it('should trigger in-app notification and push alert on student absence', async () => {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          schoolId,
          student: {
            guardians: {
              some: {
                guardian: {
                  userId: parentUserId,
                },
              },
            },
          },
        },
      });
      expect(enrollment).not.toBeNull();

      await CommunicationService.dispatchAttendanceAlert(
        schoolId,
        enrollment!.id,
        'ABSENT',
        new Date('2026-10-08T00:00:00Z'),
      );

      // Verify that parent received the attendance alert
      const parentNotifs = await prisma.notification.findMany({
        where: {
          schoolId,
          userId: parentUserId,
          type: 'ATTENDANCE_ALERT',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(parentNotifs.length).toBeGreaterThan(0);
      expect(parentNotifs[0].title).toContain('Attendance Alert: ABSENT');
    });
  });
});
