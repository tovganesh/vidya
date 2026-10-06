<script setup lang="ts">
defineProps<{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'checking' | 'active' | 'inactive';
  label?: string;
}>();
</script>

<template>
  <span
    class="badge"
    :class="{
      'badge-emerald': status === 'healthy' || status === 'active',
      'badge-amber': status === 'checking' || status === 'degraded',
      'badge-rose': status === 'unhealthy' || status === 'inactive',
    }"
  >
    <span class="status-dot"></span>
    <span>{{ label || status }}</span>
  </span>
</template>

<style scoped>
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.badge-rose {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-rose-400);
  border: 1px solid rgba(244, 63, 94, 0.3);
}
</style>
