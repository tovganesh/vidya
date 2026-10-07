import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import HealthView from '../views/HealthView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import LoginView from '../views/auth/LoginView.vue';
import SecuritySettingsView from '../views/profile/SecuritySettingsView.vue';
import { useAuthStore } from '../stores/auth.js';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard — VidyaSetu' },
  },
  {
    path: '/health',
    name: 'health',
    component: HealthView,
    meta: { title: 'System Health — VidyaSetu' },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'Sign In — VidyaSetu', guestOnly: true },
  },
  {
    path: '/security',
    name: 'security',
    component: SecuritySettingsView,
    meta: { title: 'Security & 2FA — VidyaSetu', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { title: '404 Not Found — VidyaSetu' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to, _from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }

  const authStore = useAuthStore();

  // If user has token but profile is not loaded yet, fetch it
  if (authStore.accessToken && !authStore.user) {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  next();
});
