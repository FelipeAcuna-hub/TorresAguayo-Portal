import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens } from '../ThemeContext';
import { PumpkinIcon, SpiderIcon, CobwebCorner, DanglingSpiders, SpiderBurst } from '../components/HalloweenDecor';

const Creditos = ({ session }) => {
  const [burstingKey, setBurstingKey] = useState(null);
  const [esEspecial, setEsEspecial] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // Los clientes especiales (marcados por un admin en Administración) ven
  // bonificación en todos los paquetes, no solo en el de 80 y 100.
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('cliente_especial')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setEsEspecial(!!data?.cliente_especial));
  }, [session?.user?.id]);

  // --- CONFIGURACIÓN WHATSAPP ---
  const WHATSAPP_NUMBER = "56995161488"; // <-- TU NÚMERO

  // Dispara el efecto de arañas saliendo del botón al comprar (edición Halloween)
  const triggerBurst = (key) => {
    setBurstingKey(key);
    setTimeout(() => setBurstingKey(prev => (prev === key ? null : prev)), 1900);
  };

  const handleWhatsAppBuy = (qty, bonus = 0) => {
    const numQty = parseInt(qty);
    if (isNaN(numQty) || numQty <= 0) return;

    const amount = (numQty * 10000).toLocaleString('es-CL');
    const total = (numQty + bonus).toLocaleString('es-CL');
    const regaloTexto = bonus > 0 ? ` (incluye ${bonus} créditos de regalo, ${total} créditos en total)` : '';
    const message = encodeURIComponent(
      `Hola! 👋 Soy ${session?.user?.email}, me gustaría comprar ${numQty} créditos por $${amount} CLP para mi cuenta${regaloTexto}.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  // "col" ubica cada tarjeta en una grilla de 6 columnas: las 3 de arriba ocupan
  // 2 columnas cada una, y las 2 de abajo quedan centradas justo en el espacio
  // entre las de arriba (efecto "al tresbolillo"). "bonus" es el regalo de
  // créditos extra que se suma al comprar ese paquete.
  // Los clientes especiales ven bonificación en TODOS los paquetes, no solo
  // en el de 80 y 100 (ver sección "Clientes Especiales" en Administración).
  const paquetes = esEspecial ? [
    { qty: 10, popular: false, col: '1 / 3', row: 1, bonus: 2 },
    { qty: 30, popular: true, col: '3 / 5', row: 1, bonus: 7 },
    { qty: 50, popular: false, col: '5 / 7', row: 1, bonus: 12 },
    { qty: 80, popular: false, col: '2 / 4', row: 2, bonus: 20 },
    { qty: 100, popular: false, col: '4 / 6', row: 2, bonus: 30, special: true },
  ] : [
    { qty: 10, popular: false, col: '1 / 3', row: 1 },
    { qty: 30, popular: true, col: '3 / 5', row: 1 },
    { qty: 50, popular: false, col: '5 / 7', row: 1 },
    { qty: 80, popular: false, col: '2 / 4', row: 2, bonus: 4 },
    { qty: 100, popular: false, col: '4 / 6', row: 2, bonus: 10, special: true },
  ];

  const styles = {
    mainContent: { flex: 1, padding: '40px 30px 60px', background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh', position: 'relative' },
    container: { maxWidth: '900px', margin: '0 auto' },
    btnBack: { color: isDark ? '#e0b0a4' : '#888', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '28px', fontWeight: '600', transition: 'color 0.2s ease' },
    header: { marginBottom: '36px' },
    title: { fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: isDark ? '#fff' : '#111' },
    subtitle: { color: isDark ? '#e0b0a4' : '#888', fontSize: '14px', marginTop: '6px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '18px 12px' },
    card: (popular) => ({
      backgroundColor: s.cardBg,
      padding: '30px 16px',
      textAlign: 'center',
      borderRadius: '18px',
      border: popular ? '1.5px solid #e11d48' : `1px solid ${s.border}`,
      boxShadow: popular ? '0 12px 28px -8px rgba(225,29,72,0.25)' : (isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)'),
      position: 'relative',
      transform: popular ? 'scale(1.03)' : 'scale(1)',
    }),
    badge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#D9241D', color: 'white', fontSize: '9px', fontWeight: '800', padding: '5px 14px', borderRadius: '20px', letterSpacing: '0.5px', boxShadow: '0 4px 10px rgba(217,36,29,0.35)' },
    coinIcon: { fontSize: '26px', marginBottom: '14px', display: 'inline-block', color: s.text },
    qtyLabel: { fontWeight: '700', fontSize: '13px', color: s.textMuted, letterSpacing: '0.5px', marginBottom: '10px' },
    bonusBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.35)', fontSize: '10px', fontWeight: '800', padding: '3px 9px', borderRadius: '999px', marginBottom: '12px' },
    price: { fontSize: '22px', fontWeight: '800', color: s.text, marginBottom: '4px', letterSpacing: '-0.5px', wordBreak: 'break-word' },
    perUnit: { fontSize: '11px', color: s.textFaint, marginBottom: '22px' },
    btnComprar: (popular) => ({
      backgroundColor: popular ? '#D9241D' : '#111',
      color: 'white',
      border: 'none',
      padding: '13px 0',
      width: '100%',
      fontWeight: '700',
      cursor: 'pointer',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.5px',
      borderRadius: '10px',
      position: 'relative',
    }),
  };

  return (
    <div style={styles.mainContent}>
      <style>{`
        @keyframes creditFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .credit-card { animation: creditFadeUp 0.35s ease both; transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
        .credit-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 16px 30px -10px rgba(0,0,0,0.15); border-color: #e11d48; }
        .credit-card.popular:hover { transform: translateY(-6px) scale(1.05); }
        @keyframes specialGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(217,36,29,0.6), 0 0 16px rgba(217,36,29,0.4), 0 0 30px rgba(217,36,29,0.22); }
          50% { box-shadow: 0 0 10px rgba(249,115,22,0.9), 0 0 24px rgba(249,115,22,0.6), 0 0 46px rgba(217,36,29,0.35); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-250%) rotate(20deg); }
          100% { transform: translateX(450%) rotate(20deg); }
        }
        .credit-card.special {
          border: 1.5px solid #D9241D !important;
          position: relative;
          animation: creditFadeUp 0.35s ease both, specialGlow 2.4s ease-in-out infinite;
        }
        .special-shine-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
          pointer-events: none;
        }
        .special-shine-wrap::before {
          content: '';
          position: absolute;
          top: -60%;
          left: 0;
          width: 26%;
          height: 220%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmerSweep 3.2s ease-in-out infinite;
        }
        .buy-btn { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
        .buy-btn:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 6px 14px rgba(0,0,0,0.2); }
        .back-link:hover { color: #e11d48; }
        @media (max-width: 720px) {
          .credits-grid { grid-template-columns: 1fr !important; }
          .credits-grid > div { grid-column: 1 / -1 !important; grid-row: auto !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <CobwebCorner color={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'} style={{ position: 'absolute', top: 0, left: 0 }} />
        <CobwebCorner color={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'} style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)' }} />
        <DanglingSpiders />
      </div>

      <div style={{ ...styles.container, position: 'relative', zIndex: 1 }}>
        <Link to="/" className="back-link" style={styles.btnBack}>← Volver al dashboard</Link>

        <div style={styles.header}>
          <h1 style={{ ...styles.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PumpkinIcon size={24} />
            Cargar créditos
            {esEspecial && (
              <span style={{ fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', letterSpacing: '0.4px' }}>
                ⭐ CLIENTE ESPECIAL
              </span>
            )}
          </h1>
          <p style={{ ...styles.subtitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {esEspecial
              ? 'Tenés bonificación en todos los paquetes de créditos — edición especial de Halloween'
              : 'Selecciona un paquete de créditos — edición especial de Halloween'}
            <SpiderIcon size={14} style={{ color: isDark ? '#e0b0a4' : '#888' }} />
          </p>
        </div>

        {/* PAQUETES PREDEFINIDOS */}
        <div className="credits-grid" style={styles.grid}>
          {paquetes.map(({ qty, popular, col, row, bonus, special }, i) => (
            <div
              key={qty}
              className={`credit-card${popular ? ' popular' : ''}${special ? ' special' : ''}`}
              style={{ ...styles.card(popular), gridColumn: col, gridRow: row, animationDelay: `${i * 0.08}s` }}
            >
              {popular && <span style={styles.badge}>MÁS POPULAR</span>}
              {special && <span style={styles.badge}>MEJOR BENEFICIO</span>}
              {special && <div className="special-shine-wrap" />}
              <PumpkinIcon size={24} style={{ position: 'absolute', top: '-9px', right: '-7px', transform: 'rotate(12deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }} />
              <div style={styles.coinIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-credit-card-fill" viewBox="0 0 16 16">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1" />
                </svg>
              </div>
              <div style={styles.qtyLabel}>{qty} CRÉDITOS</div>
              {bonus > 0 && <div style={styles.bonusBadge}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-gift-fill" viewBox="0 0 16 16" style={{ marginRight: '5px', flexShrink: 0 }}>
                  <path d="M3 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0v.006c0 .07 0 .27-.038.494H15a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.038A3 3 0 0 1 3 2.506zm1.068.5H7v-.5a1.5 1.5 0 1 0-3 0c0 .085.002.274.045.43zM9 3h2.932l.023-.07c.043-.156.045-.345.045-.43a1.5 1.5 0 0 0-3 0zm6 4v7.5a1.5 1.5 0 0 1-1.5 1.5H9V7zM2.5 16A1.5 1.5 0 0 1 1 14.5V7h6v9z" />
                </svg>
                + {bonus} créditos de bonificación</div>}
              <div style={styles.price}>${(qty * 10000).toLocaleString('es-CL')} <span style={{ fontSize: '11px', fontWeight: '700', color: s.textFaint }}>+ IVA</span></div>
              <div style={styles.perUnit}>${(10000).toLocaleString('es-CL')} por crédito</div>
              <button className="buy-btn" onClick={() => handleWhatsAppBuy(qty, bonus)} onMouseEnter={() => triggerBurst(qty)} style={styles.btnComprar(popular)}>
                <SpiderBurst active={burstingKey === qty} />
                Comprar ahora
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Creditos;
