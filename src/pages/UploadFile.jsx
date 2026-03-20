import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- 1. DEFINICIÓN DE SERVICIOS (Igual al simulador) ---
const OPCIONES_SERVICIO = [
  { id: 'st1', cat: 'STAGE', label: 'STAGE 1', precio: 140 },
  { id: 'st2', cat: 'STAGE', label: 'STAGE 2', precio: 160 },
  { id: 'desc', cat: 'STAGE', label: 'DESACTIVACIÓN', precio: 5 },
  { id: 'dpf', cat: 'EXTRA', label: 'DPF/ OPF OFF', precio: 4 },
  { id: 'egr', cat: 'EXTRA', label: 'EGR OFF', precio: 4 },
  { id: 'adb', cat: 'EXTRA', label: 'ADBLUE OFF', precio: 7 },
  { id: 'csd', cat: 'EXTRA', label: 'COLD START DELETE', precio: 12 },
  { id: 'stst', cat: 'EXTRA', label: 'START/STOP SYSTEM OFF', precio: 12 },
];

const UploadFile = ({ session }) => {
  const navigate = useNavigate();
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]); // Nuevo: Servicios marcados
  
  const [formData, setFormData] = useState({
    patente: '', marca: '', modelo: '', anio: '',
    motor: '', hp: '', ecu: '', combustible: '',
    tipo_modulo: '', comentarios: ''
  });

  // --- LÓGICA DE CÁLCULO DE CRÉDITOS ---
  const totalCreditos = serviciosSeleccionados.reduce((acc, s) => acc + s.precio, 0);

  const toggleServicio = (servicio) => {
    setServiciosSeleccionados(prev => 
      prev.find(s => s.id === servicio.id) 
        ? prev.filter(s => s.id !== servicio.id) 
        : [...prev, servicio]
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile || !session?.user?.id) {
      alert("Por favor selecciona un archivo");
      return;
    }
    if (serviciosSeleccionados.length === 0) {
      alert("Por favor selecciona al menos un servicio");
      return;
    }

    setLoading(true);
    try {
      // 1. VERIFICAR CRÉDITOS DEL USUARIO
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

      // 2. SUBIR A STORAGE
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('archivos-vehiculos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(filePath);

      // 3. DESCONTAR CRÉDITOS DEL PERFIL
      const { error: updateCreditsError } = await supabase
        .from('profiles')
        .update({ credits: perfil.credits - totalCreditos })
        .eq('id', session.user.id);

      if (updateCreditsError) throw updateCreditsError;

      // 4. INSERTAR EN TABLA 'ARCHIVOS'
      const detalleServicios = serviciosSeleccionados.map(s => s.label).join(' + ');
      
      const { error: dbError } = await supabase.from('archivos').insert({
        user_id: session.user.id,
        patente: formData.patente,
        marca_modelo: `${formData.marca} ${formData.modelo}`.trim(),
        estado: 'pendiente',
        file_url: publicUrl,
        detalles_tecnicos: { 
            ...formData, 
            servicios_solicitados: detalleServicios,
            costo_creditos: totalCreditos 
        }
      });

      if (dbError) throw dbError;

      alert(`✅ Archivo enviado. Se han descontado ${totalCreditos} créditos.`);
      navigate('/archivos');

    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' },
    formCard: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#333', textTransform: 'uppercase' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    fileUploadContainer: {
      border: '2px dashed #ddd', padding: '20px', textAlign: 'center', borderRadius: '4px', backgroundColor: '#f9f9f9', marginBottom: '25px', cursor: 'pointer'
    },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', borderRadius: '2px', textTransform: 'uppercase', fontSize: '13px' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', marginLeft: '30px', marginTop: '20px', display: 'inline-block', fontWeight: 'bold' },
    
    // ESTILOS PARA EL SELECTOR DE SERVICIOS
    selectorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', margin: '20px 0' },
    serviceItem: (isSelected) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px', marginBottom: '8px', border: isSelected ? '2px solid #e11d48' : '1px solid #eee',
      borderRadius: '4px', cursor: 'pointer', backgroundColor: isSelected ? '#fff5f6' : 'white',
      transition: '0.2s'
    }),
    badgePrecio: { backgroundColor: '#e11d48', color: 'white', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' },
    resumenBox: { 
        backgroundColor: '#000', color: 'white', padding: '30px', borderRadius: '4px', 
        textAlign: 'center', marginTop: '30px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' 
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div style={styles.main}>
      <Link to="/" style={styles.btnBack}>← VOLVER AL DASHBOARD</Link>

      <div style={styles.formCard}>
        {/* SECCIÓN 1: INFO VEHICULO (Tu código original) */}
        <h2 style={{ fontSize: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          INFORMACIÓN DEL VEHÍCULO
        </h2>
        <div style={styles.row}>
          <div><label style={styles.label}>Patente</label><input style={styles.input} placeholder="AACC82" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>Marca</label><input style={styles.input} placeholder="AUDI" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>Modelo</label><input style={styles.input} placeholder="Q7" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} /></div>
          <div>
            <label style={styles.label}>Año</label>
            <select style={styles.input} value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})}>
              <option value="">Seleccionar año</option>
              {years.map(year => (<option key={year} value={year}>{year}</option>))}
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div><label style={styles.label}>Motor</label><input style={styles.input} placeholder="EA888 (opcional)" value={formData.motor} onChange={e => setFormData({...formData, motor: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>HP</label><input style={styles.input} placeholder="200 (opcional)" value={formData.hp} onChange={e => setFormData({...formData, hp: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>Modelo de ECU</label><input style={styles.input} placeholder="Bosch/TRW/Delco/etc.." value={formData.ecu} onChange={e => setFormData({...formData, ecu: e.target.value.toUpperCase()})} /></div>
          <div>
            <label style={styles.label}>Combustible</label>
            <select style={styles.input} value={formData.combustible} onChange={e => setFormData({...formData, combustible: e.target.value})}>
              <option value="">Seleccionar combustible</option>
              <option value="Bencina">Bencina</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN 2: SELECTOR DE SERVICIOS (LO NUEVO) */}
        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          SIMULA EL PRECIO DE TU ARCHIVO
        </h2>
        
        <div style={styles.selectorGrid}>
          <div>
            <label style={styles.label}>1. SELECT STAGE</label>
            {OPCIONES_SERVICIO.filter(o => o.cat === 'STAGE').map(s => (
              <div key={s.id} style={styles.serviceItem(serviciosSeleccionados.find(x => x.id === s.id))} onClick={() => toggleServicio(s)}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{s.label}</span>
                <span style={styles.badgePrecio}>+{s.precio}</span>
              </div>
            ))}
          </div>
          <div>
            <label style={styles.label}>2. SELECT EXTRAS</label>
            {OPCIONES_SERVICIO.filter(o => o.cat === 'EXTRA').map(s => (
              <div key={s.id} style={styles.serviceItem(serviciosSeleccionados.find(x => x.id === s.id))} onClick={() => toggleServicio(s)}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{s.label}</span>
                <span style={styles.badgePrecio}>+{s.precio}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN 3: REQUERIMIENTOS Y COMENTARIOS */}
        <div style={{ marginBottom: '25px' }}>
          <label style={styles.label}>Tipo de Módulo</label>
          <select style={styles.input} value={formData.tipo_modulo} onChange={e => setFormData({...formData, tipo_modulo: e.target.value})}>
            <option value="">Selecciona el tipo de módulo</option>
            <option value="ECU">ECU</option>
            <option value="TCU">TCU</option>
          </select>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={styles.label}>Comentarios</label>
          <textarea style={{ ...styles.input, height: '100px' }} placeholder="Escribe un comentario..." value={formData.comentarios} onChange={e => setFormData({...formData, comentarios: e.target.value})}></textarea>
        </div>

        {/* SECCIÓN 4: ADJUNTAR ARCHIVO */}
        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          ADJUNTAR ARCHIVO
        </h2>
        <div style={styles.fileUploadContainer} onClick={() => document.getElementById('fileInput').click()}>
          <input type="file" id="fileInput" style={{ display: 'none' }} accept=".mmf,.bin,.ori,.rar,.zip" onChange={handleFileChange} />
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>📁</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e11d48' }}>
            {selectedFile ? 'ARCHIVO LISTO PARA SUBIR' : 'HAGA CLIC PARA ESCOGER ARCHIVO'}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>{selectedFile ? selectedFile.name : 'Formatos: .mmf, .bin, .rar'}</div>
        </div>

        {/* RESUMEN DE CRÉDITOS Y BOTÓN FINAL */}
        <div style={styles.resumenBox}>
            <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>Créditos a descontar:</p>
                <h1 style={{ margin: 0, fontSize: '48px', color: '#fff' }}>{totalCreditos}</h1>
            </div>
            <button 
              onClick={handleSubmit}
              style={{ 
                ...styles.button, 
                marginTop: 0, 
                padding: '20px 50px',
                fontSize: '16px',
                opacity: (loading || !selectedFile || totalCreditos === 0) ? 0.6 : 1 
              }} 
              disabled={loading || !selectedFile || totalCreditos === 0}
            >
              {loading ? 'PROCESANDO...' : 'CARGAR MI ARCHIVO'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default UploadFile;