import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light';

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeMode>('dark');

  const isDark = computed(() => currentTheme.value === 'dark');
  const isLight = computed(() => currentTheme.value === 'light');

  function applyTheme(theme: ThemeMode) {
    currentTheme.value = theme;
    localStorage.setItem('vidya_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('vidya_theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }

    // Default to dark theme for Vidya OS signature look
    applyTheme('dark');
  }

  function toggleTheme() {
    const next = currentTheme.value === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function setTheme(theme: ThemeMode) {
    applyTheme(theme);
  }

  return {
    currentTheme,
    isDark,
    isLight,
    initTheme,
    toggleTheme,
    setTheme,
  };
});
