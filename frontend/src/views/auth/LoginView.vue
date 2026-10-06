<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

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
      router.push('/');
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
    router.push('/');
  } catch (err: unknown) {
    localError.value = err instanceof Error ? err.message : 'Invalid code';
  }
}
</script>

<template>
  <div class="login-container" id="login-page">
    <div class="login-card card">
      <!-- Brand Header -->
      <div class="login-brand">
        <div class="logo-circle">
          <svg viewBox="0 0 48 48" class="logo-icon" fill="none">
            <rect width="48" height="48" rx="12" fill="#0f172a" />
            <circle cx="24" cy="18" r="5" fill="#f59e0b" />
            <path d="M10 34C15 26 21 24 24 24C27 24 33 26 38 34" stroke="#818cf8" stroke-width="3.5" stroke-linecap="round" />
            <path d="M14 38C18 31 22 30 24 30C26 30 30 31 34 38" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
        <h2>VidyaSetu</h2>
        <p class="tagline">The Open School Operating System</p>
      </div>

      <!-- Error Notification -->
      <div v-if="localError || authStore.errorMessage" class="error-alert">
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
          <span v-else>Sign In to VidyaSetu</span>
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
  </div>
</template>

<style scoped>
.login-container {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 2.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.75rem;
}

.logo-circle {
  width: 48px;
  height: 48px;
  margin-bottom: 0.75rem;
}

.logo-icon {
  width: 100%;
  height: 100%;
}

.login-brand h2 {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.error-alert {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: var(--color-rose-400);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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
  color: var(--color-cyan-400);
}

.form-group input {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.85rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: border-color var(--duration-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.btn-block {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}

.demo-section {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
}

.demo-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  color: var(--text-secondary);
  transition: all var(--duration-fast);
}

.demo-pill:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
  border-color: var(--color-primary-400);
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
  color: var(--color-cyan-400);
  font-weight: 600;
}

.text-btn:hover {
  text-decoration: underline;
}
</style>
