import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  soundEnabled: true,
  toggleSound: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ta_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('ta_sound') !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ta_theme', theme);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('ta_sound', soundEnabled ? 'on' : 'off');
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, [soundEnabled]);

  // --- SONIDITO GENÉRICO DE CLIC, PARA CUALQUIER BOTÓN DEL SITIO ---
  useEffect(() => {
    const onClick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      // Los botones que ya tienen su propio sonidito (ej. descargas) se saltan
      // para no sonar dos veces.
      if (btn.classList.contains('dl-btn')) return;
      playUiClick();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const toggleSound = () => setSoundEnabled(v => !v);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, soundEnabled, toggleSound }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// --- DEGRADADO OSCURO COMPARTIDO (usado en todas las páginas del portal) ---
export const DARK_GRADIENT = 'linear-gradient(160deg, #6E1300 0%, #1a0500 55%, #000000 100%)';

// --- TOKENS DE SUPERFICIE (tarjetas, tablas, inputs) PARA CADA TEMA ---
export const getSurfaceTokens = (isDark) => (isDark ? {
  cardBg: '#110a08',
  border: 'rgba(255,255,255,0.10)',
  text: '#f5ece9',
  textMuted: '#c9a99e',
  textFaint: '#8a7570',
  headerBg: 'rgba(255,255,255,0.04)',
  rowBorder: 'rgba(255,255,255,0.08)',
  rowHover: 'rgba(0,0,0,0.45)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.18)',
} : {
  cardBg: '#ffffff',
  border: '#eeeeee',
  text: '#222222',
  textMuted: '#888888',
  textFaint: '#999999',
  headerBg: '#fafafa',
  rowBorder: '#f0f0f0',
  rowHover: '#fafafa',
  inputBg: '#ffffff',
  inputBorder: '#dddddd',
});

// --- UTILIDAD DE SONIDO COMPARTIDA (Web Audio API, sin archivos externos) ---
// Vive fuera de React para que la pueda usar tanto el listener global de
// clics como cualquier componente, y siempre respeta la preferencia guardada.
let sharedAudioCtx = null;

export const isSoundEnabled = () => {
  try {
    return localStorage.getItem('ta_sound') !== 'off';
  } catch {
    return true;
  }
};

export const playTone = (freq, duration = 0.05, volume = 0.06, delay = 0) => {
  if (!isSoundEnabled()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AC();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    const ctx = sharedAudioCtx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    // Ignorar si el navegador bloquea audio
  }
};

export const playUiClick = () => playTone(740, 0.045, 0.05);
