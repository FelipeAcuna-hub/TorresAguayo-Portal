import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Creditos = ({ session }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // --- CONFIGURACIÓN WHATSAPP ---
  const WHATSAPP_NUMBER = "56995161488"; // <-- REEMPLAZA CON TU NÚMERO (con código de país)

  const handleWhatsAppBuy = (qty) => {
    const numQty = parseInt(qty);
    if (isNaN(numQty) || numQty <= 0) return;
    
    const amount = (numQty * 10000).toLocaleString('es-CL');
    const message = encodeURIComponent(
      `Hola! 👋 Soy ${session?.user?.email}, me gustaría comprar ${numQty} créditos por $${amount} CLP para mi cuenta.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const fetchMovimientos = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('historial_movimientos')
        .select('*')
        .eq('perfil_id', userId)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setMovimientos(data || []);
    } catch (err) {
      console.error("Error al cargar historial:", err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) fetchMovimientos();
  }, [session, fetchMovimientos]);

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = movimientos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(movimientos.length / itemsPerPage);

  const styles = {
    mainContent: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    card: { backgroundColor: 'white', padding: '40px 20px', textAlign: 'center', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #eee' },
    price: { fontSize: '32px', fontWeight: 'bold', color: '#e11d48', marginBottom: '25px' },
    btnComprar: { backgroundColor: '#000', color: 'white', border: 'none', padding: '12px 0', width: '100%', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' },
    calculatorCard: { backgroundColor: 'white', marginTop: '40px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderTop: '4px solid #e11d48' },
    inputAmount: { padding: '15px', fontSize: '18px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px', width: '250px', marginBottom: '20px', outline: 'none' },
    conversionText: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '40px', fontWeight: 'bold', color: '#333' },
    historySection: { marginTop: '50px' },
    historyTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden' },
    th: { textAlign: 'left', padding: '15px', backgroundColor: '#eee', fontSize: '12px', color: '#666', textTransform: 'uppercase' },
    td: { padding: '15px', borderBottom: '1px solid #eee', fontSize: '14px' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' },
    pageBtn: { padding: '8px 16px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }
  };

  return (
    <div style={styles.mainContent}>
      <Link to="/" style={styles.btnBack}>← VOLVER AL DASHBOARD</Link>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>CARGAR CRÉDITOS</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>Selecciona un paquete o ingresa una cantidad personalizada.</p>
      </div>

      <div style={styles.grid}>
        {[10, 30, 50].map(qty => (
          <div key={qty} style={styles.card}>
            <div style={{ fontWeight: 'bold', marginBottom: '15px' }}>{qty} CRÉDITOS</div>
            <div style={styles.price}>${(qty * 10000).toLocaleString('es-CL')}</div>
            <button onClick={() => handleWhatsAppBuy(qty)} style={styles.btnComprar}>COMPRAR AHORA</button>
          </div>
        ))}
      </div>

      {/* CALCULADORA RESTAURADA */}
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

      {/* HISTORIAL CON PAGINACIÓN */}
      <div style={styles.historySection}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>HISTORIAL DE MOVIMIENTOS</h2>
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
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((m) => (
                <tr key={m.id}>
                  <td style={styles.td}>{new Date(m.fecha).toLocaleDateString('es-CL')}</td>
                  <td style={styles.td}>{m.descripcion}</td>
                  <td style={styles.td}>{m.tipo.toUpperCase()}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: m.tipo === 'carga' ? 'green' : 'red', textAlign: 'right' }}>
                    {m.tipo === 'carga' ? '+' : '-'}{m.cantidad}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No hay movimientos.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={styles.paginationContainer}>
            <button 
              style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Anterior
            </button>
            <span style={{ fontSize: '14px' }}>Página {currentPage} de {totalPages}</span>
            <button 
              style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Creditos;