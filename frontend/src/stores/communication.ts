import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth.js';

export type AnnouncementPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';
export type AnnouncementAudience =
  | 'ALL_SCHOOL'
  | 'SPECIFIC_CLASSES'
  | 'TEACHERS_ONLY'
  | 'PARENTS_ONLY'
  | 'STAFF_ONLY';

export type NotificationType =
  | 'ANNOUNCEMENT'
  | 'ATTENDANCE_ALERT'
  | 'TIMETABLE_UPDATE'
  | 'FEE_REMINDER'
  | 'SYSTEM_ALERT';

export interface AnnouncementItem {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  targetClassIds?: string[];
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    primaryRole: string;
  };
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementAudience;
  targetClassIds?: string[];
  broadcastPush?: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useCommunicationStore = defineStore('communication', () => {
  const announcements = ref<AnnouncementItem[]>([]);
  const notifications = ref<InAppNotification[]>([]);
  const unreadCount = ref<number>(0);
  const vapidPublicKey = ref<string | null>(null);
  const isPushSupported = ref<boolean>(
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  );
  const isPushSubscribed = ref<boolean>(false);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const urgentAnnouncements = computed(() =>
    announcements.value.filter((a) => a.priority === 'URGENT' || a.priority === 'EMERGENCY'),
  );

  function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore();
    return {
      'Content-Type': 'application/json',
      ...(authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}),
    };
  }

  async function fetchVapidPublicKey() {
    try {
      const res = await fetch('/api/v1/communication/vapid-public-key');
      if (res.ok) {
        const data = await res.json();
        vapidPublicKey.value = data.publicKey;
        return data.publicKey;
      }
    } catch {
      // Ignore background failure
    }
    return null;
  }

  async function fetchAnnouncements(filters?: {
    priority?: AnnouncementPriority;
    targetAudience?: AnnouncementAudience;
    search?: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.targetAudience) params.set('targetAudience', filters.targetAudience);
      if (filters?.search) params.set('search', filters.search);

      const qs = params.toString();
      const url = qs ? `/api/v1/communication/announcements?${qs}` : '/api/v1/communication/announcements';

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch announcements');
      announcements.value = data.announcements || [];
      return data.announcements;
    } catch (err: any) {
      error.value = err.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createAnnouncement(payload: CreateAnnouncementInput) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/communication/announcements', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish announcement');
      announcements.value.unshift(data);
      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAnnouncement(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/communication/announcements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete announcement');
      announcements.value = announcements.value.filter((a) => a.id !== id);
      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchNotifications(unreadOnly = false) {
    try {
      const res = await fetch(
        `/api/v1/communication/notifications?unreadOnly=${unreadOnly ? 'true' : 'false'}&limit=20`,
        { headers: getAuthHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        notifications.value = data.notifications || [];
        unreadCount.value = data.unreadCount ?? notifications.value.filter((n) => !n.isRead).length;
      }
    } catch {
      // Soft fail in polling/background
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/v1/communication/notifications/unread-count', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        unreadCount.value = data.unreadCount || 0;
      }
    } catch {
      // Soft fail
    }
  }

  async function markNotificationAsRead(id: string) {
    try {
      const res = await fetch(`/api/v1/communication/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const notif = notifications.value.find((n) => n.id === id);
        if (notif && !notif.isRead) {
          notif.isRead = true;
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
      }
    } catch {
      // Soft fail
    }
  }

  async function markAllNotificationsAsRead() {
    try {
      const res = await fetch('/api/v1/communication/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        notifications.value.forEach((n) => {
          n.isRead = true;
        });
        unreadCount.value = 0;
      }
    } catch {
      // Soft fail
    }
  }

  async function enablePushNotifications() {
    if (!isPushSupported.value) {
      throw new Error('Web Push is not supported in this browser environment.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was denied by user.');
    }

    let key = vapidPublicKey.value;
    if (!key) {
      key = await fetchVapidPublicKey();
    }
    if (!key) {
      throw new Error('Could not retrieve VAPID public key from server.');
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(key);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });
    }

    const jsonSub = subscription.toJSON();
    const p256dh = jsonSub.keys?.p256dh;
    const authKey = jsonSub.keys?.auth;

    if (!p256dh || !authKey) {
      throw new Error('Push subscription keys missing from browser.');
    }

    const res = await fetch('/api/v1/communication/push/subscribe', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
        userAgent: navigator.userAgent,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to register push subscription on server');

    isPushSubscribed.value = true;
    return true;
  }

  async function sendTestPush() {
    const res = await fetch('/api/v1/communication/push/test', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to dispatch test push notification');
    return data;
  }

  return {
    announcements,
    notifications,
    unreadCount,
    vapidPublicKey,
    isPushSupported,
    isPushSubscribed,
    loading,
    error,
    urgentAnnouncements,
    fetchVapidPublicKey,
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    enablePushNotifications,
    sendTestPush,
  };
});
