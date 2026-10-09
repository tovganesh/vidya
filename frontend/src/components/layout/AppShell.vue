<script setup lang="ts">
import TopNav from './TopNav.vue';
import Sidebar from './Sidebar.vue';
</script>

<template>
  <div class="app-layout" id="vidya-root-app">
    <TopNav />
    <div class="app-body">
      <Sidebar />
      <main class="main-content" id="main-content-viewport">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-canvas);
}

.app-body {
  display: flex;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
}
</style>
