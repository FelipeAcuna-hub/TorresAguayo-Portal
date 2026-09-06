import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens } from '../ThemeContext';

const checkIsWorkTime = () => {
  const now = new Date();
  const chileTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const hour = chileTime.getHours();
  const day = chileTime.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado

  if (day === 0) return false;
  // Sábado: turno reducido de 10 a 12
  if (day === 6) return hour >= 10 && hour < 12;

  // Turno mañana: Lunes a Viernes de 09:00 a 13:00
  const morningShift = hour >= 9 && hour < 13;
  // Turno tarde: Lunes a Viernes de 15:00 a 19:00
  const afternoonShift = hour >= 15 && hour < 19;

  return morningShift || afternoonShift;
};

const Admin = ({ session }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsArchivos, setStatsArchivos] = useState({ semana: 0, mes: 0, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // Inicializado con un valor por defecto seguro
  const [config, setConfig] = useState({ is_online: 'auto', mensaje_online: '', mensaje_offline: '' });

  // --- NUEVOS ESTADOS PARA BÚSQUEDA Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);

  // --- CONFIGURACIÓN DE LOS ADMINISTRADORES ---
  const ADMIN_EMAILS = [
    'stockcarscl@gmail.com',
    'felipe.acuna2@mail.udp.cl'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchConfig();
      fetchStatsArchivos();
    }
  }, [isAdmin]);

  const fetchStatsArchivos = async () => {
    try {
      const ahora = new Date();

      // Inicio de la semana (lunes 00:00)
      const inicioSemana = new Date(ahora);
      const diaSemana = (inicioSemana.getDay() + 6) % 7; // 0 = lunes
      inicioSemana.setDate(inicioSemana.getDate() - diaSemana);
      inicioSemana.setHours(0, 0, 0, 0);

      // Inicio del mes
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);

      const [semanaRes, mesRes, totalRes] = await Promise.all([
        supabase.from('archivos').select('id', { count: 'exact', head: true })
          .eq('estado', 'completado').gte('created_at', inicioSemana.toISOString()),
        supabase.from('archivos').select('id', { count: 'exact', head: true })
          .eq('estado', 'completado').gte('created_at', inicioMes.toISOString()),
        supabase.from('archivos').select('id', { count: 'exact', head: true })
          .eq('estado', 'completado')
      ]);

      setStatsArchivos({
        semana: semanaRes.count || 0,
        mes: mesRes.count || 0,
        total: totalRes.count || 0
      });
    } catch (error) {
      console.error("Error cargando estadísticas de archivos:", error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
      if (data && !error) setConfig(data);
    } catch (e) {
      console.error("Error cargando config inicial:", e);
    }
  };

  const fetchMovimientos = async (userId) => {
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setMovimientos(data || []);
  };

  const handleOpenDetails = (user) => {
    setSelectedUser(user);
    fetchMovimientos(user.id);
  };

  const handleAdjustCredits = async (userId, currentCredits, accion) => {
    const amountStr = prompt(`¿Cuántos créditos desea ${accion.toLowerCase()}?`);
    if (!amountStr || isNaN(amountStr) || parseInt(amountStr) <= 0) return;
    const amount = parseInt(amountStr);

    if (accion === 'RESTAR' && currentCredits < amount) {
      alert("Error: El usuario no tiene suficientes créditos.");
      return;
    }

    const desc = prompt("Motivo del ajuste:",
      accion === 'SUMAR' ? "Carga manual de créditos" : "Retiro manual de créditos");
    if (desc === null) return;

    try {
      const nuevoTotal = accion === 'SUMAR' ? currentCredits + amount : currentCredits - amount;
      const tipoMovimiento = accion === 'SUMAR' ? 'carga' : 'gasto';

      const { error: errorUpdate } = await supabase
        .from('profiles')
        .update({ credits: nuevoTotal })
        .eq('id', userId);

      if (errorUpdate) throw errorUpdate;

      const { error: errorMov } = await supabase
        .from('movimientos')
        .insert([
          {
            user_id: userId,
            descripcion: desc,
            cantidad: amount,
            tipo: tipoMovimiento,
            admin_email: session?.user?.email
          }
        ]);

      if (errorMov) throw errorMov;

      alert(`✅ Operación exitosa. Nuevo saldo: ${nuevoTotal.toLocaleString('es-CL')}`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) fetchMovimientos(userId);

    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // FUNCIÓN MAESTRA: Cambia el color EN EL ACTO y luego actualiza Supabase
  const cambiarEstadoInmediato = async (nuevoEstado) => {
    // 1. Actualiza la pantalla de inmediato sin esperar al servidor
    setConfig(prev => ({ ...prev, is_online: nuevoEstado }));

    // 2. Ejecuta el evento para avisarle al Layout de inmediato
    window.dispatchEvent(new CustomEvent('config-updated'));

    // 3. Guarda en Supabase en segundo plano
    try {
      await supabase
        .from('configuracion_global')
        .update({ is_online: nuevoEstado })
        .eq('id', 'atencion_cliente');
    } catch (err) {
      console.error("Error guardando en segundo plano:", err);
    }
  };

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
  const usersFiltrados = users.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (u.full_name?.toLowerCase().includes(searchLower)) ||
      (u.email?.toLowerCase().includes(searchLower))
    );
  });

  const totalPaginas = Math.ceil(usersFiltrados.length / itemsPorPagina);
  const indiceUltimo = paginaActual * itemsPorPagina;
  const indicePrimer = indiceUltimo - itemsPorPagina;
  const usersPaginados = usersFiltrados.slice(indicePrimer, indiceUltimo);

  const styles = {
    main: { flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh' },
    topBar: { display: 'flex', justifyContent: 'flex-end', padding: '24px 30px 0 30px' },
    btnRefresh: (busy) => ({
      padding: '9px 18px', cursor: busy ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '700',
      borderRadius: '999px', border: `1px solid ${s.border}`, backgroundColor: busy ? s.headerBg : s.cardBg,
      color: busy ? s.textFaint : s.text, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)'
    }),
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 30px 0 30px' },
    statTile: { backgroundColor: s.cardBg, padding: '22px 24px', borderRadius: '20px', border: `1px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px' },
    statIconWrap: (color) => ({ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    statNumber: { fontSize: '26px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px', lineHeight: 1.1 },
    statLabel: { fontSize: '11px', color: s.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' },
    statusCard: { backgroundColor: s.cardBg, margin: '20px 30px 0 30px', padding: '28px', borderRadius: '20px', border: `1px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' },
    cardTitle: { margin: 0, fontSize: '15px', fontWeight: '800', color: s.text, letterSpacing: '-0.2px' },
    cardSubtitle: { margin: '5px 0 0 0', fontSize: '12px', color: s.textMuted },
    statusPill: (color) => ({
      display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '700', color, backgroundColor: `${color}15`, border: `1px solid ${color}30`
    }),
    segmented: { display: 'flex', gap: '8px', marginTop: '22px', flexWrap: 'wrap' },
    contentCard: { backgroundColor: s.cardBg, margin: '20px 30px 30px 30px', padding: '28px', borderRadius: '20px', border: `1px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' },
    sectionTitle: { fontSize: '16px', fontWeight: '800', marginBottom: '18px', color: s.text, letterSpacing: '-0.2px' },
    searchBar: {
      display: 'flex', alignItems: 'center', backgroundColor: s.inputBg,
      padding: '11px 16px', borderRadius: '12px', border: `1.5px solid ${s.inputBorder}`,
      marginBottom: '22px', width: '100%', maxWidth: '400px'
    },
    tableWrap: { width: '100%', overflowX: 'auto', borderRadius: '14px', border: `1px solid ${s.border}` },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    th: { textAlign: 'left', padding: '13px 16px', fontSize: '10px', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800', backgroundColor: s.headerBg, borderBottom: `1px solid ${s.rowBorder}` },
    td: { padding: '13px 16px', fontSize: '13px', borderBottom: `1px solid ${s.rowBorder}`, color: s.text },
    creditsPill: (positive) => ({
      display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontWeight: '800', fontSize: '12px',
      color: positive ? '#166534' : '#991b1b', backgroundColor: positive ? '#dcfce7' : '#fee2e2'
    }),
    btnIcon: { backgroundColor: 'transparent', color: s.textMuted, border: `1px solid ${s.border}`, padding: '7px 11px', fontWeight: '700', cursor: 'pointer', borderRadius: '9px', fontSize: '11px', marginRight: '6px' },
    btnPlus: { backgroundColor: '#16a34a', color: 'white', border: 'none', width: '28px', height: '28px', fontWeight: '800', cursor: 'pointer', borderRadius: '9px', fontSize: '13px', marginRight: '6px' },
    btnMinus: { backgroundColor: '#D9241D', color: 'white', border: 'none', width: '28px', height: '28px', fontWeight: '800', cursor: 'pointer', borderRadius: '9px', fontSize: '13px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalBox: { backgroundColor: s.cardBg, padding: '30px', borderRadius: '20px', width: '550px', maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '26px' },
    pageBtn: (active) => ({
      padding: '8px 16px', cursor: 'pointer', backgroundColor: active ? '#D9241D' : s.cardBg,
      color: active ? 'white' : s.textMuted, border: `1px solid ${s.border}`, borderRadius: '10px', fontSize: '12px', fontWeight: '700'
    })
  };

  if (!isAdmin) {
    return <div style={{ padding: '50px', textAlign: 'center' }}><h2>Acceso Denegado</h2></div>;
  }

  // Evaluaciones directas del estado actual
  const currentOnlineState = config?.is_online;
  const isAutoActive = currentOnlineState === 'auto' || currentOnlineState === true || currentOnlineState === "true";
  const isManualOnActive = currentOnlineState === 'manual_on';
  const isManualOffActive = currentOnlineState === 'manual_off' || currentOnlineState === false || currentOnlineState === "false";

  const statusColor = isManualOnActive ? '#22c55e' : (isManualOffActive ? '#D9241D' : (checkIsWorkTime() ? '#22c55e' : '#D9241D'));
  const statusLabel = isManualOnActive
    ? 'Online forzado (manual)'
    : isManualOffActive
      ? 'Bloqueado manualmente'
      : (checkIsWorkTime() ? 'Automático: online' : 'Automático: cerrado');

  return (
    <div style={styles.main}>
      <style>{`
        @keyframes adminFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .admin-card { animation: adminFadeUp 0.3s ease both; }
        .refresh-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .refresh-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,0.1); }
        .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
        .segment-btn {
          flex: 1; padding: 13px; font-size: 11px; font-weight: 800; border: none; border-radius: 12px;
          cursor: pointer; text-transform: uppercase; letter-spacing: 0.3px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
          background-color: ${s.headerBg}; color: ${s.textMuted};
        }
        .segment-btn:hover { transform: translateY(-2px); }
        .segment-btn.active-auto { background-color: #111; color: white; box-shadow: 0 6px 14px rgba(0,0,0,0.2); }
        .segment-btn.active-on { background-color: #22c55e; color: white; box-shadow: 0 6px 14px rgba(34,197,94,0.3); }
        .segment-btn.active-off { background-color: #e11d48; color: white; box-shadow: 0 6px 14px rgba(225,29,72,0.3); }
        .search-wrap { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .search-wrap:focus-within { border-color: #e11d48; box-shadow: 0 0 0 4px rgba(225,29,72,0.1); }
        .admin-row { transition: background-color 0.15s ease; }
        .admin-row:hover { background-color: ${s.rowHover}; }
        .icon-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .icon-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .page-btn-admin:hover { transform: translateY(-2px); border-color: #e11d48; }
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPopIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-overlay-anim { animation: overlayFadeIn 0.2s ease; }
        .modal-content-anim { animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div style={styles.topBar}>
        <button
          className="refresh-btn"
          onClick={() => { fetchUsers(); fetchStatsArchivos(); }}
          disabled={loading}
          style={styles.btnRefresh(loading)}
        >
          {loading ? '⏳ Actualizando...' : '⟳ Actualizar lista'}
        </button>
      </div>

      {/* ESTADÍSTICAS DE ARCHIVOS PROCESADOS */}
      <div className="admin-card" style={styles.statsGrid}>
        <div style={styles.statTile}>
          <div style={styles.statIconWrap('#0ea5e9')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM0 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
            </svg>
          </div>
          <div>
            <div style={styles.statNumber}>{statsArchivos.semana.toLocaleString('es-CL')}</div>
            <div style={styles.statLabel}>Esta semana</div>
          </div>
        </div>
        <div style={styles.statTile}>
          <div style={styles.statIconWrap('#a855f7')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
            </svg>
          </div>
          <div>
            <div style={styles.statNumber}>{statsArchivos.mes.toLocaleString('es-CL')}</div>
            <div style={styles.statLabel}>Este mes</div>
          </div>
        </div>
        <div style={styles.statTile}>
          <div style={styles.statIconWrap('#22c55e')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" />
            </svg>
          </div>
          <div>
            <div style={styles.statNumber}>{statsArchivos.total.toLocaleString('es-CL')}</div>
            <div style={styles.statLabel}>Total procesados</div>
          </div>
        </div>
      </div>

      {/* CARD DE CONTROL GLOBAL */}
      <div className="admin-card" style={{ ...styles.statusCard, animationDelay: '0.03s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={styles.cardTitle}>Estado de atención global</h3>
            <p style={styles.cardSubtitle}>Controla el banner del sistema de créditos en tiempo real.</p>
          </div>
          <span style={styles.statusPill(statusColor)}>
            <span className="status-dot" style={{ backgroundColor: statusColor }} />
            {statusLabel}
          </span>
        </div>

        {/* BOTONERA TRIPLE ASIGNADA A LA FUNCIÓN INMEDIATA */}
        <div style={styles.segmented}>
          <button
            className={`segment-btn${isAutoActive ? ' active-auto' : ''}`}
            onClick={() => cambiarEstadoInmediato('auto')}
          >
            ⏰ Modo Auto (Por Horario)
          </button>

          <button
            className={`segment-btn${isManualOnActive ? ' active-on' : ''}`}
            onClick={() => cambiarEstadoInmediato('manual_on')}
          >
            🔓 Forzar Online (Para Domingos)
          </button>

          <button
            className={`segment-btn${isManualOffActive ? ' active-off' : ''}`}
            onClick={() => cambiarEstadoInmediato('manual_off')}
          >
            🔒 Forzar Cierre (Manual)
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ ...styles.contentCard, animationDelay: '0.06s' }}>
        <h2 style={styles.sectionTitle}>Usuarios y créditos</h2>

        {/* BARRA DE BÚSQUEDA */}
        <div className="search-wrap" style={styles.searchBar}>
          <span style={{ marginRight: '10px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent', color: s.text }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPaginaActual(1); }}
          />
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Créditos</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersPaginados.map((u) => (
                <tr className="admin-row" key={u.id}>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.full_name || 'Sin nombre'}</td>
                  <td style={styles.td}>
                    <span style={styles.creditsPill(u.credits > 0)}>{u.credits?.toLocaleString('es-CL')}</span>
                  </td>
                  <td style={styles.td}>
                    <button className="icon-btn" style={styles.btnIcon} onClick={() => handleOpenDetails(u)}>ℹ️ Detalles</button>
                    <button className="icon-btn" style={styles.btnPlus} onClick={() => handleAdjustCredits(u.id, u.credits, 'SUMAR')}>+</button>
                    <button className="icon-btn" style={styles.btnMinus} onClick={() => handleAdjustCredits(u.id, u.credits, 'RESTAR')}>−</button>
                  </td>
                </tr>
              ))}
              {!loading && usersPaginados.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: s.textMuted }}>No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={styles.pagination}>
            <button
              className="page-btn-admin"
              onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
              disabled={paginaActual === 1}
              style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}
            >
              ← Anterior
            </button>
            {[...Array(totalPaginas).keys()].map(n => (
              <button
                className="page-btn-admin"
                key={n + 1}
                onClick={() => { setPaginaActual(n + 1); window.scrollTo(0, 0); }}
                style={styles.pageBtn(paginaActual === n + 1)}
              >
                {n + 1}
              </button>
            ))}
            <button
              className="page-btn-admin"
              onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0, 0); }}
              disabled={paginaActual === totalPaginas}
              style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="modal-overlay-anim" style={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className="modal-content-anim" style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ borderBottom: '2px solid #D9241D', paddingBottom: '10px', textTransform: 'uppercase', fontSize: '14px', color: s.text }}>Ficha del Distribuidor</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              <div>
                <p style={{ fontSize: '10px', color: s.textMuted, margin: 0, fontWeight: 'bold' }}>NOMBRE COMPLETO</p>
                <p style={{ fontSize: '14px', margin: '5px 0 15px 0', borderBottom: '1px solid #D9241D', paddingBottom: '5px', color: s.text }}>{selectedUser.full_name || 'No reg.'}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: s.textMuted, margin: 0, fontWeight: 'bold' }}>CRÉDITOS DISPONIBLES</p>
                <p style={{ fontSize: '14px', margin: '5px 0 15px 0', fontWeight: 'bold', color: '#D9241D', borderBottom: '1px solid #D9241D', paddingBottom: '5px' }}>{selectedUser.credits?.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <h4 style={{ marginTop: '25px', fontSize: '12px', borderBottom: `1px solid ${s.text}`, paddingBottom: '5px', textTransform: 'uppercase', color: s.text }}>Historial de Movimientos</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: s.textMuted, borderBottom: `1px solid ${s.rowBorder}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>FECHA</th>
                    <th style={{ textAlign: 'left' }}>DETALLE</th>
                    <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${s.rowBorder}`, color: s.text }}>
                      <td style={{ padding: '10px 0' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                      <td>{m.descripcion}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#D9241D' : '#228b22' }}>{m.tipo === 'gasto' ? '-' : '+'}{m.cantidad.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="icon-btn" onClick={() => setSelectedUser(null)} style={{ backgroundColor: '#111', color: 'white', border: 'none', width: '100%', padding: '14px', marginTop: '25px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
