import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens, playTone } from '../ThemeContext';
import logoStockcarsBlanco from '../logoSTOCKCARSBLANCO.png';
import logoStockcarsColor from '../logo_stockcars.png';

// --- GRÁFICO DE DYNO (demostrativo): curva típica escalada a los picos HP/Nm cargados ---
const DYNO_RPM = [1000, 1700, 2400, 3100, 3800, 4500, 5200, 5900, 6600];
const DYNO_SHAPE_POWER = [0.20, 0.47, 0.68, 0.83, 0.93, 1.00, 0.97, 0.91, 0.84];
const DYNO_SHAPE_TORQUE = [0.38, 0.74, 0.93, 1.00, 0.98, 0.93, 0.87, 0.81, 0.75];

const construirDynoChart = (hpStock, hpStage1, nmStock, nmStage1) => {
  const W = 420, H = 190;
  const padL = 36, padR = 36, padT = 10, padB = 10;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxPower = Math.max(hpStock, hpStage1) * 1.18;
  const maxTorque = Math.max(nmStock, nmStage1) * 1.18;

  const xAt = (i) => padL + (plotW * i) / (DYNO_RPM.length - 1);
  const yPower = (v) => padT + plotH - (v / maxPower) * plotH;
  const yTorque = (v) => padT + plotH - (v / maxTorque) * plotH;

  const buildPts = (peak, shape, yFn) => shape.map((f, i) => ({ x: xAt(i), y: yFn(peak * f), v: peak * f }));

  return {
    W, H, padL, padR, padT, plotW, plotH, maxPower, maxTorque,
    origPower: buildPts(hpStock, DYNO_SHAPE_POWER, yPower),
    modPower: buildPts(hpStage1, DYNO_SHAPE_POWER, yPower),
    origTorque: buildPts(nmStock, DYNO_SHAPE_TORQUE, yTorque),
    modTorque: buildPts(nmStage1, DYNO_SHAPE_TORQUE, yTorque)
  };
};

