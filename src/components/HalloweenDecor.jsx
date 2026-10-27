import React from 'react';

// --- DECORACIÓN DE HALLOWEEN COMPARTIDA (íconos propios, sin depender de emojis) ---
// Se usa en varias páginas (Dashboard, Créditos) para la edición especial de temporada.
export const PumpkinIcon = ({ size = 22, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d="M11.3 1c.5 0 .9.9 1 2.4" stroke="#4b7a2f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <ellipse cx="12" cy="14" rx="9.5" ry="8.5" fill="#f97316" />
    <path d="M7 6 Q12 2.5 17 6" stroke="#c2410c" strokeWidth="1" fill="none" opacity="0.6" />
    <line x1="8.3" y1="6.2" x2="8.3" y2="21.8" stroke="#c2410c" strokeWidth="0.8" opacity="0.35" />
    <line x1="12" y1="5.6" x2="12" y2="22.4" stroke="#c2410c" strokeWidth="0.8" opacity="0.35" />
    <line x1="15.7" y1="6.2" x2="15.7" y2="21.8" stroke="#c2410c" strokeWidth="0.8" opacity="0.35" />
    <polygon points="8,11.5 10.3,15 5.7,15" fill="#2a0a05" />
    <polygon points="16,11.5 18.3,15 13.7,15" fill="#2a0a05" />
    <path d="M6.5 17.5 L8 20 L9.5 17.5 L11 20 L12 17.5 L13 20 L14.5 17.5 L16 20 L17.5 17.5" stroke="#2a0a05" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SkeletonIcon = ({ size = 26, style, color = '#f1ece3' }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 24 32" fill="none" style={style}>
    {/* cráneo */}
    <circle cx="13" cy="4" r="3.4" fill={color} />
    <circle cx="11.7" cy="3.6" r="0.6" fill="#000" />
    <circle cx="14.3" cy="3.6" r="0.6" fill="#000" />
    {/* columna */}
    <line x1="13" y1="7.4" x2="12" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    {/* costillas */}
    <line x1="10.5" y1="9.5" x2="14.5" y2="9.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    <line x1="10" y1="11.5" x2="14" y2="11.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    <line x1="9.7" y1="13.5" x2="13.7" y2="13.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    {/* brazo adelante, doblado */}
    <path d="M12.5 9 L8 11 L9.5 15" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* brazo atrás, doblado */}
    <path d="M12.5 9 L17 10 L18.5 6.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* pierna adelante, en zancada */}
    <path d="M12 15 L17 18 L16 23" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* pierna atrás, estirada */}
    <path d="M12 15 L6 17 L3 15.5" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpiderIcon = ({ size = 18, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <ellipse cx="12" cy="14.5" rx="4" ry="5" />
    <circle cx="12" cy="7.5" r="2.6" />
    <g stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round">
      <path d="M8.5 10 L2 7" />
      <path d="M8 13 L1.5 12" />
      <path d="M8.3 16.5 L2 18" />
      <path d="M9 19 L4.5 22" />
      <path d="M15.5 10 L22 7" />
      <path d="M16 13 L22.5 12" />
      <path d="M15.7 16.5 L22 18" />
      <path d="M15 19 L19.5 22" />
    </g>
  </svg>
);

export const CobwebCorner = ({ style, color }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" stroke={color} strokeWidth="0.8" style={style}>
    <line x1="0" y1="0" x2="90" y2="0" />
    <line x1="0" y1="0" x2="0" y2="90" />
    <line x1="0" y1="0" x2="90" y2="90" />
    <line x1="0" y1="0" x2="55" y2="14" />
    <line x1="0" y1="0" x2="14" y2="55" />
    <path d="M10,0 Q10,10 0,10" />
    <path d="M26,0 Q26,26 0,26" />
    <path d="M45,0 Q45,45 0,45" />
    <path d="M65,0 Q65,65 0,65" />
    <path d="M90,22 Q45,22 22,90" />
  </svg>
);

// Arañas que salen disparadas desde el centro de un botón (position:relative)
// y se dispersan hacia afuera. Se dispara pasando active=true por un ratito
// (ver triggerBurst en Creditos.jsx) y se desmonta solo al no estar activa.
// Los botones suelen ser anchos pero bajitos, así que para que las arañas se
// vean claramente afuera conviene que recorran más distancia vertical
// (arriba/abajo) que horizontal: así cruzan el borde del botón más rápido.
const SPIDER_BURST_DIRS = [
  { dx: -70, dy: 42, rot: -20 },
  { dx: -46, dy: -56, rot: -10 },
  { dx: 0, dy: -72, rot: 2 },
  { dx: 50, dy: -54, rot: 12 },
  { dx: 74, dy: 40, rot: 22 },
];

export const SpiderBurst = ({ active, count = 5 }) => {
  if (!active) return null;
  return (
    <>
      {SPIDER_BURST_DIRS.slice(0, count).map((d, i) => (
        <span
          key={i}
          className="spider-burst"
          style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--rot': `${d.rot}deg`, animationDelay: `${i * 0.1}s` }}
        >
          <SpiderIcon size={12} style={{ color: 'rgba(255,255,255,0.95)' }} />
        </span>
      ))}
    </>
  );
};

// Grupo de arañas colgando de su hilo, listas para soltar dentro de
// cualquier contenedor con position:relative + overflow:hidden.
// El gris medio del hilo y del cuerpo se distingue tanto en modo oscuro
// como en modo claro, así no hace falta variarlo según el tema.
export const DanglingSpiders = ({ spiders = [
  { left: '10%', length: 60, opacity: 0.6, duration: '3s', delay: '0s' },
  { left: '50%', length: 95, opacity: 0.5, duration: '3.6s', delay: '-1.1s' },
  { left: '90%', length: 45, opacity: 0.55, duration: '2.6s', delay: '-0.5s' },
] }) => (
  <>
    {spiders.map((sp, i) => (
      <div key={i} className="halloween-spider" style={{ left: sp.left, animationDuration: sp.duration, animationDelay: sp.delay }}>
        <div style={{ width: '1px', height: `${sp.length}px`, margin: '0 auto', background: `rgba(120,120,120,${sp.opacity * 0.7})` }} />
        <SpiderIcon size={16} style={{ display: 'block', margin: '-2px auto 0', color: `rgba(90,90,90,${sp.opacity})` }} />
      </div>
    ))}
  </>
);
