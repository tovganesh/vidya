import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from '../src/stores/theme.js';

describe('Global Theme Store & Lite Theme Switcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.className = '';
  });

  it('initializes with default dark theme when no storage preference exists', () => {
    const store = useThemeStore();
    store.initTheme();

    expect(store.currentTheme).toBe('dark');
    expect(store.isDark).toBe(true);
    expect(store.isLight).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores light theme from localStorage if previously configured', () => {
    localStorage.setItem('vidya_theme', 'light');

    const store = useThemeStore();
    store.initTheme();

    expect(store.currentTheme).toBe('light');
    expect(store.isDark).toBe(false);
    expect(store.isLight).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('toggles seamlessly between dark and light themes and updates storage', () => {
    const store = useThemeStore();
    store.initTheme(); // dark

    store.toggleTheme(); // switch to light
    expect(store.currentTheme).toBe('light');
    expect(localStorage.getItem('vidya_theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    store.toggleTheme(); // switch back to dark
    expect(store.currentTheme).toBe('dark');
    expect(localStorage.getItem('vidya_theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('allows setting specific theme mode directly', () => {
    const store = useThemeStore();
    store.setTheme('light');

    expect(store.currentTheme).toBe('light');
    expect(store.isLight).toBe(true);
    expect(localStorage.getItem('vidya_theme')).toBe('light');
  });
});
