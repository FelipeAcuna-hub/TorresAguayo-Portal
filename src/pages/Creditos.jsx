import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Creditos = ({ session }) => {
  const [customAmount, setCustomAmount] = useState('');

  // --- CONFIGURACIÓN WHATSAPP ---
  const WHATSAPP_NUMBER = "56995161488"; // <-- TU NÚMERO

  const handleWhatsAppBuy = (qty) => {
    const numQty = parseInt(qty);
    if (isNaN(numQty) || numQty <= 0) return;
    
    const amount = (numQty * 10000).toLocaleString('es-CL');
    const message = encodeURIComponent(
      `Hola! 👋 Soy ${session?.user?.email}, me gustaría comprar ${numQty} créditos por $${amount} CLP para mi cuenta.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const styles = {
    mainContent: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    card: { backgroundColor: 'white', padding: '40px 20px', textAlign: 'center', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #eee' },
    price: { fontSize: '32px', fontWeight: 'bold', color: '#e11d48', marginBottom: '25px' },
    btnComprar: { backgroundColor: '#000', color: 'white', border: 'none', padding: '12px 0', width: '100%', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' },
    calculatorCard: { backgroundColor: 'white', marginTop: '40px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #e11d48' },
    inputAmount: { padding: '15px', fontSize: '18px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px', width: '250px', marginBottom: '20px', outline: 'none' },
    conversionText: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '40px', fontWeight: 'bold', color: '#333' }
  };

  return (
    <div style={styles.mainContent}>
      <Link to="/" style={styles.btnBack}>← VOLVER AL DASHBOARD</Link>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>CARGAR CRÉDITOS</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>Selecciona un paquete o ingresa una cantidad personalizada.</p>
      </div>

      {/* PAQUETES PREDEFINIDOS */}
      <div style={styles.grid}>
        {[10, 30, 50].map(qty => (
          <div key={qty} style={styles.card}>
            <div style={{ fontWeight: 'bold', marginBottom: '15px' }}>{qty} CRÉDITOS</div>
            <div style={styles.price}>${(qty * 10000).toLocaleString('es-CL')}</div>
            <button onClick={() => handleWhatsAppBuy(qty)} style={styles.btnComprar}>COMPRAR AHORA</button>
          </div>
        ))}
      </div>

      {/* CALCULADORA DE CRÉDITOS */}
      <div style={styles.calculatorCard}>
        <h3 style={{ fontSize: '12px', color: '#888', marginBottom: '20px', textTransform: 'uppercase' }}>Cantidad personalizada</h3>
        <input
          style={styles.inputAmount}
          type="number"
          placeholder="Ingresa créditos..."
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
        
        <div style={styles.conversionText}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>CRÉDITOS</div>
            {customAmount || 0}
          </div>
          <div style={{ color: '#e11d48' }}>=</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>PESOS CLP</div>
            ${( (parseInt(customAmount) || 0) * 10000).toLocaleString('es-CL')}
          </div>
        </div>

        <button 
          style={{ ...styles.btnComprar, width: '300px', marginTop: '30px', backgroundColor: '#e11d48', height: '50px', fontSize: '16px' }} 
          disabled={!customAmount || customAmount <= 0}
          onClick={() => handleWhatsAppBuy(customAmount)}
        >
          CONTINUAR CON EL PAGO
        </button>
      </div>
    </div>
  );
};

export default Creditos;