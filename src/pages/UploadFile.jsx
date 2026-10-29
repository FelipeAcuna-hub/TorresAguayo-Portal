import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens, playTone } from '../ThemeContext';
import { PumpkinIcon, CobwebCorner, DanglingSpiders } from '../components/HalloweenDecor';

// --- 1. DEFINICIÓN DE SERVICIOS DINÁMICOS ---
export const SERVICIOS_CONFIG = {
  'REPRO GASOLINA': [
    { id: 'b_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 14 },
    { id: 'b_s1pb', name: 'STAGE 1 + POPS AND BANGS', price: 18 },
    { id: 'b_s2', name: 'STAGE 2 (REQUIERE MODS)', price: 16 },
    { id: 'b_s2pb', name: 'STAGE 2 + POPS AND BANGS', price: 22 },
    { id: 'b_pb', name: 'POPS AND BANGS (SOLO)', price: 6 },
    { id: 'b_sc', name: 'STAGE CUSTOM (MAPA A MEDIDA)', price: 28 },
    { id: 'b_s3', name: 'MULTI MAP (STOCK + STAGE 1 + STAGE 2 SELECCIONABLE)', price: 32 }
  ],
  'REPRO DIÉSEL': [
    { id: 'd_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 14 },
    { id: 'd_s1egr', name: 'STAGE 1 + EGR OFF', price: 15 },
    { id: 'd_s1dpf', name: 'STAGE 1 + DPF + EGR OFF', price: 16 },
    { id: 'd_s1full', name: 'STAGE 1 + DPF + EGR OFF + ADBLUE OFF', price: 19 },
    { id: 'd_s2', name: 'STAGE 2', price: 16 },
    { id: 'd_s2full', name: 'STAGE 2 + HARDCUT', price: 20 },
    { id: 'd_s2full_adblue', name: 'STAGE 2 + DPF + EGR o ADBLUE OFF', price: 24 },
    { id: 'd_s3', name: 'STAGE CUSTOM (MAPA A MEDIDA)', price: 28 },
    { id: 'd_s3full', name: 'MULTI MAP (STOCK + STAGE 1 + STAGE 2 SELECCIONABLE)', price: 32 }
  ],
  'ANULACIONES EURO': [
    { id: 'dpf_only', name: 'DPF OFF', price: 5 },
    { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 6 },
    { id: 'adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 8 },
    { id: 'egr_only', name: 'EGR OFF', price: 4 },
    { id: 'adblue_only', name: 'ADBLUE OFF', price: 6 },
    { id: 'restauracion_orig', name: 'RESTAURACIÓN ORIG', price: 6 },
    { id: 'checkfile', name: 'CHECK FILE', price: 2 }
  ],
  'ANULACIONES EURO (CAMIONES)': [
  { id: 'truck_dpf_egr', name: 'DPF + EGR OFF', price: 12 },
  { id: 'truck_adblue_full', name: 'ADBLUE + DPF + EGR OFF', price: 16 },
  { id: 'truck_dpf_egr_adblue', name: 'ADBLUE + DPF & EGR OFF + DCU OFF', price: 22 },
  { id: 'truck_egr_only', name: 'EGR OFF', price: 8 },
  { id: 'truck_adbue_only', name: 'SCR ONLY OFF', price: 20 },
  { id: 'truck_dpf_only', name: 'DPF OFF', price: 12 },
  { id: 'truck_cummins_emissions', name: 'CUMMINS EMISSIONS', price: 35 },
  { id: 'truck_checkfile', name: 'CHECK FILE', price: 6 }
],
 'DESACTIVACIONES': [
  { id: 'dtc', name: 'DTC OFF', price: 3 },
  { id: 'lambda', name: 'LAMBDA OFF', price: 6 },
  { id: 'immo', name: 'IMMO OFF', price: 6 },
  { id: 'vmax', name: 'VMAX OFF (LIMITADOR DE VELOCIDAD)', price: 8 },
  { id: 'immo_toyota', name: 'IMMO OFF SPECIAL (TOYOTA)', price: 8 },
  { id: 'decat_off', name: 'DECAT OFF', price: 6 },
  { id: 'tva_off', name: 'TVA OFF', price: 6 },
  { id: 'flaps_swirls', name: 'FLAPS/SWIRLS', price: 6 },
  { id: 'encriptacion', name: 'ENC', price: 4},
  { id: 'halfengine', name: 'HALF ENGINE MODE OFF', price: 12},
  { id: 'startstop', name: 'START/STOP OFF', price: 6}
],
  'SPECIAL ECU MD1 MG1 SID212-212EVO SID213-213EVO' : [
  { id: 'adblue',  name: 'ADBLUE + DPF + EGR OFF', price: 16 },
  { id: 'gpf', name: 'GPF OFF', price: 15 },
  { id: 'dpfoff_egr', name: 'DPF + EGR OFF', price: 15 },
  { id: 'stage1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 22 },
  { id: 'unlock_service', name: 'UNLOCK SERVICE + (ADBLUE OFF) + (DPF OFF)+ (EGR OFF) ', price: 25 },
  { id: 'stage2', name: 'STAGE 2 (REQUIERE MODS)', price: 28 }
  ]
};

const UploadFile = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // --- SONIDITOS MINIMALISTAS AL PASAR EL CURSOR Y AL SELECCIONAR (respeta el silencio) ---
  const playHoverTick = () => playTone(900, 0.05, 0.06);
  const playSelectSound = () => {
    playTone(750, 0.05, 0.08, 0);
    playTone(1150, 0.07, 0.08, 0.05);
  };

  const [fileId, setFileId] = useState(null);
  const [fileMapa, setFileMapa] = useState(null);
  const [filePass, setFilePass] = useState(null);

  const [loading, setLoading] = useState(false);
  const [categoriaSel, setCategoriaSel] = useState(null);
  const [servicioSel, setServicioSel] = useState(null);

  const [formData, setFormData] = useState({
    patente: '', marca: '', modelo: '', anio: '',
    motor: '', hp: '', ecu: '', combustible: '', transmision: '',
    tipo_modulo: '', comentarios: '', codigosfalla: '', modo_lectura: '', vin: '',
  });

  useEffect(() => {
    if (location.state?.servicio) {
      const { name, price, id } = location.state.servicio;
      const categoriaEncontrada = Object.keys(SERVICIOS_CONFIG).find(cat =>
        SERVICIOS_CONFIG[cat].some(s => s.id === id)
      );
      if (categoriaEncontrada) {
        setCategoriaSel(categoriaEncontrada);
        setServicioSel({ id, name, price });
        if (categoriaEncontrada === 'REPRO DIÉSEL') setFormData(prev => ({ ...prev, combustible: 'Diesel' }));
        if (categoriaEncontrada === 'REPRO GASOLINA') setFormData(prev => ({ ...prev, combustible: 'Gasolina' }));
      }
    }
  }, [location]);

  const totalCreditos = servicioSel ? servicioSel.price : 0;

  const handlePatenteChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 6) {
      setFormData({ ...formData, patente: val });
    }
  };

  const handleVinChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 17) {
      setFormData({ ...formData, vin: val });
    }
  };

  // Para cualquier Stage (bencina o diésel) el VIN deja de ser opcional.
  const requiereVin = (categoriaSel === 'REPRO GASOLINA' || categoriaSel === 'REPRO DIÉSEL')
    && !!servicioSel?.name?.toUpperCase().includes('STAGE');

  const isFormValid = formData.patente.length >= 4 && fileId && fileMapa && servicioSel && formData.modo_lectura
    && (!requiereVin || formData.vin.length > 0);

  const uploadSingleFile = async (file, prefix, folderName) => {
    if (!file) return null;
    const fileNameClean = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${session.user.id}/${folderName}/${prefix}_${fileNameClean}`;

    const { error: uploadError } = await supabase.storage
      .from('archivos-vehiculos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('archivos-vehiculos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      alert("Faltan campos obligatorios (Patente, ID o Mapa)");
      return;
    }

    setLoading(true);
    try {
      const { data: perfil, error: perfilErr } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      if (perfilErr) throw perfilErr;

      if (perfil.credits < totalCreditos) {
        alert(`Saldo insuficiente. Tienes ${perfil.credits} créditos y necesitas ${totalCreditos}.`);
        setLoading(false);
        return;
      }

      const folderName = Date.now();
      const urlId = await uploadSingleFile(fileId, 'ID', folderName);
      const urlMapa = await uploadSingleFile(fileMapa, 'MAPA', folderName);
      const urlPass = await uploadSingleFile(filePass, 'PASS', folderName);

      const { error: updateCreditsError } = await supabase
        .from('profiles')
        .update({ credits: perfil.credits - totalCreditos })
        .eq('id', session.user.id);

      if (updateCreditsError) throw updateCreditsError;

      await supabase.from('historial_movimientos').insert([
        {
          perfil_id: session.user.id,
          tipo: 'canje',
          cantidad: totalCreditos,
          descripcion: `Canje: ${formData.marca} ${formData.modelo} (${formData.patente}) - ${servicioSel.name}`,
          fecha: new Date().toISOString(),
        }
      ]);

      const { error: dbError } = await supabase.from('archivos').insert({
        user_id: session.user.id,
        patente: formData.patente,
        marca_modelo: `${formData.marca} ${formData.modelo}`.trim(),
        estado: 'pendiente',
        file_url: urlMapa,
        file_url_id: urlId,
        file_url_mapa: urlMapa,
        file_url_password: urlPass,
        detalles_tecnicos: {
          ...formData,
          servicios_solicitados: servicioSel.name,
          costo_creditos: totalCreditos
        }
      });

      if (dbError) throw dbError;

      // --- PARTE DEL ENVÍO DE CORREO EN UPLOADFILE.JSX ---
    // --- NOTIFICACIÓN DE NUEVO ARCHIVO A ADMINISTRADORES ---
    try {
      const archivosLista = [];
      if (fileId) archivosLista.push("ID (Export Console)");
      if (fileMapa) archivosLista.push("MAPA");
      if (filePass) archivosLista.push("PASSWORD");

      const filaDato = (label, valor, destacado = false) => `
        <tr>
          <td style="padding: 10px 6px; color: #8a7570; font-size: 12px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${label}</td>
          <td style="padding: 10px 6px; color: ${destacado ? '#D9241D' : '#111'}; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f0f0f0; text-align: right;">${valor || '—'}</td>
        </tr>`;

      const emailHtmlNuevo = `
        <div style="font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #1a0500; padding: 40px 16px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.4);">

            <div style="background: linear-gradient(135deg, #1a0500 0%, #000000 100%); padding: 30px 20px 26px 20px; text-align: center; border-bottom: 3px solid #D9241D;">
              <img src="https://torresaguayomms.cl/logo-email.png" alt="Stock Cars" style="height: 48px; display: block; margin: 0 auto 16px auto;" />
              <span style="display: inline-block; background-color: #D9241D; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 7px 16px; border-radius: 999px; text-transform: uppercase;">🚀 Nueva Solicitud</span>
            </div>

            <div style="padding: 32px 28px;">
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #555;">Se recibió un nuevo archivo para procesar, con estos datos:</p>

              <table style="width: 100%; border-collapse: collapse;">
                ${filaDato('Cliente', session.user.email)}
                ${filaDato('Patente', formData.patente, true)}
                ${filaDato('Vehículo', `${formData.marca} ${formData.modelo}`.trim())}
                ${filaDato('Año', formData.anio)}
                ${filaDato('VIN', formData.vin)}
                ${filaDato('Motor', formData.motor)}
                ${filaDato('HP', formData.hp)}
                ${filaDato('Combustible', formData.combustible)}
                ${filaDato('Transmisión', formData.transmision)}
                ${filaDato('ECU / Módulo', [formData.tipo_modulo, formData.ecu].filter(Boolean).join(' - '))}
                ${filaDato('Modo de lectura', formData.modo_lectura)}
                ${filaDato('Servicio', servicioSel?.name || 'No especificado', true)}
                ${filaDato('Archivos adjuntos', archivosLista.join(', '))}
              </table>

              ${formData.comentarios ? `
              <div style="background-color: #fff5f6; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #D9241D; margin: 22px 0 0 0;">
                <strong style="color: #D9241D; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Comentarios</strong>
                <p style="margin: 6px 0 0 0; color: #333; font-size: 13px; line-height: 1.5;">${formData.comentarios}</p>
              </div>` : ''}

              ${formData.codigosfalla ? `
              <div style="background-color: #fff5f6; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #D9241D; margin: 16px 0 0 0;">
                <strong style="color: #D9241D; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Códigos de falla</strong>
                <p style="margin: 6px 0 0 0; color: #333; font-size: 13px; line-height: 1.5;">${formData.codigosfalla}</p>
              </div>` : ''}

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://torresaguayomms.cl/archivos" style="background-color: #D9241D; color: white; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; display: inline-block;">VER EN EL PORTAL DE ADMIN</a>
              </div>
            </div>

            <div style="background-color: #0d0603; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #8a7570; font-size: 10px; letter-spacing: 1.5px;">STOCK CARS — PORTAL DISTRIBUIDORES</p>
            </div>
          </div>
        </div>
      `;

      await supabase.functions.invoke('swift-function', {
        body: {
          // Importante: Sin espacios entre las comas de los correos
          to: 'stockcarscl@gmail.com,felipe.acuna2@mail.udp.cl',
          subject: `🚀 ARCHIVO: ${formData.patente} - ${formData.marca}`,
          html: emailHtmlNuevo
        },
      });

      console.log("Notificación de nuevo archivo enviada con éxito");
    } catch (mailErr) {
      console.error("Error enviando notificación inicial:", mailErr);
    }

      alert(`✅ Archivos enviados con éxito.`);
      navigate('/archivos');

    } catch (error) {
      console.error("Error completo:", error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    main: { flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh', padding: '30px 30px 60px', position: 'relative' },
    container: { width: '100%' },
    btnBack: { color: isDark ? '#e0a89c' : '#888', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' },
    formCard: { backgroundColor: s.cardBg, padding: '36px', borderRadius: '20px', border: `1px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)', position: 'relative' },
    sectionTitle: { fontSize: '15px', fontWeight: '800', margin: '0 0 20px', color: s.text, letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '8px' },
    sectionDivider: { border: 'none', borderTop: `1px solid ${s.rowBorder}`, margin: '32px 0' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '18px', marginBottom: '18px' },
    label: { display: 'block', fontSize: '10px', fontWeight: '800', marginBottom: '7px', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' },
    input: { width: '100%', padding: '11px 13px', border: `1.5px solid ${s.inputBorder}`, borderRadius: '10px', boxSizing: 'border-box', fontSize: '13px', outline: 'none', color: s.text, backgroundColor: s.inputBg },
    gridFiles: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '10px' },
    fileBox: (hasFile, isRequired) => ({
      border: hasFile ? '1.5px solid #22c55e' : (isRequired ? '1.5px dashed #D9241D' : `1.5px dashed ${s.inputBorder}`),
      padding: '22px 16px', textAlign: 'center', borderRadius: '16px',
      backgroundColor: hasFile ? (isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4') : (isRequired ? (isDark ? 'rgba(217,36,29,0.1)' : '#fdece9') : s.inputBg), cursor: 'pointer'
    }),
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '16px 44px', fontWeight: '800', cursor: 'pointer', borderRadius: '999px', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '0.4px' },
    selectorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '4px 0' },
    serviceItem: (isSelected) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '13px 16px', marginBottom: '8px', border: isSelected ? '1.5px solid #D9241D' : `1px solid ${s.border}`,
      borderRadius: '12px', cursor: 'pointer', backgroundColor: isSelected ? (isDark ? 'rgba(217,36,29,0.12)' : '#fdece9') : s.cardBg,
      boxShadow: isSelected ? '0 6px 16px -6px rgba(217,36,29,0.25)' : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)')
    }),
    badgePrecio: { backgroundColor: '#D9241D', color: 'white', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginLeft: '10px' },
    resumenBox: {
      backgroundColor: '#111', color: 'white', padding: '30px', borderRadius: '18px',
      textAlign: 'center', marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
    }
  };

  return (
    <div style={styles.main}>
      <style>{`
        @keyframes upFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .up-section { animation: upFadeUp 0.35s ease both; }
        .up-input { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .up-input:focus { border-color: #e11d48; box-shadow: 0 0 0 4px rgba(225,29,72,0.1); }
        .up-file-box { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .up-file-box:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -8px rgba(0,0,0,0.15); }
        .up-service-item { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .up-service-item:hover { transform: translateY(-2px); }
        .up-submit-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
        .up-submit-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(225,29,72,0.4); }
        .back-link-up:hover { color: #e11d48; }
        @keyframes checkPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        .file-check { animation: checkPop 0.3s ease; }
        @media (max-width: 800px) {
          .up-row { grid-template-columns: 1fr 1fr !important; }
          .up-selector-grid { grid-template-columns: 1fr !important; }
          .up-files-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <CobwebCorner color={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'} style={{ position: 'absolute', top: 0, left: 0 }} />
        <CobwebCorner color={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'} style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)' }} />
        <DanglingSpiders />
      </div>

      <div style={{ ...styles.container, position: 'relative', zIndex: 1 }}>
        <Link to="/" className="back-link-up" style={styles.btnBack}>← Volver al dashboard</Link>

        <div style={styles.formCard}>
          <PumpkinIcon size={26} style={{ position: 'absolute', top: '-10px', right: '20px', transform: 'rotate(10deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }} />
          <div className="up-section" style={{ animationDelay: '0s' }}>
            <h2 style={styles.sectionTitle}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15zM5.5 7h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1M.8 1a.8.8 0 0 0-.8.8V3a.8.8 0 0 0 .8.8h14.4A.8.8 0 0 0 16 3V1.8a.8.8 0 0 0-.8-.8z" />
              </svg>
              Información del vehículo
            </h2>

            <div className="up-row" style={styles.row}>
              <div>
                <label style={styles.label}>Patente | Matrícula (Obligatorio)</label>
                <input
                  className="up-input"
                  style={{ ...styles.input, borderColor: formData.patente ? '#e5e5e5' : '#e11d48' }}
                  placeholder="AACC82"
                  value={formData.patente}
                  onChange={handlePatenteChange}
                />
                <small style={{ fontSize: '9px', color: '#aaa' }}>Máx. 6 caracteres</small>
              </div>
              <div><label style={styles.label}>Marca</label><input className="up-input" style={styles.input} placeholder="AUDI" value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value.toUpperCase() })} /></div>
              <div><label style={styles.label}>Modelo</label><input className="up-input" style={styles.input} placeholder="Q7" value={formData.modelo} onChange={e => setFormData({ ...formData, modelo: e.target.value.toUpperCase() })} /></div>
              <div>
                <label style={styles.label}>Año</label>
                <select className="up-input" style={styles.input} value={formData.anio} onChange={e => setFormData({ ...formData, anio: e.target.value })}>
                  <option value="">Seleccionar año</option>
                  {years.map(year => (<option key={year} value={year}>{year}</option>))}
                </select>
              </div>
            </div>

            <div className="up-row" style={{ ...styles.row, gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
              <div><label style={styles.label}>Motor</label><input className="up-input" style={styles.input} placeholder="EA888" value={formData.motor} onChange={e => setFormData({ ...formData, motor: e.target.value.toUpperCase() })} /></div>
              <div><label style={styles.label}>HP</label><input className="up-input" style={styles.input} placeholder="200" value={formData.hp} onChange={e => setFormData({ ...formData, hp: e.target.value.toUpperCase() })} /></div>
              <div><label style={styles.label}>ECU / DCU / TCU / DSG</label><input className="up-input" style={styles.input} placeholder="Bosch/Delco/etc.." value={formData.ecu} onChange={e => setFormData({ ...formData, ecu: e.target.value.toUpperCase() })} /></div>
              <div>
                <label style={styles.label}>Combustible</label>
                <select className="up-input" style={styles.input} value={formData.combustible} onChange={e => setFormData({ ...formData, combustible: e.target.value })}>
                  <option value="">Seleccionar</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hibrido">Híbrido</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Transmisión</label>
                <select className="up-input" style={styles.input} value={formData.transmision} onChange={e => setFormData({ ...formData, transmision: e.target.value })}>
                  <option value="">Seleccionar</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatico">Automático</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={styles.sectionDivider} />

          <div className="up-section" style={{ animationDelay: '0.06s' }}>
            <h2 style={styles.sectionTitle}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15zM5.5 7h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1M.8 1a.8.8 0 0 0-.8.8V3a.8.8 0 0 0 .8.8h14.4A.8.8 0 0 0 16 3V1.8a.8.8 0 0 0-.8-.8z" />
              </svg>
              Seleccionar servicio
            </h2>

            <div className="up-selector-grid" style={styles.selectorGrid}>
              <div>
                <label style={styles.label}>1. Tipo servicio</label>
                {Object.keys(SERVICIOS_CONFIG).map(cat => (
                  <div className="up-service-item" key={cat} style={styles.serviceItem(categoriaSel === cat)} onMouseEnter={playHoverTick} onClick={() => { playSelectSound(); setCategoriaSel(cat); setServicioSel(null); }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: s.text }}>› {cat}</span>
                  </div>
                ))}
              </div>
              <div>
                <label style={styles.label}>2. Detalle</label>
                {categoriaSel ? SERVICIOS_CONFIG[categoriaSel].map(svc => (
                  <div className="up-service-item" key={svc.id} style={styles.serviceItem(servicioSel?.id === svc.id)} onMouseEnter={playHoverTick} onClick={() => { playSelectSound(); setServicioSel(svc); }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{svc.name}</span>
                    <span style={styles.badgePrecio}>+{svc.price}</span>
                  </div>
                )) : <p style={{ fontSize: '12px', color: s.textFaint, fontStyle: 'italic' }}>Selecciona una categoría primero...</p>}
              </div>
            </div>
          </div>

          <hr style={styles.sectionDivider} />

          <div className="up-section" style={{ animationDelay: '0.1s' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Tipo de módulo</label>
              <select className="up-input" style={styles.input} value={formData.tipo_modulo} onChange={e => setFormData({ ...formData, tipo_modulo: e.target.value })}>
                <option value="">Selecciona</option>
                <option value="ECU">ECU</option>
                <option value="DCU">DCU</option>
                <option value="TCU">TCU</option>
                <option value="DSG">DSG</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={styles.label}>Comentarios</label>
              <textarea className="up-input" style={{ ...styles.input, height: '45px', resize: 'vertical' }} placeholder="..." value={formData.comentarios} onChange={e => setFormData({ ...formData, comentarios: e.target.value })}></textarea>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label style={styles.label}>Códigos de falla (DTC)</label>
              <textarea className="up-input" style={{ ...styles.input, height: '80px', resize: 'vertical' }} placeholder="Ejemplo P2463" value={formData.codigosfalla} onChange={e => setFormData({ ...formData, codigosfalla: e.target.value })}></textarea>
            </div>
          </div>

          <hr style={styles.sectionDivider} />

          <div className="up-section" style={{ animationDelay: '0.14s' }}>
            <h2 style={styles.sectionTitle}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z" />
              </svg>
              Adjuntar archivos
            </h2>

            <div style={{ maxWidth: '260px', marginBottom: '18px' }}>
              <label style={styles.label}>Modo de lectura (Obligatorio)</label>
              <select className="up-input" style={{ ...styles.input, borderColor: formData.modo_lectura ? '#e5e5e5' : '#e11d48' }} value={formData.modo_lectura} onChange={e => setFormData({ ...formData, modo_lectura: e.target.value })}>
                <option value="">Seleccionar</option>
                <option value="OBD2">OBD2</option>
                <option value="BENCH">BENCH</option>
                <option value="BOOT">BOOT</option>
                <option value="BOOTGLITCH">BOOTGLITCH</option>
                <option value="KORHEX MODE">KORHEX MODE</option>
              </select>
            </div>

            <div style={{ maxWidth: '340px', marginBottom: '18px' }}>
              <label style={{ ...styles.label, whiteSpace: 'nowrap' }}>
                VIN del Vehículo {requiereVin ? '(OBLIGATORIO PARA STAGE)' : '(RECOMENDADO PARA STAGE 1 Y 2)'}
              </label>
              <input
                className="up-input"
                style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.5px', borderColor: requiereVin && !formData.vin ? '#e11d48' : s.inputBorder }}
                placeholder="17 caracteres"
                maxLength={17}
                value={formData.vin}
                onChange={handleVinChange}
              />
            </div>

            <div className="up-files-grid" style={styles.gridFiles}>
              <div className="up-file-box" style={styles.fileBox(!!fileId, true)} onClick={() => document.getElementById('fileId').click()}>
                <input type="file" id="fileId" style={{ display: 'none' }} onChange={(e) => setFileId(e.target.files[0])} />
                <div className={fileId ? 'file-check' : ''} style={{ fontSize: '24px', marginBottom: '5px' }}>{fileId ? '✅' : '🆔'}</div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: fileId ? '#22c55e' : '#D9241D' }}>{fileId ? 'ID LISTO' : 'SUBIR ID (OBLIGATORIO)'}</div>
                <div style={{ fontSize: '10px', color: s.textFaint, marginTop: '3px' }}>{fileId ? fileId.name : 'Export Console requerido'}</div>
              </div>

              <div className="up-file-box" style={styles.fileBox(!!fileMapa, true)} onClick={() => document.getElementById('fileMapa').click()}>
                <input type="file" id="fileMapa" style={{ display: 'none' }} onChange={(e) => setFileMapa(e.target.files[0])} />
                <div className={fileMapa ? 'file-check' : ''} style={{ fontSize: '24px', marginBottom: '5px' }}>{fileMapa ? '✅' : '🗺️'}</div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: fileMapa ? '#22c55e' : '#D9241D' }}>{fileMapa ? 'MAPA LISTO' : 'SUBIR MAPA (OBLIGATORIO)'}</div>
                <div style={{ fontSize: '10px', color: s.textFaint, marginTop: '3px' }}>{fileMapa ? fileMapa.name : 'Lectura de mapa requerida'}</div>
              </div>

              <div className="up-file-box" style={styles.fileBox(!!filePass, false)} onClick={() => document.getElementById('filePass').click()}>
                <input type="file" id="filePass" style={{ display: 'none' }} onChange={(e) => setFilePass(e.target.files[0])} />
                <div className={filePass ? 'file-check' : ''} style={{ fontSize: '24px', marginBottom: '5px' }}>{filePass ? '✅' : '🔑'}</div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: filePass ? '#22c55e' : '#333' }}>{filePass ? 'PASS LISTO' : 'SUBIR PASS (OPCIONAL)'}</div>
                <div style={{ fontSize: '10px', color: s.textFaint, marginTop: '3px' }}>{filePass ? filePass.name : 'Solo si el archivo lo requiere'}</div>
              </div>
            </div>

            <div style={styles.resumenBox}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Créditos a descontar</p>
                <h1 style={{ margin: 0, fontSize: '44px', color: '#fff', fontWeight: '800' }}>{totalCreditos}</h1>
              </div>
              <button
                className="up-submit-btn"
                onClick={handleSubmit}
                style={{
                  ...styles.button,
                  opacity: (loading || !isFormValid) ? 0.4 : 1,
                  cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer',
                  backgroundColor: !isFormValid && !loading ? '#555' : '#e11d48'
                }}
                disabled={loading || !isFormValid}
              >
                {loading ? 'PROCESANDO...' :
                  !formData.patente ? 'FALTA PATENTE' :
                    !formData.modo_lectura ? 'FALTA MODO DE LECTURA' :
                      !fileId ? 'FALTA ARCHIVO ID' :
                        !fileMapa ? 'FALTA ARCHIVO MAPA' :
                          !servicioSel ? 'SELECCIONA SERVICIO' :
                            (requiereVin && !formData.vin) ? 'FALTA VIN (OBLIGATORIO PARA STAGE)' :
                              'CARGAR ARCHIVOS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFile;
