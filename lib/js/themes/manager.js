// lib/js/themes/manager.js
// SNQR Reader – Theme Manager (ES module)

const THEME_STORAGE_KEY = 'snqr_reader_theme';

const AVAILABLE_THEMES = [
  'default',
  'dark',
  'light',
  'purple',
  'green',
  'red',
  'orange',
  'pink',
  'cyan',
  'indigo',
  'yellow',
  'gray',
  'emerald',
  'teal',
  'violet',
  'rose',
  'amber',
  'lime',
  'sky',
  'fuchsia',
  'slate',
  'zinc',
  'neutral',
  'stone',
  'dracula',
  'nord',
  'gruvbox',
  'solarized',
  'monokai',
  'tomorrow',
  'github',
  'material',
  'vscode',
  'atom',
  'xcode',
  'sublime',
  'jetbrains',
  'notepad',
  'terminal',
  'matrix',
  'cyberpunk',
  'ocean',
  'forest'
];

class ThemeManager {
  constructor () {
    this.currentTheme = 'default';
    this.initialised = false;
  }

  init () {
    if (this.initialised) return;

    // 1. Load saved theme (if any)
    const savedTheme = this._getSavedTheme();
    const appliedTheme = AVAILABLE_THEMES.includes(savedTheme)
      ? savedTheme
      : 'default';

    this.applyTheme(appliedTheme);
    this._wireSelect(appliedTheme);

    this.initialised = true;
  }

  _getSavedTheme () {
    try {
      const v = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (typeof v === 'string' && v.trim() !== '') {
        return v.trim();
      }
    } catch (e) {
      // ignore
    }
    return 'default';
  }

  _saveTheme (theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // ignore
    }
  }

  _wireSelect (appliedTheme) {
    const select = document.getElementById('themeSelect');
    if (!select) return;

    // Ensure the select reflects the applied theme
    select.value = appliedTheme;

    select.addEventListener('change', (event) => {
      const theme = event.target.value || 'default';
      this.applyTheme(theme);
      this._saveTheme(theme);
    });
  }

  applyTheme (themeName) {
    if (!AVAILABLE_THEMES.includes(themeName)) {
      themeName = 'default';
    }

    const body = document.body;
    if (!body) return;

    // Remove old theme-* classes
    for (const t of AVAILABLE_THEMES) {
      body.classList.remove(`theme-${t}`);
    }

    // Add new
    body.classList.add(`theme-${themeName}`);
    body.setAttribute('data-theme', themeName);

    this.currentTheme = themeName;
  }

  getCurrentTheme () {
    return this.currentTheme || 'default';
  }
}

// Initialise once DOM is ready
const themeManager = new ThemeManager();

window.addEventListener('DOMContentLoaded', () => {
  themeManager.init();
});

// Expose to global so load.js can query current theme
window.themeManager = themeManager;
