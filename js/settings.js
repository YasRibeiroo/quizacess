const STORAGE_KEY = 'quizaccess_prefs_v1';

const defaultSettings = {
  nickname: '',
  timeMode: 'standard', // 'standard' | 'extended' | 'unlimited'
  highContrast: false,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  shortcutsEnabled: true
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultSettings, ...saved };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(partial) {
  const current = loadSettings();
  const updated = { ...current, ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Não foi possível salvar preferências no localStorage:', e);
  }
  return updated;
}

export function applyVisualPreferences(settings) {
  // Tema de alto contraste
  const btnContrast = document.getElementById('btn-contrast');
  if (settings.highContrast) {
    document.documentElement.setAttribute('data-theme', 'high-contrast');
    btnContrast?.setAttribute('aria-pressed', 'true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    btnContrast?.setAttribute('aria-pressed', 'false');
  }

  // Redução de animações
  const btnMotion = document.getElementById('btn-motion');
  if (settings.reducedMotion) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    btnMotion?.setAttribute('aria-pressed', 'true');
    if (btnMotion) btnMotion.textContent = 'Animações: Pausadas';
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
    btnMotion?.setAttribute('aria-pressed', 'false');
    if (btnMotion) btnMotion.textContent = 'Pausar Animações';
  }

  // Atalhos de teclado
  const btnShortcuts = document.getElementById('btn-shortcuts');
  if (btnShortcuts) {
    btnShortcuts.setAttribute('aria-pressed', String(settings.shortcutsEnabled));
    btnShortcuts.textContent = settings.shortcutsEnabled ? 'Atalhos: Ligados' : 'Atalhos: Desligados';
  }
}