import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens, playTone } from '../ThemeContext';

// --- 1. DEFINICIÓN DE SERVICIOS DINÁMICOS ---
const SERVICIOS_CONFIG = {
  'REPRO GASOLINA': [
    { id: 'b_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 14 },
    { id: 'b_s1pb', name: 'STAGE 1 + POPS AND BANGS', price: 18 },
    { id: 'b_s2', name: 'STAGE 2 (REQUIERE MODS)', price: 16 },
    { id: 'b_s2pb', name: 'STAGE 2 + POPS AND BANGS', price: 22 },
    { id: 'b_pb', name: 'POPS AND BANGS (SOLO)', price: 6 }
  ],
  'REPRO DIÉSEL': [
    { id: 'd_s1', name: 'STAGE 1', price: 14 },
    { id: 'd_s1egr', name: 'STAGE 1 + EGR OFF', price: 15 },
    { id: 'd_s1dpf', name: 'STAGE 1 + DPF OFF + EGR OFF', price: 16 },
    { id: 'd_s1full', name: 'STAGE 1 + DPF + EGR OFF + ADBLUE OFF', price: 19 },
    { id: 'd_s2', name: 'STAGE 2 (POTENCIA + MODS)', price: 16 }
  ],
  'ANULACIONES EURO': [
    { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 6 },
    { id: 'adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 8 },
    { id: 'egr_only', name: 'EGR OFF', price: 4 },
    { id: 'adblue_only', name: 'ADBLUE OFF', price: 6 },
    { id: 'restauracion_orig', name: 'RESTAURACION ORI', price: 6 }
  ],
  'ANULACIONES EURO (CAMIONES)': [
    { id: 'truck_dpf_egr', name: 'DPF OFF + EGR OFF', price: 12 },
    { id: 'truck_adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 16 },
    { id: 'truck_dpf_egr_adblue', name: 'ADBLUE + DPF & EGR OFF + DCU OFF', price: 22 },
    { id: 'truck_egr_only', name: 'EGR OFF', price: 8 },
    { id: 'truck_adbue_only', name: 'SCR ONLY OFF', price: 20 },
    { id: 'truck_dpf_only', name: 'DPF OFF', price: 12 },
    { id: 'truck_cummins_emissions', name: 'CUMMINS EMISSIONS', price: 35 }
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
    { id: 'halfengine', name: 'HALF ENGINE MODE OFF', price: 12}
  ],
  'SPECIAL ECU MD1 MG1 SID212-212EVO SID213-213EVO' : [
    { id: 'adblue',  name: 'ADBLUE + DPF + EGR OFF', price: 16 },
    { id: 'gpf', name: 'GPF OFF', price: 15 },
    { id: 'dpfoff_egr', name: 'DPF + EGR OFF', price: 15 },
    { id: 'stage1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 22 },
    { id: 'unlock_service', name: 'UNLOCK SERVICE + (ADBLUE OFF) + (DPF OFF)+ (EGR OFF) ', price: 25 }
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
    motor: '', hp: '', ecu: '', combustible: '',
    tipo_modulo: '', comentarios: '', codigosfalla: '',
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

  const isFormValid = formData.patente.length >= 4 && fileId && fileMapa && servicioSel;

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

      const emailHtmlNuevo = `
        <div style="font-family: 'Helvetica', Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #000000; padding: 20px; text-align: center;">
              <h1 style="color: #e11d48; margin: 0; font-size: 24px; letter-spacing: 2px;">NUEVA SOLICITUD</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6; color: #333;">
              <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Datos del Requerimiento</h2>
              <p>Se ha recibido un nuevo archivo para procesar:</p>

              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 0;"><strong>Cliente:</strong></td><td>${session.user.email}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Patente:</strong></td><td>${formData.patente}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Vehículo:</strong></td><td>${formData.marca} ${formData.modelo}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Servicio:</strong></td><td>${servicioSel?.name || 'No especificado'}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Archivos:</strong></td><td>${archivosLista.join(', ')}</td></tr>
              </table>

              <div style="background-color: #fff5f6; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0;">
                <strong>Comentarios:</strong><br/>
                ${formData.comentarios || 'Sin comentarios adicionales.'}
              </div>

              <div style="background-color: #fff5f6; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0;">
                <strong>Codigos de Falla:</strong><br/>
                ${formData.codigosfalla || 'Sin codigos adicionales.'}
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://torresaguayomms.cl/archivos" style="background-color: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">VER EN EL PORTAL DE ADMIN</a>
              </div>
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
    main: { flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? DARK_GRADIENT : '#f7f7f8', minHeight: '100vh', padding: '30px 30px 60px' },
    container: { width: '100%' },
    btnBack: { color: isDark ? '#e0a89c' : '#888', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontWeight: '700' },
    formCard: { backgroundColor: s.cardBg, padding: '36px', borderRadius: '20px', border: `1px solid ${s.border}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' },
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

      <div style={styles.container}>
        <Link to="/" className="back-link-up" style={styles.btnBack}>← Volver al dashboard</Link>

        <div style={styles.formCard}>
          <div className="up-section" style={{ animationDelay: '0s' }}>
            <h2 style={styles.sectionTitle}>🚗 Información del vehículo</h2>

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

            <div className="up-row" style={styles.row}>
              <div><label style={styles.label}>Motor</label><input className="up-input" style={styles.input} placeholder="EA888" value={formData.motor} onChange={e => setFormData({ ...formData, motor: e.target.value.toUpperCase() })} /></div>
              <div><label style={styles.label}>HP</label><input className="up-input" style={styles.input} placeholder="200" value={formData.hp} onChange={e => setFormData({ ...formData, hp: e.target.value.toUpperCase() })} /></div>
              <div><label style={styles.label}>ECU / DCU / TCU / DSG</label><input className="up-input" style={styles.input} placeholder="Bosch/Delco/etc.." value={formData.ecu} onChange={e => setFormData({ ...formData, ecu: e.target.value.toUpperCase() })} /></div>
              <div>
                <label style={styles.label}>Combustible</label>
                <select className="up-input" style={styles.input} value={formData.combustible} onChange={e => setFormData({ ...formData, combustible: e.target.value })}>
                  <option value="">Seleccionar</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Diesel">Híbrido</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={styles.sectionDivider} />

          <div className="up-section" style={{ animationDelay: '0.06s' }}>
            <h2 style={styles.sectionTitle}>💰 Simula el precio de tu archivo</h2>

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
            <h2 style={styles.sectionTitle}>📎 Adjuntar archivos</h2>

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
                    !fileId ? 'FALTA ARCHIVO ID' :
                      !fileMapa ? 'FALTA ARCHIVO MAPA' :
                        !servicioSel ? 'SELECCIONA SERVICIO' :
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
