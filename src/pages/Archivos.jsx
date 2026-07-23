import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivoDetalle, setArchivoDetalle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(8);
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

  // --- FUNCIÓN PARA DESCARGA LIMPIA FORZADA ---
  const handleForceDownload = async (url) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Limpiamos el nombre del archivo de prefijos y timestamps
      const baseName = url.split('/').pop();
      const cleanName = baseName.replace(/^\d+_/, '').replace(/^(ID_|MAPA_|PASS_|MOD_|EXTRA_)/, '');

      link.setAttribute('download', cleanName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Error en descarga:", e);
      // Fallback si falla el blob
      window.open(url, '_blank');
    }
  };

  const handleCancelarSolicitud = async (archivo) => {
    if (archivo.estado !== 'pendiente') {
      alert("Solo se pueden cancelar solicitudes en estado pendiente.");
      return;
    }

    const costo = archivo.detalles_tecnicos?.costo_creditos || 0;

    if (window.confirm(`¿Estás seguro de cancelar esta solicitud? Se te devolverán ${costo} créditos.`)) {
      try {
        setLoading(true);

        const { error: errorDelete } = await supabase
          .from('archivos')
          .delete()
          .eq('id', archivo.id);

        if (errorDelete) throw new Error("No se pudo eliminar de la base de datos.");

        setArchivos(prevArchivos => prevArchivos.filter(a => a.id !== archivo.id));

        const { data: perfil, error: errorPerfil } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single();

        if (errorPerfil) throw errorPerfil;

        const nuevosCreditos = (perfil.credits || 0) + costo;

        await supabase
          .from('profiles')
          .update({ credits: nuevosCreditos })
          .eq('id', session.user.id);

        await supabase.from('movimientos').insert([
          {
            user_id: session.user.id,
            tipo: 'carga',
            cantidad: costo,
            descripcion: `Cancelación Solicitud: ${archivo.marca_modelo} (${archivo.patente})`,
            created_at: new Date()
          }
        ]);

        alert("✅ Solicitud eliminada y créditos devueltos.");
        fetchArchivos();

      } catch (error) {
        console.error("Error:", error.message);
        alert("Error crítico: " + error.message);
        fetchArchivos();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadModificado = async (archivoId, file, patente, clienteEmail, campoDestino = 'mod_file_url') => {
    let nota = null;
    if (campoDestino === 'mod_file_url') {
      nota = window.prompt("Nota de instalación (Opcional):");
    }

    try {
      if (!file) return;
      setLoading(true);

      const fileNameClean = file.name.replace(/\s+/g, '_');
      const storagePath = `procesados/${Date.now()}/${fileNameClean}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('archivos-vehiculos')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(storagePath);

      const updateData = {
        [campoDestino]: publicUrl,
        estado: 'completado'
      };

      if (nota) updateData.nota_instalacion = nota;

      const { error: dbError } = await supabase
        .from('archivos')
        .update(updateData)
        .eq('id', archivoId);

      if (dbError) throw dbError;

      await handleStatusChange(archivoId, 'completado', clienteEmail, patente);
      alert(`✅ Subido con éxito: ${fileNameClean}`);
      fetchArchivos();

    } catch (error) {
      console.error("Error:", error.message);
      alert("Error al subir.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarNota = async (archivoId, notaActual) => {
    if (!isAdmin) return;

    const nuevaNota = window.prompt("Instrucciones de instalación:", notaActual || "");

    if (nuevaNota !== null) {
      const { error } = await supabase
        .from('archivos')
        .update({ notas_instalacion: nuevaNota })
        .eq('id', archivoId);

      if (error) alert("Error al guardar nota");
      else fetchArchivos();
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
                <p>${nuevoEstado === 'completado' ? 'Ya puedes descargar tu archivo modificado desde el portal oficial.' : 'Nuestro equipo técnico ya está trabajando en tu solicitud.'}</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://torresaguayomms.cl/archivos" style="background-color: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">IR AL PORTAL</a>
                </div>
              </div>
            </div>
          </div>
        `;

        await supabase.functions.invoke('swift-function', {
          body: { to: clienteEmail, subject: subjectText, html: emailHtml },
        });
      }

      setArchivos(prev => prev.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const styles = {
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6', width: '100%', minHeight: '100vh' },
    tableCard: { backgroundColor: 'white', margin: '10px', padding: '15px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    responsiveContainer: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', minWidth: '800px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap' },
    selectAdmin: { padding: '5px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', outline: 'none', backgroundColor: 'white' },
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' },
    statusSelector: { padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#333', marginRight: '10px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' },
    modalHeader: { backgroundColor: '#000', color: '#e11d48', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e11d48' },
    modalBody: { padding: '25px', maxHeight: '75vh', overflowY: 'auto' },
    infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    infoLabel: { padding: '8px 0', fontWeight: 'bold', fontSize: '11px', color: '#000', borderBottom: '1px solid #eee', textTransform: 'uppercase', width: '40%' },
    infoValue: { padding: '8px 0', fontSize: '12px', color: '#444', borderBottom: '1px solid #eee' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px', paddingBottom: '20px' },
    pageBtn: (active) => ({ padding: '8px 16px', cursor: 'pointer', backgroundColor: active ? '#e11d48' : 'white', color: active ? 'white' : '#666', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }),
    btnDownload: { border: 'none', fontSize: '9px', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', color: 'white', display: 'block', width: '100%' },
    timeText: { color: '#888', fontSize: '10px', marginTop: '3px' }, // NUEVO ESTILO: Para mostrar la hora con estilo gris ordenado
    btnCancel: {
      backgroundColor: '#fff',
      color: '#e11d48',
      border: '1px solid #e11d48',
      padding: '6px',
      fontSize: '9px',
      fontWeight: 'bold',
      cursor: 'pointer',
      borderRadius: '4px',
      marginTop: '5px',
      width: '100%',
      textAlign: 'center'
    }
  };

  const getBadgeColor = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completado') return '#22c55e';
    if (e === 'pendiente') return '#f59e0b';
    if (e === 'en revision') return '#3b82f6';
    return '#e11d48';
  };

  const filteredArchivos = archivos.filter(a => {
    const term = searchTerm.trim().toLowerCase();
  
    const matchOrden = a.numero_orden?.toString() === term;
    const matchPatente = a.patente?.toLowerCase().includes(term);
    const matchEmail = a.profiles?.email?.toLowerCase().includes(term);
  
    const matchSearch = !term || matchOrden || matchPatente || matchEmail;
    const matchStatus = statusFilter === 'todos' || a.estado === statusFilter;
  
    return matchSearch && matchStatus;
  });

  const totalPaginas = Math.ceil(filteredArchivos.length / itemsPorPagina);
  const indiceUltimo = paginaActual * itemsPorPagina;
  const indicePrimer = indiceUltimo - itemsPorPagina;
  const archivosPaginados = filteredArchivos.slice(indicePrimer, indiceUltimo);

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
                {isAdmin && <th style={styles.th}>Empresa</th>}
                <th style={styles.th}>Patente</th>
                <th style={styles.th}>Marca / Modelo</th>
                <th style={styles.th}>Ficha</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acción</th>
                <th style={styles.th}>Acción ADMI</th>
                <th style={styles.th}>Mensaje Técnico</th>
                <th style={styles.th}>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {archivosPaginados.map((archivo) => {
                const fechaObj = new Date(archivo.created_at);
                return (
                  <tr key={archivo.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#e11d48', fontSize: '14px' }}>#{archivo.numero_orden || '---'}</div>
                      <div>{fechaObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                      {/* NUEVO: Se renderiza la hora exacta abajo de la fecha en la celda */}
                      <div style={styles.timeText}>
                        {fechaObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                      </div>
                    </td>
                    {isAdmin && <td style={{ ...styles.td, fontWeight: 'bold', color: '#e11d48' }}>{archivo.profiles?.company || 'PARTICULAR'}</td>}
                    {isAdmin && (
                      <td style={{ ...styles.td, fontSize: '11px', color: '#555' }}>
                        {archivo.profiles?.email || '---'}
                      </td>
                    )}
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

                    {/* --- COLUMNA ACCIÓN (USUARIO) --- */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '110px' }}>
                        {archivo.file_url_id && <button onClick={() => handleForceDownload(archivo.file_url_id)} style={{ ...styles.btnDownload, background: '#3b82f6' }}>🆔 ID (Export Console)</button>}
                        {archivo.file_url_mapa && <button onClick={() => handleForceDownload(archivo.file_url_mapa)} style={{ ...styles.btnDownload, background: '#8b5cf6' }}>🗺️ MAPA</button>}
                        {archivo.file_url_password && <button onClick={() => handleForceDownload(archivo.file_url_password)} style={{ ...styles.btnDownload, background: '#f59e0b' }}>🔑 PASSWORD</button>}

                        {archivo.file_url && !archivo.file_url_id && !archivo.file_url_mapa && (
                          <button onClick={() => handleForceDownload(archivo.file_url)} style={{ ...styles.btnDownload, background: '#fff', border: '1px solid #ddd', color: '#666' }}>📄 ORIGINAL</button>
                        )}
                      </div>
                    </td>

                    {/* --- COLUMNA ACCIÓN ADMI (ADMINISTRADOR) --- */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '110px' }}>
                        {archivo.mod_file_url ? (
                          <button onClick={() => handleForceDownload(archivo.mod_file_url)} style={{ ...styles.btnDownload, background: '#22c55e' }}>🚀 DESCARGAR MOD</button>
                        ) : isAdmin && (
                          <label style={{ backgroundColor: '#000', color: '#22c55e', padding: '5px', fontSize: '9px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #22c55e', textAlign: 'center', fontWeight: 'bold' }}>
                            {loading ? '...' : '📤 SUBIR MOD'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_url')} />
                          </label>
                        )}

                        {archivo.mod_file_extra_url ? (
                          <button onClick={() => handleForceDownload(archivo.mod_file_extra_url)} style={{ ...styles.btnDownload, background: '#10b981' }}>📦 DESCARGAR EXTRA</button>
                        ) : isAdmin && (
                          <label style={{ backgroundColor: '#111', color: '#10b981', padding: '5px', fontSize: '9px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #10b981', textAlign: 'center', fontWeight: 'bold' }}>
                            {loading ? '...' : '➕ SUBIR V2'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_extra_url')} />
                          </label>
                        )}
                      </div>
                    </td>

                    <td style={{ ...styles.td, minWidth: '180px' }}>
                      <div style={{
                        fontSize: '11px', padding: '10px',
                        backgroundColor: archivo.notas_instalacion ? '#fffbeb' : '#f9f9f9',
                        border: '1px solid ' + (archivo.notas_instalacion ? '#fef3c7' : '#eee'),
                        borderRadius: '4px', color: '#333', minHeight: '50px'
                      }}>
                        {archivo.notas_instalacion ? (
                          <><div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '4px', fontSize: '9px' }}>📝 INSTRUCCIONES:</div>{archivo.notas_instalacion}</>
                        ) : (
                          <span style={{ color: '#aaa', fontStyle: 'italic' }}>No se han subido intrucciones...</span>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleGuardarNota(archivo.id, archivo.notas_instalacion)} style={{ display: 'block', marginTop: '8px', backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '3px 7px', fontSize: '9px', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer' }}>
                            {archivo.notas_instalacion ? 'EDITAR MENSAJE' : '+ ESCRIBIR NOTA'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {!isAdmin && archivo.estado === 'pendiente' ? (
                        <button
                          onClick={() => handleCancelarSolicitud(archivo)}
                          style={{
                            backgroundColor: 'white',
                            color: '#e11d48',
                            border: '1px solid #e11d48',
                            padding: '6px 10px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '4px',
                          }}
                        >
                          ❌ CANCELAR
                        </button>
                      ) : (
                        <span style={{ color: '#ccc', fontSize: '10px' }}>---</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div style={styles.pagination}>
            <button onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }} disabled={paginaActual === 1} style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}>← ANTERIOR</button>
            {[...Array(totalPaginas).keys()].map(n => {
              const numeroPagina = n + 1;
              const rangoMaximo = 2; // Muestra un máximo de 2 páginas hacia la izquierda y derecha

              // 1. CONDICIÓN: Si es la primera, la última, o está cerca de la página actual, muestra el botón
              if (
                numeroPagina === 1 ||
                numeroPagina === totalPaginas ||
                (numeroPagina >= paginaActual - rangoMaximo && numeroPagina <= paginaActual + rangoMaximo)
              ) {
                return (
                  <button
                    key={numeroPagina}
                    onClick={() => { setPaginaActual(numeroPagina); window.scrollTo(0, 0); }}
                    style={styles.pageBtn(paginaActual === numeroPagina)}
                  >
                    {numeroPagina}
                  </button>
                );
              }

              // 2. CONDICIÓN: Coloca los puntos suspensivos "..." justo en el límite del rango para ocultar los bloques intermedios
              if (
                numeroPagina === paginaActual - rangoMaximo - 1 ||
                numeroPagina === paginaActual + rangoMaximo + 1
              ) {
                return <span key={numeroPagina} style={{ color: '#666', padding: '0 5px', fontWeight: 'bold' }}>...</span>;
              }

              // Si está muy lejos, se salta el número para mantener limpia la botonera
              return null;
            })}            <button onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0, 0); }} disabled={paginaActual === totalPaginas} style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}>SIGUIENTE →</button>
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
                    ['HP', archivoDetalle.detalles_tecnicos?.hp],
                    ['Fuel', archivoDetalle.detalles_tecnicos?.combustible],
                    ['ECU / DCU / TCU / DSG',
                      archivoDetalle.detalles_tecnicos?.tipo_modulo
                        ? `${archivoDetalle.detalles_tecnicos.tipo_modulo} (${archivoDetalle.detalles_tecnicos?.ecu || 'Sin especificar'})`
                        : archivoDetalle.detalles_tecnicos?.ecu],
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
              {archivoDetalle.detalles_tecnicos?.codigosfalla && (
                <div style={{ marginTop: '15px', backgroundColor: '#fff5f6', padding: '15px', borderLeft: '4px solid #e11d48' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#e11d48' }}>CÓDIGOS DE FALLA (DTC):</div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: '#333', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                    {archivoDetalle.detalles_tecnicos.codigosfalla}
                  </p>
                </div>
              )}
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