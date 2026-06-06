import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const checkIsWorkTime = () => {
  const now = new Date();
  const chileTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const hour = chileTime.getHours();
  const day = chileTime.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado

  // Turno mañana: Lunes a Sábado de 09:00 a 13:00
  const morningShift = hour >= 9 && hour < 13;
  // Turno tarde: Solo Lunes a Viernes (1 al 5) de 15:00 a 19:00
  const afternoonShift = day !== 6 && day !== 0 && hour >= 15 && hour < 19;

  // Está abierto si es de Lunes a Sábado y calza con los turnos (Domingo siempre cerrado)
  return day !== 0 && (morningShift || afternoonShift);
};

const Admin = ({ session }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Inicializado con un valor por defecto seguro
  const [config, setConfig] = useState({ is_online: 'auto', mensaje_online: '', mensaje_offline: '' });

  // --- NUEVOS ESTADOS PARA BÚSQUEDA Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);

  // --- CONFIGURACIÓN DE LOS 3 ADMINISTRADORES ---
  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchConfig();
    }
  }, [isAdmin]);

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
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    switchCard: { backgroundColor: 'white', margin: '30px 30px 0 30px', padding: '20px 30px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ddd', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    contentCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    searchBar: {
      display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6',
      padding: '10px 15px', borderRadius: '4px', border: '1px solid #ddd',
      marginBottom: '20px', width: '100%', maxWidth: '400px'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', fontSize: '11px', color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee' },
    td: { padding: '12px', fontSize: '13px', borderBottom: '1px solid #eee' },
    btnAction: { backgroundColor: 'black', color: 'white', border: 'none', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' },
    btnInfo: { backgroundColor: 'transparent', color: '#666', border: '1px solid #ddd', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', fontSize: '10px', marginRight: '5px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '550px', maxHeight: '85vh', overflowY: 'auto' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px' },
    pageBtn: (active) => ({
      padding: '8px 16px', cursor: 'pointer', backgroundColor: active ? '#e11d48' : 'white',
      color: active ? 'white' : '#666', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
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

  return (
    <div style={styles.main}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px 30px 0 30px' }}>
        <button
          onClick={() => fetchUsers()}
          disabled={loading}
          style={{
            padding: '5px 15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            backgroundColor: loading ? '#f0f0f0' : 'white',
            color: loading ? '#999' : 'black',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'ACTUALIZANDO...' : 'Actualizar Lista'}
        </button>
      </div>

      {/* CARD DE CONTROL GLOBAL REVISADO */}
      <div style={{ ...styles.switchCard, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>Estado de Atención Global</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#888' }}>
              Selecciona cómo debe operar el banner del sistema de créditos en tiempo real.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: '14px',
              color: isManualOnActive ? '#22c55e' : (isManualOffActive ? '#e11d48' : (checkIsWorkTime() ? '#22c55e' : '#e11d48'))
            }}>
              {isManualOnActive && '🟢 ONLINE FORZADO (MANUAL)'}
              {isManualOffActive && '🔴 BLOQUEADO MANUALMENTE'}
              {isAutoActive && (checkIsWorkTime() ? '🟢 AUTOMÁTICO: ONLINE' : '🔴 AUTOMÁTICO: CERRADO')}
            </span>
          </div>
        </div>

        {/* BOTONERA TRIPLE ASIGNADA A LA FUNCIÓN INMEDIATA */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          
          {/* BOTÓN AUTOMÁTICO */}
          <button
            onClick={() => cambiarEstadoInmediato('auto')}
            style={{
              flex: 1, padding: '12px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.1s',
              backgroundColor: isAutoActive ? '#000000' : '#e5e7eb',
              color: isAutoActive ? '#ffffff' : '#4b5563',
              boxShadow: isAutoActive ? '0 4px 6px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            ⏰ Modo Auto (Por Horario)
          </button>

          {/* BOTÓN MANUAL OPEN */}
          <button
            onClick={() => cambiarEstadoInmediato('manual_on')}
            style={{
              flex: 1, padding: '12px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.1s',
              backgroundColor: isManualOnActive ? '#22c55e' : '#e5e7eb',
              color: isManualOnActive ? '#ffffff' : '#4b5563',
              boxShadow: isManualOnActive ? '0 4px 6px rgba(34,197,94,0.3)' : 'none'
            }}
          >
            🔓 Forzar Online (Para Domingos)
          </button>

          {/* BOTÓN MANUAL CLOSED */}
          <button
            onClick={() => cambiarEstadoInmediato('manual_off')}
            style={{
              flex: 1, padding: '12px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.1s',
              backgroundColor: isManualOffActive ? '#e11d48' : '#e5e7eb',
              color: isManualOffActive ? '#ffffff' : '#4b5563',
              boxShadow: isManualOffActive ? '0 4px 6px rgba(225,29,72,0.3)' : 'none'
            }}
          >
            🔒 Forzar Cierre (Manual)
          </button>

        </div>
      </div>

      <div style={styles.contentCard}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', textTransform: 'uppercase' }}>Usuarios y Créditos</h2>

        {/* BARRA DE BÚSQUEDA */}
        <div style={styles.searchBar}>
          <span style={{ marginRight: '10px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent' }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPaginaActual(1); }}
          />
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>EMAIL</th>
              <th style={styles.th}>NOMBRE</th>
              <th style={styles.th}>CRÉDITOS</th>
              <th style={styles.th}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {usersPaginados.map((u) => (
              <tr key={u.id}>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>{u.full_name || 'Sin nombre'}</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: u.credits > 0 ? '#22c55e' : '#e11d48' }}>{u.credits?.toLocaleString('es-CL')}</td>
                <td style={styles.td}>
                  <button style={styles.btnInfo} onClick={() => handleOpenDetails(u)}>ℹ️ DETALLES</button>
                  <button style={{ ...styles.btnAction, backgroundColor: '#228b22', marginRight: '5px' }} onClick={() => handleAdjustCredits(u.id, u.credits, 'SUMAR')}>+</button>
                  <button style={{ ...styles.btnAction, backgroundColor: '#e11d48' }} onClick={() => handleAdjustCredits(u.id, u.credits, 'RESTAR')}>-</button>
                </td>
              </tr>
            ))}
            {!loading && usersPaginados.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No se encontraron usuarios.</td></tr>
            )}
          </tbody>
        </table>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
              disabled={paginaActual === 1}
              style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}
            >
              ← ANTERIOR
            </button>
            {[...Array(totalPaginas).keys()].map(n => (
              <button
                key={n + 1}
                onClick={() => { setPaginaActual(n + 1); window.scrollTo(0, 0); }}
                style={styles.pageBtn(paginaActual === n + 1)}
              >
                {n + 1}
              </button>
            ))}
            <button
              onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0, 0); }}
              disabled={paginaActual === totalPaginas}
              style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}
            >
              SIGUIENTE →
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ borderBottom: '2px solid #e11d48', paddingBottom: '10px', textTransform: 'uppercase' }}>Ficha del Distribuidor</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#888', margin: 0, fontWeight: 'bold' }}>NOMBRE COMPLETO</p>
                <p style={{ fontSize: '14px', margin: '5px 0 15px 0', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>{selectedUser.full_name || 'No reg.'}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#888', margin: 0, fontWeight: 'bold' }}>CRÉDITOS DISPONIBLES</p>
                <p style={{ fontSize: '14px', margin: '5px 0 15px 0', fontWeight: 'bold', color: '#e11d48', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>{selectedUser.credits?.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <h4 style={{ marginTop: '25px', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', textTransform: 'uppercase' }}>Historial de Movimientos</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#888', borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>FECHA</th>
                    <th style={{ textAlign: 'left' }}>DETALLE</th>
                    <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '10px 0' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                      <td>{m.descripcion}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#e11d48' : '#228b22' }}>{m.tipo === 'gasto' ? '-' : '+'}{m.cantidad.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setSelectedUser(null)} style={{ ...styles.btnAction, width: '100%', padding: '14px', marginTop: '25px', backgroundColor: '#e11d48', borderRadius: '4px' }}>CERRAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;