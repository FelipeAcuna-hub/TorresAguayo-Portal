import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Historial = ({ session }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [canjes, setCanjes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CONFIGURACIÓN DE LOS 3 ADMINISTRADORES ---
  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;

        // 1. CARGAR RECARGAS (Tabla: movimientos)
        // Usamos 'user_id' y 'created_at' como en tu versión original que funcionaba
        let queryMovs = supabase
          .from('movimientos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          queryMovs = queryMovs.eq('user_id', session?.user?.id);
        }

        const { data: dataMovs, error: errorMovs } = await queryMovs;
        if (errorMovs) throw errorMovs;

        // 2. CARGAR CANJES (Tabla: historial_movimientos)
        // Usamos 'perfil_id' y 'fecha' como en esta tabla nueva
        let queryCanjes = supabase
          .from('historial_movimientos')
          .select('*')
          .order('fecha', { ascending: false });

        if (!isAdmin) {
          queryCanjes = queryCanjes.eq('perfil_id', session?.user?.id);
        }

        const { data: dataCanjes, error: errorCanjes } = await queryCanjes;
        if (errorCanjes) throw errorCanjes;

        setMovimientos(dataMovs || []);
        setCanjes(dataCanjes || []);

      } catch (error) {
        console.error("Error cargando historial:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [session, isAdmin]);

  const styles = {
    mainContent: { flex: 1, padding: '0', backgroundColor: '#f3f4f6' },
    card: { 
      backgroundColor: 'white', 
      margin: '30px', 
      padding: '40px', 
      borderRadius: '4px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      minHeight: '200px'
    },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '15px 12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '15px 12px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#333' },
    tituloSeccion: { fontSize: '18px', margin: 0, textTransform: 'uppercase', color: '#000', borderBottom: '2px solid #e11d48', display: 'inline-block', paddingBottom: '5px' }
  };

  return (
    <div style={styles.mainContent}>
      
      {/* --- SECCIÓN 1: RECARGAS --- */}
      <div style={styles.card}>
        <h2 style={styles.tituloSeccion}>
          {isAdmin ? "Gestión Global de Recargas" : "Recargas del Administrador"}
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>FECHA</th>
              <th style={styles.th}>DESCRIPCIÓN</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map(m => (
              <tr key={m.id}>
                <td style={styles.td}>
                  {new Date(m.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={styles.td}>{m.descripcion}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#e11d48' : '#228b22' }}>
                  {m.tipo === 'gasto' ? '-' : '+'}{m.cantidad.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && movimientos.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay recargas registradas.</p>}
      </div>

      {/* --- SECCIÓN 2: CANJES --- */}
      <div style={styles.card}>
        <h2 style={styles.tituloSeccion}>
          {isAdmin ? "Gestión Global de Canjes" : "Canjes por Archivos"}
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>FECHA</th>
              <th style={styles.th}>DETALLE</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {canjes.map(c => (
              <tr key={c.id}>
                <td style={styles.td}>
                  {new Date(c.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={styles.td}>{c.descripcion}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>
                  -{c.cantidad.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && canjes.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No has realizado canjes aún.</p>}
        {loading && <p style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '12px' }}>CARGANDO...</p>}
      </div>
    </div>
  );
};

export default Historial;