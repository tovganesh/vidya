import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import HealthView from '../views/HealthView.vue';
import NotFoundView from '../views/NotFoundView.vue';

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

router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
  next();
});
