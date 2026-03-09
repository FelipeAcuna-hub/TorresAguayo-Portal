import React from 'react';
import { Link } from 'react-router-dom';

const UploadFile = () => {
  // Generamos los años del 2026 al 1990
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

  const styles = {
    container: { display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', margin: 0 },
    sidebar: { width: '260px', backgroundColor: '#000', color: 'white', display: 'flex', flexDirection: 'column', shrink: 0 },
    logo: { padding: '24px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #333', textDecoration: 'none', color: 'white' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    // LA BARRA SUPERIOR QUE NECESITAS
    header: { backgroundColor: 'white', padding: '15px 30px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', borderRadius: '2px' },
    userInfo: { fontSize: '12px', fontWeight: 'bold', color: '#555' },
    // FORMULARIO
    formCard: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#333', textTransform: 'uppercase' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    button: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '12px 30px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', borderRadius: '2px' }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>TORRES<span style={{color: '#e11d48'}}>AGUAYO</span></Link>
        <ul style={{padding: 0, listStyle: 'none'}}>
          <Link to="/" style={{textDecoration: 'none'}}>
            <li style={{padding: '15px 24px', color: '#9ca3af', cursor: 'pointer'}}>← VOLVER AL DASHBOARD</li>
          </Link>
        </ul>
      </aside>

      <main style={styles.main}>
        {/* LA BARRA SUPERIOR (HEADER) REPLICADA */}
        <header style={styles.header}>
          <div style={styles.statusBadge}>
            FUERA DE HORARIO: 45 min a 24 hrs.
          </div>
          <div style={styles.userInfo}>
            💳 0 CREDITS &nbsp;&nbsp;&nbsp; 👤 FELIPE ACUÑA
          </div>
        </header>

        {/* CONTENIDO DEL FORMULARIO */}
        <div style={styles.formCard}>
          <h2 style={{fontSize: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>INFORMACIÓN DEL VEHÍCULO</h2>
          
          <div style={styles.row}>
            <div><label style={styles.label}>Patente</label><input style={styles.input} placeholder="ID Vehicle" /></div>
            <div><label style={styles.label}>Marca</label><input style={styles.input} placeholder="Brand" /></div>
            <div><label style={styles.label}>Modelo</label><input style={styles.input} placeholder="Model" /></div>
            <div>
              <label style={styles.label}>Año</label>
              <select style={styles.input}>
                <option value="">Seleccionar año</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div><label style={styles.label}>Motor</label><input style={styles.input} placeholder="Motor" /></div>
            <div><label style={styles.label}>HP</label><input style={styles.input} placeholder="HP" /></div>
            <div><label style={styles.label}>Modelo de ECU</label><input style={styles.input} placeholder="Bosch/TRW/Delco/etc.." /></div>
            <div>
              <label style={styles.label}>Combustible</label>
              <select style={styles.input}>
                <option>Seleccionar combustible</option>
                <option>Bencina</option>
                <option>Diesel</option>
              </select>
            </div>
          </div>

          <h2 style={{fontSize: '20px', margin: '40px 0 20px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>REQUERIMIENTOS</h2>
          
          <div style={{marginBottom: '25px'}}>
            <label style={styles.label}>Tipo de Módulo</label>
            <select style={styles.input}>
              <option>Selecciona el tipo de módulo</option>
              <option>ECU</option>
              <option>TCU</option>
            </select>
          </div>

          <div style={{marginBottom: '25px'}}>
            <label style={styles.label}>Comentarios</label>
            <textarea style={{...styles.input, height: '100px'}} placeholder="Escribe un comentario..."></textarea>
          </div>

          <button style={styles.button}>ENVIAR REQUERIMIENTO</button>
        </div>
      </main>
    </div>
  );
};

export default UploadFile;