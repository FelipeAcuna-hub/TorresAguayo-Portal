import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logoTorres from '../magic_torresaguayo.svg';
import logoStageX from '../magicstagex.svg';
import logoFlex from '../magicflex.svg';
import logoMagic from '../magicmotors.svg';
import logoStockcars from '../logoStockcars.png';

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
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
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
      borderLeft: '5px solid #e11d48',
      flexShrink: 0, // Evita que el banner se achique si otros elementos crecen
      minHeight: '180px' // Asegura un tamaño mínimo siempre
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 30px', marginBottom: '30px' },
    card: { backgroundColor: 'white', padding: '30px', textAlign: 'center', borderRadius: '4px', borderBottom: '4px solid #eee', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', borderRadius: '2px', textTransform: 'uppercase', fontSize: '12px' },
    // ESTILOS DE PARTNERS
    partnerSection: { margin: '10px 30px 20px 30px', textAlign: 'center' },
    partnerTitle: { fontSize: '10px', color: '#999', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '15px', fontWeight: 'bold' },
    partnerRibbon: { backgroundColor: 'rgba(0,0,0,0.03)', padding: '15px 20px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '80px', flexWrap: 'wrap', border: '1px solid #eee' },
    logoStyle: { height: '130px', width: 'auto', filter: 'grayscale(1) opacity(0.6)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer' }
  };

  return (
    <div style={styles.main}>
      <style>{`
        @keyframes fadeInLogo {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <section style={styles.banner}>
        <div style={{ animation: 'fadeInLogo 1s ease-out' }}>
          <img
            src={logoTorres}
            alt="Torres Aguayo Logo"
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
            Plataforma <span style={{ color: '#e11d48' }}>Reseller</span>
          </h1>
          <h2 style={{ fontSize: '24px', color: '#e11d48', margin: '2px 0 0 0', fontStyle: 'italic', fontWeight: 'bold' }}>
            Dealer Online
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '15px', letterSpacing: '2px', fontWeight: 'bold' }}>
            TORRES AGUAYO MOTORSPORT — CHILE
          </p>
        </div>
      </section>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase' }}>SUBIR ARCHIVOS</h3>
          <p style={{ fontSize: '11px', color: '#888', margin: '10px 0' }}>Carga tu archivo y recibe una notificación de confirmación.</p>
          <Link to="/upload"><button style={styles.button}>SUBIR EL ARCHIVO</button></Link>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>💰</div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase' }}>CARGAR CRÉDITOS</h3>
          <p style={{ fontSize: '11px', color: '#888', margin: '10px 0' }}>Carga fondos mediante transferencia o Webpay.</p>
          <Link to="/creditos"><button style={styles.button}>COMPRAR CRÉDITOS</button></Link>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔧</div>
          <h3 style={{ margin: '0', fontSize: '16px', textTransform: 'uppercase' }}>Soporte</h3>
          <p style={{ fontSize: '11px', color: '#888', margin: '10px 0' }}>Tiempo estimado de respuesta: 15 - 45 min. Lunes a Viernes.</p>
          <Link to="/tickets"><button style={styles.button}>IR A SOPORTE</button></Link>
        </div>
      </div>

      {/* SECCIÓN DE PARTNERS (NUEVA) */}
      <div style={styles.partnerSection}>
        <div style={styles.partnerTitle}>Official Technology Partners</div>
        <div style={styles.partnerRibbon}>
          {[
            { id: 1, src: logoTorres, name: 'Torres Aguayo' },
            { id: 2, src: logoMagic, name: 'Magic' },
            { id: 3, src: logoStageX, name: 'StageX' },
            { id: 4, src: logoFlex, name: 'Flex' },
            { id: 5, src: logoStockcars, name: 'StockCars' }
          ].map((logo) => (
            <img
              key={logo.id}
              src={logo.src}
              alt={logo.name}
              style={styles.logoStyle}
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

      <footer style={{ marginTop: 'auto', padding: '40px 30px', borderTop: '1px solid #ddd', backgroundColor: '#f9f9f9', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
        <div>
          <h4 style={{ fontSize: '12px', color: '#e11d48', marginBottom: '15px', textTransform: 'uppercase' }}>🕒 Horarios de Atención</h4>
          <p style={{ fontSize: '13px', color: '#555', margin: '5px 0' }}><strong>Lunes a Viernes:</strong> 09:00 - 13:00 / 15:00 - 19:00</p>
          <p style={{ fontSize: '13px', color: '#555', margin: '5px 0' }}><strong>Sábados:</strong> 09:00 - 13:00 hrs</p>
        </div>
        <div>
          <h4 style={{ fontSize: '12px', color: '#e11d48', marginBottom: '15px', textTransform: 'uppercase' }}>📞 Contacto Técnico</h4>
          <p style={{ fontSize: '13px', color: '#555', margin: '5px 0' }}><strong>WhatsApp:</strong> +56 9 9516 1488 || +56 9 8499 6539</p>
          <p style={{ fontSize: '13px', color: '#555', margin: '5px 0' }}><strong>Email:</strong> scannerstorresaguayo@gmail.com</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ fontSize: '12px', color: '#000', marginBottom: '15px', textTransform: 'uppercase' }}>Torres Aguayo Motorsport</h4>
          <p style={{ fontSize: '11px', color: '#999', margin: '5px 0' }}>© 2026 Reservados todos los derechos.</p>
          <p style={{ fontSize: '10px', color: '#ccc', marginTop: '15px' }}>v1.0.4 - Developer: Felipe Acuña</p>
        </div>
      </footer>
    </div>
  );
};

export default DashboardTorresAguayo;