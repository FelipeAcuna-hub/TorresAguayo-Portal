import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Perfil = () => {
  const styles = {
    // Contenedor anclado a los bordes para eliminar marcos blancos
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
    
    // Formulario Estilo Kenner
    formCard: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase', fontFamily: 'sans-serif' },
    gridRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#666', textTransform: 'uppercase', fontFamily: 'sans-serif' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '14px 28px', fontWeight: 'bold', cursor: 'pointer', marginTop: '30px', borderRadius: '2px', alignSelf: 'flex-start', fontFamily: 'sans-serif', textTransform: 'uppercase' }
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
          <div style={{backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'sans-serif'}}>FUERA DE HORARIO: 45 min a 24 hrs.</div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555', fontFamily: 'sans-serif'}}>💳 0 CREDITS &nbsp;&nbsp;&nbsp; 👤 FELIPE ACUÑA</div>
        </header>

        <div style={styles.formCard}>
          <h3 style={styles.sectionTitle}>👤 INFORMACIÓN PERSONAL</h3>
          <div style={styles.gridRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nombre</label>
              <input style={styles.input} type="text" defaultValue="Felipe" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Apellido</label>
              <input style={styles.input} type="text" defaultValue="Acuña" />
            </div>
          </div>
          <div style={{...styles.gridRow, width: '49%'}}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Teléfono</label>
              <input style={styles.input} type="text" defaultValue="+569 1234 5678" />
            </div>
          </div>

          <h3 style={{...styles.sectionTitle, marginTop: '40px'}}>📄 INFORMACIÓN DE FACTURACIÓN</h3>
          <div style={styles.gridRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Compañía</label>
              <input style={styles.input} type="text" defaultValue="Torres Aguayo Motorsport" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>RUT / VAT</label>
              <input style={styles.input} type="text" placeholder="12.345.678-9" />
            </div>
          </div>
          <div style={styles.gridRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Actividad</label>
              <input style={styles.input} type="text" placeholder="Giro comercial" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>País</label>
              <select style={styles.input}><option>Chile</option><option>Argentina</option></select>
            </div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Calle</label>
              <input style={styles.input} type="text" placeholder="Cuna de prat" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ciudad</label>
              <input style={styles.input} type="text" placeholder="Santiago" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Número</label>
              <input style={styles.input} type="text" placeholder="3288" />
            </div>
          </div>

          <h3 style={{...styles.sectionTitle, marginTop: '40px'}}>🔑 ACCESO</h3>
          <div style={styles.gridRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail</label>
              <input style={styles.input} type="email" defaultValue="felipe@torresaguayo.cl" disabled />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Contraseña</label>
              <input style={styles.input} type="password" placeholder="••••••••••••" />
              <div style={{ marginTop: '8px' }}>
                <span 
                  style={{ color: '#e11d48', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => alert('Función para enviar correo de restablecimiento habilitada')}
                >
                  Cambiar contraseña
                </span>
              </div>
            </div>
          </div>

          <button style={styles.button}>GUARDAR CAMBIOS</button>
        </div>
      </main>
    </div>
  );
};

export default Perfil;