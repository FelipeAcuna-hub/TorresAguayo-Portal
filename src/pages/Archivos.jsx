import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivoDetalle, setArchivoDetalle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- LÓGICA DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(8); 

  // --- FILTRO DE ESTADO ---
  const [statusFilter, setStatusFilter] = useState('todos');

  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

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

  useEffect(() => {
    fetchArchivos();
  }, [session, isAdmin]);

  // --- FUNCIÓN: CANCELAR Y DEVOLVER CRÉDITOS ---
  const handleCancelarSolicitud = async (archivo) => {
    if (archivo.estado !== 'pendiente') {
      alert("Solo se pueden cancelar solicitudes en estado pendiente.");
      return;
    }

    const costo = archivo.detalles_tecnicos?.costo_creditos || 0;

    if (window.confirm(`¿Estás seguro de cancelar esta solicitud? Se te devolverán ${costo} créditos.`)) {
      try {
        setLoading(true);

        const { data: perfil, error: errorPerfil } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single();

        if (errorPerfil) throw errorPerfil;

        const nuevosCreditos = (perfil.credits || 0) + costo;

        const { error: errorUpdate } = await supabase
          .from('profiles')
          .update({ credits: nuevosCreditos })
          .eq('id', session.user.id);

        if (errorUpdate) throw errorUpdate;

        await supabase.from('movimientos').insert([
          {
            user_id: session.user.id,
            tipo: 'carga',
            cantidad: costo,
            descripcion: `Devolución por cancelación: ${archivo.marca_modelo} (${archivo.patente})`,
            created_at: new Date()
          }
        ]);

        const { error: errorDelete } = await supabase
          .from('archivos')
          .delete()
          .eq('id', archivo.id);

        if (errorDelete) throw errorDelete;

        alert("Solicitud cancelada y créditos devueltos con éxito.");
        fetchArchivos();
      } catch (error) {
        console.error("Error al cancelar:", error.message);
        alert("Ocurrió un error al procesar la cancelación.");
      } finally {
        setLoading(false);
      }
    }
  };

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

        const emailHtml = `
          <div style="font-family: 'Helvetica', Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <div style="background-color: #000000; padding: 20px; text-align: center;">
                <h1 style="color: #e11d48; margin: 0; font-size: 24px; letter-spacing: 2px;">TORRES AGUAYO MMS</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Actualización de Requerimiento</h2>
                <p>Hola,</p>
                <p>Te informamos que el archivo para el vehículo con patente <strong>${patente}</strong> ha cambiado su estado a:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid ${nuevoEstado === 'completado' ? '#22c55e' : '#facc15'}; margin: 20px 0; font-weight: bold; font-size: 18px; text-align: center; text-transform: uppercase; color: ${nuevoEstado === 'completado' ? '#166534' : '#854d0e'};">
                  ${nuevoEstado === 'completado' ? '✅ ' + nuevoEstado : '🔍 ' + nuevoEstado}
                </div>
                <p>${nuevoEstado === 'completado' ? 'Ya puedes descargar tu archivo modificado desde el portal oficial.' : 'Nuestro equipo técnico ya está trabajando en tu solicitud. Te notificaremos apenas esté listo.'}</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://torresaguayomms.cl/archivos" style="background-color: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">IR AL PORTAL DE USUARIO</a>
                </div>
              </div>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                <p>© 2026 Torres Aguayo MMS - Ingeniería en Reprogramación Automotriz</p>
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              </div>
            </div>
          </div>
        `;
  
        await supabase.functions.invoke('swift-function', {
          body: {
            to: clienteEmail,
            subject: subjectText,
            html: emailHtml
          },
        });
      }
  
      setArchivos(prev => prev.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
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
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' },
    statusSelector: { padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#333', marginRight: '10px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' },
    modalHeader: { backgroundColor: '#000', color: '#e11d48', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e11d48' },
    modalBody: { padding: '25px', maxHeight: '75vh', overflowY: 'auto' },
    infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    infoLabel: { padding: '8px 0', fontWeight: 'bold', fontSize: '11px', color: '#000', borderBottom: '1px solid #eee', textTransform: 'uppercase', width: '40%' },
    infoValue: { padding: '8px 0', fontSize: '12px', color: '#444', borderBottom: '1px solid #eee' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '20px', padding: '10px' },
    pageBtn: (active) => ({ padding: '6px 12px', cursor: 'pointer', backgroundColor: active ? '#e11d48' : 'white', color: active ? 'white' : '#666', border: '1px solid #ddd', borderRadius: '2px', fontSize: '12px', fontWeight: 'bold' }),
    
    // BOTÓN ELIMINAR NUEVO
    btnDelete: (active) => ({
      backgroundColor: active ? '#e11d48' : '#eee',
      color: active ? 'white' : '#ccc',
      border: 'none',
      padding: '6px 10px',
      borderRadius: '2px',
      cursor: active ? 'pointer' : 'not-allowed',
      fontWeight: 'bold',
      fontSize: '9px',
      textTransform: 'uppercase'
    })
  };

  const getBadgeColor = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completado') return '#22c55e';
    if (e === 'pendiente') return '#f59e0b';
    if (e === 'en revision') return '#3b82f6';
    return '#e11d48';
  };

  const filteredArchivos = archivos.filter(a => {
    const matchSearch = !searchTerm || a.numero_orden?.toString() === searchTerm || a.patente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const indiceUltimo = paginaActual * itemsPorPagina;
  const indicePrimer = indiceUltimo - itemsPorPagina;
  const archivosPaginados = filteredArchivos.slice(indicePrimer, indiceUltimo);
  const totalPaginas = Math.ceil(filteredArchivos.length / itemsPorPagina);

  return (
    <div style={styles.mainContent}>
      <div style={styles.tableCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '10px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select style={styles.statusSelector} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPaginaActual(1); }}>
              <option value="todos">ESTADO (TODOS)</option>
              <option value="pendiente">PENDIENTES</option>
              <option value="en revision">EN REVISIÓN</option>
              <option value="completado">COMPLETADOS</option>
            </select>
            <div style={styles.searchBar}>
              <span style={{ fontSize: '12px', marginRight: '8px' }}>🔍</span>
              <input type="text" placeholder="Buscar..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '150px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPaginaActual(1); }} />
            </div>
          </div>
        </div>

        <div style={styles.responsiveContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>N° Orden / Fecha</th>
                {isAdmin && <th style={styles.th}>Empresa</th>}
                <th style={styles.th}>Patente</th>
                <th style={styles.th}>Marca / Modelo</th>
                <th style={styles.th}>Ficha</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Eliminar</th> {/* COLUMNA NUEVA */}
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {archivosPaginados.map((archivo) => (
                <tr key={archivo.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 'bold', color: '#e11d48', fontSize: '14px' }}>#{archivo.numero_orden || '---'}</div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{new Date(archivo.created_at).toLocaleDateString('es-CL')}</div>
                  </td>
                  {isAdmin && <td style={{ ...styles.td, fontWeight: 'bold', color: '#e11d48' }}>{archivo.profiles?.company || 'PARTICULAR'}</td>}
                  <td style={styles.td}>{archivo.patente}</td>
                  <td style={styles.td}>{archivo.marca_modelo}</td>
                  <td style={styles.td}>
                    <button onClick={() => setArchivoDetalle(archivo)} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>DETALLES</button>
                  </td>
                  <td style={styles.td}>
                    {isAdmin ? (
                      <select style={{ ...styles.selectAdmin, color: getBadgeColor(archivo.estado), borderColor: getBadgeColor(archivo.estado) }} value={archivo.estado} onChange={(e) => handleStatusChange(archivo.id, e.target.value, archivo.profiles?.email, archivo.patente)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="en revision">En Revisión</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    ) : <span style={{ ...styles.statusBadge, backgroundColor: getBadgeColor(archivo.estado) }}>{archivo.estado}</span>}
                  </td>

                  {/* COLUMNA ELIMINAR */}
                  <td style={styles.td}>
                    {!isAdmin && (
                      <button 
                        style={styles.btnDelete(archivo.estado === 'pendiente')} 
                        onClick={() => handleCancelarSolicitud(archivo)}
                        disabled={archivo.estado !== 'pendiente'}
                      >
                        {archivo.estado === 'pendiente' ? '❌ ELIMINAR' : 'BLOQUEADO'}
                      </button>
                    )}
                    {isAdmin && <span style={{fontSize: '9px', color: '#ccc'}}>Solo Cliente</span>}
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {archivo.file_url && <button onClick={() => window.open(archivo.file_url, '_blank')} style={{ color: '#666', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', padding: '5px', textTransform: 'uppercase', borderRadius: '4px' }}>📄 ORIGINAL</button>}
                      {archivo.mod_file_url ? (
                        <button onClick={() => window.open(archivo.mod_file_url, '_blank')} style={{ color: 'white', border: 'none', background: '#22c55e', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', padding: '5px', textTransform: 'uppercase', borderRadius: '4px' }}>🚀 MODIFICADO</button>
                      ) : isAdmin && (
                        <label style={{ backgroundColor: '#000', color: '#e11d48', padding: '5px', fontSize: '9px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e11d48', textAlign: 'center', fontWeight: 'bold' }}>
                          {loading ? '...' : '📤 SUBIR MOD'}
                          <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email)} />
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div style={styles.pagination}>
            <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}>← ANTERIOR</button>
            {[...Array(totalPaginas).keys()].map(n => <button key={n+1} onClick={() => setPaginaActual(n+1)} style={styles.pageBtn(paginaActual === n+1)}>{n+1}</button>)}
            <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}>SIGUIENTE →</button>
          </div>
        )}
      </div>

      {archivoDetalle && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '13px' }}>ORDEN N° {archivoDetalle.numero_orden} - {archivoDetalle.patente}</h3>
              <button onClick={() => setArchivoDetalle(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <table style={styles.infoTable}>
                <tbody>
                  {[
                    ['License Plate', archivoDetalle.patente],
                    ['Brand / Model', archivoDetalle.marca_modelo],
                    ['Year', archivoDetalle.detalles_tecnicos?.anio],
                    ['Motor', archivoDetalle.detalles_tecnicos?.motor],
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
              <div style={{ marginTop: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderLeft: '4px solid #e11d48' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#e11d48' }}>COMMENTS:</div>
                <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic' }}>{archivoDetalle.detalles_tecnicos?.comentarios || 'No comments provided.'}</p>
              </div>
            </div>
            <div style={{ padding: '15px', textAlign: 'right' }}>
              <button onClick={() => setArchivoDetalle(null)} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '8px 25px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archivos;