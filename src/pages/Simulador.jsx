import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, DARK_GRADIENT, getSurfaceTokens, playTone } from '../ThemeContext';

const Simulador = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // --- SONIDITOS MINIMALISTAS AL PASAR EL CURSOR Y AL SELECCIONAR (respeta el silencio) ---
  const playHoverTick = () => playTone(900, 0.05, 0.06);
  const playSelectSound = () => {
    playTone(750, 0.05, 0.08, 0);
    playTone(1150, 0.07, 0.08, 0.05);
  };

  // 1. ESTADOS PARA FILTRADO DINÁMICO
  const [categoriaSel, setCategoriaSel] = useState(null);
  const [servicioSel, setServicioSel] = useState(null);

  // 2. CONFIGURACIÓN COMPLETA (Categorías separadas para que sea dinámico)
  const SERVICIOS_CONFIG = {
    'REPRO GASOLINA': [
      { id: 'b_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 14 },
      { id: 'b_s1pb', name: 'STAGE 1 + POPS AND BANGS', price: 18 },
      { id: 'b_s2', name: 'STAGE 2 (REQUIERE MODS)', price: 16 },
      { id: 'b_s2pb', name: 'STAGE 2 + POPS AND BANGS', price: 22 },
      { id: 'b_pb', name: 'POPS AND BANGS (SOLO)', price: 6 }
    ],
    'REPRO DIÉSEL': [
      { id: 'd_s1', name: 'STAGE 1', price: 14 },
      { id: 'd_s1egr', name: 'STAGE 1 + EGR OFF', price: 15 },
      { id: 'd_s1dpf', name: 'STAGE 1 + DPF OFF + EGR OFF', price: 16 },
      { id: 'd_s1full', name: 'STAGE 1 + DPF + EGR OFF + ADBLUE OFF', price: 19 },
      { id: 'd_s2', name: 'STAGE 2 (POTENCIA + MODS)', price: 16 }
    ],
    'ANULACIONES EURO': [
      { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 6 },
      { id: 'adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 8 },
      { id: 'egr_only', name: 'EGR OFF', price: 4 },
      { id: 'adblue_only', name: 'ADBLUE OFF', price: 6 },
      { id: 'restauracion_orig', name: 'RESTAURACIÓN ORIG', price: 6 }
    ],
    'ANULACIONES EURO (CAMIONES)': [
    { id: 'truck_dpf_egr', name: 'DPF OFF + EGR OFF', price: 12 },
    { id: 'truck_adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 16 },
    { id: 'truck_dpf_egr_adblue', name: 'ADBLUE + DPF & EGR OFF + DCU OFF', price: 22 },
    { id: 'truck_egr_only', name: 'EGR OFF', price: 8 },
    { id: 'truck_adbue_only', name: 'SCR ONLY OFF', price: 20 },
    { id: 'truck_dpf_only', name: 'DPF OFF', price: 12 },
    { id: 'truck_cummins_emissions', name: 'CUMMINS EMISSIONS', price: 35 }
  ],
   'DESACTIVACIONES': [
    { id: 'dtc', name: 'DTC OFF', price: 3 },
    { id: 'lambda', name: 'LAMBDA OFF', price: 6 },
    { id: 'immo', name: 'IMMO OFF', price: 6 },
    { id: 'vmax', name: 'VMAX OFF (LIMITADOR DE VELOCIDAD)', price: 8 },
    { id: 'immo_toyota', name: 'IMMO OFF SPECIAL (TOYOTA)', price: 8 },
    { id: 'decat_off', name: 'DECAT OFF', price: 6 },
    { id: 'tva_off', name: 'TVA OFF', price: 6 },
    { id: 'flaps_swirls', name: 'FLAPS/SWIRLS', price: 6 },
    { id: 'encriptacion', name: 'ENC', price: 4},
    { id: 'halfengine', name: 'HALF ENGINE MODE OFF', price: 12}
  ],
    'SPECIAL ECU MD1 MG1 SID212-212EVO SID213-213EVO' : [
    { id: 'adblue',  name: 'ADBLUE + DPF + EGR OFF', price: 16 },
    { id: 'gpf', name: 'GPF OFF', price: 15 },
    { id: 'dpfoff_egr', name: 'DPF + EGR OFF', price: 15 },
    { id: 'stage1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 22 },
    { id: 'unlock_service', name: 'UNLOCK SERVICE + (ADBLUE OFF) + (DPF OFF)+ (EGR OFF) ', price: 25 }
    ]
  };

  const totalPrice = servicioSel ? servicioSel.price : 0;

  const styles = {
    mainContent: { padding: '40px', flex: 1, background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh' },
    container: { maxWidth: '1100px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.4px', color: isDark ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: '10px' },
    subtitle: { color: isDark ? '#e0b0a4' : '#888', fontSize: '14px', marginTop: '6px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' },
    colHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' },
    stepBadge: (active) => ({
      width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: '800', color: active ? 'white' : s.textFaint,
      backgroundColor: active ? '#D9241D' : s.headerBg, flexShrink: 0
    }),
    columnTitle: { fontSize: '13px', fontWeight: '800', color: isDark ? '#fff' : '#111', textTransform: 'uppercase', letterSpacing: '0.4px' },
    card: (selected) => ({
      backgroundColor: selected ? (isDark ? 'rgba(225,29,72,0.12)' : '#fff5f6') : s.cardBg,
      padding: '15px 18px',
      borderRadius: '14px',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      border: selected ? '1.5px solid #e11d48' : `1px solid ${s.border}`,
      boxShadow: selected ? '0 6px 16px -6px rgba(225,29,72,0.25)' : (isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.03)'),
    }),
    priceBadge: { backgroundColor: '#D9241D', color: 'white', padding: '4px 11px', borderRadius: '999px', fontWeight: '800', fontSize: '12px', flexShrink: 0, marginLeft: '10px' },
    infoBox: { backgroundColor: '#f0f4ff', padding: '16px 18px', borderRadius: '14px', marginBottom: '20px', fontSize: '12px', color: '#3b4b8a', lineHeight: '1.5', border: '1px solid #e2e8fc' },
    infoBoxWarn: { backgroundColor: '#fffaeb', padding: '16px 18px', borderRadius: '14px', border: '1px solid #fde68a', color: '#92650b', fontSize: '12px', lineHeight: '1.5' },
    emptyState: { color: isDark ? '#e0b0a4' : '#bbb', textAlign: 'center', marginTop: '40px', fontSize: '13px', fontStyle: 'italic' },
    totalBox: { backgroundColor: '#111', color: 'white', padding: '28px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' },
    totalLabel: { fontSize: '13px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' },
    totalValue: { fontSize: '38px', fontWeight: '800', backgroundColor: '#D9241D', padding: '6px 22px', borderRadius: '14px', letterSpacing: '-0.5px' },
    btnCargar: { backgroundColor: '#D9241D', color: 'white', padding: '16px 0', width: '100%', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.3px', cursor: 'pointer', marginTop: '24px' },
  };

  return (
    <div style={styles.mainContent}>
      <style>{`
        @keyframes simFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .sim-col { animation: simFadeUp 0.35s ease both; }
        .sim-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .sim-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -8px rgba(0,0,0,0.12); }
        .sim-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
        .sim-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(225,29,72,0.35); }
        .total-value { transition: transform 0.2s ease; }
        @media (max-width: 900px) {
          .sim-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔲 Simula el precio de tu archivo</h1>
          <p style={styles.subtitle}>Elige el servicio que necesitas y descubre cuántos créditos vas a usar.</p>
        </div>

        <div className="sim-grid" style={styles.grid}>
          {/* 1. SELECCIÓN DE CATEGORÍA */}
          <div className="sim-col" style={{ animationDelay: '0s' }}>
            <div style={styles.colHeader}>
              <span style={styles.stepBadge(true)}>1</span>
              <span style={styles.columnTitle}>Tipo servicio</span>
            </div>
            <div style={styles.infoBox}>
              Selecciona la categoría principal.
            </div>
            {Object.keys(SERVICIOS_CONFIG).map(cat => (
              <div
                className="sim-card"
                key={cat}
                style={styles.card(categoriaSel === cat)}
                onMouseEnter={playHoverTick}
                onClick={() => {
                  playSelectSound();
                  setCategoriaSel(cat);
                  setServicioSel(null);
                }}
              >
                <span style={{ fontWeight: '700', fontSize: '12.5px', color: s.text }}>› {cat}</span>
              </div>
            ))}
          </div>

          {/* 2. OPCIONES ESPECÍFICAS */}
          <div className="sim-col" style={{ animationDelay: '0.08s' }}>
            <div style={styles.colHeader}>
              <span style={styles.stepBadge(!!categoriaSel)}>2</span>
              <span style={styles.columnTitle}>Opciones</span>
            </div>
            {categoriaSel ? (
              SERVICIOS_CONFIG[categoriaSel].map(svc => (
                <div
                  className="sim-card"
                  key={svc.id}
                  style={styles.card(servicioSel?.id === svc.id)}
                  onMouseEnter={playHoverTick}
                  onClick={() => { playSelectSound(); setServicioSel(svc); }}
                >
                  <span style={{ fontWeight: '700', fontSize: '12px', color: s.text }}>{svc.name}</span>
                  <span style={styles.priceBadge}>+{svc.price}</span>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                Selecciona una categoría a la izquierda para ver las opciones...
              </div>
            )}
          </div>

          {/* 3. TOTAL Y REDIRECCIÓN */}
          <div className="sim-col" style={{ display: 'flex', flexDirection: 'column', animationDelay: '0.16s' }}>
            <div style={styles.colHeader}>
              <span style={styles.stepBadge(!!servicioSel)}>3</span>
              <span style={styles.columnTitle}>Total</span>
            </div>
            <div style={styles.infoBoxWarn}>
              Total de créditos que se descontarán de tu cuenta. (1 crédito = $10.000 CLP)
            </div>

            <div style={styles.totalBox}>
              <span style={styles.totalLabel}>Créditos</span>
              <span className="total-value" style={styles.totalValue}>
                {totalPrice}
              </span>
            </div>

            <button
              className="sim-btn"
              style={{ ...styles.btnCargar, opacity: servicioSel ? 1 : 0.4, cursor: servicioSel ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                if (servicioSel) {
                  // REDIRECCIÓN CON ESTADO: Enviamos el nombre y el precio
                  navigate('/upload', {
                    state: {
                      servicio: servicioSel
                    }
                  });
                }
              }}
              disabled={!servicioSel}
            >
              Cargar mi archivo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulador;
