<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useThemeStore } from '@/stores/theme.js';

const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const email = ref('');
const password = ref('');
const totpCode = ref('');
const isUsingBackupCode = ref(false);
const localError = ref<string | null>(null);

const demoAccounts = [
  { role: 'School Admin', email: 'admin@vidyasetu.org', color: 'indigo' },
  { role: 'Principal', email: 'principal@vidyasetu.org', color: 'emerald' },
  { role: 'Teacher', email: 'teacher@vidyasetu.org', color: 'cyan' },
  { role: 'Accountant', email: 'accountant@vidyasetu.org', color: 'amber' },
  { role: 'Parent', email: 'parent@vidyasetu.org', color: 'rose' },
];

function selectDemo(demoEmail: string) {
  email.value = demoEmail;
  password.value = 'VidyaSetu@2026';
}

async function handleLogin() {
  localError.value = null;
  if (!email.value || !password.value) {
    localError.value = 'Please provide both email and password';
    return;
  }

  try {
    const res = await authStore.login(email.value, password.value);
    if (!res.requires2FA) {
      const redirectPath = (router.currentRoute.value.query.redirect as string) || '/';
      router.push(redirectPath);
    }
  } catch (err: unknown) {
    localError.value = err instanceof Error ? err.message : 'Login failed';
  }
}

async function handleVerify2FA() {
  localError.value = null;
  if (!totpCode.value) {
    localError.value = 'Please enter your verification code';
    return;
  }

  try {
    await authStore.verify2FALogin(totpCode.value, isUsingBackupCode.value);
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (err: unknown) {
    localError.value = err instanceof Error ? err.message : 'Invalid code';
  }
}
</script>

<template>
  <div class="auth-fullscreen" id="login-page">
    <!-- Clean Auth Top Bar with Theme Switcher -->
    <header class="auth-header">
      <div class="auth-header-brand">
        <div class="mini-logo">
          <svg viewBox="0 0 48 48" class="logo-icon" fill="none">
            <rect width="48" height="48" rx="12" fill="#0f172a" />
            <circle cx="24" cy="18" r="5" fill="#f59e0b" />
            <path d="M10 34C15 26 21 24 24 24C27 24 33 26 38 34" stroke="#818cf8" stroke-width="3.5" stroke-linecap="round" />
            <path d="M14 38C18 31 22 30 24 30C26 30 30 31 34 38" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
        <span class="auth-brand-name">Vidya</span>
        <span class="auth-brand-tag">Open School OS</span>
      </div>

      <div class="auth-header-actions">
        <!-- Theme Switcher Button -->
        <button
          class="auth-theme-btn"
          :title="themeStore.isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          :aria-label="themeStore.isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          id="auth-theme-toggle"
          @click="themeStore.toggleTheme"
        >
          <svg v-if="themeStore.isDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="theme-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="theme-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span class="theme-text">{{ themeStore.isDark ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Auth Viewport -->
    <main class="auth-main">
      <div class="login-card card">
        <!-- Brand Header inside card -->
        <div class="login-brand">
          <div class="logo-circle">
            <svg viewBox="0 0 48 48" class="logo-icon" fill="none">
              <rect width="48" height="48" rx="12" fill="#0f172a" />
              <circle cx="24" cy="18" r="5" fill="#f59e0b" />
              <path d="M10 34C15 26 21 24 24 24C27 24 33 26 38 34" stroke="#818cf8" stroke-width="3.5" stroke-linecap="round" />
              <path d="M14 38C18 31 22 30 24 30C26 30 30 31 34 38" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </div>
          <h2>Vidya</h2>
          <p class="tagline">The Open School Operating System</p>
          <p class="sub-tagline">Sign in to access your school's administration, academics & operations</p>
        </div>

        <!-- Error Notification -->
        <div v-if="localError || authStore.errorMessage" class="error-alert" role="alert">
          {{ localError || authStore.errorMessage }}
        </div>

        <!-- Step 1: Standard Credentials Form -->
        <form v-if="!authStore.requires2FA" @submit.prevent="handleLogin" class="auth-form" id="standard-login-form">
          <div class="form-group">
            <label for="login-email">Official Email or Phone</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="admin@vidyasetu.org"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <div class="password-label-row">
              <label for="login-password">Password</label>
              <span class="demo-hint">Demo: VidyaSetu@2026</span>
            </div>
            <input
              id="login-password"
              v-model="password"
              type="password"
              placeholder="••••••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="authStore.isLoading">
            <span v-if="authStore.isLoading">Authenticating...</span>
            <span v-else>Sign In to Vidya</span>
          </button>

          <!-- Quick Demo Switcher -->
          <div class="demo-section">
            <div class="demo-divider"><span>OR TEST WITH DEMO ROLES</span></div>
            <div class="demo-pills">
              <button
                v-for="d in demoAccounts"
                :key="d.email"
                type="button"
                class="demo-pill"
                @click="selectDemo(d.email)"
              >
                {{ d.role }}
              </button>
            </div>
          </div>
        </form>

        <!-- Step 2: 2FA TOTP Challenge Form -->
        <form v-else @submit.prevent="handleVerify2FA" class="auth-form" id="totp-challenge-form">
          <div class="challenge-banner">
            <div class="shield-icon">🛡️</div>
            <div>
              <h3>Two-Factor Authentication</h3>
              <p>Enter the 6-digit verification code from Google Authenticator or Microsoft Authenticator.</p>
            </div>
          </div>

          <div class="form-group">
            <label for="totp-input">
              {{ isUsingBackupCode ? 'Emergency 8-Digit Backup Code' : '6-Digit TOTP Code' }}
            </label>
            <input
              id="totp-input"
              v-model="totpCode"
              type="text"
              :placeholder="isUsingBackupCode ? 'ABCD-1234' : '123456'"
              maxlength="12"
              required
              autocomplete="one-time-code"
              class="code-input font-mono"
              autofocus
            />
          </div>

          <div class="backup-toggle-row">
            <button
              type="button"
              class="text-btn"
              @click="isUsingBackupCode = !isUsingBackupCode; totpCode = ''"
            >
              {{ isUsingBackupCode ? '← Use Authenticator App Code' : 'Can\'t access phone? Use Backup Code' }}
            </button>
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="authStore.isLoading">
            <span v-if="authStore.isLoading">Verifying Security Code...</span>
            <span v-else>Verify & Proceed</span>
          </button>

          <button
            type="button"
            class="btn btn-secondary btn-block mt-2"
            @click="authStore.requires2FA = false; authStore.tempToken = null"
          >
            Cancel & Back to Sign In
          </button>
        </form>
      </div>
    </main>

    <!-- Clean Footer -->
    <footer class="auth-footer">
      <p>Free schools from WhatsApp dependence. Build an open digital foundation for Indian education.</p>
      <span class="auth-footer-copy">© 2026 Vidya Open School OS • tovganesh/vidya</span>
    </footer>
  </div>
</template>

<style scoped>
.auth-fullscreen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-canvas);
  color: var(--text-primary);
  position: relative;
  overflow-x: hidden;
}

