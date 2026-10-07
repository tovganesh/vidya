import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import HealthView from '../views/HealthView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import LoginView from '../views/auth/LoginView.vue';
import SecuritySettingsView from '../views/profile/SecuritySettingsView.vue';
import SchoolProfileView from '../views/admin/SchoolProfileView.vue';
import AcademicYearsView from '../views/admin/AcademicYearsView.vue';
import ClassesSectionsView from '../views/admin/ClassesSectionsView.vue';
import SubjectsView from '../views/admin/SubjectsView.vue';
import AcademicOnboardingView from '../views/admin/AcademicOnboardingView.vue';
import PeopleDirectoryView from '../views/people/PeopleDirectoryView.vue';
import StudentProfileView from '../views/people/StudentProfileView.vue';
import BatchPromotionView from '../views/people/BatchPromotionView.vue';
import RollCallView from '../views/attendance/RollCallView.vue';
import AttendanceRegisterView from '../views/attendance/AttendanceRegisterView.vue';
import TimetableGridView from '../views/timetable/TimetableGridView.vue';
import { useAuthStore } from '../stores/auth.js';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard — Vidya' },
  },
  {
    path: '/health',
    name: 'health',
    component: HealthView,
    meta: { title: 'System Health — Vidya' },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'Sign In — Vidya', guestOnly: true },
  },
  {
    path: '/security',
    name: 'security',
    component: SecuritySettingsView,
    meta: { title: 'Security & 2FA — Vidya', requiresAuth: true },
  },
  {
    path: '/admin/school',
    name: 'school-profile',
    component: SchoolProfileView,
    meta: { title: 'School Profile & Campuses — Vidya', requiresAuth: true },
  },
  {
    path: '/admin/academic-years',
    name: 'academic-years',
    component: AcademicYearsView,
    meta: { title: 'Academic Years & Sessions — Vidya', requiresAuth: true },
  },
  {
    path: '/admin/classes',
    alias: '/classes',
    name: 'classes-sections',
    component: ClassesSectionsView,
    meta: { title: 'Classes & Sections — Vidya', requiresAuth: true },
  },
  {
    path: '/admin/subjects',
    name: 'subjects',
    component: SubjectsView,
    meta: { title: 'Curriculum Subjects — Vidya', requiresAuth: true },
  },
  {
    path: '/admin/onboarding',
    name: 'academic-onboarding',
    component: AcademicOnboardingView,
    meta: { title: 'Academic Setup Wizard — Vidya', requiresAuth: true },
  },
  {
    path: '/people',
    alias: ['/students', '/guardians', '/teachers'],
    name: 'people-directory',
    component: PeopleDirectoryView,
    meta: { title: 'People & Registry — Vidya', requiresAuth: true },
  },
  {
    path: '/people/students/:id',
    alias: ['/students/:id'],
    name: 'student-profile',
    component: StudentProfileView,
    meta: { title: 'Student 360 Profile — Vidya', requiresAuth: true },
  },
  {
    path: '/people/promote',
    alias: ['/students/promote', '/promote'],
    name: 'batch-promotion',
    component: BatchPromotionView,
    meta: { title: 'Batch Student Promotion — Vidya', requiresAuth: true },
  },
  {
    path: '/attendance',
    name: 'attendance-rollcall',
    component: RollCallView,
    meta: { title: 'Daily Attendance Roll Call — Vidya', requiresAuth: true },
  },
  {
    path: '/attendance/register',
    name: 'attendance-register',
    component: AttendanceRegisterView,
    meta: { title: 'Monthly Attendance Register — Vidya', requiresAuth: true },
  },
  {
    path: '/timetable',
    name: 'timetable-grid',
    component: TimetableGridView,
    meta: { title: 'Class Timetable & Allocations — Vidya', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { title: '404 Not Found — Vidya' },
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
