import React from 'react';

const Archivos = ({ session }) => {
  // Los datos de usuario (Nombre y Créditos) y el estado del banner 
  // ahora los maneja el Layout.jsx automáticamente.

  const styles = {
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' },
    tableCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', backgroundColor: '#22c55e' }
  };

  return (
    <div style={styles.mainContent}>
      {/* ELIMINADOS: <aside>, <header> y <topBarStatus> 
        RAZÓN: El Layout.jsx ya los provee de forma global para todo el sitio.
      */}

      <div style={styles.tableCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold' }}>PORTAL OFICIAL</div>
        </div>
        
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase', color: '#333' }}>
          Historial de Archivos
        </h2>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Patente</th>
              <th style={styles.th}>Marca / Modelo</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {/* MANTENEMOS TU FILA DE EJEMPLO INTEGRA */}
            <tr>
              <td style={styles.td}>08/03/2026</td>
              <td style={styles.td}>ABCD-12</td>
              <td style={styles.td}>Audi A3 2.0 TFSI</td>
              <td style={styles.td}><span style={styles.statusBadge}>COMPLETADO</span></td>
              <td style={styles.td}>
                <button style={{ color: '#e11d48', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
                  Descargar
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Mensaje de ayuda si no hay archivos (opcional) */}
        <p style={{ marginTop: '20px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
          * Los archivos procesados estarán disponibles para descarga por 30 días.
        </p>
      </div>
    </div>
  );
};

export default Archivos;