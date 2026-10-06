<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const authStore = useAuthStore();

const isSettingUp2FA = ref(false);
const setupData = ref<{
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
} | null>(null);

const testCode = ref('');
const disableCode = ref('');
const isDisabling = ref(false);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchMe();
  }
});

async function start2FASetup() {
  actionError.value = null;
  actionMessage.value = null;
  try {
    const data = await authStore.setup2FA();
    setupData.value = data;
    isSettingUp2FA.value = true;
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Failed to start 2FA setup';
  }
}

async function confirm2FAEnable() {
  actionError.value = null;
  actionMessage.value = null;
  if (!setupData.value || !testCode.value) {
    actionError.value = 'Please enter the 6-digit verification code from your authenticator app';
    return;
  }

  try {
    await authStore.enable2FA(setupData.value.secret, testCode.value, setupData.value.backupCodes);
    actionMessage.value = 'Two-factor authentication is now active on your account!';
    isSettingUp2FA.value = false;
    setupData.value = null;
    testCode.value = '';
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Invalid code';
  }
}

async function handleDisable2FA() {
  actionError.value = null;
  actionMessage.value = null;
  if (!disableCode.value) {
    actionError.value = 'Please enter your current 6-digit code to confirm disabling 2FA';
    return;
  }

  try {
    await authStore.disable2FA(disableCode.value);
    actionMessage.value = 'Two-factor authentication has been disabled.';
    isDisabling.value = false;
    disableCode.value = '';
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Invalid code';
  }
}
</script>