const dynoPts = (pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

// Índice del punto más alto de cada curva (el mismo para original y modificado, ya que comparten forma)
const DYNO_PEAK_POWER_IDX = DYNO_SHAPE_POWER.indexOf(Math.max(...DYNO_SHAPE_POWER));
const DYNO_PEAK_TORQUE_IDX = DYNO_SHAPE_TORQUE.indexOf(Math.max(...DYNO_SHAPE_TORQUE));

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendoKey, setSubiendoKey] = useState(null);
  const [archivoDetalle, setArchivoDetalle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadProgress, setDownloadProgress] = useState({});
  const [aumentosAbierto, setAumentosAbierto] = useState(null);
  const [aumentosEditar, setAumentosEditar] = useState(null);
  const [formAumentos, setFormAumentos] = useState({
    hpStock: '', nmStock: '', hpStage1: '', nmStage1: '',
    marca_modelo: '', patente: '', anio: '', motor: '', combustible: '', transmision: '', modo_lectura: '', ecu: ''
  });
  const [guardandoAumentos, setGuardandoAumentos] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // Colores propios del panel de "Aumentos", adaptados a modo claro/oscuro
  const aTokens = {
    panelBg: isDark ? 'linear-gradient(135deg, #1a0000 0%, #000000 100%)' : 'linear-gradient(135deg, #fff6f6 0%, #ffffff 100%)',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(217,36,29,0.03)',
    border: isDark ? '#2a2a2a' : '#eadcdc',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    text: isDark ? '#fff' : '#1a1a1a',
    textMuted: isDark ? '#aaa' : '#666',
    textFaint: isDark ? '#777' : '#999',
    unit: isDark ? '#888' : '#999',
    original: isDark ? '#ffffff' : '#334155',
    logo: isDark ? logoStockcarsBlanco : logoStockcarsColor,
    logoOpacity: isDark ? 0.35 : 0.1
  };

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
    'felipe.acuna2@mail.udp.cl'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  // Viewport "chico" en CSS px (ej: Windows con escala 125%/150%) -> tabla más compacta
  // para que quepa sin scroll horizontal, sin achicar la vista cómoda en pantallas grandes.
  const isCompact = window.innerWidth <= 1600;

  // Columnas totales de la tabla, para el colSpan del panel de Aumentos
  const totalColumnas = isAdmin ? 11 : 10;
  const aplicaAumentos = (servicio) => !!servicio && /STAGE\s*[12]/.test(servicio.toUpperCase());
  const etiquetaStage = (servicio) => {
    if (!servicio) return 'STAGE 1';
    const s = servicio.toUpperCase();
    return s.includes('STAGE 2') ? 'STAGE 2' : 'STAGE 1';
  };
  const toggleAumentos = (archivoId) => {
    playTone(800, 0.05, 0.07);
    const seAbre = aumentosAbierto !== archivoId;
    if (seAbre) {
      // "Rev up" sincronizado con el barrido del gráfico de puntos (dyno)
      playTone(320, 0.05, 0.05, 0.25);
      playTone(480, 0.05, 0.05, 0.45);
      playTone(680, 0.05, 0.05, 0.65);
      playTone(950, 0.08, 0.06, 0.85);
    }
    setAumentosAbierto(prev => (prev === archivoId ? null : archivoId));
  };

  // Al abrir el panel de Aumentos, baja la pantalla sola para que se vea completo sin scrollear a mano
  useEffect(() => {
    if (!aumentosAbierto) return;
    const t = setTimeout(() => {
      document.getElementById(`archivo-row-${aumentosAbierto}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(t);
  }, [aumentosAbierto]);

  const abrirEditorAumentos = (archivo) => {
    const actuales = archivo.detalles_tecnicos?.aumentos || {};
    const dt = archivo.detalles_tecnicos || {};
    setFormAumentos({
      hpStock: actuales.hpStock ?? dt.hp ?? '',
      nmStock: actuales.nmStock ?? '',
      hpStage1: actuales.hpStage1 ?? '',
      nmStage1: actuales.nmStage1 ?? '',
      marca_modelo: archivo.marca_modelo ?? '',
      patente: archivo.patente ?? '',
      anio: dt.anio ?? '',
      motor: dt.motor ?? '',
      combustible: dt.combustible ?? '',
      transmision: dt.transmision ?? '',
      modo_lectura: dt.modo_lectura ?? '',
      ecu: dt.tipo_modulo ? `${dt.tipo_modulo} (${dt.ecu || ''})`.trim() : (dt.ecu ?? '')
    });
    setAumentosEditar(archivo);
  };

  const guardarAumentos = async () => {
    if (!aumentosEditar) return;
    const hpStock = parseFloat(formAumentos.hpStock);
    const nmStock = parseFloat(formAumentos.nmStock);
    const hpStage1 = parseFloat(formAumentos.hpStage1);
    const nmStage1 = parseFloat(formAumentos.nmStage1);

    if ([hpStock, nmStock, hpStage1, nmStage1].some(v => isNaN(v) || v <= 0)) {
      alert('Completa los 4 valores con números mayores a 0.');
      return;
    }

    try {
      setGuardandoAumentos(true);
      const nuevosDetalles = {
        ...(aumentosEditar.detalles_tecnicos || {}),
        aumentos: { hpStock, nmStock, hpStage1, nmStage1 },
        anio: formAumentos.anio.trim(),
        motor: formAumentos.motor.trim(),
        combustible: formAumentos.combustible.trim(),
        transmision: formAumentos.transmision,
        modo_lectura: formAumentos.modo_lectura,
        ecu: formAumentos.ecu.trim(),
        tipo_modulo: null
      };

      const { error } = await supabase
        .from('archivos')
        .update({
          detalles_tecnicos: nuevosDetalles,
          marca_modelo: formAumentos.marca_modelo.trim(),
          patente: formAumentos.patente.trim().toUpperCase()
        })
        .eq('id', aumentosEditar.id);

      if (error) throw error;

      playTone(750, 0.05, 0.08, 0);
      playTone(1150, 0.07, 0.08, 0.05);
      setAumentosEditar(null);
      fetchArchivos();
    } catch (error) {
      console.error('Error guardando aumentos:', error.message);
      alert('Error al guardar los datos de aumentos.');
    } finally {
      setGuardandoAumentos(false);
    }
  };

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
        @keyframes aumentosSlideIn {
          from { opacity: 0; transform: translateY(-14px) scaleY(0.92); filter: blur(6px); }
          to { opacity: 1; transform: translateY(0) scaleY(1); filter: blur(0); }
        }
        .aumentos-panel { animation: aumentosSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: top center; }
        @keyframes aumentosColRise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .aumentos-col { animation: aumentosColRise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes barReveal { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .aumentos-bar-fill { transform-origin: left; animation: barReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes barRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .aumentos-bar-rise { transform-box: fill-box; transform-origin: bottom; animation: barRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes chevronPop { from { opacity: 0; transform: rotate(-90deg) scale(0.5); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
        .aumentos-icon-open { animation: chevronPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .aumentos-toggle-btn { transform: scale(1); }
        .aumentos-toggle-btn:active { transform: scale(0.92); }
        @keyframes aumentosGlowPulse {
          0% { box-shadow: 0 0 0 0 rgba(217,36,29,0.7), 0 0 0 0 rgba(217,36,29,0.4); }
          60% { box-shadow: 0 0 0 7px rgba(217,36,29,0), 0 0 14px 4px rgba(217,36,29,0.35); }
          100% { box-shadow: 0 0 0 7px rgba(217,36,29,0), 0 0 0 0 rgba(217,36,29,0); }
        }
        .aumentos-toggle-open { animation: aumentosGlowPulse 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes dynoReveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
        .dyno-reveal { animation: dynoReveal 0.9s cubic-bezier(0.65, 0, 0.35, 1) both; animation-delay: 0.25s; }
        @keyframes dynoDotPop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        .dyno-dot { transform-box: fill-box; transform-origin: center; animation: dynoDotPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .dyno-peak-dot { cursor: pointer; }
        .dyno-peak-tip { opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
        svg:has(.dyno-peak-dot-op:hover) .dyno-peak-tip-op { opacity: 1; }
        svg:has(.dyno-peak-dot-mp:hover) .dyno-peak-tip-mp { opacity: 1; }
        svg:has(.dyno-peak-dot-ot:hover) .dyno-peak-tip-ot { opacity: 1; }
        svg:has(.dyno-peak-dot-mt:hover) .dyno-peak-tip-mt { opacity: 1; }
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
                <React.Fragment key={archivo.id}>
                  <tr
                    className="file-row"
                    id={`archivo-row-${archivo.id}`}
                    style={{
                      animationDelay: `${Math.min(index, 8) * 0.04}s`,
                      ...(aumentosAbierto === archivo.id ? {
                        backgroundColor: 'rgba(217,36,29,0.07)',
                        boxShadow: 'inset 4px 0 0 0 #D9241D'
                      } : {})
                    }}
                  >
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '85px' }}>
                        <button className="action-btn" onClick={() => setArchivoDetalle(archivo)} style={{ backgroundColor: isDark ? '#3a3a3a' : '#000', color: '#fff', border: isDark ? '1px solid #6a6a6a' : 'none', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>DETALLES</button>
                        {isAdmin && aplicaAumentos(archivo.detalles_tecnicos?.servicios_solicitados) && (
                          <button
                            className="action-btn"
                            onClick={() => abrirEditorAumentos(archivo)}
                            style={{
                              backgroundColor: archivo.detalles_tecnicos?.aumentos ? '#1a0000' : 'transparent',
                              color: '#D9241D', border: '1px solid #D9241D', padding: '4px 8px', fontSize: '9px',
                              fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', whiteSpace: 'nowrap'
                            }}
                          >
                            ⚙️ AUMENTOS
                          </button>
                        )}
                      </div>
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

                      {aplicaAumentos(archivo.detalles_tecnicos?.servicios_solicitados) && (
                        <button
                          className={`action-btn aumentos-toggle-btn${aumentosAbierto === archivo.id ? ' aumentos-toggle-open' : ''}`}
                          onClick={() => toggleAumentos(archivo.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            marginTop: '6px', backgroundColor: aumentosAbierto === archivo.id ? '#D9241D' : 'transparent',
                            color: aumentosAbierto === archivo.id ? '#fff' : '#D9241D',
                            border: '1px solid #D9241D', padding: '4px 8px', fontSize: '9px',
                            fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'background-color 0.2s ease, color 0.2s ease'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                            <path d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07" />
                          </svg>
                          AUMENTOS
                          <svg
                            xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="currentColor" viewBox="0 0 16 16"
                            style={{
                              flexShrink: 0, marginLeft: '2px',
                              transform: aumentosAbierto === archivo.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                          </svg>
                        </button>
                      )}
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

                    <td style={{ ...styles.td, minWidth: isCompact ? '105px' : '180px', maxWidth: isCompact ? '170px' : '280px', width: isCompact ? '170px' : undefined }}>
                      <div style={{
                        fontSize: isCompact ? '9px' : '11px', padding: isCompact ? '6px' : '10px',
                        backgroundColor: archivo.notas_instalacion ? '#fffbeb' : s.inputBg,
                        border: '1px solid ' + (archivo.notas_instalacion ? '#fef3c7' : s.border),
                        borderRadius: '4px', color: archivo.notas_instalacion ? '#333' : s.text, minHeight: isCompact ? '36px' : '50px',
                        overflowWrap: 'break-word'
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

                  {aumentosAbierto === archivo.id && (
                    <tr className="aumentos-row" id={`aumentos-row-${archivo.id}`}>
                      <td colSpan={totalColumnas} style={{ padding: 0, border: 'none' }}>
                        <div className="aumentos-panel" style={{
                          position: 'relative',
                          overflow: 'hidden',
                          margin: '0 8px 14px 8px',
                          borderRadius: '0 0 10px 10px',
                          background: aTokens.panelBg,
                          border: '1px solid #D9241D',
                          borderTop: 'none',
                          padding: '24px 30px'
                        }}>
                          {(() => {
                            const datosReales = archivo.detalles_tecnicos?.aumentos;
                            const stageTxt = etiquetaStage(archivo.detalles_tecnicos?.servicios_solicitados);

                            // Valores base (reales si el admin los cargó, si no unos genéricos
                            // solo para que se vea el gráfico mientras no se cargan).
                            const hpStock = Math.round(datosReales?.hpStock ?? 150);
                            const hpStage1 = Math.round(datosReales?.hpStage1 ?? 150 * 1.25);
                            const nmStock = Math.round(datosReales?.nmStock ?? 280);
                            const nmStage1 = Math.round(datosReales?.nmStage1 ?? 280 * 1.30);
                            const dyno = construirDynoChart(hpStock, hpStage1, nmStock, nmStage1);

                            // Dibuja los puntos de una curva; el punto más alto queda resaltado
                            // y muestra el valor máximo (HP o Nm) al pasar el cursor.
                            // Los puntos se dibujan primero (en orden normal); los recuadros de los
                            // picos se dibujan todos al final, para que ninguna curva los tape.
                            const renderDynoDots = (pts, peakIdx, color, prefix) => pts.map((p, i) => (
                              <circle
                                key={`${prefix}${i}`}
                                className={i === peakIdx ? `dyno-dot dyno-peak-dot dyno-peak-dot-${prefix}` : 'dyno-dot'}
                                style={{ animationDelay: `${0.25 + (i / 8) * 0.9}s` }}
                                cx={p.x} cy={p.y} r={i === peakIdx ? '3.6' : '2.6'}
                                fill={i === peakIdx ? color : '#000'} stroke={i === peakIdx ? '#fff' : color}
                                strokeWidth={i === peakIdx ? '1.2' : '1.3'}
                              />
                            ));

                            const renderDynoTooltip = (pts, peakIdx, color, unidad, prefix, etiqueta) => {
                              const p = pts[peakIdx];
                              const tipY = Math.max(p.y - 26, 16);
                              return (
                                <g key={prefix} className={`dyno-peak-tip dyno-peak-tip-${prefix}`} transform={`translate(${p.x}, ${tipY})`}>
                                  <rect x="-24" y="-17" width="48" height="24" rx="4" fill="#0a0a0a" stroke={color} strokeWidth="1" />
                                  <text x="0" y="-6" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">{Math.round(p.v)} {unidad}</text>
                                  <text x="0" y="3" textAnchor="middle" fontSize="6.5" fontWeight="700" letterSpacing="0.4" fill={color}>{etiqueta}</text>
                                </g>
                              );
                            };

                            const metrics = [
                              { label: 'POWER HP', unidad: 'HP', stock: hpStock, stage1: hpStage1 },
                              { label: 'TORQUE NM', unidad: 'Nm', stock: nmStock, stage1: nmStage1 }
                            ];

                            // Eje "lindo" (0 / 50 / 100 ...) para el mini gráfico de barras de cada métrica
                            const ejeLindo = (v) => {
                              const raw = v * 1.25;
                              const paso = raw > 500 ? 100 : raw > 200 ? 50 : raw > 80 ? 25 : 10;
                              return Math.ceil(raw / paso) * paso;
                            };

                            return (
                              <>
                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <div className="aumentos-col" style={{ flex: '0 1 460px', minWidth: '380px', animationDelay: '0.05s' }}>
                                  <h4 style={{ margin: '0 0 6px 0', color: aTokens.text, fontSize: '20px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07" />
                                    </svg>
                                    Aumentos {datosReales ? '' : 'estimados '}
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center',
                                      background: 'linear-gradient(135deg, #D9241D 0%, #7a0f0a 100%)',
                                      color: '#fff', fontSize: '11px', fontWeight: '800',
                                      padding: '3px 11px', borderRadius: '999px',
                                      letterSpacing: '0.6px', boxShadow: '0 0 10px rgba(217,36,29,0.55)'
                                    }}>
                                      {stageTxt}
                                    </span>
                                  </h4>
                                  <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: aTokens.textMuted }}>
                                    {archivo.marca_modelo} · {archivo.patente} {datosReales ? '' : '— valores referenciales, pueden variar según el vehículo'}
                                  </p>

                                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                    {metrics.map((m) => {
                                      const max = ejeLindo(Math.max(m.stock, m.stage1));
                                      const W = 170, H = 120, padL = 30, padR = 8, padT = 10, padB = 22;
                                      const plotW = W - padL - padR, plotH = H - padT - padB;
                                      const yAt = (v) => padT + plotH - (v / max) * plotH;
                                      const barW = 32;
                                      const xOrig = padL + plotW * 0.26 - barW / 2;
                                      const xMod = padL + plotW * 0.74 - barW / 2;
                                      const diff = m.stage1 - m.stock;
                                      return (
                                        <div key={m.label} style={{ flex: '1 1 190px', minWidth: '180px', backgroundColor: aTokens.cardBg, border: `1px solid ${aTokens.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                                          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                                            {[0, 0.25, 0.5, 0.75, 1].map(f => (
                                              <line key={f} x1={padL} x2={W - padR} y1={padT + plotH * (1 - f)} y2={padT + plotH * (1 - f)} stroke={aTokens.grid} strokeWidth="1" />
                                            ))}
                                            {[0, 0.5, 1].map(f => (
                                              <text key={f} x={padL - 5} y={padT + plotH * (1 - f) + 3} fill={aTokens.textFaint} fontSize="9" textAnchor="end">{Math.round(max * f)}</text>
                                            ))}
                                            <rect className="aumentos-bar-rise" x={xOrig} y={yAt(m.stock)} width={barW} height={padT + plotH - yAt(m.stock)} fill={aTokens.original} style={{ animationDelay: '0.1s' }} />
                                            <rect className="aumentos-bar-rise" x={xMod} y={yAt(m.stage1)} width={barW} height={padT + plotH - yAt(m.stage1)} fill="#D9241D" style={{ animationDelay: '0.22s' }} />
                                            <text x={xOrig + barW / 2} y={H - 6} fill={aTokens.textFaint} fontSize="9" textAnchor="middle">Original</text>
                                            <text x={xMod + barW / 2} y={H - 6} fill={aTokens.textFaint} fontSize="9" textAnchor="middle">{stageTxt}</text>
                                          </svg>
                                          <div style={{ borderTop: `1px solid ${aTokens.border}`, padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: aTokens.text, letterSpacing: '0.4px', marginBottom: '8px' }}>{m.label}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: aTokens.textMuted, marginBottom: '4px' }}>
                                              <span>Original</span>
                                              <span style={{ color: aTokens.text, fontWeight: 'bold' }}>{m.stock} <span style={{ fontWeight: 'normal', color: aTokens.unit }}>{m.unidad}</span></span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: aTokens.textMuted, marginBottom: '8px' }}>
                                              <span>{stageTxt}</span>
                                              <span style={{ color: '#D9241D', fontWeight: 'bold' }}>{m.stage1} <span style={{ fontWeight: 'normal', color: aTokens.unit }}>{m.unidad}</span></span>
                                            </div>
                                            <div style={{ borderTop: `1px solid ${aTokens.border}`, paddingTop: '7px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: aTokens.text }}>
                                              <span>Aumentos</span>
                                              <span style={{ color: '#D9241D' }}>+{diff} {m.unidad}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {isAdmin && (
                                    <button
                                      className="action-btn"
                                      onClick={() => abrirEditorAumentos(archivo)}
                                      style={{ marginTop: '14px', backgroundColor: 'transparent', color: aTokens.textMuted, border: `1px solid ${aTokens.border}`, padding: '6px 14px', fontSize: '13px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                      ⚙️ {datosReales ? 'EDITAR VALORES' : 'CARGAR VALORES REALES'}
                                    </button>
                                  )}
                                </div>

                                {/* --- GRÁFICO DE DYNO (CURVA DEMOSTRATIVA) --- */}
                                <div className="aumentos-col" style={{ position: 'relative', flex: '0 1 560px', minWidth: '460px', maxWidth: '600px', animationDelay: '0.14s' }}>
                                  <img
                                    src={aTokens.logo}
                                    alt=""
                                    style={{
                                      position: 'absolute', top: '50%', left: '50%',
                                      width: '85%', maxWidth: '420px',
                                      transform: 'translate(-50%, -50%)',
                                      opacity: aTokens.logoOpacity,
                                      pointerEvents: 'none', userSelect: 'none'
                                    }}
                                  />
                                  <p style={{ position: 'relative', margin: '0 0 6px 0', fontSize: '15px', color: aTokens.textFaint, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Gráfico demostrativo
                                  </p>
                                  <svg viewBox={`0 0 ${dyno.W} ${dyno.H}`} style={{ position: 'relative', width: '100%', height: 'auto', display: 'block' }}>
                                    {/* grilla horizontal */}
                                    {[0, 0.25, 0.5, 0.75, 1].map(f => (
                                      <line
                                        key={f}
                                        x1={dyno.padL} x2={dyno.W - dyno.padR}
                                        y1={dyno.padT + dyno.plotH * (1 - f)} y2={dyno.padT + dyno.plotH * (1 - f)}
                                        stroke={aTokens.grid} strokeWidth="1"
                                      />
                                    ))}
                                    {/* eje Y izquierdo: potencia (HP) */}
                                    {[0, 0.5, 1].map(f => (
                                      <text key={`p${f}`} x={dyno.padL - 5} y={dyno.padT + dyno.plotH * (1 - f) + 3} fill={aTokens.textFaint} fontSize="8" textAnchor="end">
                                        {Math.round(dyno.maxPower * f)}
                                      </text>
                                    ))}
                                    <text
                                      x="9" y={dyno.padT + dyno.plotH / 2} fill={aTokens.textMuted} fontSize="7.5" fontWeight="800"
                                      textAnchor="middle" letterSpacing="0.5"
                                      transform={`rotate(-90, 9, ${dyno.padT + dyno.plotH / 2})`}
                                    >
                                      HP
                                    </text>
                                    {/* eje Y derecho: torque (Nm) */}
                                    {[0, 0.5, 1].map(f => (
                                      <text key={`t${f}`} x={dyno.W - dyno.padR + 5} y={dyno.padT + dyno.plotH * (1 - f) + 3} fill={aTokens.textFaint} fontSize="8" textAnchor="start">
                                        {Math.round(dyno.maxTorque * f)}
                                      </text>
                                    ))}
                                    <text
                                      x={dyno.W - 9} y={dyno.padT + dyno.plotH / 2} fill={aTokens.textMuted} fontSize="7.5" fontWeight="800"
                                      textAnchor="middle" letterSpacing="0.5"
                                      transform={`rotate(90, ${dyno.W - 9}, ${dyno.padT + dyno.plotH / 2})`}
                                    >
                                      Nm
                                    </text>
                                    {/* curvas + marcadores, revelados con un barrido de izquierda a derecha */}
                                    <g className="dyno-reveal">
                                      <polyline points={dynoPts(dyno.origPower)} fill="none" stroke="#1E3A8A" strokeWidth="2" />
                                      <polyline points={dynoPts(dyno.modPower)} fill="none" stroke="#D9241D" strokeWidth="2" />
                                      <polyline points={dynoPts(dyno.origTorque)} fill="none" stroke="#1E3A8A" strokeWidth="2" strokeDasharray="5,4" />
                                      <polyline points={dynoPts(dyno.modTorque)} fill="none" stroke="#D9241D" strokeWidth="2" strokeDasharray="5,4" />
                                      {renderDynoDots(dyno.origPower, DYNO_PEAK_POWER_IDX, "#1E3A8A", "op")}
                                      {renderDynoDots(dyno.modPower, DYNO_PEAK_POWER_IDX, "#D9241D", "mp")}
                                      {renderDynoDots(dyno.origTorque, DYNO_PEAK_TORQUE_IDX, "#1E3A8A", "ot")}
                                      {renderDynoDots(dyno.modTorque, DYNO_PEAK_TORQUE_IDX, "#D9241D", "mt")}
                                    </g>
                                    {/* eje X */}
                                    <text x={dyno.W / 2} y={dyno.H - 1} fill={aTokens.textMuted} fontSize="8" fontWeight="700" textAnchor="middle">RPM</text>
                                    {/* recuadros de los picos: van al final para quedar siempre por encima de todo */}
                                    {renderDynoTooltip(dyno.origPower, DYNO_PEAK_POWER_IDX, "#1E3A8A", "HP", "op", "STOCK")}
                                    {renderDynoTooltip(dyno.modPower, DYNO_PEAK_POWER_IDX, "#D9241D", "HP", "mp", stageTxt)}
                                    {renderDynoTooltip(dyno.origTorque, DYNO_PEAK_TORQUE_IDX, "#1E3A8A", "Nm", "ot", "STOCK")}
                                    {renderDynoTooltip(dyno.modTorque, DYNO_PEAK_TORQUE_IDX, "#D9241D", "Nm", "mt", stageTxt)}
                                  </svg>
                                  <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '8px', fontSize: '13px', color: aTokens.textMuted }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '16px', height: '3px', backgroundColor: '#1E3A8A', display: 'inline-block' }} />Potencia original</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '16px', height: '3px', backgroundColor: '#D9241D', display: 'inline-block' }} />Potencia modificada</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '16px', height: '0', borderTop: '3px dashed #1E3A8A', display: 'inline-block' }} />Torque original</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '16px', height: '0', borderTop: '3px dashed #D9241D', display: 'inline-block' }} />Torque modificado</span>
                                  </div>
                                </div>

                                {/* --- CARACTERÍSTICAS DEL VEHÍCULO --- */}
                                <div className="aumentos-col" style={{ flex: '0 1 230px', minWidth: '200px', backgroundColor: aTokens.cardBg, border: `1px solid ${aTokens.border}`, borderRadius: '8px', padding: '14px 16px', animationDelay: '0.22s' }}>
                                  <h5 style={{ margin: '0 0 10px 0', color: aTokens.text, fontSize: '11px', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Vehículo
                                  </h5>
                                  {[
                                    ['Marca / Modelo', archivo.marca_modelo],
                                    ['Patente', archivo.patente],
                                    ['Año', archivo.detalles_tecnicos?.anio],
                                    ['Motor', archivo.detalles_tecnicos?.motor],
                                    ['Combustible', archivo.detalles_tecnicos?.combustible],
                                    ['Transmisión', archivo.detalles_tecnicos?.transmision === 'Automatico' ? 'Automático' : archivo.detalles_tecnicos?.transmision],
                                    ['Modo de lectura', archivo.detalles_tecnicos?.modo_lectura],
                                    ['ECU / Módulo', archivo.detalles_tecnicos?.tipo_modulo
                                      ? `${archivo.detalles_tecnicos.tipo_modulo} (${archivo.detalles_tecnicos?.ecu || 'N/E'})`
                                      : archivo.detalles_tecnicos?.ecu]
                                  ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: aTokens.textMuted, padding: '5px 0', borderBottom: `1px solid ${aTokens.divider}` }}>
                                      <span style={{ color: aTokens.textFaint }}>{label}</span>
                                      <span style={{ color: aTokens.text, fontWeight: 'bold', textAlign: 'right', overflowWrap: 'break-word' }}>{value || '---'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <p style={{ position: 'relative', zIndex: 1, margin: '14px 0 0 0', fontSize: '10px', color: aTokens.textFaint, fontStyle: 'italic', lineHeight: 1.4 }}>
                                Los resultados obtenidos corresponden a pruebas realizadas en un vehículo con mantenimiento al día y un motor en óptimas condiciones. Las cifras pueden variar según el estado mecánico, el combustible utilizado y la configuración de cada vehículo.
                              </p>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
                    ['Patente', archivoDetalle.patente],
                    ['Marca / Modelo', archivoDetalle.marca_modelo],
                    ['Año', archivoDetalle.detalles_tecnicos?.anio],
                    ['Motor', archivoDetalle.detalles_tecnicos?.motor],
                    ['HP', archivoDetalle.detalles_tecnicos?.hp],
                    ['Combustible', archivoDetalle.detalles_tecnicos?.combustible],
                    ['Transmisión', archivoDetalle.detalles_tecnicos?.transmision === 'Automatico' ? 'Automático' : archivoDetalle.detalles_tecnicos?.transmision],
                    ['Modo de lectura', archivoDetalle.detalles_tecnicos?.modo_lectura],
                    ['ECU / DCU / TCU / DSG',
                      archivoDetalle.detalles_tecnicos?.tipo_modulo
                        ? `${archivoDetalle.detalles_tecnicos.tipo_modulo} (${archivoDetalle.detalles_tecnicos?.ecu || 'Sin especificar'})`
                        : archivoDetalle.detalles_tecnicos?.ecu],
                    ['Servicios', archivoDetalle.detalles_tecnicos?.servicios_solicitados],
                    ['Créditos', archivoDetalle.detalles_tecnicos?.costo_creditos]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={styles.infoLabel}>{label}</td>
                      <td style={styles.infoValue}>{value || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', backgroundColor: s.inputBg, padding: '15px', borderLeft: '4px solid #D9241D' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#D9241D' }}>COMENTARIOS:</div>
                <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: s.text }}>{archivoDetalle.detalles_tecnicos?.comentarios || 'No se proporcionaron comentarios.'}</p>
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
              <button className="action-btn" onClick={() => setArchivoDetalle(null)} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '8px 25px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {aumentosEditar && (
        <div className="modal-overlay-anim" style={styles.modalOverlay} onClick={() => !guardandoAumentos && setAumentosEditar(null)}>
          <div className="modal-content-anim" style={{ ...styles.modalContent, maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '13px' }}>AUMENTOS — {aumentosEditar.patente}</h3>
              <button onClick={() => setAumentosEditar(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ ...styles.modalBody, padding: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#D9241D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Vehículo</h4>
              {[
                { key: 'marca_modelo', label: 'Marca / Modelo' },
                { key: 'patente', label: 'Patente' },
                { key: 'anio', label: 'Año' },
                { key: 'motor', label: 'Motor' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>{f.label}</label>
                  <input
                    type="text"
                    value={formAumentos[f.key]}
                    onChange={(e) => setFormAumentos(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                    placeholder="---"
                  />
                </div>
              ))}

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>Combustible</label>
                <select
                  value={formAumentos.combustible}
                  onChange={(e) => setFormAumentos(prev => ({ ...prev, combustible: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                >
                  <option value="">Seleccionar</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hibrido">Híbrido</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>Transmisión</label>
                <select
                  value={formAumentos.transmision}
                  onChange={(e) => setFormAumentos(prev => ({ ...prev, transmision: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                >
                  <option value="">Seleccionar</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatico">Automático</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>Modo de lectura</label>
                <select
                  value={formAumentos.modo_lectura}
                  onChange={(e) => setFormAumentos(prev => ({ ...prev, modo_lectura: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                >
                  <option value="">Seleccionar</option>
                  <option value="OBD2">OBD2</option>
                  <option value="BENCH">BENCH</option>
                  <option value="BOOT">BOOT</option>
                  <option value="BOOTGLITCH">BOOTGLITCH</option>
                  <option value="KORHEK MODE">KORHEK MODE</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>ECU / Módulo</label>
                <input
                  type="text"
                  value={formAumentos.ecu}
                  onChange={(e) => setFormAumentos(prev => ({ ...prev, ecu: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                  placeholder="---"
                />
              </div>

              <h4 style={{ margin: '18px 0 10px 0', fontSize: '11px', color: '#D9241D', textTransform: 'uppercase', letterSpacing: '0.4px', borderTop: `1px solid ${s.border}`, paddingTop: '16px' }}>Aumentos</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: s.textMuted }}>
                Valores de fábrica y con {etiquetaStage(aumentosEditar.detalles_tecnicos?.servicios_solicitados)}. Se usan para el gráfico de aumentos que ve el cliente en "Servicio".
              </p>
              {[
                { key: 'hpStock', label: 'HP de fábrica (Stock)' },
                { key: 'nmStock', label: 'Nm de fábrica (Stock)' },
                { key: 'hpStage1', label: `HP con ${etiquetaStage(aumentosEditar.detalles_tecnicos?.servicios_solicitados)}` },
                { key: 'nmStage1', label: `Nm con ${etiquetaStage(aumentosEditar.detalles_tecnicos?.servicios_solicitados)}` }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: s.text, marginBottom: '4px', textTransform: 'uppercase' }}>{f.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={formAumentos[f.key]}
                    onChange={(e) => setFormAumentos(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${s.inputBorder}`, backgroundColor: s.inputBg, color: s.text, boxSizing: 'border-box' }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="action-btn" onClick={() => setAumentosEditar(null)} disabled={guardandoAumentos} style={{ backgroundColor: 'transparent', color: s.textMuted, border: `1px solid ${s.border}`, padding: '8px 18px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}>CANCELAR</button>
              <button className="action-btn" onClick={guardarAumentos} disabled={guardandoAumentos} style={{ backgroundColor: '#D9241D', color: 'white', border: 'none', padding: '8px 22px', cursor: guardandoAumentos ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}>
                {guardandoAumentos ? 'GUARDANDO...' : 'GUARDAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archivos;