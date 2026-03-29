import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Agregamos useLocation
import { supabase } from '../supabaseClient';

// --- 1. DEFINICIÓN DE SERVICIOS DINÁMICOS ---
const SERVICIOS_CONFIG = {
  'REPROS BENCINA': [
    { id: 'b_s1', name: 'STAGE 1 (INCLUYE VMAX OFF)', price: 140 },
    { id: 'b_s1pb', name: 'STAGE 1 + POPS AND BANGS', price: 180 },
    { id: 'b_s2', name: 'STAGE 2 (REQUIERE MODS)', price: 160 },
    { id: 'b_pb', name: 'POPS AND BANGS (SOLO)', price: 60 }
  ],
  'REPROS DIÉSEL': [
    { id: 'd_s1', name: 'STAGE 1 (POTENCIA SOLA)', price: 140 }, 
    { id: 'd_s1egr', name: 'STAGE 1 + EGR OFF', price: 150 }, 
    { id: 'd_s1dpf', name: 'STAGE 1 + DPF OFF', price: 160 }, 
    { id: 'd_s1full', name: 'STAGE 1 + DPF & EGR OFF', price: 180 },
    { id: 'd_s2', name: 'STAGE 2 (POTENCIA + MODS)', price: 160 }
  ],
  'ANULACIONES EURO': [
    { id: 'dpf_egr', name: 'DPF OFF + EGR OFF', price: 60 },
    { id: 'adblue_full', name: 'ADBLUE + DPF & EGR OFF', price: 80 },
    { id: 'egr_only', name: 'EGR OFF', price: 40 },
    { id: 'adblue_only', name: 'ADBLUE OFF', price: 60 }
  ],
  'DESACTIVACIONES': [
    { id: 'dtc', name: 'DTC OFF', price: 30 },
    { id: 'lambda', name: 'LAMBDA OFF', price: 60 },
    { id: 'immo', name: 'IMMO OFF', price: 60 },
    { id: 'vmax', name: 'VMAX OFF (LIMITADORES)', price: 80 },
    { id: 'immo_toyota', name: 'IMMO OFF SPECIAL (TOYOTA)', price: 80 }
  ]
};

