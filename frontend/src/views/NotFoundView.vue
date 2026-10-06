<template>
  <div class="not-found-page">
    <div class="card not-found-card">
      <span class="error-code">404</span>
      <h2>Resource Not Found</h2>
      <p>The operational module or screen requested is either under active development or does not exist.</p>
      <router-link to="/" class="btn btn-primary">
        Return to Dashboard
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.not-found-card {
  max-width: 480px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
}

.error-code {
  font-family: var(--font-mono);
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-cyan-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
