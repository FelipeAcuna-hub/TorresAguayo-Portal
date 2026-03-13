import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivoDetalle, setArchivoDetalle] = useState(null);
  // --- NUEVO ESTADO PARA EL FILTRO ---
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    const fetchArchivos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;
    
        let query = supabase
          .from('archivos')
          .select(`
            *,
            profiles:user_id (
              company,
              email
            )
          `);
        
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

  const handleUploadModificado = async (archivoId, file, patente, clienteEmail) => {
    try {
      if (!file) return;
      setLoading(true);

      const fileName = `${Date.now()}_${patente}_MODIFICADO.bin`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('archivos-vehiculos')
        .upload(`procesados/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(`procesados/${fileName}`);

      const { error: dbError } = await supabase
        .from('archivos')
        .update({ 
          mod_file_url: publicUrl, 
          estado: 'completado' 
        })
        .eq('id', archivoId);

      if (dbError) throw dbError;

      await handleStatusChange(archivoId, 'completado', clienteEmail, patente);
      alert("Archivo MODIFICADO cargado con éxito.");
      
    } catch (error) {
      console.error("Error al subir modificado:", error.message);
      alert("Error al subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (archivoId, nuevoEstado, clienteEmail, patente) => {
    try {
      const { error } = await supabase
        .from('archivos')
        .update({ estado: nuevoEstado })
        .eq('id', archivoId);
  
      if (error) throw error;
  
      if (clienteEmail) {
        const subjectText = nuevoEstado === 'completado' 
          ? `✅ Archivo Listo - Patente ${patente}` 
          : `🔍 Archivo en Revisión - Patente ${patente}`;
  
        await supabase.functions.invoke('swift-function', {
          body: {
            to: clienteEmail,
            subject: subjectText,
            html: `<h3>Actualización Torres Aguayo MMS</h3><p>El estado de la patente ${patente} es: ${nuevoEstado.toUpperCase()}</p>`
          },
        });
      }
  
      setArchivos(prev => prev.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
      alert("Estado actualizado y cliente notificado.");
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const styles = {
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6', width: '100%', minHeight: '100vh' },
    tableCard: { backgroundColor: 'white', margin: '10px', padding: '15px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
    responsiveContainer: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', minWidth: '600px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap' },
    selectAdmin: { padding: '5px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', textTransform: 'uppercase', outline: 'none', backgroundColor: 'white' },
    
    // BARRA DE BÚSQUEDA
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' },
    
    // MODAL
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' },
    modalHeader: { backgroundColor: '#000', color: '#e11d48', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e11d48' },
    modalBody: { padding: '25px', maxHeight: '75vh', overflowY: 'auto' },
    infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    infoLabel: { padding: '8px 0', fontWeight: 'bold', fontSize: '11px', color: '#000', borderBottom: '1px solid #eee', textTransform: 'uppercase', width: '40%' },
    infoValue: { padding: '8px 0', fontSize: '12px', color: '#444', borderBottom: '1px solid #eee' }
  };

  const getBadgeColor = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completado') return '#22c55e';
    if (e === 'pendiente') return '#f59e0b';
    if (e === 'en revision') return '#3b82f6';
    return '#e11d48';
  };

  // --- FILTRADO DINÁMICO ---
  const filteredArchivos = archivos.filter(a => {
    if (!searchTerm) return true; // Si no hay nada escrito, muestra todo
    
    const matchNumero = a.numero_orden?.toString() === searchTerm; // Exacto
    const matchPatente = a.patente?.toLowerCase().includes(searchTerm.toLowerCase()); // Parcial
    
    return matchNumero || matchPatente;
  });

  return (
    <div style={styles.mainContent}>
      <div style={styles.tableCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '10px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>

          {/* BARRA DE BÚSQUEDA POR N° O PATENTE */}
          <div style={styles.searchBar}>
            <span style={{ fontSize: '12px', marginRight: '8px' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Buscar N° o Patente..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '150px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '15px', textTransform: 'uppercase', color: '#333' }}>
          {isAdmin ? "Gestión Global" : "Mis Archivos"}
        </h2>

        <div style={styles.responsiveContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>N° Orden / Fecha</th>
                {isAdmin && <th style={styles.th}>Empresa</th>}
                <th style={styles.th}>Patente</th>
                <th style={styles.th}>Marca / Modelo</th>
                {isAdmin && <th style={styles.th}>Ficha</th>}
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredArchivos.length > 0 ? (
                filteredArchivos.map((archivo) => (
                  <tr key={archivo.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#e11d48', fontSize: '14px' }}>#{archivo.numero_orden || '---'}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>{new Date(archivo.created_at).toLocaleDateString('es-CL')}</div>
                    </td>
                    {isAdmin && (
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#e11d48' }}>
                        {archivo.profiles?.company || 'PARTICULAR'}
                      </td>
                    )}
                    <td style={styles.td}>{archivo.patente}</td>
                    <td style={styles.td}>{archivo.marca_modelo}</td>
                    
                    {isAdmin && (
                      <td style={styles.td}>
                        <button 
                          onClick={() => setArchivoDetalle(archivo)}
                          style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}
                        >
                          DETALLES
                        </button>
                      </td>
                    )}

                    <td style={styles.td}>
                      {isAdmin ? (
                        <select
                          style={{ ...styles.selectAdmin, color: getBadgeColor(archivo.estado), borderColor: getBadgeColor(archivo.estado) }}
                          value={archivo.estado}
                          onChange={(e) => handleStatusChange(archivo.id, e.target.value, archivo.profiles?.email, archivo.patente)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en revision">En Revisión</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      ) : (
                        <span style={{ ...styles.statusBadge, backgroundColor: getBadgeColor(archivo.estado) }}>{archivo.estado}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {archivo.file_url && (
                          <button
                            onClick={() => window.open(archivo.file_url, '_blank')}
                            style={{ color: '#666', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', padding: '5px', textTransform: 'uppercase', borderRadius: '4px' }}
                          >
                            📄 ORIGINAL
                          </button>
                        )}
                        {archivo.mod_file_url ? (
                          <button
                            onClick={() => window.open(archivo.mod_file_url, '_blank')}
                            style={{ color: 'white', border: 'none', background: '#22c55e', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', padding: '5px', textTransform: 'uppercase', borderRadius: '4px' }}
                          >
                            🚀 MODIFICADO
                          </button>
                        ) : (
                          isAdmin && (
                            <label style={{ backgroundColor: '#000', color: '#e11d48', padding: '5px', fontSize: '9px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e11d48', textAlign: 'center', fontWeight: 'bold' }}>
                              {loading ? '...' : '📤 SUBIR MOD'}
                              <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email)} />
                            </label>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    {loading ? 'Cargando archivos...' : 'No se encontraron registros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLES TÉCNICOS */}
      {archivoDetalle && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '13px', letterSpacing: '1px' }}>
                ORDEN DE TRABAJO N° {archivoDetalle.numero_orden} - {archivoDetalle.patente}
              </h3>
              <button onClick={() => setArchivoDetalle(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '11px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>VEHICLE INFORMATION</div>
              <table style={styles.infoTable}>
                <tbody>
                  {[
                    ['N° Orden Correlativo', archivoDetalle.numero_orden],
                    ['License Plate', archivoDetalle.patente],
                    ['Brand / Model', archivoDetalle.marca_modelo],
                    ['Year', archivoDetalle.detalles_tecnicos?.anio],
                    ['Motor', archivoDetalle.detalles_tecnicos?.motor],
                    ['HP', archivoDetalle.detalles_tecnicos?.hp],
                    ['Fuel', archivoDetalle.detalles_tecnicos?.combustible],
                    ['ECU', archivoDetalle.detalles_tecnicos?.ecu],
                    ['Services', archivoDetalle.detalles_tecnicos?.servicios_solicitados],
                    ['Credits', archivoDetalle.detalles_tecnicos?.costo_creditos]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={styles.infoLabel}>{label}</td>
                      <td style={styles.infoValue}>{value || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', borderLeft: '4px solid #e11d48' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#e11d48', marginBottom: '5px' }}>COMMENTS:</div>
                <p style={{ margin: 0, fontSize: '12px', color: '#333', fontStyle: 'italic', lineHeight: '1.4' }}>
                  {archivoDetalle.detalles_tecnicos?.comentarios || 'No comments provided.'}
                </p>
              </div>
            </div>
            <div style={{ padding: '15px', textAlign: 'right', borderTop: '1px solid #eee' }}>
              <button onClick={() => setArchivoDetalle(null)} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '8px 25px', borderRadius: '2px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archivos;