const UploadFile = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para recibir los datos del Simulador
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [categoriaSel, setCategoriaSel] = useState(null);
  const [servicioSel, setServicioSel] = useState(null);
  
  const [formData, setFormData] = useState({
    patente: '', marca: '', modelo: '', anio: '',
    motor: '', hp: '', ecu: '', combustible: '',
    tipo_modulo: '', comentarios: ''
  });

  // --- EFECTO PARA CAPTURAR DATOS DEL SIMULADOR ---
  useEffect(() => {
    // Verificamos si en el historial de navegación vienen datos del servicio
    if (location.state?.servicio) {
      const { name, price, id } = location.state.servicio;
      
      // Encontrar a qué categoría pertenece el servicio enviado
      const categoriaEncontrada = Object.keys(SERVICIOS_CONFIG).find(cat => 
        SERVICIOS_CONFIG[cat].some(s => s.id === id)
      );

      if (categoriaEncontrada) {
        setCategoriaSel(categoriaEncontrada);
        setServicioSel({ id, name, price });
        
        // Auto-seleccionar combustible si es Diésel o Bencina
        if (categoriaEncontrada === 'REPROS DIÉSEL') setFormData(prev => ({...prev, combustible: 'Diesel'}));
        if (categoriaEncontrada === 'REPROS BENCINA') setFormData(prev => ({...prev, combustible: 'Bencina'}));
      }
    }
  }, [location]);

  const totalCreditos = servicioSel ? servicioSel.price : 0;

  const handleSubmit = async () => {
    if (!selectedFile || !session?.user?.id) {
      alert("Por favor selecciona un archivo");
      return;
    }
    if (!servicioSel) {
      alert("Por favor selecciona un servicio");
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

      const { error: updateCreditsError } = await supabase
        .from('profiles')
        .update({ credits: perfil.credits - totalCreditos })
        .eq('id', session.user.id);

      if (updateCreditsError) throw updateCreditsError;

      const { error: historyError } = await supabase
        .from('historial_movimientos')
        .insert([
          {
            perfil_id: session.user.id,
            tipo: 'canje',
            cantidad: totalCreditos,
            descripcion: `Canje por archivo: ${selectedFile.name} (${formData.marca} ${formData.modelo}) - ${servicioSel.name}`,
            fecha: new Date().toISOString(),
          }
        ]);

      if (historyError) throw historyError;

      const { error: dbError } = await supabase.from('archivos').insert({
        user_id: session.user.id,
        patente: formData.patente,
        marca_modelo: `${formData.marca} ${formData.modelo}`.trim(),
        estado: 'pendiente',
        file_url: publicUrl,
        detalles_tecnicos: { 
            ...formData, 
            servicios_solicitados: servicioSel.name,
            costo_creditos: totalCreditos 
        }
      });

      if (dbError) throw dbError;

      alert(`✅ Archivo enviado. Se han descontado ${totalCreditos} créditos.`);
      navigate('/archivos');

    } catch (error) {
      console.error("Error completo:", error);
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
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', textTransform: 'uppercase', fontSize: '13px' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', marginLeft: '30px', marginTop: '20px', display: 'inline-block', fontWeight: 'bold' },
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
    if (e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  return (
    <div style={styles.main}>
      <Link to="/" style={styles.btnBack}>← VOLVER AL DASHBOARD</Link>
      <div style={styles.formCard}>
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
          <div><label style={styles.label}>Motor</label><input style={styles.input} placeholder="EA888" value={formData.motor} onChange={e => setFormData({...formData, motor: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>HP</label><input style={styles.input} placeholder="200" value={formData.hp} onChange={e => setFormData({...formData, hp: e.target.value.toUpperCase()})} /></div>
          <div><label style={styles.label}>ECU</label><input style={styles.input} placeholder="Bosch/Delco/etc.." value={formData.ecu} onChange={e => setFormData({...formData, ecu: e.target.value.toUpperCase()})} /></div>
          <div>
            <label style={styles.label}>Combustible</label>
            <select style={styles.input} value={formData.combustible} onChange={e => setFormData({...formData, combustible: e.target.value})}>
              <option value="">Seleccionar</option>
              <option value="Bencina">Bencina</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          SIMULA EL PRECIO DE TU ARCHIVO
        </h2>
        
        <div style={styles.selectorGrid}>
          <div>
            <label style={styles.label}>1. TIPO SERVICIO</label>
            {Object.keys(SERVICIOS_CONFIG).map(cat => (
              <div 
                key={cat} 
                style={styles.serviceItem(categoriaSel === cat)} 
                onClick={() => { setCategoriaSel(cat); setServicioSel(null); }}
              >
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>› {cat}</span>
              </div>
            ))}
          </div>

          <div>
            <label style={styles.label}>2. DETALLE</label>
            {categoriaSel ? SERVICIOS_CONFIG[categoriaSel].map(s => (
              <div 
                key={s.id} 
                style={styles.serviceItem(servicioSel?.id === s.id)} 
                onClick={() => setServicioSel(s)}
              >
                <span style={{ fontSize: '12px', fontWeight: '500' }}>{s.name}</span>
                <span style={styles.badgePrecio}>+{s.price}</span>
              </div>
            )) : <p style={{ fontSize: '12px', color: '#999' }}>Selecciona una categoría primero...</p>}
          </div>
        </div>

        {/* ... Resto de componentes (Módulo, Comentarios, Archivo) ... */}
        <div style={{ marginBottom: '25px' }}>
          <label style={styles.label}>Tipo de Módulo</label>
          <select style={styles.input} value={formData.tipo_modulo} onChange={e => setFormData({...formData, tipo_modulo: e.target.value})}>
            <option value="">Selecciona</option>
            <option value="ECU">ECU</option>
            <option value="TCU">TCU</option>
          </select>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={styles.label}>Comentarios</label>
          <textarea style={{ ...styles.input, height: '80px' }} placeholder="..." value={formData.comentarios} onChange={e => setFormData({...formData, comentarios: e.target.value})}></textarea>
        </div>

        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          ADJUNTAR ARCHIVO
        </h2>
        <div style={styles.fileUploadContainer} onClick={() => document.getElementById('fileInput').click()}>
          <input type="file" id="fileInput" style={{ display: 'none' }} accept=".mmf,.bin,.ori,.rar,.zip" onChange={handleFileChange} />
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>📁</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e11d48' }}>
            {selectedFile ? 'ARCHIVO LISTO' : 'HAGA CLIC PARA ESCOGER'}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>{selectedFile ? selectedFile.name : '.mmf, .bin, .rar, etc..'}</div>
        </div>

        <div style={styles.resumenBox}>
            <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>Créditos a descontar:</p>
                <h1 style={{ margin: 0, fontSize: '48px', color: '#fff' }}>{totalCreditos}</h1>
            </div>
            <button 
              onClick={handleSubmit}
              style={{ ...styles.button, opacity: (loading || !selectedFile || totalCreditos === 0) ? 0.6 : 1 }} 
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