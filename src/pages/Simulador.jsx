import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Simulador = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Lógica de precios (Manteniendo tus valores)
  const services = [
    { id: 'stage1', name: 'STAGE 1', price: 15 },
    { id: 'stage2', name: 'STAGE 2', price: 19 },
    { id: 'desactivacion', name: 'DESACTIVACIÓN', price: 5 },
  ];

  const addons = [
    { id: 'dpf', name: 'DPF/ OPF OFF', price: 4 },
    { id: 'egr', name: 'EGR OFF', price: 4 },
    { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 7 },
    { id: 'adblue', name: 'ADBLUE', price: 7 },
    { id: 'adblue_dpf', name: 'ADBLUE + DPF OFF', price: 9 },
    { id: 'coldstart', name: 'COLD START DELETE', price: 12 },
    { id: 'startstop', name: 'START/STOP SYSTEM OFF', price: 12 },
  ];

  const totalPrice = (selectedService?.price || 0) + selectedAddons.reduce((acc, curr) => acc + curr.price, 0);

  const toggleAddon = (addon) => {
    if (selectedAddons.find(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const styles = {
    mainContent: { padding: '40px', flex: 1, backgroundColor: '#f3f4f6' },
    title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' },
    columnTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    card: { backgroundColor: 'white', padding: '15px 20px', borderRadius: '4px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.3s' },
    cardSelected: { borderColor: '#e11d48', backgroundColor: '#fff5f6' },
    priceBadge: { backgroundColor: '#c2410c', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' },
    totalBox: { backgroundColor: 'black', color: 'white', padding: '30px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' },
    btnCargar: { backgroundColor: '#b91c1c', color: 'white', padding: '15px 40px', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', alignSelf: 'flex-end', marginTop: '40px' },
    infoBox: { backgroundColor: '#fef9c3', padding: '20px', borderRadius: '4px', border: '1px solid #fde047', color: '#854d0e', fontSize: '13px', lineHeight: '1.5' }
  };

  return (
    <div style={styles.mainContent}>
      <div style={styles.title}>🔲 Simula el precio de tu archivo</div>

      <div style={styles.grid}>
        {/* 1. SELECT 1 */}
        <div>
          <h3 style={styles.columnTitle}>1. SELECT 1</h3>
          <div style={{ backgroundColor: '#d1eaf0', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '13px', color: '#1e5a69' }}>
            Selecciona el tipo de servicio que requieres de nosotros
          </div>
          {services.map(s => (
            <div 
              key={s.id} 
              style={{ ...styles.card, ...(selectedService?.id === s.id ? styles.cardSelected : {}) }}
              onClick={() => setSelectedService(s)}
            >
              <span style={{ fontWeight: 'bold' }}>› {s.name}</span>
              <span style={styles.priceBadge}>+{s.price}</span>
            </div>
          ))}
        </div>

        {/* 2. SELECT 2 */}
        <div>
          <h3 style={styles.columnTitle}>2. SELECT 2</h3>
          {addons.map(a => (
            <div 
              key={a.id} 
              style={{ ...styles.card, ...(selectedAddons.find(item => item.id === a.id) ? styles.cardSelected : {}) }}
              onClick={() => toggleAddon(a)}
            >
              <span style={{ fontWeight: 'bold' }}>{a.name}</span>
              <span style={styles.priceBadge}>+{a.price}</span>
            </div>
          ))}
        </div>

        {/* 3. CREDITS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={styles.columnTitle}>3. CREDITS</h3>
          <div style={styles.infoBox}>
            A continuación se muestra el total de créditos que se descontarán de tu cuenta al cargar tu archivo con las opciones seleccionadas.
          </div>
          
          <div style={styles.totalBox}>
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>Créditos</span>
            <span style={{ fontSize: '48px', fontWeight: 'bold', backgroundColor: '#b91c1c', padding: '0 20px', borderRadius: '8px' }}>
              {totalPrice}
            </span>
          </div>

          <button style={styles.btnCargar} onClick={() => navigate('/upload')}>
            CARGAR MI ARCHIVO
          </button>
        </div>
      </div>
    </div>
  );
};

export default Simulador;