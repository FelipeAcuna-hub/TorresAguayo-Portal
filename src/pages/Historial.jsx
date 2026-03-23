import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Historial = ({ session }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [canjes, setCanjes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE PAGINACIÓN ---
  const [pagMovimientos, setPagMovimientos] = useState(1);
  const [pagCanjes, setPagCanjes] = useState(1);
  const itemsPorPagina = 4; // Ajustado a 4 ítems como pediste

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

        let queryMovs = supabase
          .from('movimientos')
          .select('*, profiles:user_id(company)')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          queryMovs = queryMovs.eq('user_id', session?.user?.id);
        }

        const { data: dataMovs, error: errorMovs } = await queryMovs;
        if (errorMovs) throw errorMovs;

        let queryCanjes = supabase
          .from('historial_movimientos')
          .select('*, profiles:perfil_id(company)')
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

  // --- LÓGICA DE CÁLCULO DE PÁGINAS ---
  const totalPagMovs = Math.ceil(movimientos.length / itemsPorPagina);
  const movsPaginados = movimientos.slice((pagMovimientos - 1) * itemsPorPagina, pagMovimientos * itemsPorPagina);

  const totalPagCanjes = Math.ceil(canjes.length / itemsPorPagina);
  const canjesPaginados = canjes.slice((pagCanjes - 1) * itemsPorPagina, pagCanjes * itemsPorPagina);

  const styles = {
    mainContent: { flex: 1, padding: '0', backgroundColor: '#f3f4f6' },
    card: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', minHeight: '200px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '15px 12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '15px 12px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#333' },
    tituloSeccion: { fontSize: '18px', margin: 0, textTransform: 'uppercase', color: '#000', borderBottom: '2px solid #e11d48', display: 'inline-block', paddingBottom: '5px' },
    companyText: { color: '#e11d48', fontWeight: 'bold', fontSize: '12px' },
    // Estilos de paginación
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '25px' },
    pageBtn: (active) => ({
      padding: '6px 12px',
      cursor: 'pointer',
      backgroundColor: active ? '#e11d48' : 'white',
      color: active ? 'white' : '#666',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontSize: '12px',
      fontWeight: 'bold',
      transition: 'all 0.2s'
    })
  };

  const renderPagination = (current, total, setPage) => (
    total > 1 && (
      <div style={styles.pagination}>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={current === 1}
          style={{ ...styles.pageBtn(false), opacity: current === 1 ? 0.3 : 1 }}
        >
          Anterior
        </button>
        {[...Array(total).keys()].map(n => (
          <button key={n+1} onClick={() => setPage(n+1)} style={styles.pageBtn(current === n+1)}>
            {n+1}
          </button>
        ))}
        <button 
          onClick={() => setPage(p => Math.min(total, p + 1))} 
          disabled={current === total}
          style={{ ...styles.pageBtn(false), opacity: current === total ? 0.3 : 1 }}
        >
          Siguiente
        </button>
      </div>
    )
  );

  return (
    <div style={styles.mainContent}>
      
      {/* --- SECCIÓN 1: RECARGAS --- */}
      <div style={styles.card}>
        <h2 style={styles.tituloSeccion}>
          {isAdmin ? "Gestión Global de Recargas" : "Mi Historial de Recargas"}
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>FECHA</th>
              {isAdmin && <th style={styles.th}>EMPRESA</th>}
              <th style={styles.th}>DESCRIPCIÓN</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {movsPaginados.map(m => (
              <tr key={m.id}>
                <td style={styles.td}>{new Date(m.created_at).toLocaleDateString('es-CL')}</td>
                {isAdmin && <td style={styles.td}><span style={styles.companyText}>{m.profiles?.company || 'PARTICULAR'}</span></td>}
                <td style={styles.td}>{m.descripcion}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: m.tipo === 'gasto' ? '#e11d48' : '#228b22' }}>
                  {m.tipo === 'gasto' ? '-' : '+'}{m.cantidad.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination(pagMovimientos, totalPagMovs, setPagMovimientos)}
      </div>

      {/* --- SECCIÓN 2: CANJES --- */}
      <div style={styles.card}>
        <h2 style={styles.tituloSeccion}>
          {isAdmin ? "Gestión Global de Canjes" : "Mis Canjes Realizados"}
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>FECHA</th>
              {isAdmin && <th style={styles.th}>EMPRESA</th>}
              <th style={styles.th}>DETALLE</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {canjesPaginados.map(c => (
              <tr key={c.id}>
                <td style={styles.td}>{new Date(c.fecha).toLocaleDateString('es-CL')}</td>
                {isAdmin && <td style={styles.td}><span style={styles.companyText}>{c.profiles?.company || 'PARTICULAR'}</span></td>}
                <td style={styles.td}>{c.descripcion}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>
                  -{c.cantidad.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination(pagCanjes, totalPagCanjes, setPagCanjes)}
      </div>
    </div>
  );
};

export default Historial;