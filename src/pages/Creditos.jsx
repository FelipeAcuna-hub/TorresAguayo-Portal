import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Creditos = ({ session }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FUNCIÓN REFORMULADA: USA CALLBACK PARA EVITAR RE-RENDERIZADOS INFINITOS ---
  const fetchMovimientos = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setLoading(true);
      console.log("Solicitando historial para el usuario:", userId);

      const { data, error } = await supabase
        .from('historial_movimientos')
        .select('*')
        .eq('perfil_id', userId)
        .order('fecha', { ascending: false });

      if (error) throw error;

      console.log("Movimientos encontrados en la DB:", data);
      setMovimientos(data || []);
    } catch (err) {
      console.error("Error crítico al cargar historial:", err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Efecto principal: Se dispara cuando la sesión está lista
  useEffect(() => {
    if (session?.user?.id) {
      fetchMovimientos();
    }
  }, [session, fetchMovimientos]);

  const styles = {
    mainContent: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 'bold' },
    titleSection: { marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    card: { backgroundColor: 'white', padding: '40px 20px', textAlign: 'center', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #eee' },
    packageTitle: { fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '15px' },
    price: { fontSize: '32px', fontWeight: 'bold', color: '#e11d48', marginBottom: '25px' },
    btnComprar: { backgroundColor: '#000', color: 'white', border: 'none', padding: '12px 0', width: '100%', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' },
    calculatorCard: { backgroundColor: 'white', marginTop: '40px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #e11d48' },
    inputAmount: { padding: '15px', fontSize: '18px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px', width: '250px', marginBottom: '20px', outline: 'none' },
    conversionText: { display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '20px', fontSize: '40px', fontWeight: 'bold', color: '#333' },
    
    // SECCIÓN DE HISTORIAL
    historySection: { marginTop: '50px' },
    historyTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden' },
    th: { textAlign: 'left', padding: '15px', backgroundColor: '#eee', fontSize: '12px', color: '#666', textTransform: 'uppercase' },
    td: { padding: '15px', borderBottom: '1px solid #eee', fontSize: '14px' },
    badgeCarga: { backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
    badgeCanje: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }
  };

  return (
    <div style={styles.mainContent}>
      <Link to="/" style={styles.btnBack}><span>←</span> VOLVER AL DASHBOARD</Link>

      <div style={styles.titleSection}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>CARGAR CRÉDITOS</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>Selecciona un paquete o ingresa una cantidad personalizada.</p>
      </div>

      <div style={styles.grid}>
        {[100, 300, 500].map(qty => (
          <div key={qty} style={styles.card}>
            <div style={styles.packageTitle}>{qty} CRÉDITOS</div>
            <div style={styles.price}>${(qty * 1000).toLocaleString('es-CL')}</div>
            <button style={styles.btnComprar}>COMPRAR AHORA</button>
          </div>
        ))}
      </div>

      <div style={styles.calculatorCard}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '20px', textTransform: 'uppercase' }}>Cantidad personalizada</h3>
        <input
          style={styles.inputAmount}
          type="number"
          placeholder="Ingresa créditos..."
          value={customAmount}
          onChange={(e) => setCustomAmount(Math.max(0, e.target.value))}
        />
        <div style={styles.conversionText}>
          <div><div style={{ fontSize: '12px', color: '#999' }}>CRÉDITOS</div>{customAmount || 0}</div>
          <div style={{ color: '#e11d48' }}>=</div>
          <div><div style={{ fontSize: '12px', color: '#999' }}>PESOS CLP</div>${(customAmount * 1000).toLocaleString('es-CL')}</div>
        </div>
        <button style={{ ...styles.btnComprar, width: '300px', marginTop: '30px', backgroundColor: '#e11d48', height: '50px', fontSize: '16px' }} disabled={!customAmount || customAmount <= 0}>CONTINUAR CON EL PAGO</button>
      </div>

      <div style={styles.historySection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>HISTORIAL DE MOVIMIENTOS</h2>
          <button 
            onClick={fetchMovimientos} 
            style={{ backgroundColor: '#eee', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🔄 ACTUALIZAR
          </button>
        </div>
        
        <div style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={styles.historyTable}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Detalle</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>Cargando transacciones...</td></tr>
              ) : movimientos.length > 0 ? (
                movimientos.map((m) => (
                  <tr key={m.id}>
                    <td style={styles.td}>
                      {new Date(m.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={styles.td}>{m.descripcion}</td>
                    <td style={styles.td}>
                      <span style={m.tipo === 'carga' ? styles.badgeCarga : styles.badgeCanje}>
                        {m.tipo === 'carga' ? 'CARGA' : 'CANJE'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: m.tipo === 'carga' ? '#166534' : '#991b1b', textAlign: 'right' }}>
                      {m.tipo === 'carga' ? '+' : '-'}{m.cantidad}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No tienes movimientos registrados aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Creditos;