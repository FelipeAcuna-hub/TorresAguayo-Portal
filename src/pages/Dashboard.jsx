import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens } from '../ThemeContext';
import logoStockcars from '../stockcarsconregister.png';
import logoStageX from '../magicstagex.svg';
import logoFlex from '../magicflex.svg';
import logoMagic from '../magicmotors.svg';
import logoDyno from '../dynomag.png';
import logoDynoBlack from '../dynomag_black.png';
import logoMagicWhite from '../magic_motorsport_white.png';

// --- PARTE 1: FUNCIÓN DE CÁLCULO DE HORARIO CHILENO (INTACTA) ---
const checkAutoOnline = () => {
  const chileTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "numeric",
    hour12: false,
    weekday: "long",
  }).formatToParts(new Date());

  const hour = parseInt(chileTime.find(p => p.type === 'hour').value);
  const day = chileTime.find(p => p.type === 'weekday').value;

  const isWorkDay = !['Saturday', 'Sunday'].includes(day);

  const morningShift = hour >= 9 && hour < 13;
  const afternoonShift = hour >= 15 && hour < 19;

  return isWorkDay && (morningShift || afternoonShift);
};

const DashboardTorresAguayo = ({ session }) => {
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });
  const [dbCredits, setDbCredits] = useState(0);
  const [displayName, setDisplayName] = useState("USUARIO");
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!session?.user?.id) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, apellido, credits')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setDbCredits(data.credits || 0);
        const name = data.full_name || "USUARIO";
        const lastName = data.apellido || "";
        setDisplayName(`${name} ${lastName}`.trim().toUpperCase());
      }
    };

    const updateBanner = (dbStatus) => {
      const isScheduleOnline = checkAutoOnline();
      if (!dbStatus.is_online) {
        setStatus({ is_online: false, mensaje: dbStatus.mensaje_offline });
      } else {
        if (isScheduleOnline) {
          setStatus({ is_online: true, mensaje: dbStatus.mensaje_online });
        } else {
          const now = new Date();
          const hour = new Date(now.toLocaleString("en-US", { timeZone: "America/Santiago" })).getHours();
          let msg = "SISTEMA CERRADO: Los archivos se procesarán el siguiente día hábil.";
          if (hour >= 13 && hour < 15) {
            msg = "HORARIO DE COLACIÓN: Volvemos a las 15:00 hrs.";
          }
          setStatus({ is_online: false, mensaje: msg });
        }
      }
    };

    const channel = supabase.channel('dashboard_realtime_sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'configuracion_global'
      }, payload => {
        updateBanner(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session?.user?.id}`
      }, payload => {
        setDbCredits(payload.new.credits);
        setDisplayName(`${payload.new.full_name} ${payload.new.apellido || ''}`.trim().toUpperCase());
      })
      .subscribe();

    fetchProfileData();
    supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single().then(({ data }) => {
      if (data) updateBanner(data);
    });

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
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: isDark ? DARK_GRADIENT : '#f3f4f6' },
    banner: {
      backgroundColor: 'black',
      margin: '30px',
      padding: '40px 50px',
      borderRadius: '4px',
      color: 'white',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '40px',
      flexWrap: 'wrap',
      position: 'relative',
      overflow: 'hidden',
      borderLeft: '5px solid #D9241D',
      flexShrink: 0, // Evita que el banner se achique si otros elementos crecen
      minHeight: '180px' // Asegura un tamaño mínimo siempre
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 30px', marginBottom: '30px' },
    card: { backgroundColor: s.cardBg, padding: '30px', textAlign: 'center', borderRadius: '10px', border: `1px solid ${s.border}`, borderBottom: `4px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    button: {
      background: 'linear-gradient(135deg, #D9241D 0%, #300804 130%)',
      border: '1px solid rgba(230,80,70,0.9)',
      boxShadow: '0 0 4px rgba(217,36,29,0.9), 0 0 12px rgba(217,36,29,0.7), 0 0 24px rgba(217,36,29,0.45), 0 0 42px rgba(217,36,29,0.25)',
      color: 'white', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '12px'
    },
    // ESTILOS DE PARTNERS
    partnerSection: { margin: '10px 30px 20px 30px', textAlign: 'center' },
    partnerTitle: { fontSize: '10px', color: isDark ? '#d9a99e' : '#999', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '15px', fontWeight: 'bold' },
    partnerRibbon: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', padding: '15px 20px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '80px', flexWrap: 'wrap', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #eee' },
    logoStyle: { height: '130px', width: 'auto', filter: 'grayscale(1) opacity(0.6)', transition: 'filter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer' }
  };

  return (
    <div style={styles.main}>
      <style>{`
        @keyframes fadeInLogo {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-card {
          animation: dashFadeUp 0.35s ease both;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .dash-card:hover {
          transform: translateY(-4px);
          border-color: #e11d48;
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.15), 0 0 0 1px rgba(225,29,72,0.35), 0 0 22px rgba(225,29,72,0.28);
        }
        .dash-icon { transition: transform 0.2s ease; display: inline-block; }
        .dash-card:hover .dash-icon { transform: scale(1.12); }
        .dash-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
        .dash-btn:hover { transform: translateY(-2px); filter: brightness(1.2); box-shadow: 0 0 6px rgba(230,70,60,1), 0 0 16px rgba(217,36,29,0.9), 0 0 32px rgba(217,36,29,0.6), 0 0 56px rgba(217,36,29,0.35); }
        .wsp-bubble { transition: transform 0.2s ease, box-shadow 0.2s ease; animation: dashFadeUp 0.4s ease both; }
        .wsp-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
      `}</style>

      <section style={styles.banner}>
        <div style={{
          animation: 'fadeInLogo 1s ease-out',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <img
            src={logoStockcars}
            alt="StockCars Logo"
            style={{
              height: '160px',
              width: 'auto',
              filter: 'drop-shadow(0px 0px 12px rgba(225, 29, 72, 0.5))',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '36px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>
            Plataforma <span style={{ color: '#D9241D' }}>Reseller</span>
          </h1>
          <h2 style={{ fontSize: '24px', color: '#D9241D', margin: '2px 0 0 0', fontStyle: 'italic', fontWeight: 'bold' }}>
            Online File Services
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '15px', letterSpacing: '2px', fontWeight: 'bold' }}>
            STOCKCARS — CHILE - LATAM
          </p>
        </div>
      </section>

      <div style={styles.grid}>
        <div className="dash-card" style={{ ...styles.card, animationDelay: '0s' }}>
          <div className="dash-icon" style={{ fontSize: '40px', marginBottom: '10px', color: isDark ? '#fff' : 'inherit' }}>
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" className="bi bi-file-earmark-arrow-up" viewBox="0 0 16 16">
                <path d="M8.5 11.5a.5.5 0 0 1-1 0V7.707L6.354 8.854a.5.5 0 1 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 7.707z" />
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" className="bi bi-file-earmark-arrow-up-fill" viewBox="0 0 16 16">
                <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M6.354 9.854a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 8.707V12.5a.5.5 0 0 1-1 0V8.707z" />
              </svg>
            )}
          </div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase', color: s.text }}>CARGAR ARCHIVOS</h3>
          <p style={{ fontSize: '11px', color: s.textMuted, margin: '10px 0' }}>Carga tu archivo y recibe una notificación de confirmación.</p>
          <Link to="/upload"><button className="dash-btn" style={styles.button}>SUBIR EL ARCHIVO</button></Link>
        </div>
        <div className="dash-card" style={{ ...styles.card, animationDelay: '0.08s' }}>
          <div className="dash-icon" style={{ fontSize: '40px', marginBottom: '10px', color: isDark ? '#fff' : 'inherit' }}><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-currency-exchange" viewBox="0 0 16 16">
            <path d="M0 5a5 5 0 0 0 4.027 4.905 6.5 6.5 0 0 1 .544-2.073C3.695 7.536 3.132 6.864 3 5.91h-.5v-.426h.466V5.05q-.001-.07.004-.135H2.5v-.427h.511C3.236 3.24 4.213 2.5 5.681 2.5c.316 0 .59.031.819.085v.733a3.5 3.5 0 0 0-.815-.082c-.919 0-1.538.466-1.734 1.252h1.917v.427h-1.98q-.004.07-.003.147v.422h1.983v.427H3.93c.118.602.468 1.03 1.005 1.229a6.5 6.5 0 0 1 4.97-3.113A5.002 5.002 0 0 0 0 5m16 5.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0m-7.75 1.322c.069.835.746 1.485 1.964 1.562V14h.54v-.62c1.259-.086 1.996-.74 1.996-1.69 0-.865-.563-1.31-1.57-1.54l-.426-.1V8.374c.54.06.884.347.966.745h.948c-.07-.804-.779-1.433-1.914-1.502V7h-.54v.629c-1.076.103-1.808.732-1.808 1.622 0 .787.544 1.288 1.45 1.493l.358.085v1.78c-.554-.08-.92-.376-1.003-.787zm1.96-1.895c-.532-.12-.82-.364-.82-.732 0-.41.311-.719.824-.809v1.54h-.005zm.622 1.044c.645.145.943.38.943.796 0 .474-.37.8-1.02.86v-1.674z" />
          </svg></div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase', color: s.text }}>CARGAR CRÉDITOS</h3>
          <p style={{ fontSize: '11px', color: s.textMuted, margin: '10px 0' }}>Carga fondos mediante transferencia o PayPal.</p>
          <Link to="/creditos"><button className="dash-btn" style={styles.button}>COMPRAR CRÉDITOS</button></Link>
        </div>
        <div className="dash-card" style={{ ...styles.card, animationDelay: '0.16s' }}>
          <div className="dash-icon" style={{ fontSize: '40px', marginBottom: '10px', color: isDark ? '#fff' : 'inherit' }}><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-send-check-fill" viewBox="0 0 16 16">
            <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 1.59 2.498C8 14 8 13 8 12.5a4.5 4.5 0 0 1 5.026-4.47zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471z" />
            <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686" />
          </svg></div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase', color: s.text }}>Soporte</h3>
          <p style={{ fontSize: '11px', color: s.textMuted, margin: '10px 0' }}>Tiempo estimado de respuesta: 15 - 45 min. Lunes a Viernes.</p>
          <Link to="/tickets"><button className="dash-btn" style={styles.button}>IR A SOPORTE</button></Link>
        </div>
      </div>

      {/* SECCIÓN DE PARTNERS (NUEVA) */}
      <div style={styles.partnerSection}>
        <div style={styles.partnerTitle}>Official Technology Partners</div>
        <div style={styles.partnerRibbon}>
          {[
            { id: 2, src: isDark ? logoMagicWhite : logoMagic, name: 'Magic', height: isDark ? '34px' : '130px' },
            { id: 3, src: logoStageX, name: 'StageX' },
            { id: 4, src: logoFlex, name: 'Flex' },
            { id: 5, src: isDark ? logoDyno : logoDynoBlack, name: 'DynoMag', height: '100px' }
          ].map((logo) => (
            <img
              key={logo.id}
              src={logo.src}
              alt={logo.name}
              style={{ ...styles.logoStyle, height: logo.height || styles.logoStyle.height }}
              onMouseOver={(e) => {
                e.currentTarget.style.filter = 'grayscale(0) opacity(1) drop-shadow(0px 0px 8px rgba(225, 29, 72, 0.3))';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.filter = 'grayscale(1) opacity(0.6)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      </div>

      <footer style={{ marginTop: 'auto', padding: '40px 30px', borderTop: `1px solid ${s.border}`, backgroundColor: s.cardBg, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
        <div>
          <h4 style={{ fontSize: '12px', color: '#D9241D', marginBottom: '15px', textTransform: 'uppercase' }}>🕒 Horarios de Atención</h4>
          <p style={{ fontSize: '13px', color: s.textMuted, margin: '5px 0' }}><strong>Lunes a Viernes:</strong> 09:00 - 13:00 / 15:00 - 19:00</p>
          <p style={{ fontSize: '13px', color: s.textMuted, margin: '5px 0' }}><strong>Sábados:</strong> 09:00 - 13:00 hrs</p>
        </div>
        <div>
          <h4 style={{ fontSize: '12px', color: '#D9241D', marginBottom: '15px', textTransform: 'uppercase' }}>📞 Contacto Técnico</h4>
          <p style={{ fontSize: '13px', color: s.textMuted, margin: '5px 0' }}><strong>WhatsApp:</strong> +56 9 9516 1488</p>
          <p style={{ fontSize: '13px', color: s.textMuted, margin: '5px 0' }}><strong>Email:</strong> stockcarscl@gmail.com</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ fontSize: '12px', color: s.text, marginBottom: '15px', textTransform: 'uppercase' }}>StockCars Service</h4>
          <p style={{ fontSize: '11px', color: s.textMuted, margin: '5px 0' }}>© 2026 Reservados todos los derechos.</p>
          <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '15px', letterSpacing: '0.5px' }}>DESARROLLADO POR <a href="https://focaldev.cl/" target="_blank" rel="noopener noreferrer" style={{ color: '#D9241D', fontWeight: 'bold', textDecoration: 'none' }}>FOCALDEV</a></p>
        </div>
      </footer>

      <a
        href="https://wa.me/56995161488?text=Hola%2C%20necesito%20ayuda%20con%20algo%20del%20portal"
        target="_blank"
        rel="noopener noreferrer"
        className="wsp-bubble"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          backgroundColor: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          zIndex: 2000,
          textDecoration: 'none'
        }}
        aria-label="Contactar por WhatsApp"
        title="Contactar por WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="white" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.336-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
        </svg>
      </a>
    </div>
  );
};

export default DashboardTorresAguayo;