import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  // 1. LÓGICA DEL SWITCH DE ATENCIÓN (Añadida para consistencia)
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });
  const userMetadata = session?.user?.user_metadata;
  const fullName = userMetadata?.full_name || "FELIPE ACUÑA";

  useEffect(() => {
    // Suscripción en tiempo real
    const channel = supabase
      .channel('status_archivos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_global' }, payload => {
        setStatus({ 
          is_online: payload.new.is_online, 
          mensaje: payload.new.is_online ? payload.new.mensaje_online : payload.new.mensaje_offline 
        });
      })
      .subscribe();

    // Carga inicial
    supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single().then(({ data }) => {
      if (data) setStatus({ is_online: data.is_online, mensaje: data.is_online ? data.mensaje_online : data.mensaje_offline });
    });

    return () => supabase.removeChannel(channel);
  }, []);

  const styles = {
    container: { 
      display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f3f4f6', 
      fontFamily: 'sans-serif', margin: 0, padding: 0, position: 'fixed', 
      top: 0, left: 0, overflow: 'hidden' 
    },
    sidebar: { 
      width: '260px', backgroundColor: '#000', color: 'white', display: 'flex', 
      flexDirection: 'column', shrink: 0, fontFamily: 'sans-serif' 
    },
    logo: { padding: '24px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #333', textDecoration: 'none', color: 'white', display: 'block' },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none' },
    navItemActive: { padding: '15px 24px', cursor: 'pointer', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
    header: { backgroundColor: 'white', padding: '15px 30px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    
    // BARRA DINÁMICA (Añadida)
    topBarStatus: { 
      backgroundColor: status.is_online ? '#228b22' : '#e11d48', 
      color: 'white', padding: '12px 20px', fontWeight: 'bold', fontSize: '13px', 
      textAlign: 'center', transition: 'background-color 0.5s ease' 
    },

    tableCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', backgroundColor: '#22c55e' }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>TORRES<span style={{color: '#e11d48'}}>AGUAYO</span></Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <ul style={{padding: 0, margin: 0, listStyle: 'none'}}>
            {/* ICONOS AÑADIDOS PARA UNIFICAR CON DASHBOARD */}
            <Link to="/" style={{textDecoration: 'none'}}><li style={styles.navItem}>💠 DASHBOARD</li></Link>
            <Link to="/perfil" style={{textDecoration: 'none'}}><li style={styles.navItem}>👤 PERFIL</li></Link>
            <Link to="/historial" style={{textDecoration: 'none'}}><li style={styles.navItem}>💳 CRÉDITOS</li></Link>
            <Link to="/tickets" style={{textDecoration: 'none'}}><li style={styles.navItem}>💬 TICKETS</li></Link>
            <li style={styles.navItemActive}>📄 ARCHIVOS</li>
          </ul>

          <div style={{ borderTop: '1px solid #333', padding: '20px' }}>
            <button 
              onClick={async () => { await supabase.auth.signOut(); }}
              style={{ width: '100%', backgroundColor: 'transparent', color: '#e11d48', border: '1px solid #e11d48', padding: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase' }}
            >
              Salir de la cuenta
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        {/* BARRA DE ESTADO DINÁMICA (Añadida) */}
        <div style={styles.topBarStatus}>
          {status.mensaje}
        </div>

        <header style={styles.header}>
          <div style={{backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold'}}>PORTAL OFICIAL</div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>
            💳 {userMetadata?.credits || 0} CREDITS &nbsp;&nbsp;&nbsp; 👤 {fullName.toUpperCase()}
          </div>
        </header>

        <div style={styles.tableCard}>
          <h2 style={{fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase'}}>Historial de Archivos</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Patente</th>
                <th style={styles.th}>Marca / Modelo</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {/* MANTENEMOS TU FILA DE EJEMPLO INTEGRA */}
              <tr>
                <td style={styles.td}>08/03/2026</td>
                <td style={styles.td}>ABCD-12</td>
                <td style={styles.td}>Audi A3 2.0 TFSI</td>
                <td style={styles.td}><span style={styles.statusBadge}>COMPLETADO</span></td>
                <td style={styles.td}>
                  <button style={{color: '#e11d48', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'}}>
                    Descargar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Archivos;