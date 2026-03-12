import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verificamos si es administrador (por metadatos o por tu correo específico)
  const isAdmin = 
  session?.user?.user_metadata?.role === 'admin' || 
  session?.user?.email?.toLowerCase() === 'felipe.acuna2@mail.udp.cl';
  
  useEffect(() => {
    const fetchArchivos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;

        // EMPEZAMOS LA CONSULTA
        let query = supabase.from('archivos').select('*');

        // SOLO SI NO ES ADMIN, FILTRAMOS POR SU ID
        // Si es admin, no entra aquí y trae todo de la tabla
        if (!isAdmin) {
          query = query.eq('user_id', session.user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setArchivos(data || []);
      } catch (error) {
        console.error("Error al cargar archivos:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivos();
  }, [session, isAdmin]);

  // NUEVA FUNCIÓN: Actualizar estado y (opcionalmente) notificar
  const handleStatusChange = async (archivoId, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('archivos')
        .update({ estado: nuevoEstado })
        .eq('id', archivoId);

      if (error) throw error;

      // Actualizamos el estado local para que se vea el cambio al tiro
      setArchivos(archivos.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
      
      alert(`Estado actualizado a: ${nuevoEstado.toUpperCase()}`);
      
      // Aquí podrías disparar el correo más adelante con una Edge Function o servicio de mail
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    }
  };

  const styles = {
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' },
    tableCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    statusBadge: { 
      padding: '4px 8px', 
      borderRadius: '4px', 
      fontSize: '10px', 
      fontWeight: 'bold', 
      color: 'white',
      textTransform: 'uppercase'
    },
    selectAdmin: {
      padding: '5px',
      fontSize: '11px',
      fontWeight: 'bold',
      borderRadius: '4px',
      border: '1px solid #ddd',
      cursor: 'pointer',
      textTransform: 'uppercase'
    }
  };

  const getBadgeColor = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completado') return '#22c55e';
    if (e === 'pendiente') return '#f59e0b';
    if (e === 'en revision') return '#3b82f6'; // Azul para revisión
    return '#e11d48';
  };

  return (
    <div style={styles.mainContent}>
      <div style={styles.tableCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>
        </div>
        
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase', color: '#333' }}>
          {isAdmin ? "Gestión Global de Archivos" : "Historial de Archivos"}
        </h2>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Patente</th>
              <th style={styles.th}>Marca / Modelo</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {archivos.length > 0 ? (
              archivos.map((archivo) => (
                <tr key={archivo.id}>
                  <td style={styles.td}>
                    {new Date(archivo.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td style={styles.td}>{archivo.patente}</td>
                  <td style={styles.td}>{archivo.marca_modelo}</td>
                  <td style={styles.td}>
                    {isAdmin ? (
                      <select 
                        style={{ ...styles.selectAdmin, color: getBadgeColor(archivo.estado) }}
                        value={archivo.estado}
                        onChange={(e) => handleStatusChange(archivo.id, e.target.value)}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en revision">En Revisión</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    ) : (
                      <span style={{ ...styles.statusBadge, backgroundColor: getBadgeColor(archivo.estado) }}>
                        {archivo.estado}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {archivo.file_url && (
                      <button 
                        onClick={() => window.open(archivo.file_url, '_blank')}
                        style={{ color: '#e11d48', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}
                      >
                        {isAdmin ? "Ver Archivo" : "Descargar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {loading ? 'Cargando archivos...' : 'No hay registros disponibles.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p style={{ marginTop: '20px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
          * {isAdmin ? "Como administrador puedes gestionar el flujo de trabajo." : "Los archivos procesados estarán disponibles para descarga por 30 días."}
        </p>
      </div>
    </div>
  );
};

export default Archivos;