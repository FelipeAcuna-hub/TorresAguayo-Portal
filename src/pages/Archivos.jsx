import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens, playTone } from '../ThemeContext';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendoKey, setSubiendoKey] = useState(null);
  const [archivoDetalle, setArchivoDetalle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadProgress, setDownloadProgress] = useState({});
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // --- SONIDITOS MINIMALISTAS DE DESCARGA (usan la utilidad compartida, respeta el silencio) ---
  const playDownloadStartSound = () => playTone(650, 0.05, 0.1);
  const playDownloadDoneSound = () => {
    playTone(700, 0.06, 0.12, 0);
    playTone(1050, 0.09, 0.12, 0.07);
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(8);
  const [statusFilter, setStatusFilter] = useState('todos');

  const ADMIN_EMAILS = [
    'stockcarscl@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  // Viewport "chico" en CSS px (ej: Windows con escala 125%/150%) -> tabla más compacta
  // para que quepa sin scroll horizontal, sin achicar la vista cómoda en pantallas grandes.
  const isCompact = window.innerWidth <= 1600;

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

  // --- FUNCIÓN PARA DESCARGA LIMPIA FORZADA (con barra de progreso real) ---
  const handleForceDownload = async (url) => {
    if (!url || downloadProgress[url] !== undefined) return;

    playDownloadStartSound();
    setDownloadProgress(prev => ({ ...prev, [url]: 0 }));

    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) throw new Error('Descarga fallida');

      const totalBytes = parseInt(response.headers.get('Content-Length') || '0', 10);
      const reader = response.body.getReader();
      const chunks = [];
      let recibidos = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        recibidos += value.length;

        setDownloadProgress(prev => ({
          ...prev,
          [url]: totalBytes ? Math.min(99, Math.round((recibidos / totalBytes) * 100)) : 66
        }));
      }

      setDownloadProgress(prev => ({ ...prev, [url]: 100 }));
      playDownloadDoneSound();

      const blob = new Blob(chunks);
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

      setTimeout(() => {
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
      }, 500);
    } catch (e) {
      console.error("Error en descarga:", e);
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      // Fallback si falla el streaming
      window.open(url, '_blank');
    }
  };

  // --- BOTÓN DE DESCARGA CON BARRA DE PROGRESO ---
  const gradientBg = (color) => `linear-gradient(135deg, ${color} 0%, #000000 170%)`;

  const renderDownloadBtn = (url, label, background, extraStyle = {}) => {
    const progreso = downloadProgress[url];
    const descargando = progreso !== undefined;
    const isFlat = background === '#fff' || background === '#ffffff';
    return (
      <button
        className="action-btn dl-btn"
        onClick={() => handleForceDownload(url)}
        disabled={descargando}
        style={{ ...styles.btnDownload, background: isFlat ? background : gradientBg(background), cursor: descargando ? 'default' : 'pointer', ...extraStyle }}
      >
        {descargando && <span className="dl-progress-fill" style={{ width: `${progreso}%` }} />}
        <span className="dl-btn-label">{descargando ? `⬇ ${progreso}%` : label}</span>
      </button>
    );
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

    if (!file) return;
    const uploadKey = `${archivoId}_${campoDestino}`;

    try {
      setLoading(true);
      setSubiendoKey(uploadKey);

      const fileNameClean = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
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
      setSubiendoKey(null);
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
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? DARK_GRADIENT : '#f3f4f6', width: '100%', minHeight: '100vh' },
    tableCard: { backgroundColor: s.cardBg, margin: '10px', padding: isCompact ? '10px 6px' : '15px', borderRadius: '4px', boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.05)', border: `1px solid ${s.border}` },
    responsiveContainer: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', minWidth: isCompact ? '560px' : '800px' },
    th: { textAlign: 'left', padding: isCompact ? '6px 4px' : '12px', borderBottom: `2px solid ${s.rowBorder}`, fontSize: isCompact ? '8px' : '10px', color: s.textMuted, textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: isCompact ? '6px 4px' : '12px', borderBottom: `1px solid ${s.rowBorder}`, fontSize: isCompact ? '10px' : '12px', color: s.text },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap' },
    serviceBadge: {
      display: 'inline-block',
      padding: '5px 12px',
      borderRadius: '14px',
      fontSize: '10px',
      fontWeight: '700',
      color: '#fff',
      backgroundColor: isDark ? '#3a3a3a' : '#000',
      border: isDark ? '1px solid #6a6a6a' : 'none',
      overflowWrap: 'break-word',
      maxWidth: isCompact ? '140px' : '200px',
      verticalAlign: 'middle',
      letterSpacing: '0.2px'
    },
    // --- ESTILO DE PATENTE CHILENA ---
    plateBox: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      border: '2px solid #111',
      borderRadius: '5px',
      padding: '3px 10px 2px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      lineHeight: 1
    },
    plateText: {
      color: '#111',
      fontWeight: '900',
      fontSize: '15px',
      fontFamily: "'Arial Narrow', Arial, sans-serif",
      letterSpacing: '1.5px'
    },
    plateCountry: {
      color: '#111',
      fontWeight: '700',
      fontSize: '6px',
      letterSpacing: '2px',
      marginTop: '1px'
    },
    selectAdmin: { padding: '5px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, cursor: 'pointer', outline: 'none', backgroundColor: s.inputBg },
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: s.inputBg, padding: '6px 12px', borderRadius: '4px', border: `1px solid ${s.inputBorder}` },
    statusSelector: { padding: '6px 12px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, fontSize: '12px', outline: 'none', backgroundColor: s.inputBg, cursor: 'pointer', fontWeight: 'bold', color: s.text, marginRight: '10px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: s.cardBg, width: '100%', maxWidth: '500px', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' },
    modalHeader: { backgroundColor: '#000', color: '#D9241D', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #D9241D' },
    modalBody: { padding: '25px', maxHeight: '75vh', overflowY: 'auto' },
    infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    infoLabel: { padding: '8px 0', fontWeight: 'bold', fontSize: '11px', color: s.text, borderBottom: `1px solid ${s.rowBorder}`, textTransform: 'uppercase', width: '40%' },
    infoValue: { padding: '8px 0', fontSize: '12px', color: s.textMuted, borderBottom: `1px solid ${s.rowBorder}` },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px', paddingBottom: '20px' },
    pageBtn: (active) => ({ padding: '8px 16px', cursor: 'pointer', backgroundColor: active ? '#D9241D' : s.cardBg, color: active ? 'white' : s.textMuted, border: `1px solid ${s.border}`, borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }),
    btnDownload: { border: 'none', fontSize: '9px', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', color: 'white', display: 'block', width: '100%' },
    timeText: { color: s.textFaint, fontSize: '10px', marginTop: '3px' }, // NUEVO ESTILO: Para mostrar la hora con estilo gris ordenado
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
      <style>{`
        @keyframes rowFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .file-row { animation: rowFadeIn 0.3s ease both; transition: background-color 0.15s ease; }
        .file-row:hover { background-color: ${s.rowHover}; transition: background-color 0.15s ease; }
        .action-btn { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
        .action-btn:hover { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
        .upload-label { display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
        .upload-label.uploading { cursor: wait; animation: uploadPulse 1.1s ease-in-out infinite; }
        @keyframes uploadPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        @keyframes uploadSpin { to { transform: rotate(360deg); } }
        .upload-spinner {
          width: 9px; height: 9px; flex-shrink: 0; border-radius: 50%;
          border: 2px solid currentColor; border-top-color: transparent;
          animation: uploadSpin 0.6s linear infinite;
        }
        .badge-pop { transition: transform 0.15s ease; }
        .badge-pop:hover { transform: scale(1.06); }
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPopIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-overlay-anim { animation: overlayFadeIn 0.2s ease; }
        .modal-content-anim { animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .search-input-wrap { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .search-input-wrap:focus-within { border-color: #e11d48; box-shadow: 0 0 0 3px rgba(225,29,72,0.12); }
        .status-select { transition: border-color 0.2s ease; }
        .status-select:hover { border-color: #e11d48; }
        .page-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: #e11d48; }
        .dl-btn { position: relative; overflow: hidden; }
        .dl-progress-fill {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          background-image: linear-gradient(135deg, rgba(255,255,255,0.35) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.35) 75%, transparent 75%, transparent);
          background-size: 14px 14px;
          animation: dlStripes 0.6s linear infinite;
          transition: width 0.15s ease;
          z-index: 0;
        }
        @keyframes dlStripes { from { background-position: 0 0; } to { background-position: 14px 0; } }
        .dl-btn-label { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 3px; }
      `}</style>
      <div style={styles.tableCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ backgroundColor: '#D9241D', color: 'white', padding: '5px 12px', fontSize: '10px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select className="status-select" style={styles.statusSelector} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPaginaActual(1); }}>
              <option value="todos">ESTADO (TODOS)</option>
              <option value="pendiente">PENDIENTES</option>
              <option value="en revision">EN REVISIÓN</option>
              <option value="completado">COMPLETADOS</option>
            </select>
            <div className="search-input-wrap" style={styles.searchBar}>
              <span style={{ fontSize: '12px', marginRight: '8px' }}>🔍</span>
              <input type="text" placeholder="Buscar..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '150px', color: s.text }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPaginaActual(1); }} />
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
                <th style={styles.th}>Servicio</th>
                <th style={styles.th}>Acción</th>
                <th style={styles.th}>Acción ADMI</th>
                <th style={styles.th}>Mensaje Técnico</th>
                <th style={styles.th}>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {archivosPaginados.map((archivo, index) => {
                const fechaObj = new Date(archivo.created_at);
                return (
                  <tr className="file-row" style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }} key={archivo.id}>
                    <td style={{ ...styles.td, minWidth: isCompact ? '75px' : '110px' }}>
                      <div style={{ display: 'inline-block', fontWeight: 'bold', color: '#fff', backgroundColor: '#D9241D', fontSize: isCompact ? '11px' : '14px', padding: isCompact ? '2px 5px' : '3px 9px', borderRadius: '6px', marginBottom: isCompact ? '4px' : '6px' }}>#{archivo.numero_orden || '---'}</div>
                      <div style={{ whiteSpace: 'nowrap' }}>{fechaObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                      {/* NUEVO: Se renderiza la hora exacta abajo de la fecha en la celda */}
                      <div style={styles.timeText}>
                        {fechaObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }).replace('a. m.', 'a.m.').replace('p. m.', 'p.m.')} hrs
                      </div>
                    </td>
                    {isAdmin && (
                      <td style={{ ...styles.td, maxWidth: isCompact ? '130px' : '220px' }}>
                        <div style={{ fontWeight: 'bold', color: '#D9241D', overflowWrap: 'break-word' }}>{archivo.profiles?.company || 'PARTICULAR'}</div>
                        <div style={{ fontSize: isCompact ? '10px' : '11px', color: s.textMuted, overflowWrap: 'break-word' }}>{archivo.profiles?.email || '---'}</div>
                      </td>
                    )}
                    <td style={styles.td}>
                      <div style={styles.plateBox}>
                        <span style={styles.plateText}>{archivo.patente}</span>
                        <span style={styles.plateCountry}>CHILE</span>
                      </div>
                    </td>
                    <td style={styles.td}>{archivo.marca_modelo}</td>
                    <td style={styles.td}>
                      <button className="action-btn" onClick={() => setArchivoDetalle(archivo)} style={{ backgroundColor: isDark ? '#3a3a3a' : '#000', color: '#fff', border: isDark ? '1px solid #6a6a6a' : 'none', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>DETALLES</button>
                    </td>
                    <td style={styles.td}>
                      {isAdmin ? (
                        <select style={{ ...styles.selectAdmin, color: getBadgeColor(archivo.estado), borderColor: getBadgeColor(archivo.estado) }} value={archivo.estado} onChange={(e) => handleStatusChange(archivo.id, e.target.value, archivo.profiles?.email, archivo.patente)}>
                          <option value="pendiente">Pendiente</option>
                          <option value="en revision">En Revisión</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      ) : <span className="badge-pop" style={{ ...styles.statusBadge, backgroundColor: getBadgeColor(archivo.estado) }}>{archivo.estado}</span>}
                    </td>

                    {/* --- COLUMNA SERVICIO --- */}
                    <td style={styles.td}>
                      {archivo.detalles_tecnicos?.servicios_solicitados ? (
                        <span className="badge-pop" style={styles.serviceBadge} title={archivo.detalles_tecnicos.servicios_solicitados}>
                          {archivo.detalles_tecnicos.servicios_solicitados}
                        </span>
                      ) : <span style={{ color: s.textFaint, fontSize: '11px' }}>---</span>}
                    </td>

                    {/* --- COLUMNA ACCIÓN (USUARIO) --- */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '3px' : '5px', minWidth: isCompact ? '75px' : '110px' }}>
                        {archivo.file_url_id && renderDownloadBtn(archivo.file_url_id, (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-journal-text" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                              <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5" />
                              <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2" />
                              <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z" />
                            </svg>
                            ID (Export Console)
                          </>
                        ), '#2f606b')}
                        {archivo.file_url_mapa && renderDownloadBtn(archivo.file_url_mapa, (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-map-fill" viewBox="0 0 16 16" style={{ flexShrink: 0, transform: 'translateX(-6px)' }}>
                              <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.598-.49L10.5.99 5.598.01a.5.5 0 0 0-.196 0l-5 1A.5.5 0 0 0 0 1.5v14a.5.5 0 0 0 .598.49l4.902-.98 4.902.98a.5.5 0 0 0 .196 0l5-1A.5.5 0 0 0 16 14.5zM5 14.09V1.11l.5-.1.5.1v12.98l-.402-.08a.5.5 0 0 0-.196 0zm5 .8V1.91l.402.08a.5.5 0 0 0 .196 0L11 1.91v12.98l-.5.1z" />
                            </svg>
                            MAPA
                          </>
                        ), '#113047')}
                        {archivo.file_url_password && renderDownloadBtn(archivo.file_url_password, (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16" style={{ flexShrink: 0, transform: 'translateX(-6px)' }}>
                              <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
                            </svg>
                            PASSWORD
                          </>
                        ), '#f59e0b')}

                        {archivo.file_url && !archivo.file_url_id && !archivo.file_url_mapa && (
                          renderDownloadBtn(archivo.file_url, '📄 ORIGINAL', '#fff', { border: '1px solid #ddd', color: '#666' })
                        )}
                      </div>
                    </td>

                    {/* --- COLUMNA ACCIÓN ADMI (ADMINISTRADOR) --- */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '3px' : '5px', minWidth: isCompact ? '75px' : '110px' }}>
                        {archivo.mod_file_url ? (
                          renderDownloadBtn(archivo.mod_file_url, (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-rocket-takeoff-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                                <path d="M12.17 9.53c2.307-2.592 3.278-4.684 3.641-6.218.21-.887.214-1.58.16-2.065a3.6 3.6 0 0 0-.108-.563 2 2 0 0 0-.078-.23V.453c-.073-.164-.168-.234-.352-.295a2 2 0 0 0-.16-.045 4 4 0 0 0-.57-.093c-.49-.044-1.19-.03-2.08.188-1.536.374-3.618 1.343-6.161 3.604l-2.4.238h-.006a2.55 2.55 0 0 0-1.524.734L.15 7.17a.512.512 0 0 0 .433.868l1.896-.271c.28-.04.592.013.955.132.232.076.437.16.655.248l.203.083c.196.816.66 1.58 1.275 2.195.613.614 1.376 1.08 2.191 1.277l.082.202c.089.218.173.424.249.657.118.363.172.676.132.956l-.271 1.9a.512.512 0 0 0 .867.433l2.382-2.386c.41-.41.668-.949.732-1.526zm.11-3.699c-.797.8-1.93.961-2.528.362-.598-.6-.436-1.733.361-2.532.798-.799 1.93-.96 2.528-.361s.437 1.732-.36 2.531Z" />
                                <path d="M5.205 10.787a7.6 7.6 0 0 0 1.804 1.352c-1.118 1.007-4.929 2.028-5.054 1.903-.126-.127.737-4.189 1.839-5.18.346.69.837 1.35 1.411 1.925" />
                              </svg>
                              DESCARGAR MOD
                            </>
                          ), '#22c55e')
                        ) : isAdmin && (
                          <label className={`action-btn upload-label${subiendoKey === `${archivo.id}_mod_file_url` ? ' uploading' : ''}`} style={{ background: 'linear-gradient(135deg, #062e1a 0%, #000000 100%)', color: '#22c55e', padding: '5px', fontSize: '9px', cursor: subiendoKey === `${archivo.id}_mod_file_url` ? 'wait' : 'pointer', borderRadius: '4px', border: '1px solid #22c55e', textAlign: 'center', fontWeight: 'bold' }}>
                            {subiendoKey === `${archivo.id}_mod_file_url` ? <><span className="upload-spinner" />SUBIENDO...</> : '📤 SUBIR MOD'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_url')} />
                          </label>
                        )}

                        {archivo.mod_file_extra_url ? (
                          renderDownloadBtn(archivo.mod_file_extra_url, (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-rocket-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                                <path d="M10.175 1.991c.81 1.312 1.583 3.43 1.778 6.819l1.5 1.83A2.5 2.5 0 0 1 14 12.202V15.5a.5.5 0 0 1-.9.3l-1.125-1.5c-.166-.222-.42-.4-.752-.57-.214-.108-.414-.192-.627-.282l-.196-.083C9.7 13.793 8.85 14 8 14s-1.7-.207-2.4-.635q-.101.044-.198.084c-.211.089-.411.173-.625.281-.332.17-.586.348-.752.57L2.9 15.8a.5.5 0 0 1-.9-.3v-3.298a2.5 2.5 0 0 1 .548-1.562l.004-.005L4.049 8.81c.197-3.323.969-5.434 1.774-6.756.466-.767.94-1.262 1.31-1.57a3.7 3.7 0 0 1 .601-.41A.55.55 0 0 1 8 0c.101 0 .17.027.25.064q.056.025.145.075c.118.066.277.167.463.315.373.297.85.779 1.317 1.537M9.5 6c0-1.105-.672-2-1.5-2s-1.5.895-1.5 2S7.172 8 8 8s1.5-.895 1.5-2" />
                                <path d="M8 14.5c.5 0 .999-.046 1.479-.139L8.4 15.8a.5.5 0 0 1-.8 0l-1.079-1.439c.48.093.98.139 1.479.139" />
                              </svg>
                              DESCARGAR V2
                            </>
                          ), '#10b981')
                        ) : isAdmin && (
                          <label className={`action-btn upload-label${subiendoKey === `${archivo.id}_mod_file_extra_url` ? ' uploading' : ''}`} style={{ background: 'linear-gradient(135deg, #04241d 0%, #000000 100%)', color: '#10b981', padding: '5px', fontSize: '9px', cursor: subiendoKey === `${archivo.id}_mod_file_extra_url` ? 'wait' : 'pointer', borderRadius: '4px', border: '1px solid #10b981', textAlign: 'center', fontWeight: 'bold' }}>
                            {subiendoKey === `${archivo.id}_mod_file_extra_url` ? <><span className="upload-spinner" />SUBIENDO...</> : '➕ SUBIR V2'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_extra_url')} />
                          </label>
                        )}

                        {archivo.mod_file_v3_url ? (
                          renderDownloadBtn(archivo.mod_file_v3_url, (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-rocket-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                                <path d="M10.175 1.991c.81 1.312 1.583 3.43 1.778 6.819l1.5 1.83A2.5 2.5 0 0 1 14 12.202V15.5a.5.5 0 0 1-.9.3l-1.125-1.5c-.166-.222-.42-.4-.752-.57-.214-.108-.414-.192-.627-.282l-.196-.083C9.7 13.793 8.85 14 8 14s-1.7-.207-2.4-.635q-.101.044-.198.084c-.211.089-.411.173-.625.281-.332.17-.586.348-.752.57L2.9 15.8a.5.5 0 0 1-.9-.3v-3.298a2.5 2.5 0 0 1 .548-1.562l.004-.005L4.049 8.81c.197-3.323.969-5.434 1.774-6.756.466-.767.94-1.262 1.31-1.57a3.7 3.7 0 0 1 .601-.41A.55.55 0 0 1 8 0c.101 0 .17.027.25.064q.056.025.145.075c.118.066.277.167.463.315.373.297.85.779 1.317 1.537M9.5 6c0-1.105-.672-2-1.5-2s-1.5.895-1.5 2S7.172 8 8 8s1.5-.895 1.5-2" />
                                <path d="M8 14.5c.5 0 .999-.046 1.479-.139L8.4 15.8a.5.5 0 0 1-.8 0l-1.079-1.439c.48.093.98.139 1.479.139" />
                              </svg>
                              DESCARGAR V3
                            </>
                          ), '#0ea5e9')
                        ) : isAdmin && (
                          <label className={`action-btn upload-label${subiendoKey === `${archivo.id}_mod_file_v3_url` ? ' uploading' : ''}`} style={{ background: 'linear-gradient(135deg, #082e3f 0%, #000000 100%)', color: '#0ea5e9', padding: '5px', fontSize: '9px', cursor: subiendoKey === `${archivo.id}_mod_file_v3_url` ? 'wait' : 'pointer', borderRadius: '4px', border: '1px solid #0ea5e9', textAlign: 'center', fontWeight: 'bold' }}>
                            {subiendoKey === `${archivo.id}_mod_file_v3_url` ? <><span className="upload-spinner" />SUBIENDO...</> : '➕ SUBIR V3'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_v3_url')} />
                          </label>
                        )}

                        {archivo.mod_file_eeprom_url ? (
                          renderDownloadBtn(archivo.mod_file_eeprom_url, (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-cpu-fill" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                                <path d="M6.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z" />
                                <path d="M5.5.5a.5.5 0 0 0-1 0V2A2.5 2.5 0 0 0 2 4.5H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2A2.5 2.5 0 0 0 4.5 14v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14a2.5 2.5 0 0 0 2.5-2.5h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14A2.5 2.5 0 0 0 11.5 2V.5a.5.5 0 0 0-1 0V2h-1V.5a.5.5 0 0 0-1 0V2h-1V.5a.5.5 0 0 0-1 0V2h-1zm1 4.5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3A1.5 1.5 0 0 1 6.5 5" />
                              </svg>
                              DESCARGAR EEPROM
                            </>
                          ), '#9c2247')
                        ) : isAdmin && (
                          <label className={`action-btn upload-label${subiendoKey === `${archivo.id}_mod_file_eeprom_url` ? ' uploading' : ''}`} style={{ background: 'linear-gradient(135deg, #340a1c 0%, #000000 100%)', color: '#ffb3c9', padding: '5px', fontSize: '9px', cursor: subiendoKey === `${archivo.id}_mod_file_eeprom_url` ? 'wait' : 'pointer', borderRadius: '4px', border: '1px solid #9c2247', textAlign: 'center', fontWeight: 'bold' }}>
                            {subiendoKey === `${archivo.id}_mod_file_eeprom_url` ? <><span className="upload-spinner" />SUBIENDO...</> : '➕ SUBIR EEPROM'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadModificado(archivo.id, e.target.files[0], archivo.patente, archivo.profiles?.email, 'mod_file_eeprom_url')} />
                          </label>
                        )}
                      </div>
                    </td>

                    <td style={{ ...styles.td, minWidth: isCompact ? '105px' : '180px' }}>
                      <div style={{
                        fontSize: isCompact ? '9px' : '11px', padding: isCompact ? '6px' : '10px',
                        backgroundColor: archivo.notas_instalacion ? '#fffbeb' : s.inputBg,
                        border: '1px solid ' + (archivo.notas_instalacion ? '#fef3c7' : s.border),
                        borderRadius: '4px', color: archivo.notas_instalacion ? '#333' : s.text, minHeight: isCompact ? '36px' : '50px'
                      }}>
                        {archivo.notas_instalacion ? (
                          <><div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#92400e', marginBottom: '4px', fontSize: '9px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16" style={{ marginRight: '4px', flexShrink: 0 }}>
                              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                              <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z" />
                            </svg>
                            INSTRUCCIONES:
                          </div><span style={{ fontWeight: 'bold' }}>{archivo.notas_instalacion}</span></>
                        ) : (
                          <span style={{ color: s.textFaint, fontStyle: 'italic' }}>No se han subido intrucciones...</span>
                        )}
                        {isAdmin && (
                          <button className="action-btn" onClick={() => handleGuardarNota(archivo.id, archivo.notas_instalacion)} style={{ display: 'block', marginTop: '8px', backgroundColor: '#D9241D', color: 'white', border: 'none', padding: '3px 7px', fontSize: '9px', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer' }}>
                            {archivo.notas_instalacion ? 'EDITAR MENSAJE' : '+ ESCRIBIR NOTA'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {!isAdmin && archivo.estado === 'pendiente' ? (
                        <button
                          className="action-btn"
                          onClick={() => handleCancelarSolicitud(archivo)}
                          style={{
                            backgroundColor: 'white',
                            color: '#e11d48',
                            border: '1px solid #e11d48',
                            padding: isCompact ? '4px 6px' : '6px 10px',
                            fontSize: isCompact ? '8px' : '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '4px',
                          }}
                        >
                          ❌ CANCELAR
                        </button>
                      ) : (
                        <span style={{ color: s.textFaint, fontSize: '10px' }}>---</span>
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
            <button className="page-btn" onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }} disabled={paginaActual === 1} style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}>← ANTERIOR</button>
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
                    className="page-btn"
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
                return <span key={numeroPagina} style={{ color: s.textMuted, padding: '0 5px', fontWeight: 'bold' }}>...</span>;
              }

              // Si está muy lejos, se salta el número para mantener limpia la botonera
              return null;
            })}            <button className="page-btn" onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0, 0); }} disabled={paginaActual === totalPaginas} style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}>SIGUIENTE →</button>
          </div>
        )}
      </div>

      {archivoDetalle && (
        <div className="modal-overlay-anim" style={styles.modalOverlay}>
          <div className="modal-content-anim" style={styles.modalContent}>
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
              <div style={{ marginTop: '20px', backgroundColor: s.inputBg, padding: '15px', borderLeft: '4px solid #D9241D' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#D9241D' }}>COMMENTS:</div>
                <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: s.text }}>{archivoDetalle.detalles_tecnicos?.comentarios || 'No comments provided.'}</p>
              </div>
              {archivoDetalle.detalles_tecnicos?.codigosfalla && (
                <div style={{ marginTop: '15px', backgroundColor: s.inputBg, padding: '15px', borderLeft: '4px solid #D9241D' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#D9241D' }}>CÓDIGOS DE FALLA (DTC):</div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: s.text, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                    {archivoDetalle.detalles_tecnicos.codigosfalla}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: '15px', textAlign: 'right' }}>
              <button className="action-btn" onClick={() => setArchivoDetalle(null)} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '8px 25px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archivos;