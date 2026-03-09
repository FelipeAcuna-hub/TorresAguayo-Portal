import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Archivos = () => {
  const styles = {
    // Contenedor fijo a los bordes para eliminar marcos blancos
    container: { 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      backgroundColor: '#f3f4f6', 
      fontFamily: 'sans-serif', 
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden'
    },
    sidebar: { 
      width: '260px', 
      backgroundColor: '#000', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      shrink: 0,
      fontFamily: 'sans-serif'
    },
    logo: { padding: '24px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #333', textDecoration: 'none', color: 'white', display: 'block', fontFamily: 'sans-serif' },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none', fontFamily: 'sans-serif' },
    navItemActive: { padding: '15px 24px', cursor: 'pointer', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold', fontFamily: 'sans-serif' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
    header: { backgroundColor: 'white', padding: '15px 30px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'sans-serif' },
    
    // Tabla de Historial
    tableCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontFamily: 'sans-serif' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', fontFamily: 'sans-serif' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', backgroundColor: '#22c55e', fontFamily: 'sans-serif' }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>TORRES<span style={{color: '#e11d48'}}>AGUAYO</span></Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <ul style={{padding: 0, margin: 0, listStyle: 'none'}}>
            <Link to="/" style={{textDecoration: 'none'}}><li style={window.location.pathname === "/" ? styles.navItemActive : styles.navItem}>DASHBOARD</li></Link>
            <Link to="/perfil" style={{textDecoration: 'none'}}><li style={window.location.pathname === "/perfil" ? styles.navItemActive : styles.navItem}>PERFIL</li></Link>
            <Link to="/creditos" style={{textDecoration: 'none'}}><li style={window.location.pathname === "/creditos" ? styles.navItemActive : styles.navItem}>CRÉDITOS</li></Link>
            <Link to="/tickets" style={{textDecoration: 'none'}}><li style={window.location.pathname === "/tickets" ? styles.navItemActive : styles.navItem}>TICKETS</li></Link>
            <Link to="/archivos" style={{textDecoration: 'none'}}><li style={window.location.pathname === "/archivos" ? styles.navItemActive : styles.navItem}>ARCHIVOS</li></Link>
          </ul>

          {/* Botón Salir */}
          <div style={{ borderTop: '1px solid #333', padding: '20px' }}>
            <button 
              onClick={async () => {
                try { await supabase.auth.signOut(); } 
                catch (error) { console.error("Error al salir:", error.message); }
              }}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#e11d48',
                border: '1px solid #e11d48',
                padding: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '12px',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif'
              }}
            >
              Salir de la cuenta
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={{backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'sans-serif'}}>FUERA DE HORARIO</div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555', fontFamily: 'sans-serif'}}>💳 0 CREDITS &nbsp;&nbsp;&nbsp; 👤 FELIPE ACUÑA</div>
        </header>

        <div style={styles.tableCard}>
          <h2 style={{fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', fontFamily: 'sans-serif', textTransform: 'uppercase'}}>Historial de Archivos</h2>
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
              <tr>
                <td style={styles.td}>08/03/2026</td>
                <td style={styles.td}>ABCD-12</td>
                <td style={styles.td}>Audi A3 2.0 TFSI</td>
                <td style={styles.td}><span style={styles.statusBadge}>COMPLETADO</span></td>
                <td style={styles.td}>
                  <button style={{color: '#e11d48', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '12px'}}>
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