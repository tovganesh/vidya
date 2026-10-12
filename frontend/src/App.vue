<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import AppShell from './components/layout/AppShell.vue';
import PwaBanner from './components/common/PwaBanner.vue';

const route = useRoute();
const authStore = useAuthStore();

const isAuthPage = computed(() => {
  return route.meta.layout === 'auth' || !authStore.isAuthenticated;
});
</script>

<template>
  <div v-if="isAuthPage" class="auth-viewport" id="vidya-auth-shell">
    <PwaBanner />
    <router-view />
  </div>
  <AppShell v-else />
</template>

<style scoped>
.auth-viewport {
  min-height: 100vh;
  width: 100%;
  background-color: var(--color-canvas);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}
</style>
