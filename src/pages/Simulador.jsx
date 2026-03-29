import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Simulador = () => {
  const navigate = useNavigate();
  const [categoriaSel, setCategoriaSel] = useState(null);
  const [servicioSel, setServicioSel] = useState(null);

  // DATA EXTRAÍDA DIRECTAMENTE DEL PDF [cite: 6, 10, 13]
  // Conversión: $1.000 = 1 Crédito
  const SERVICIOS_CONFIG = {
    'REPROS BENCINA': [
      { id: 'b_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 140 }, // $140.000 [cite: 13]
      { id: 'b_s1pb', name: 'STAGE 1 + POPS AND BANGS', price: 180 }, // $180.000 [cite: 13]
      { id: 'b_s2', name: 'STAGE 2 (REQUIERE MODS FÍSICAS)', price: 160 }, // $160.000 [cite: 13]
      { id: 'b_pb', name: 'POPS AND BANGS (SOLO)', price: 60 } // $60.000 [cite: 13]
    ],
    'REPROS DIÉSEL': [
      { id: 'd_s1', name: 'STAGE 1 (POTENCIA SOLA)', price: 140 }, 
      { id: 'd_s1egr', name: 'STAGE 1 + EGR OFF', price: 150 }, 
      { id: 'd_s1dpf', name: 'STAGE 1 + DPF OFF', price: 160 }, 
      { id: 'd_s1full', name: 'STAGE 1 + DPF & EGR OFF', price: 180 },
      { id: 'd_s2', name: 'STAGE 2 (POTENCIA + MODS)', price: 160 }
    ],
    'ANULACIONES EURO': [
      { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 60 }, // $60.000 [cite: 6]
      { id: 'adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 80 }, // $80.000 [cite: 6]
      { id: 'egr_only', name: 'EGR OFF', price: 40 }, // $40.000 [cite: 6]
      { id: 'adblue_only', name: 'ADBLUE OFF', price: 60 }, // $60.000 [cite: 6]
      { id: 'flaps', name: 'FLAPS/FLATS OFF', price: 60 } // $60.000 [cite: 6]
    ],
    'DESACTIVACIONES': [
      { id: 'dtc', name: 'DTC OFF', price: 30 }, // $30.000 [cite: 10]
      { id: 'lambda', name: 'LAMBDA OFF', price: 60 }, // $60.000 [cite: 10]
      { id: 'decat', name: 'DECAT OFF', price: 60 }, // $60.000 [cite: 10]
      { id: 'tva', name: 'TVA OFF', price: 60 }, // $60.000 [cite: 10]
      { id: 'immo', name: 'IMMO OFF', price: 60 }, // $60.000 [cite: 10]
      { id: 'vmax', name: 'VMAX OFF (LIMITADORES)', price: 80 }, // $80.000 [cite: 13]
      { id: 'immo_toyota', name: 'IMMO OFF SPECIAL (TOYOTA/LEXUS)', price: 80 } // $80.000 [cite: 13]
    ]
  };

  const totalPrice = servicioSel ? servicioSel.price : 0;

  const styles = {
    mainContent: { padding: '40px', flex: 1, backgroundColor: '#f3f4f6', minHeight: '100vh' },
    title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' },
    columnTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    card: { backgroundColor: 'white', padding: '15px 20px', borderRadius: '4px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.3s' },
    cardSelected: { borderColor: '#e11d48', backgroundColor: '#fff5f6', borderLeft: '5px solid #e11d48' },
    priceBadge: { backgroundColor: '#e11d48', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' },
    totalBox: { backgroundColor: 'black', color: 'white', padding: '30px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' },
    btnCargar: { backgroundColor: '#b91c1c', color: 'white', padding: '15px 40px', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', alignSelf: 'flex-end', marginTop: '40px' },
    infoBox: { backgroundColor: '#fef9c3', padding: '20px', borderRadius: '4px', border: '1px solid #fde047', color: '#854d0e', fontSize: '13px', lineHeight: '1.5' }
  };

  return (
    <div style={styles.mainContent}>
      <div style={styles.title}>🔳 Simula el precio de tu archivo</div>

      <div style={styles.grid}>
        {/* 1. SELECT 1 */}
        <div>
          <h3 style={styles.columnTitle}>1. TIPO SERVICIO</h3>
          <div style={{ backgroundColor: '#d1eaf0', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '13px', color: '#1e5a69' }}>
            Selecciona el tipo de servicio que requieres.
          </div>
          {Object.keys(SERVICIOS_CONFIG).map(cat => (
            <div 
              key={cat} 
              style={{ ...styles.card, ...(categoriaSel === cat ? styles.cardSelected : {}) }}
              onClick={() => {
                setCategoriaSel(cat);
                setServicioSel(null); 
              }}
            >
              <span style={{ fontWeight: 'bold' }}>› {cat}</span>
            </div>
          ))}
        </div>

        {/* 2. SELECT 2 */}
        <div>
          <h3 style={styles.columnTitle}>2. DETALLE</h3>
          {categoriaSel ? (
            SERVICIOS_CONFIG[categoriaSel].map(s => (
              <div 
                key={s.id} 
                style={{ ...styles.card, ...(servicioSel?.id === s.id ? styles.cardSelected : {}) }}
                onClick={() => setServicioSel(s)}
              >
                <span style={{ fontWeight: 'bold', fontSize: '12px', maxWidth: '75%' }}>{s.name}</span>
                <span style={styles.priceBadge}>+{s.price}</span>
              </div>
            ))
          ) : (
            <div style={{ color: '#999', textAlign: 'center', marginTop: '50px', fontStyle: 'italic' }}>
              Selecciona una categoría a la izquierda...
            </div>
          )}
        </div>

        {/* 3. CREDITS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={styles.columnTitle}>3. CREDITS</h3>
          <div style={styles.infoBox}>
            Total de créditos que se descontarán de tu cuenta al cargar tu archivo. (1 crédito = $1.000 CLP).
          </div>
          
          <div style={styles.totalBox}>
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>Créditos</span>
            <span style={{ fontSize: '48px', fontWeight: 'bold', backgroundColor: '#b91c1c', padding: '0 20px', borderRadius: '8px' }}>
              {totalPrice}
            </span>
          </div>

          <button 
            style={{ ...styles.btnCargar, opacity: servicioSel ? 1 : 0.5 }} 
            onClick={() => servicioSel && navigate('/upload', { state: { servicio: servicioSel } })}
            disabled={!servicioSel}
          >
            CARGAR MI ARCHIVO
          </button>
        </div>
      </div>
    </div>
  );
};

export default Simulador;