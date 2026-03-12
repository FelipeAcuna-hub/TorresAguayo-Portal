import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Creditos = () => {
  const [customAmount, setCustomAmount] = useState('');

  const styles = {
    mainContent: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 'bold' },
    titleSection: { marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    card: { backgroundColor: 'white', padding: '40px 20px', textAlign: 'center', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #eee' },
    packageTitle: { fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '15px' },
    price: { fontSize: '32px', fontWeight: 'bold', color: '#e11d48', marginBottom: '25px' },
    btnComprar: { backgroundColor: '#000', color: 'white', border: 'none', padding: '12px 0', width: '100%', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' },

    // ESTILOS DEL CALCULADOR (NUEVO)
    calculatorCard: {
      backgroundColor: 'white',
      marginTop: '40px',
      padding: '40px',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      textAlign: 'center',
      borderTop: '4px solid #e11d48'
    },
    inputAmount: {
      padding: '15px',
      fontSize: '18px',
      textAlign: 'center',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '250px',
      marginBottom: '20px',
      outline: 'none'
    },
    conversionText: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      fontSize: '40px',
      fontWeight: 'bold',
      color: '#333'
    }
  };

  return (
    <div style={styles.mainContent}>
      <Link to="/" style={styles.btnBack}><span>←</span> VOLVER AL DASHBOARD</Link>

      <div style={styles.titleSection}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>CARGAR CRÉDITOS</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>Selecciona un paquete o ingresa una cantidad personalizada.</p>
      </div>

      {/* PAQUETES FIJOS */}
      <div style={styles.grid}>
        {[100, 300, 500].map(qty => (
          <div key={qty} style={styles.card}>
            <div style={styles.packageTitle}>{qty} CRÉDITOS</div>
            <div style={styles.price}>${(qty * 1000).toLocaleString('es-CL')}</div>
            <button style={styles.btnComprar}>COMPRAR AHORA</button>
          </div>
        ))}
      </div>

      {/* --- CALCULADOR PERSONALIZADO (LO QUE PEDISTE) --- */}
      <div style={styles.calculatorCard}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Cantidad personalizada
        </h3>

        <input
          style={styles.inputAmount}
          type="number"
          min="1" // Esto evita las flechitas hacia abajo del navegador
          placeholder="Ingresa créditos..."
          value={customAmount}
          onChange={(e) => {
            const val = e.target.value;
            // Lógica: Si el valor es negativo o menor a 0, lo dejamos vacío o en 0
            if (val < 0) {
              setCustomAmount(0);
            } else {
              setCustomAmount(val);
            }
          }}
          // Esto evita que el usuario escriba el símbolo "-" manualmente
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'e') {
              e.preventDefault();
            }
          }}
        />

        <div style={styles.conversionText}>
          <div>
            <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Créditos</div>
            {customAmount || 0}
          </div>
          <div style={{ color: '#e11d48' }}>=</div>
          <div>
            <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Pesos CLP</div>
            ${(customAmount * 1000).toLocaleString('es-CL')}
          </div>
        </div>

        <button
          style={{ ...styles.btnComprar, width: '300px', marginTop: '30px', backgroundColor: '#e11d48', height: '50px', fontSize: '16px' }}
          disabled={!customAmount || customAmount <= 0}
        >
          CONTINUAR CON EL PAGO
        </button>
      </div>

      <p style={{ marginTop: '30px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        * 1 Crédito = $1.000 CLP (IVA Incluido)
      </p>
    </div>
  );
};

export default Creditos;