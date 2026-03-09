import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Creditos = () => {
  const styles = {
    // Contenedor full-screen con tipografía forzada
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
    
    // Diseño de tarjetas de precios
    cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '30px' },
    priceCard: { backgroundColor: 'white', padding: '40px 30px', textAlign: 'center', borderRadius: '4px', borderBottom: '4px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' },
    price: { fontSize: '32px', fontWeight: 'bold', color: '#e11d48', margin: '15px 0', fontFamily: 'sans-serif' },
    buyBtn: { backgroundColor: '#000', color: 'white', border: 'none', padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%', borderRadius: '2px', textTransform: 'uppercase', fontSize: '12px', fontFamily: 'sans-serif' }
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

          {/* Botón Salir conectado a Supabase */}
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

        <div style={{padding: '30px 30px 0'}}>
          <h2 style={{textTransform: 'uppercase', fontFamily: 'sans-serif', margin: 0}}>Cargar Créditos</h2>
          <p style={{color: '#666', fontSize: '14px', marginTop: '10px', fontFamily: 'sans-serif'}}>Selecciona un paquete de créditos para continuar con tus reprogramaciones.</p>
        </div>

        <div style={styles.cardGrid}>
          {[
            { qty: 100, price: "$100.000" },
            { qty: 300, price: "$300.000" },
            { qty: 500, price: "$500.000" }
          ].map((pkg, i) => (
            <div key={i} style={styles.priceCard}>
              <h3 style={{margin: 0, fontSize: '18px', textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{pkg.qty} CRÉDITOS</h3>
              <div style={styles.price}>{pkg.price}</div>
              <button style={styles.buyBtn}>COMPRAR AHORA</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Creditos;