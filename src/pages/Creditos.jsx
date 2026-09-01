import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme, DARK_GRADIENT, getSurfaceTokens } from '../ThemeContext';

const Creditos = ({ session }) => {
  const [customAmount, setCustomAmount] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // --- CONFIGURACIÓN WHATSAPP ---
  const WHATSAPP_NUMBER = "56995161488"; // <-- TU NÚMERO

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
  const paquetes = [
    { qty: 10, popular: false, col: '1 / 3', row: 1 },
    { qty: 30, popular: true, col: '3 / 5', row: 1 },
    { qty: 50, popular: false, col: '5 / 7', row: 1 },
    { qty: 80, popular: false, col: '2 / 4', row: 2, bonus: 4 },
    { qty: 100, popular: false, col: '4 / 6', row: 2, bonus: 10, special: true },
  ];

  const customValido = customAmount && parseInt(customAmount) > 0;

  const styles = {
    mainContent: { flex: 1, padding: '40px 30px 60px', background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh' },
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
    }),
    calculatorCard: { backgroundColor: s.cardBg, marginTop: '28px', padding: '40px', borderRadius: '20px', boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.05)', textAlign: 'center', border: `1px solid ${s.border}` },
    calcTitle: { fontSize: '11px', color: s.textMuted, marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' },
    inputAmount: { padding: '16px', fontSize: '20px', fontWeight: '700', textAlign: 'center', border: `1.5px solid ${s.inputBorder}`, borderRadius: '12px', width: '260px', maxWidth: '100%', marginBottom: '28px', outline: 'none', color: s.text, backgroundColor: s.inputBg },
    conversionText: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' },
    statBlock: { minWidth: '120px' },
    statLabel: { fontSize: '10px', color: s.textFaint, fontWeight: '700', letterSpacing: '0.8px', marginBottom: '4px' },
    statValue: { fontSize: '32px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' },
    arrow: { fontSize: '20px', color: '#D9241D' },
    btnPagar: (enabled) => ({
      backgroundColor: enabled ? '#D9241D' : s.headerBg,
      color: enabled ? 'white' : s.textFaint,
      border: 'none',
      padding: '16px 0',
      width: '320px',
      maxWidth: '100%',
      marginTop: '30px',
      fontWeight: '700',
      fontSize: '14px',
      letterSpacing: '0.5px',
      cursor: enabled ? 'pointer' : 'not-allowed',
      textTransform: 'uppercase',
      borderRadius: '12px',
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
          50% { box-shadow: 0 0 10px rgba(217,36,29,0.9), 0 0 24px rgba(217,36,29,0.65), 0 0 46px rgba(217,36,29,0.4); }
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
        .amount-input { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .amount-input:focus { border-color: #e11d48; box-shadow: 0 0 0 4px rgba(225,29,72,0.1); }
        .pay-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(225,29,72,0.3); }
        .stat-value { transition: transform 0.15s ease; }
        @media (max-width: 720px) {
          .credits-grid { grid-template-columns: 1fr !important; }
          .credits-grid > div { grid-column: 1 / -1 !important; grid-row: auto !important; }
        }
      `}</style>

      <div style={styles.container}>
        <Link to="/" className="back-link" style={styles.btnBack}>← Volver al dashboard</Link>

        <div style={styles.header}>
          <h1 style={styles.title}>Cargar créditos</h1>
          <p style={styles.subtitle}>Selecciona un paquete o ingresa una cantidad personalizada.</p>
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
              <div style={styles.price}>${(qty * 10000).toLocaleString('es-CL')}</div>
              <div style={styles.perUnit}>${(10000).toLocaleString('es-CL')} por crédito</div>
              <button className="buy-btn" onClick={() => handleWhatsAppBuy(qty, bonus)} style={styles.btnComprar(popular)}>
                Comprar ahora
              </button>
            </div>
          ))}
        </div>

        {/* CALCULADORA DE CRÉDITOS */}
        <div className="credit-card" style={{ ...styles.calculatorCard, animationDelay: '0.24s' }}>
          <h3 style={styles.calcTitle}>Cantidad personalizada</h3>
          <input
            className="amount-input"
            style={styles.inputAmount}
            type="number"
            min="0"
            placeholder="0"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
          />

          <div style={styles.conversionText}>
            <div style={styles.statBlock}>
              <div style={styles.statLabel}>CRÉDITOS</div>
              <div className="stat-value" style={styles.statValue}>{customAmount || 0}</div>
            </div>
            <div style={styles.arrow}>→</div>
            <div style={styles.statBlock}>
              <div style={styles.statLabel}>PESOS CLP</div>
              <div className="stat-value" style={styles.statValue}>${((parseInt(customAmount) || 0) * 10000).toLocaleString('es-CL')}</div>
            </div>
          </div>

          <button
            className="buy-btn pay-btn"
            style={styles.btnPagar(customValido)}
            disabled={!customValido}
            onClick={() => handleWhatsAppBuy(customAmount)}
          >
            Continuar con el pago
          </button>
        </div>
      </div>
    </div>
  );
};

export default Creditos;
