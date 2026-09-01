import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT } from '../ThemeContext';
// Corregido: Importación sin espacios y con la ruta exacta desde src/components/
import logoScanner from '../stockcarsconregister.png';

// --- FUNCIÓN DE CÁLCULO DE HORARIO CHILENO (INTACTA) ---
const checkAutoOnline = () => {
  const chileTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "numeric", hour12: false, weekday: "long",
  }).formatToParts(new Date());

  const hour = parseInt(chileTime.find(p => p.type === 'hour').value);
  const day = chileTime.find(p => p.type === 'weekday').value;

  if (day === 'Sunday') return false;

  // Sábado: turno reducido de 10 a 12
  if (day === 'Saturday') {
    return hour >= 10 && hour < 12;
  }

  // Turno mañana (Lunes a Viernes de 9 a 13)
  const morningShift = hour >= 9 && hour < 13;
  // Turno tarde (Lunes a Viernes de 15 a 19)
  const afternoonShift = hour >= 15 && hour < 19;

  return morningShift || afternoonShift;
};

const Layout = ({ session }) => {
  const [dbCredits, setDbCredits] = useState(0);
  const [displayName, setDisplayName] = useState("USUARIO");
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });
  const [isApproved, setIsApproved] = useState(true);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const location = useLocation();
  const { theme, toggleTheme, soundEnabled, toggleSound } = useTheme();
  const isDark = theme === 'dark';

  // --- LÓGICA DE ADMINISTRADOR ACTUALIZADA ---
  const ADMIN_EMAILS = [
    'stockcarscl@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.app_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  const isMobile = window.innerWidth < 768;
  // Detecta viewports "chicos" en CSS px (ej: Windows con escala 125%/150%,
  // donde 1920x1080 físico se ve como ~1536x864 de espacio real para el navegador)
  // para usar un layout más compacto sin achicar la pantalla cómoda (Mac, Windows al 100%).
  const isCompact = window.innerWidth >= 768 && window.innerWidth <= 1600;
  const puedeUsar = isAdmin || isApproved;

  useEffect(() => {
    if (!session?.user?.id) return;

    const updateBanner = (dbStatus) => {
      const isScheduleOnline = checkAutoOnline();
      const now = new Date();
      const chileTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Santiago" }));
      const hour = chileTime.getHours();
      const day = chileTime.getDay();

      // ESTADO 1: MANUAL CERRADO (BLOQUEADO TOTAL)
      if (dbStatus.is_online === 'manual_off' || dbStatus.is_online === false || dbStatus.is_online === "false") {
        setStatus({
          is_online: false,
          mensaje: dbStatus.mensaje_offline || "CERRADO TEMPORALMENTE: Los archivos se procesarán a primera hora."
        });
      }
      // ESTADO 2: MANUAL ABIERTO (FORZAR ONLINE REQUERIDO, EJ: DOMINGOS)
      else if (dbStatus.is_online === 'manual_on') {
        setStatus({
          is_online: true,
          mensaje: dbStatus.mensaje_online || "SISTEMA ONLINE (MODO ESPECIAL ADMI) - PROCESANDO ARCHIVOS"
        });
      }
      // ESTADO 3: MODO AUTOMÁTICO (DEPENDE DEL RELOJ)
      else {
        if (isScheduleOnline) {
          setStatus({
            is_online: true,
            mensaje: dbStatus.mensaje_online || "SISTEMA ONLINE - PROCESANDO ARCHIVOS"
          });
        } else {
          let msg = "SISTEMA CERRADO: Los archivos se procesarán a primera hora.";

          if (day === 0) {
            msg = "DOMINGO: Volvemos el lunes a las 09:00 hrs.";
          } else if (day === 6) {
            if (hour < 10) msg = "SÁBADO: Abrimos a las 10:00 de la mañana.";
            else msg = "FIN DE SEMANA: Volvemos el lunes a las 09:00 hrs.";
          } else if (hour >= 13 && hour < 15) {
            msg = "HORARIO DE COLACIÓN: Volvemos a las 15:00 hrs.";
          } else {
            msg = "FUERA DE HORARIO: Los archivos se procesarán a primera hora.";
          }

          setStatus({ is_online: false, mensaje: msg });
        }
      }
    };

    const initLayout = async () => {
      // Cargar datos del perfil
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) {
        setDbCredits(prof.credits || 0);
        setDisplayName(`${prof.full_name || ''} ${prof.apellido || ''}`.trim().toUpperCase() || "USUARIO");
        setIsApproved(prof.is_approved !== false);
      }
      // Cargar configuración de atención
      const { data: conf } = await supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
      if (conf) updateBanner(conf);
    };

    initLayout();

    // SUSCRIPCIÓN REALTIME (Escucha a la base de datos)
    const channel = supabase.channel('layout_sync_global')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'configuracion_global',
        filter: 'id=eq.atencion_cliente'
      }, payload => {
        updateBanner(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, payload => {
        setDbCredits(payload.new.credits);
        setIsApproved(payload.new.is_approved !== false);
      })
      .subscribe();

    // ESCUCHA DE EVENTO MANUAL (Para que el cambio sea instantáneo al hacer clic)
    const handleManualUpdate = () => {
      supabase.from('configuracion_global')
        .select('*')
        .eq('id', 'atencion_cliente')
        .single()
        .then(({ data }) => {
          if (data) updateBanner(data);
        });
    };

    window.addEventListener('config-updated', handleManualUpdate);

    // Intervalo de seguridad para el reloj (cada 1 minuto)
    const timer = setInterval(handleManualUpdate, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener('config-updated', handleManualUpdate);
    };
  }, [session]);

  const styles = {
    container: { display: 'flex', width: '100vw', background: isDark ? DARK_GRADIENT : '#f3f4f6', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' },
    sidebar: {
      width: '260px',
      background: 'linear-gradient(180deg, #000000 0%, #000000 50%, #150500 75%, #2e0803 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      shrink: 0,
      position: isMobile ? 'fixed' : 'relative',
      zIndex: 1000,
      transition: 'transform 0.3s ease-in-out',
      transform: isMobile && !isMenuOpen ? 'translateX(-100%)' : 'translateX(0)'
    },
    // Estilo para el contenedor del logo ajustado para imágenes
    logoContainer: {
      padding: isCompact ? '12px' : '24px',
      borderBottom: '1px solid #333',
      textDecoration: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      flexShrink: 0,
      background: 'radial-gradient(circle at center, rgba(110,19,0,0.55) 0%, rgba(110,19,0,0.22) 40%, transparent 72%)'
    },
    navItem: { padding: isCompact ? '9px 24px' : '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: isCompact ? '12px' : '13px', transition: 'background-color 0.2s ease, color 0.2s ease, padding-left 0.2s ease' },
    navItemActive: { padding: isCompact ? '9px 24px' : '15px 24px', color: 'white', background: 'linear-gradient(135deg, #D9241D 0%, #300804 100%)', listStyle: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: isCompact ? '12px' : '13px', transition: 'background 0.2s ease' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: '100%', minHeight: 0 },
    header: {
      background: isDark ? 'linear-gradient(90deg, #2a0d08 0%, #120401 55%, #000000 100%)' : 'white',
      padding: isMobile ? '10px 15px' : '15px 30px',
      borderBottom: isDark ? '1px solid #3a1410' : '1px solid #ddd',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      shrink: 0,
      minHeight: '60px'
    },
    topBarStatus: { backgroundColor: status.is_online ? '#228b22' : '#8B0000', color: 'white', padding: isMobile ? '8px' : '12px 20px', fontWeight: 'bold', fontSize: isMobile ? '11px' : '13px', textAlign: 'center', transition: '0.5s' },
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
    <div className="app-shell" style={styles.container}>
      <style>{`
        .app-shell { height: 100vh; height: 100dvh; }
        .app-sidebar { height: 100vh; height: 100dvh; }
        .nav-link-item { transition: transform 0.2s ease, background-color 0.2s ease; }
        .nav-link-item:hover { transform: translateX(4px); background-color: rgba(225,29,72,0.12); }
        .logout-btn { transition: background-color 0.2s ease, color 0.2s ease; }
        .logout-btn:hover { background-color: #D9241D; color: white; border-color: #D9241D; }
        .theme-toggle-btn { transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        .theme-toggle-btn:hover { background-color: #222; color: white; border-color: #555; }
      `}</style>
      <aside className="app-sidebar" style={styles.sidebar}>
        {/* CORRECCIÓN: Se cambió el texto por el componente img cargando el logoScanner */}
        <Link to="/" style={styles.logoContainer} onClick={() => setIsMenuOpen(false)}>
          <img
            src={logoScanner}
            alt="TORRES AGUAYO"
            style={{ width: '100%', maxHeight: isCompact ? '110px' : '200px', objectFit: 'contain' }}
          />
        </Link>

        <ul style={{ padding: 0, margin: 0, listStyle: 'none', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={location.pathname === "/" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-house-fill" viewBox="0 0 16 16">
                <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z" />
                <path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z" />
              </svg></span> DASHBOARD
            </li>
          </Link>
          <Link to="/perfil" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={location.pathname === "/perfil" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
              </svg></span> PERFIL
            </li>
          </Link>
          <Link to="/historial" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={location.pathname === "/historial" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-credit-card-fill" viewBox="0 0 16 16">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1" />
              </svg></span> CRÉDITOS</li>
          </Link>
          <Link to="/tickets" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={location.pathname === "/tickets" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-ticket-perforated-fill" viewBox="0 0 16 16">
                <path d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a.5.5 0 0 1-.5.5 1.5 1.5 0 0 0 0 3 .5.5 0 0 1 .5.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11.5V10a.5.5 0 0 1 .5-.5 1.5 1.5 0 1 0 0-3A.5.5 0 0 1 0 6zm4-1v1h1v-1zm1 3v-1H4v1zm7 0v-1h-1v1zm-1-2h1v-1h-1zm-6 3H4v1h1zm7 1v-1h-1v1zm-7 1H4v1h1zm7 1v-1h-1v1zm-8 1v1h1v-1zm7 1h1v-1h-1z" />
              </svg></span> TICKETS
            </li>
          </Link>
          <Link to="/archivos" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={location.pathname === "/archivos" ? styles.navItemActive : styles.navItem}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-arrow-down-fill" viewBox="0 0 16 16">
                <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M8 5a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5A.5.5 0 0 1 8 5" />
              </svg></span> ARCHIVOS
            </li>
          </Link>

          {isAdmin && (
            <Link to="/clientes" style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
              <li className="nav-link-item" style={location.pathname === "/clientes" ? styles.navItemActive : styles.navItem}>
                <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-arms-up" viewBox="0 0 16 16">
                  <path d="M8 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
                  <path d="m5.93 6.704-.846 8.451a.768.768 0 0 0 1.523.203l.81-4.865a.59.59 0 0 1 1.165 0l.81 4.865a.768.768 0 0 0 1.523-.203l-.845-8.451A1.5 1.5 0 0 1 10.5 5.5L13 2.284a.796.796 0 0 0-1.239-.998L9.634 3.84a.7.7 0 0 1-.33.235c-.23.074-.665.176-1.304.176-.64 0-1.074-.102-1.305-.176a.7.7 0 0 1-.329-.235L4.239 1.286a.796.796 0 0 0-1.24.998l2.5 3.216c.317.316.475.758.43 1.204Z" />
                </svg></span> CLIENTES
              </li>
            </Link>
          )}

          <Link to="/simulador" style={{ textDecoration: 'none', marginTop: isCompact ? '12px' : '20px', display: 'block' }} onClick={() => setIsMenuOpen(false)}>
            <li className="nav-link-item" style={{ ...styles.navItem, fontSize: '11px', color: '#666' }}>
              <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calculator-fill" viewBox="0 0 16 16">
                <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm2 .5v2a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5m0 4v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 12.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M7.5 6a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM7 9.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m.5 2.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM10 6.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m.5 2.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5z" />
              </svg></span> SIMULA EL PRECIO DE UN ARCHIVO
            </li>
          </Link>

          {isAdmin && (
            <Link to="/admin" style={{ textDecoration: 'none', marginTop: isCompact ? '6px' : '10px', display: 'block' }} onClick={() => setIsMenuOpen(false)}>
              <li className="nav-link-item" style={location.pathname === "/admin" ? styles.navItemActive : styles.navItem}>
                <span style={{ marginRight: '12px' }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-check" viewBox="0 0 16 16">
                  <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
                  <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z" />
                </svg></span> ADMINISTRACIÓN
              </li>
            </Link>
          )}
        </ul>
        <div style={{ borderTop: '1px solid #333', padding: isCompact ? '12px' : '20px', display: 'flex', flexDirection: 'column', gap: isCompact ? '7px' : '10px', flexShrink: 0 }}>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #333', padding: isCompact ? '7px' : '10px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>
          <button
            className="theme-toggle-btn"
            onClick={toggleSound}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #333', padding: isCompact ? '7px' : '10px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {soundEnabled ? '🔊 Sonido Activado' : '🔇 Sonido Desactivado'}
          </button>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()} style={{ width: '100%', backgroundColor: 'transparent', color: '#D9241D', border: '1px solid #D9241D', padding: isCompact ? '9px' : '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>SALIR</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBarStatus}>{status.mensaje}</div>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuButton}>
              {isMenuOpen ? '✕' : '☰'}
            </button>
            <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold', color: '#ffffff', textShadow: '0 0 4px rgba(217,36,29,0.9), 0 0 12px rgba(217,36,29,0.7), 0 0 22px rgba(217,36,29,0.5)' }}>
              {isMobile ? 'MMS PORTAL' : 'MI PORTAL DE USUARIO'}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', color: isDark ? '#e5e5e5' : '#555', textAlign: 'right' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-credit-card-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1" />
            </svg>
            <span>{dbCredits.toLocaleString('es-CL')} <span style={{ display: isMobile ? 'none' : 'inline' }}>CREDITS</span></span>
            &nbsp;&nbsp;
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
              </svg>
              <span>{displayName.split(' ')[0]}</span>
            </span>
          </div>
        </header>

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={puedeUsar ? undefined : { filter: 'grayscale(1) opacity(0.5)', pointerEvents: 'none', userSelect: 'none' }}>
            <Outlet />
          </div>

          {!puedeUsar && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', zIndex: 10
            }}>
              <div style={{
                backgroundColor: '#111', color: 'white', border: '1px solid #D9241D',
                borderRadius: '8px', padding: '30px 40px', maxWidth: '420px', textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: '34px', marginBottom: '10px' }}>⏳</div>
                <h3 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#D9241D' }}>Cuenta pendiente de aprobación</h3>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.5, margin: 0 }}>
                  Tu cuenta aún no ha sido aprobada por un administrador. No podrás usar el portal hasta que se confirme tu acceso. Te notificaremos por email apenas esté listo.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {isMobile && isMenuOpen && (
        <div
          className="app-shell"
          onClick={() => setIsMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        />
      )}
    </div>
  );
};

export default Layout;