<template>
  <div class="security-page" id="security-settings-view">
    <div class="page-header">
      <div>
        <h1>Security & Access Control</h1>
        <p>Manage credentials, authentication factors, and role-based permissions</p>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="actionMessage" class="alert alert-success">{{ actionMessage }}</div>
    <div v-if="actionError" class="alert alert-error">{{ actionError }}</div>

    <div class="settings-grid">
      <!-- User Profile Card -->
      <section class="card profile-card">
        <h3>User Profile & Scoping</h3>
        <div class="profile-row mt-3">
          <div class="avatar-lg">
            {{ authStore.user?.firstName?.charAt(0) || 'U' }}{{ authStore.user?.lastName?.charAt(0) || '' }}
          </div>
          <div class="profile-details">
            <h4>{{ authStore.userFullName }}</h4>
            <span class="user-email">{{ authStore.user?.email }}</span>
            <div class="badges-row">
              <span class="badge badge-indigo">{{ authStore.userRole }}</span>
              <span class="badge badge-emerald" v-if="authStore.user?.school">
                {{ authStore.user.school.name }} ({{ authStore.user.school.code }})
              </span>
            </div>
          </div>
        </div>

        <div class="permissions-section mt-4">
          <span class="perm-title">Assigned Operational Permissions:</span>
          <div class="perms-list">
            <span v-for="p in authStore.user?.permissions" :key="p" class="perm-tag">
              {{ p }}
            </span>
            <span v-if="!authStore.user?.permissions?.length" class="text-muted">
              Standard base role access
            </span>
          </div>
        </div>
      </section>

      <!-- Two-Factor Authentication Card -->
      <section class="card security-card">
        <div class="section-title-row">
          <div>
            <h3>Two-Factor Authentication (TOTP)</h3>
            <p>Enhance school account protection with Google Authenticator or Microsoft Authenticator.</p>
          </div>
          <StatusBadge
            :status="authStore.user?.isTotpEnabled ? 'healthy' : 'inactive'"
            :label="authStore.user?.isTotpEnabled ? '2FA ACTIVE' : 'DISABLED'"
          />
        </div>

        <!-- 2FA Active State -->
        <div v-if="authStore.user?.isTotpEnabled && !isDisabling" class="status-box mt-3">
          <div class="icon-text">
            <span class="icon">🔒</span>
            <div>
              <strong>Your account is secured with 2FA</strong>
              <p>Every login attempt requires a dynamic one-time passcode from your authenticator device.</p>
            </div>
          </div>
          <button class="btn btn-secondary mt-3" @click="isDisabling = true">
            Disable 2FA
          </button>
        </div>

        <!-- 2FA Disable Prompt -->
        <div v-else-if="authStore.user?.isTotpEnabled && isDisabling" class="disable-box mt-3">
          <h4>Confirm Disabling 2FA</h4>
          <p>Enter a 6-digit code from your authenticator app to confirm:</p>
          <div class="input-row mt-2">
            <input
              v-model="disableCode"
              type="text"
              placeholder="123456"
              maxlength="6"
              class="font-mono text-center"
            />
            <button class="btn btn-secondary" @click="handleDisable2FA">Confirm Disable</button>
            <button class="btn btn-secondary" @click="isDisabling = false">Cancel</button>
          </div>
        </div>

        <!-- 2FA Setup Flow -->
        <div v-else-if="!authStore.user?.isTotpEnabled && isSettingUp2FA && setupData" class="setup-flow mt-3">
          <div class="setup-steps">
            <div class="step-card">
              <span class="step-num">Step 1</span>
              <h4>Scan QR Code in Authenticator</h4>
              <p>Open Google Authenticator, Microsoft Authenticator, or 1Password and scan this QR code:</p>
              <div class="qr-box">
                <img :src="setupData.qrCodeDataUrl" alt="TOTP QR Code" class="qr-img" />
              </div>
              <div class="manual-code">
                <span>Or enter key manually:</span>
                <code>{{ setupData.secret }}</code>
              </div>
            </div>

            <div class="step-card">
              <span class="step-num">Step 2</span>
              <h4>Save Emergency Backup Codes</h4>
              <p>Keep these 8 one-time emergency codes in a safe place in case you lose access to your phone:</p>
              <div class="backup-grid">
                <code v-for="c in setupData.backupCodes" :key="c" class="backup-pill">{{ c }}</code>
              </div>
            </div>

            <div class="step-card">
              <span class="step-num">Step 3</span>
              <h4>Enter Test Verification Code</h4>
              <p>Enter the current 6-digit passcode generated by your app:</p>
              <div class="input-row mt-2">
                <input
                  v-model="testCode"
                  type="text"
                  placeholder="123456"
                  maxlength="6"
                  class="font-mono text-center"
                />
                <button class="btn btn-primary" @click="confirm2FAEnable">Enable & Activate 2FA</button>
                <button class="btn btn-secondary" @click="isSettingUp2FA = false">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2FA Inactive Call to Action -->
        <div v-else class="cta-box mt-3">
          <p>
            Administrative and faculty accounts are strongly recommended to enable Two-Factor Authentication
            to prevent unauthorized access to student records and fee accounts.
          </p>
          <button class="btn btn-primary mt-3" @click="start2FASetup">
            Set Up Two-Factor Authentication
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.security-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
}

.alert-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: var(--color-emerald-400);
}

.alert-error {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: var(--color-rose-400);
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.avatar-lg {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-cyan-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-email {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.badges-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.permissions-section {
  border-top: 1px solid var(--color-card-border);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.perm-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.perms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.perm-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  color: #a5b4fc;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.status-box, .cta-box {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
}

.icon-text {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.icon-text .icon {
  font-size: 1.75rem;
}

.setup-steps {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.step-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-num {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--color-primary-400);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.qr-box {
  margin: 0.75rem 0;
  width: 180px;
  height: 180px;
  background: white;
  padding: 8px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-img {
  width: 100%;
  height: 100%;
}

.manual-code {
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.manual-code code {
  font-family: var(--font-mono);
  color: var(--color-cyan-400);
  background: var(--color-surface-raised);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.backup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.backup-pill {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: center;
  padding: 0.4rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-sm);
  color: var(--color-amber-400);
}

.input-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.input-row input {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.85rem;
  font-size: 1.1rem;
  color: var(--text-primary);
  width: 160px;
}

.text-center {
  text-align: center;
}
</style>