.auth-header {
  height: 64px;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-card-border);
  background: var(--color-surface);
}

.auth-header-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mini-logo {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.auth-brand-name {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.auth-brand-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-primary-500);
  background: rgba(99, 102, 241, 0.12);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
}

.auth-header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-theme-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.auth-theme-btn:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
  border-color: var(--color-primary-400);
}

.theme-icon {
  width: 16px;
  height: 16px;
}

.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 460px;
  padding: 2.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;
}

.logo-circle {
  width: 56px;
  height: 56px;
  margin-bottom: 0.85rem;
}

.logo-icon {
  width: 100%;
  height: 100%;
}

.login-brand h2 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.tagline {
  font-size: 0.88rem;
  color: var(--color-primary-500);
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.sub-tagline {
  font-size: 0.8rem;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.4;
}

.error-alert {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: var(--color-rose-500);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  font-weight: 500;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-hint {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  color: var(--color-cyan-500);
}

.form-group input {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.9rem;
  font-size: 0.92rem;
  color: var(--text-primary);
  transition: all var(--duration-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.btn-block {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}

.demo-section {
  margin-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.demo-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.demo-divider::before,
.demo-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-card-border);
}

.demo-divider span {
  padding: 0 0.5rem;
}

.demo-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.demo-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  color: var(--text-secondary);
  transition: all var(--duration-fast);
  cursor: pointer;
}

.demo-pill:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
  border-color: var(--color-primary-400);
  transform: translateY(-1px);
}

/* 2FA Challenge Box */
.challenge-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 0.85rem;
  border-radius: var(--radius-md);
}

.shield-icon {
  font-size: 1.5rem;
}

.challenge-banner h3 {
  font-size: 0.95rem;
}

.challenge-banner p {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.code-input {
  font-size: 1.35rem !important;
  text-align: center;
  letter-spacing: 0.25em;
  font-weight: 700;
}

.font-mono {
  font-family: var(--font-mono);
}

.backup-toggle-row {
  display: flex;
  justify-content: center;
}

.text-btn {
  font-size: 0.78rem;
  color: var(--color-cyan-500);
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
}

.text-btn:hover {
  text-decoration: underline;
}

.auth-footer {
  padding: 1.5rem 2rem;
  text-align: center;
  border-top: 1px solid var(--color-card-border);
  background: var(--color-surface);
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.auth-footer-copy {
  font-size: 0.72rem;
  opacity: 0.75;
}

@media (max-width: 640px) {
  .login-card {
    padding: 1.75rem 1.25rem;
  }
  .auth-header {
    padding: 0 1rem;
  }
}
</style>
