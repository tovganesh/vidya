import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';
import './styles/main.css';

import { useThemeStore } from './stores/theme.js';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize persisted theme mode (light/dark)
const themeStore = useThemeStore();
themeStore.initTheme();

app.mount('#app');
