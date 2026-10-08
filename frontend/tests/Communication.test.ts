import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCommunicationStore, AnnouncementItem, InAppNotification } from '../src/stores/communication.js';

describe('Frontend CommunicationStore & Web Push (Milestone 7)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with default empty state', () => {
    const store = useCommunicationStore();
    expect(store.announcements).toEqual([]);
    expect(store.notifications).toEqual([]);
    expect(store.unreadCount).toBe(0);
    expect(store.vapidPublicKey).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetches VAPID public key from backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-KV9-5ItNpZXWvLM' }),
    });

    const store = useCommunicationStore();
    const key = await store.fetchVapidPublicKey();

    expect(key).toBe('BEl62iUYgUivxIkv69yViEuiBIa-KV9-5ItNpZXWvLM');
    expect(store.vapidPublicKey).toBe('BEl62iUYgUivxIkv69yViEuiBIa-KV9-5ItNpZXWvLM');
  });

  it('fetches announcements and computes urgent filtered list', async () => {
    const mockAnnouncements: AnnouncementItem[] = [
      {
        id: 'ann-1',
        schoolId: 'sch-1',
        title: 'Monsoon Alert',
        content: 'Heavy rains expected.',
        priority: 'URGENT',
        targetAudience: 'ALL_SCHOOL',
        authorId: 'usr-1',
        isPublished: true,
        publishedAt: '2026-10-08T08:00:00Z',
        expiresAt: null,
        createdAt: '2026-10-08T08:00:00Z',
      },
      {
        id: 'ann-2',
        schoolId: 'sch-1',
        title: 'Sports Day',
        content: 'Registration open.',
        priority: 'NORMAL',
        targetAudience: 'ALL_SCHOOL',
        authorId: 'usr-1',
        isPublished: true,
        publishedAt: '2026-10-08T09:00:00Z',
        expiresAt: null,
        createdAt: '2026-10-08T09:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ announcements: mockAnnouncements, total: 2 }),
    });

    const store = useCommunicationStore();
    const data = await store.fetchAnnouncements();

    expect(data.length).toBe(2);
    expect(store.announcements.length).toBe(2);
    expect(store.urgentAnnouncements.length).toBe(1);
    expect(store.urgentAnnouncements[0].title).toBe('Monsoon Alert');
  });

  it('publishes a new announcement and prepends to feed', async () => {
    const createdItem: AnnouncementItem = {
      id: 'ann-3',
      schoolId: 'sch-1',
      title: 'Emergency Circular',
      content: 'Early dismissal at 1 PM.',
      priority: 'EMERGENCY',
      targetAudience: 'ALL_SCHOOL',
      authorId: 'usr-admin',
      isPublished: true,
      publishedAt: '2026-10-08T10:00:00Z',
      expiresAt: null,
      createdAt: '2026-10-08T10:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createdItem,
    });

    const store = useCommunicationStore();
    const result = await store.createAnnouncement({
      title: 'Emergency Circular',
      content: 'Early dismissal at 1 PM.',
      priority: 'EMERGENCY',
      targetAudience: 'ALL_SCHOOL',
      broadcastPush: true,
    });

    expect(result.id).toBe('ann-3');
    expect(store.announcements[0].id).toBe('ann-3');
  });

  it('deletes an announcement', async () => {
    const store = useCommunicationStore();
    store.announcements = [
      {
        id: 'ann-del',
        schoolId: 'sch-1',
        title: 'Delete Me',
        content: 'Temporary',
        priority: 'NORMAL',
        targetAudience: 'ALL_SCHOOL',
        authorId: 'usr-1',
        isPublished: true,
        publishedAt: '2026-10-08T08:00:00Z',
        expiresAt: null,
        createdAt: '2026-10-08T08:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await store.deleteAnnouncement('ann-del');
    expect(store.announcements.length).toBe(0);
  });

  it('fetches notifications and updates unread badge count', async () => {
    const mockNotifs: InAppNotification[] = [
      {
        id: 'notif-1',
        schoolId: 'sch-1',
        userId: 'u-1',
        title: 'Attendance Alert: ABSENT',
        body: 'Aarav was marked absent.',
        type: 'ATTENDANCE_ALERT',
        data: { link: '/attendance' },
        isRead: false,
        readAt: null,
        createdAt: '2026-10-08T09:00:00Z',
      },
      {
        id: 'notif-2',
        schoolId: 'sch-1',
        userId: 'u-1',
        title: 'Sports Day',
        body: 'Circular uploaded.',
        type: 'ANNOUNCEMENT',
        data: {},
        isRead: true,
        readAt: '2026-10-08T09:30:00Z',
        createdAt: '2026-10-08T08:30:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: mockNotifs, total: 2, unreadCount: 1 }),
    });

    const store = useCommunicationStore();
    await store.fetchNotifications();

    expect(store.notifications.length).toBe(2);
    expect(store.unreadCount).toBe(1);
  });

  it('marks a single notification as read and decrements unread count', async () => {
    const store = useCommunicationStore();
    store.notifications = [
      {
        id: 'notif-1',
        schoolId: 'sch-1',
        userId: 'u-1',
        title: 'Notice',
        body: 'Body',
        type: 'ANNOUNCEMENT',
        data: {},
        isRead: false,
        readAt: null,
        createdAt: '2026-10-08T09:00:00Z',
      },
    ];
    store.unreadCount = 1;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'notif-1', isRead: true }),
    });

    await store.markNotificationAsRead('notif-1');

    expect(store.notifications[0].isRead).toBe(true);
    expect(store.unreadCount).toBe(0);
  });

  it('marks all notifications as read and resets unread count to 0', async () => {
    const store = useCommunicationStore();
    store.notifications = [
      {
        id: 'notif-1',
        schoolId: 'sch-1',
        userId: 'u-1',
        title: 'Notice 1',
        body: 'Body',
        type: 'ANNOUNCEMENT',
        data: {},
        isRead: false,
        readAt: null,
        createdAt: '2026-10-08T09:00:00Z',
      },
      {
        id: 'notif-2',
        schoolId: 'sch-1',
        userId: 'u-1',
        title: 'Notice 2',
        body: 'Body',
        type: 'ANNOUNCEMENT',
        data: {},
        isRead: false,
        readAt: null,
        createdAt: '2026-10-08T09:00:00Z',
      },
    ];
    store.unreadCount = 2;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, updatedCount: 2 }),
    });

    await store.markAllNotificationsAsRead();

    expect(store.notifications.every((n) => n.isRead)).toBe(true);
    expect(store.unreadCount).toBe(0);
  });
});
