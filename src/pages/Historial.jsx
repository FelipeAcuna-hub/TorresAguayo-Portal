import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Historial = ({ session }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. CARGAR HISTORIAL DE TRANSACCIONES (MANTENIDO)
    const fetchMovimientos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;

        const { data, error } = await supabase
          .from('movimientos')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMovimientos(data || []);
      } catch (error) {
        console.error("Error:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovimientos();
  }, [session]);

  const styles = {
    // Ajustado para fluir dentro del Layout
    mainContent: { flex: 1, padding: '0', backgroundColor: '#f3f4f6' },
    card: { 
      backgroundColor: 'white', 
      margin: '30px', 
      padding: '40px', 
      borderRadius: '4px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      minHeight: '400px'
    },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '15px 12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '15px 12px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#333' }
  };

  return (
    <div style={styles.mainContent}>
      {/* ELIMINADO: <aside>, <header> y <topBarStatus> 
          PORQUÉ: El Layout.jsx ya los incluye de forma global.
      */}

      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', margin: 0, textTransform: 'uppercase', color: '#000', borderBottom: '2px solid #e11d48', display: 'inline-block', paddingBottom: '5px' }}>
          Mis Transacciones
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>FECHA</th>
              <th style={styles.th}>DESCRIPCIÓN</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map(m => (
              <tr key={m.id}>
                <td style={styles.td}>
                  {new Date(m.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={styles.td}>{m.descripcion}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#e11d48' : '#228b22' }}>
                  {m.tipo === 'gasto' ? '-' : '+'}{m.cantidad.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p style={{ textAlign: 'center', marginTop: '40px', color: '#666', fontSize: '12px' }}>CARGANDO MOVIMIENTOS...</p>}
        
        {movimientos.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: '50px', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <p style={{ color: '#999', fontSize: '14px' }}>No hay transacciones registradas en tu cuenta aún.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Historial;