import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Clientes = ({ session }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pendientes'); // 'pendientes' o 'activos'

  // --- 1. CARGAR DATOS ---
  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error cargando clientes:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // --- 2. ACCIONES DE ADMINISTRADOR ---
  const handleAprobar = async (id, email) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      
      alert(`✅ Cliente aprobado. Se notificará a ${email}`);
      // Aquí podrías disparar tu función de correo 'swift-function' si quieres avisarle
      fetchClientes();
    } catch (error) {
      alert("Error al aprobar: " + error.message);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta solicitud/cliente? Esta acción no se puede deshacer.")) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        alert("Registro eliminado.");
        fetchClientes();
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  // --- 3. FILTRADO ---
  const solicitudesPendientes = clientes.filter(c => c.is_approved !== true);
  const clientesActivos = clientes.filter(c => c.is_approved === true);

  console.log("Total clientes:", clientes.length);
  console.log("Activos:", clientesActivos.length);
  console.log("Pendientes:", solicitudesPendientes.length);
  
  const styles = {
    container: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
    tab: (active) => ({
      padding: '10px 20px',
      cursor: 'pointer',
      backgroundColor: active ? '#000' : '#ddd',
      color: active ? '#fff' : '#666',
      fontWeight: 'bold',
      fontSize: '12px',
      border: 'none',
      borderRadius: '4px',
      textTransform: 'uppercase'
    }),
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    btnApprove: { backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', marginRight: '5px' },
    btnReject: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Gestión de Clientes</h2>
        <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          {solicitudesPendientes.length} Solicitudes nuevas
        </div>
      </div>

      <div style={styles.tabContainer}>
        <button style={styles.tab(tab === 'pendientes')} onClick={() => setTab('pendientes')}>
          Solicitudes ({solicitudesPendientes.length})
        </button>
        <button style={styles.tab(tab === 'activos')} onClick={() => setTab('activos')}>
          Clientes Activos ({clientesActivos.length})
        </button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre / Empresa</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Teléfono / RUT</th>
              <th style={styles.th}>País / Actividad</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'pendientes' ? solicitudesPendientes : clientesActivos).map((c) => (
              <tr key={c.id}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 'bold' }}>{c.full_name} {c.apellido}</div>
                  <div style={{ fontSize: '11px', color: '#e11d48' }}>{c.company || 'PARTICULAR'}</div>
                </td>
                <td style={styles.td}>{c.email || '---'}</td>
                <td style={styles.td}>
                  <div>{c.phone}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>{c.rut}</div>
                </td>
                <td style={styles.td}>
                  <div>{c.country}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>{c.actividad}</div>
                </td>
                <td style={styles.td}>
                  {tab === 'pendientes' ? (
                    <>
                      <button style={styles.btnApprove} onClick={() => handleAprobar(c.id, c.email)}>APROBAR</button>
                      <button style={styles.btnReject} onClick={() => handleEliminar(c.id)}>RECHAZAR</button>
                    </>
                  ) : (
                    <button style={styles.btnReject} onClick={() => handleEliminar(c.id)}>ELIMINAR</button>
                  )}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando datos...</td></tr>}
            {!loading && (tab === 'pendientes' ? solicitudesPendientes : clientesActivos).length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay registros para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clientes;