import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const UploadFile = ({ session }) => {
  const navigate = useNavigate();
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

  // --- NUEVOS ESTADOS PARA CONEXIÓN ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patente: '', marca: '', modelo: '', anio: '',
    motor: '', hp: '', ecu: '', combustible: '',
    tipo_modulo: '', comentarios: ''
  });

  // --- FUNCIÓN DE SUBIDA (Lógica de base de datos) ---
  const handleSubmit = async () => {
    if (!selectedFile || !session?.user?.id) {
      alert("Por favor selecciona un archivo");
      return;
    }

    setLoading(true);
    try {
      // 1. Subir a Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('archivos-vehiculos') // Recuerda crear este bucket en Supabase
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Obtener URL
      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(filePath);

      // 3. Insertar en tabla 'archivos'
      const { error: dbError } = await supabase.from('archivos').insert({
        user_id: session.user.id,
        patente: formData.patente,
        marca_modelo: `${formData.marca} ${formData.modelo}`.trim(),
        estado: 'pendiente',
        file_url: publicUrl,
        detalles_tecnicos: formData // Guardamos el resto de los campos aquí
      });

      if (dbError) throw dbError;

      alert('✅ Archivo enviado correctamente');
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
      border: '2px dashed #ddd',
      padding: '20px',
      textAlign: 'center',
      borderRadius: '4px',
      backgroundColor: '#f9f9f9',
      marginBottom: '25px',
      cursor: 'pointer'
    },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', borderRadius: '2px', textTransform: 'uppercase', fontSize: '13px' },
    btnBack: { color: '#666', textDecoration: 'none', fontSize: '13px', marginLeft: '30px', marginTop: '20px', display: 'inline-block', fontWeight: 'bold' }
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
        <h2 style={{ fontSize: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          INFORMACIÓN DEL VEHÍCULO
        </h2>

        <div style={styles.row}>
          <div><label style={styles.label}>Patente</label><input style={styles.input} placeholder="ID Vehicle" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value})} /></div>
          <div><label style={styles.label}>Marca</label><input style={styles.input} placeholder="Brand" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} /></div>
          <div><label style={styles.label}>Modelo</label><input style={styles.input} placeholder="Model" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} /></div>
          <div>
            <label style={styles.label}>Año</label>
            <select style={styles.input} value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})}>
              <option value="">Seleccionar año</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div><label style={styles.label}>Motor</label><input style={styles.input} placeholder="Motor" value={formData.motor} onChange={e => setFormData({...formData, motor: e.target.value})} /></div>
          <div><label style={styles.label}>HP</label><input style={styles.input} placeholder="HP" value={formData.hp} onChange={e => setFormData({...formData, hp: e.target.value})} /></div>
          <div><label style={styles.label}>Modelo de ECU</label><input style={styles.input} placeholder="Bosch/TRW/Delco/etc.." value={formData.ecu} onChange={e => setFormData({...formData, ecu: e.target.value})} /></div>
          <div>
            <label style={styles.label}>Combustible</label>
            <select style={styles.input} value={formData.combustible} onChange={e => setFormData({...formData, combustible: e.target.value})}>
              <option value="">Seleccionar combustible</option>
              <option value="Bencina">Bencina</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          REQUERIMIENTOS
        </h2>

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
          <textarea 
            style={{ ...styles.input, height: '100px' }} 
            placeholder="Escribe un comentario..."
            value={formData.comentarios}
            onChange={e => setFormData({...formData, comentarios: e.target.value})}
          ></textarea>
        </div>

        <h2 style={{ fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          ADJUNTAR ARCHIVO
        </h2>

        <div
          style={styles.fileUploadContainer}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            type="file"
            id="fileInput"
            style={{ display: 'none' }}
            accept=".mmf,.bin,.ori,.rar,.zip"
            onChange={handleFileChange}
          />
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>📁</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e11d48' }}>
            {selectedFile ? 'ARCHIVO LISTO PARA SUBIR' : 'HAGA CLIC PARA ESCOGER ARCHIVO'}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
            {selectedFile ? selectedFile.name : 'Formatos recomendados: .mmf (Magic Motorsport), .bin, .rar'}
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          style={{ ...styles.button, opacity: (loading || !selectedFile) ? 0.6 : 1 }} 
          disabled={loading || !selectedFile}
        >
          {loading ? 'ENVIANDO...' : 'ENVIAR REQUERIMIENTO'}
        </button>
      </div>
    </div>
  );
};

export default UploadFile;