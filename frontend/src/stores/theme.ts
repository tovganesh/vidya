import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light';
export type ThemeColor = 'indigo' | 'emerald' | 'ocean' | 'amber' | 'rose' | 'slate';

export interface SchoolBranding {
  name: string;
  code: string;
  board: string;
  affiliationNumber?: string | null;
  description: string;
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  email?: string | null;
  phone?: string | null;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeMode>('dark');
  const currentColor = ref<ThemeColor>('indigo');
  const schoolBranding = ref<SchoolBranding | null>(null);

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

  function applyColor(color: ThemeColor) {
    currentColor.value = color;
    localStorage.setItem('vidya_theme_color', color);
    document.documentElement.setAttribute('data-theme-color', color);
  }

  async function fetchSchoolBranding() {
    try {
      const res = await fetch('/api/v1/schools/branding');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          schoolBranding.value = json.data;

          // Apply school's configured theme color
          if (json.data.themeColor) {
            applyColor(json.data.themeColor as ThemeColor);
          }

          // If user hasn't set an explicit theme mode preference in localStorage, apply school default
          const userSavedTheme = localStorage.getItem('vidya_theme');
          if (!userSavedTheme && json.data.themeMode) {
            applyTheme(json.data.themeMode as ThemeMode);
          }

          // Dynamically set tab title
          if (json.data.name) {
            document.title = `${json.data.name} — Vidya OS`;
          }
        }
      }
    } catch {
      // Graceful offline fallback
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('vidya_theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else {
      applyTheme('dark');
    }

    const savedColor = localStorage.getItem('vidya_theme_color') as ThemeColor | null;
    if (savedColor) {
      applyColor(savedColor);
    } else {
      applyColor('indigo');
    }

    // Attempt to fetch institutional school branding
    fetchSchoolBranding();
  }

  function toggleTheme() {
    const next = currentTheme.value === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function setTheme(theme: ThemeMode) {
    applyTheme(theme);
  }

  function setColor(color: ThemeColor) {
    applyColor(color);
  }

  return {
    currentTheme,
    currentColor,
    schoolBranding,
    isDark,
    isLight,
    initTheme,
    toggleTheme,
    setTheme,
    setColor,
    fetchSchoolBranding,
  };
});
