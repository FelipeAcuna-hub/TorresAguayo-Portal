import React from 'react';
import { Link } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';

const DashboardTorresAguayo = () => {
  const styles = {
    // EL SECRETO ESTÁ AQUÍ: width: '100vw' y position: 'fixed' eliminan los bordes blancos
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
      overflow: 'hidden' // Evita que la página entera "baile"
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
    navItemActive: { padding: '15px 24px', cursor: 'pointer', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold', fontFamily: 'sans-serif' },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', fontFamily: 'sans-serif' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
    header: { backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', fontFamily: 'sans-serif' },
    banner: { backgroundColor: 'black', margin: '30px', padding: '50px', borderRadius: '4px', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', fontFamily: 'sans-serif' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 30px', marginBottom: '30px' },
    card: { backgroundColor: 'white', padding: '30px', textAlign: 'center', borderRadius: '4px', borderBottom: '4px solid #eee', fontFamily: 'sans-serif' },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', borderRadius: '2px', textTransform: 'uppercase', fontSize: '12px', fontFamily: 'sans-serif' }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>
          TORRES<span style={{color: '#e11d48'}}>AGUAYO</span>
        </Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <ul style={{padding: 0, margin: 0, listStyle: 'none'}}>
            <Link to="/" style={{textDecoration: 'none'}}>
              <li style={window.location.pathname === "/" ? styles.navItemActive : styles.navItem}>DASHBOARD</li>
            </Link>
            <Link to="/perfil" style={{textDecoration: 'none'}}>
              <li style={window.location.pathname === "/perfil" ? styles.navItemActive : styles.navItem}>PERFIL</li>
            </Link>
            <Link to="/creditos" style={{textDecoration: 'none'}}>
              <li style={window.location.pathname === "/creditos" ? styles.navItemActive : styles.navItem}>CRÉDITOS</li>
            </Link>
            <Link to="/tickets" style={{textDecoration: 'none'}}>
              <li style={window.location.pathname === "/tickets" ? styles.navItemActive : styles.navItem}>TICKETS</li>
            </Link>
            <Link to="/archivos" style={{textDecoration: 'none'}}>
              <li style={window.location.pathname === "/archivos" ? styles.navItemActive : styles.navItem}>ARCHIVOS</li>
            </Link>
          </ul>

          <div style={{ borderTop: '1px solid #333', padding: '20px' }}>
            <button 
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (error) {
                  console.error("Error al salir:", error.message);
                }
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
          <div style={{backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'sans-serif'}}>
            FUERA DE HORARIO: 45 min a 24 hrs.
          </div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555', fontFamily: 'sans-serif'}}>
            💳 0 CREDITS &nbsp;&nbsp; 👤 FELIPE ACUÑA
          </div>
        </header>

        <section style={styles.banner}>
          <h1 style={{fontSize: '40px', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px', fontFamily: 'sans-serif'}}>Plataforma Reseller</h1>
          <h2 style={{fontSize: '28px', color: '#e11d48', margin: '5px 0 0 0', fontStyle: 'italic', fontFamily: 'sans-serif'}}>Dealer Online</h2>
          <p style={{color: '#9ca3af', fontSize: '12px', marginTop: '15px', letterSpacing: '2px', fontFamily: 'sans-serif'}}>TORRES AGUAYO MOTORSPORT — CHILE</p>
        </section>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{fontSize: '40px', marginBottom: '10px'}}>📄</div>
            <h3 style={{margin: '0', fontSize: '16px', textTransform: 'uppercase', fontFamily: 'sans-serif'}}>SUBIR ARCHIVOS</h3>
            <p style={{fontSize: '11px', color: '#888', margin: '10px 0', fontFamily: 'sans-serif'}}>Carga tu archivo y recibe una notificación de confirmación.</p>
            <Link to="/upload">
              <button style={styles.button}>SUBIR EL ARCHIVO</button>
            </Link>
          </div>

          <div style={styles.card}>
            <div style={{fontSize: '40px', marginBottom: '10px'}}>💰</div>
            <h3 style={{margin: '0', fontSize: '16px', textTransform: 'uppercase', fontFamily: 'sans-serif'}}>CARGAR CRÉDITOS</h3>
            <p style={{fontSize: '11px', color: '#888', margin: '10px 0', fontFamily: 'sans-serif'}}>Buy credits via Webpay or Transfer.</p>
            <button style={styles.button}>COMPRAR CRÉDITOS</button>
          </div>

          <div style={styles.card}>
            <div style={{fontSize: '40px', marginBottom: '10px'}}>🔧</div>
            <h3 style={{margin: '0', fontSize: '16px', textTransform: 'uppercase', fontFamily: 'sans-serif'}}>Soporte</h3>
            <p style={{fontSize: '11px', color: '#888', margin: '10px 0', fontFamily: 'sans-serif'}}>ETA: 15 - 45 mins. Monday to Friday.</p>
            <button style={styles.button}>IR A SOPORTE</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardTorresAguayo;