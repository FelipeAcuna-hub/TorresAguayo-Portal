import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// Corregido: Importación sin espacios y con la ruta exacta desde src/components/
import logoScanner from '../magic_torresaguayo.svg';

// --- FUNCIÓN DE CÁLCULO DE HORARIO CHILENO (INTACTA) ---
const checkAutoOnline = () => {
  const chileTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "numeric", hour12: false, weekday: "long",
  }).formatToParts(new Date());

  const hour = parseInt(chileTime.find(p => p.type === 'hour').value);
  const day = chileTime.find(p => p.type === 'weekday').value;
  const isWorkDay = !['Saturday', 'Sunday'].includes(day);
  const morningShift = hour >= 9 && hour < 13;
  const afternoonShift = hour >= 15 && hour < 19;

  return isWorkDay && (morningShift || afternoonShift);
};

const Layout = ({ session }) => {
  const [dbCredits, setDbCredits] = useState(0);
  const [displayName, setDisplayName] = useState("USUARIO");
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const location = useLocation();

  // --- LÓGICA DE ADMINISTRADOR ACTUALIZADA ---
  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin = 
    session?.user?.app_metadata?.role === 'admin' || 
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());
  
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!session?.user?.id) return;

    const updateBanner = (dbStatus) => {
      const isScheduleOnline = checkAutoOnline();
      if (!dbStatus.is_online) {
        setStatus({ is_online: false, mensaje: dbStatus.mensaje_offline });
      } else {
        if (isScheduleOnline) {
          setStatus({ is_online: true, mensaje: dbStatus.mensaje_online });
        } else {
          const now = new Date();
          const hour = new Date(now.toLocaleString("en-US", {timeZone: "America/Santiago"})).getHours();
          let msg = "SISTEMA CERRADO: Los archivos se procesarán el siguiente día hábil.";
          if (hour >= 13 && hour < 15) msg = "HORARIO DE COLACIÓN: Volvemos a las 15:00 hrs.";
          setStatus({ is_online: false, mensaje: msg });
        }
      }
    };

    const initLayout = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) {
        setDbCredits(prof.credits || 0);
        setDisplayName(`${prof.full_name || ''} ${prof.apellido || ''}`.trim().toUpperCase() || "USUARIO");
      }
      const { data: conf } = await supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
      if (conf) updateBanner(conf);
    };

    initLayout();

    const channel = supabase.channel('layout_sync_global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_global' }, payload => {
        updateBanner(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, payload => {
        setDbCredits(payload.new.credits);
        setDisplayName(`${payload.new.full_name || ''} ${payload.new.apellido || ''}`.trim().toUpperCase());
      })
      .subscribe();

    const timer = setInterval(() => {
      supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single().then(({ data }) => {
        if (data) updateBanner(data);
      });
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [session]);

  const styles = {
    container: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' },
    sidebar: { 
      width: '260px', 
      backgroundColor: '#000', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      shrink: 0,
      position: isMobile ? 'fixed' : 'relative',
      zIndex: 1000,
      height: '100vh',
      transition: 'transform 0.3s ease-in-out',
      transform: isMobile && !isMenuOpen ? 'translateX(-100%)' : 'translateX(0)'
    },
    // Estilo para el contenedor del logo ajustado para imágenes
    logoContainer: { 
      padding: '24px', 
      borderBottom: '1px solid #333', 
      textDecoration: 'none', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '13px' },
    navItemActive: { padding: '15px 24px', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: '13px' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: '100%' },
    header: { 
      backgroundColor: 'white', 
      padding: isMobile ? '10px 15px' : '15px 30px', 
      borderBottom: '1px solid #ddd', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      shrink: 0,
      minHeight: '60px'
    },
    topBarStatus: { backgroundColor: status.is_online ? '#228b22' : '#e11d48', color: 'white', padding: isMobile ? '8px' : '12px 20px', fontWeight: 'bold', fontSize: isMobile ? '11px' : '13px', textAlign: 'center', transition: '0.5s' },
    menuButton: {
      display: isMobile ? 'block' : 'none',
      backgroundColor: 'transparent',
      color: '#e11d48',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '0',
      marginRight: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        {/* CORRECCIÓN: Se cambió el texto por el componente img cargando el logoScanner */}
        <Link to="/" style={styles.logoContainer} onClick={() => setIsMenuOpen(false)}>
          <img 
            src={logoScanner} 
            alt="TORRES AGUAYO" 
            style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} 
          />
        </Link>

        <ul style={{ padding: 0, margin: 0, listStyle: 'none', flex: 1 }}>
          <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li style={location.pathname === "/" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}>💠</span> DASHBOARD
            </li>
          </Link>
          <Link to="/perfil" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li style={location.pathname === "/perfil" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}>👤</span> PERFIL
            </li>
          </Link>
          <Link to="/historial" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li style={location.pathname === "/historial" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}>💳</span> CRÉDITOS</li>
          </Link>
          <Link to="/tickets" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li style={location.pathname === "/tickets" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}>💬</span> TICKETS
            </li>
          </Link>
          <Link to="/archivos" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li style={location.pathname === "/archivos" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}>📄</span> ARCHIVOS
            </li>
          </Link>

          {isAdmin && (
            <Link to="/clientes" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
              <li style={location.pathname === "/clientes" ? styles.navItemActive : styles.navItem}>
                <span style={{ marginRight: '12px' }}>👥</span> CLIENTES
              </li>
            </Link>
          )}

          <Link to="/simulador" style={{ textDecoration: 'none', marginTop: '20px', display: 'block' }} onClick={() => setIsMenuOpen(false)}>
            <li style={{ ...styles.navItem, fontSize: '11px', color: '#666' }}>SIMULA EL PRECIO DE UN ARCHIVO</li>
          </Link>
          
          {isAdmin && (
            <Link to="/admin" style={{ textDecoration: 'none', marginTop: '10px', display: 'block' }} onClick={() => setIsMenuOpen(false)}>
              <li style={location.pathname === "/admin" ? styles.navItemActive : styles.navItem}>⚙️ ADMINISTRACIÓN</li>
            </Link>
          )}
        </ul>
        <div style={{ borderTop: '1px solid #333', padding: '20px' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', backgroundColor: 'transparent', color: '#e11d48', border: '1px solid #e11d48', padding: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>SALIR</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBarStatus}>{status.mensaje}</div>
        <header style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuButton}>
              {isMenuOpen ? '✕' : '☰'}
            </button>
            <div style={{fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold', color: '#e11d48'}}>
              {isMobile ? 'MMS PORTAL' : 'MI PORTAL DE USUARIO'}
            </div>
          </div>
          <div style={{fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', color: '#555', textAlign: 'right'}}>
            💳 {dbCredits.toLocaleString('es-CL')} <span style={{display: isMobile ? 'none' : 'inline'}}>CREDITS</span> &nbsp;&nbsp; 👤 {displayName.split(' ')[0]}
          </div>
        </header>
        <Outlet /> 
      </main>

      {isMobile && isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        />
      )}
    </div>
  );
};

export default Layout;