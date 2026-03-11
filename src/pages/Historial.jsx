import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Historial = ({ session }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });

  const userMetadata = session?.user?.user_metadata;
  const fullName = userMetadata?.full_name || "USUARIO";

  useEffect(() => {
    // 1. CARGAR HISTORIAL DE TRANSACCIONES
    const fetchMovimientos = async () => {
      try {
        setLoading(true);
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

    // 2. CARGAR ESTADO DEL SWITCH (Real-time)
    const fetchStatus = async () => {
      const { data } = await supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
      if (data) setStatus({ is_online: data.is_online, mensaje: data.is_online ? data.mensaje_online : data.mensaje_offline });
    };

    if (session?.user) {
      fetchMovimientos();
      fetchStatus();
    }

    // Suscripción al cambio de estado Online/Offline
    const channel = supabase
      .channel('status_historial')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_global' }, payload => {
        setStatus({ is_online: payload.new.is_online, mensaje: payload.new.is_online ? payload.new.mensaje_online : payload.new.mensaje_offline });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  const styles = {
    container: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' },
    sidebar: { width: '260px', backgroundColor: '#000', color: 'white', display: 'flex', flexDirection: 'column', shrink: 0 },
    logo: { padding: '24px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #333', textDecoration: 'none', color: 'white', display: 'block' },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center' },
    navItemActive: { padding: '15px 24px', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
    subMenu: { listStyle: 'none', paddingLeft: '50px', backgroundColor: '#0a0a0a' },
    subNavItemActive: { padding: '10px 0', fontSize: '13px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'block', textDecoration: 'none' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
    header: { backgroundColor: 'white', padding: '15px 30px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    topBarStatus: { backgroundColor: status.is_online ? '#228b22' : '#e11d48', color: 'white', padding: '12px 20px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', transition: '0.5s' },
    card: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' }
  };

  return (
    <div style={styles.container}>
      {/* --- SIDEBAR --- */}
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>TORRES<span style={{color: '#e11d48'}}>AGUAYO</span></Link>
        <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
          <Link to="/" style={{ textDecoration: 'none' }}><li style={styles.navItem}>💠 DASHBOARD</li></Link>
          <Link to="/perfil" style={{ textDecoration: 'none' }}><li style={styles.navItem}>👤 PERFIL</li></Link>
          <li style={{ ...styles.navItem, color: 'white', backgroundColor: '#1a1a1a', borderLeft: '4px solid #e11d48' }}>💳 CRÉDITOS</li>
          <ul style={styles.subMenu}>
            <Link to="/cargar-fondos" style={{ textDecoration: 'none' }}><li style={{...styles.navItem, fontSize: '13px', color: '#9ca3af'}}>CARGAR CRÉDITOS</li></Link>
            <li style={styles.subNavItemActive}>HISTORIAL DE TRANSACCIONES</li>
          </ul>
          <Link to="/tickets" style={{ textDecoration: 'none' }}><li style={styles.navItem}>💬 TICKETS</li></Link>
          <Link to="/archivos" style={{ textDecoration: 'none' }}><li style={styles.navItem}>📄 ARCHIVOS</li></Link>
        </ul>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main style={styles.main}>
        <div style={styles.topBarStatus}>{status.mensaje}</div>
        
        <header style={styles.header}>
          <div style={{fontSize: '14px', fontWeight: 'bold', color: '#e11d48'}}>HISTORIAL DE MOVIMIENTOS</div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>
            💳 {userMetadata?.credits || 0} CREDITS &nbsp;&nbsp; 👤 {fullName.toUpperCase()}
          </div>
        </header>

        <div style={styles.card}>
          <h2 style={{fontSize: '18px', margin: 0, textTransform: 'uppercase'}}>Mis Transacciones</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>FECHA</th>
                <th style={styles.th}>DESCRIPCIÓN</th>
                <th style={{...styles.th, textAlign: 'right'}}>CANTIDAD</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td style={styles.td}>{new Date(m.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>{m.descripcion}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#e11d48' : '#22c55e'}}>
                    {m.tipo === 'gasto' ? '-' : '+'}{m.cantidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movimientos.length === 0 && !loading && <p style={{textAlign: 'center', marginTop: '20px', color: '#999'}}>No hay transacciones registradas.</p>}
        </div>
      </main>
    </div>
  );
};

export default Historial;