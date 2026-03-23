import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Admin = ({ session }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  const [config, setConfig] = useState({ is_online: true, mensaje_online: '', mensaje_offline: '' });

  // --- CONFIGURACIÓN DE LOS 3 ADMINISTRADORES (AGREGADO) ---
  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    // Solo carga datos si es uno de los 3 admins
    if (isAdmin) {
      fetchUsers();
      fetchConfig();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("Actualizando lista de usuarios...");

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
    const { data } = await supabase
      .from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
    if (data) setConfig(data);
  };

  const fetchMovimientos = async (userId) => {
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setMovimientos(data || []);
  };

  const toggleAtencion = async () => {
    const nuevoEstado = !config.is_online;
    const { error } = await supabase
      .from('configuracion_global')
      .update({ is_online: nuevoEstado })
      .eq('id', 'atencion_cliente');
    if (!error) setConfig({ ...config, is_online: nuevoEstado });
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
            tipo: tipoMovimiento
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

  const styles = {
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' },
    switchCard: { backgroundColor: 'white', margin: '30px 30px 0 30px', padding: '20px 30px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ddd', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    contentCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', fontSize: '11px', color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee' },
    td: { padding: '12px', fontSize: '13px', borderBottom: '1px solid #eee' },
    btnAction: { backgroundColor: 'black', color: 'white', border: 'none', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' },
    btnInfo: { backgroundColor: 'transparent', color: '#666', border: '1px solid #ddd', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', fontSize: '10px', marginRight: '5px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '550px', maxHeight: '85vh', overflowY: 'auto' }
  };

  // Validación de seguridad visual
  if (!isAdmin) {
    return <div style={{ padding: '50px', textAlign: 'center' }}><h2>Acceso Denegado</h2></div>;
  }

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

      <div style={styles.switchCard}>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>Estado de Atención Global</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#888' }}>Cambia el banner de Online/Offline.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: config.is_online ? '#228b22' : '#e11d48', fontWeight: 'bold', fontSize: '13px' }}>
            {config.is_online ? '● SISTEMA ONLINE' : '○ SISTEMA CERRADO'}
          </span>
          <button
            onClick={toggleAtencion}
            style={{ backgroundColor: config.is_online ? '#e11d48' : '#228b22', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}
          >
            {config.is_online ? 'Desactivar Atención' : 'Activar Atención'}
          </button>
        </div>
      </div>

      <div style={styles.contentCard}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', textTransform: 'uppercase' }}>Usuarios y Créditos</h2>
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
            {users.map((u) => (
              <tr key={u.id}>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>{u.full_name || 'Sin nombre'}</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: u.credits > 0 ? '#22c55e' : '#e11d48' }}>{u.credits.toLocaleString('es-CL')}</td>
                <td style={styles.td}>
                  <button style={styles.btnInfo} onClick={() => handleOpenDetails(u)}>ℹ️ DETALLES</button>
                  <button style={{ ...styles.btnAction, backgroundColor: '#228b22', marginRight: '5px' }} onClick={() => handleAdjustCredits(u.id, u.credits, 'SUMAR')}>+</button>
                  <button style={{ ...styles.btnAction, backgroundColor: '#e11d48' }} onClick={() => handleAdjustCredits(u.id, u.credits, 'RESTAR')}>-</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <p style={{ fontSize: '14px', margin: '5px 0 15px 0', fontWeight: 'bold', color: '#e11d48', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>{selectedUser.credits.toLocaleString('es-CL')}</p>
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