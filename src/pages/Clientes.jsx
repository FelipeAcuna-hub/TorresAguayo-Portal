import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Clientes = ({ session }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pendientes'); // 'pendientes' o 'activos'
  
  // --- ESTADOS PARA BÚSQUEDA Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error cargando clientes:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // --- ACCIONES DE ADMINISTRADOR ---
  const handleAprobar = async (id, email) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      alert(`✅ Cliente aprobado.`);
      fetchClientes();
    } catch (error) {
      alert("Error al aprobar: " + error.message);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        alert("Registro eliminado.");
        fetchClientes();
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  // --- LÓGICA DE FILTRADO Y BÚSQUEDA ---
  const clientesFiltrados = clientes.filter(c => {
    const cumpleTab = tab === 'pendientes' ? c.is_approved !== true : c.is_approved === true;
    const searchLower = searchTerm.toLowerCase();
    const cumpleBusqueda = 
      (c.full_name?.toLowerCase().includes(searchLower)) ||
      (c.apellido?.toLowerCase().includes(searchLower)) ||
      (c.company?.toLowerCase().includes(searchLower)) ||
      (c.email?.toLowerCase().includes(searchLower));
    
    return cumpleTab && cumpleBusqueda;
  });

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina);
  const indiceUltimo = paginaActual * itemsPorPagina;
  const indicePrimer = indiceUltimo - itemsPorPagina;
  const clientesPaginados = clientesFiltrados.slice(indicePrimer, indiceUltimo);

  const styles = {
    container: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
    tab: (active) => ({
      padding: '10px 20px', cursor: 'pointer', backgroundColor: active ? '#000' : '#ddd',
      color: active ? '#fff' : '#666', fontWeight: 'bold', fontSize: '12px', border: 'none',
      borderRadius: '4px', textTransform: 'uppercase'
    }),
    searchBar: { 
      display: 'flex', alignItems: 'center', backgroundColor: 'white', 
      padding: '8px 15px', borderRadius: '4px', border: '1px solid #ddd', width: '300px' 
    },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#888', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    btnApprove: { backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', marginRight: '5px' },
    btnReject: { backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px' },
    pageBtn: (active) => ({ 
      padding: '8px 16px', cursor: 'pointer', backgroundColor: active ? '#e11d48' : 'white', 
      color: active ? 'white' : '#666', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
    })
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '20px' }}>Gestión de Clientes</h2>
        
        {/* BUSCADOR */}
        <div style={styles.searchBar}>
          <span style={{ marginRight: '10px' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre o empresa..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPaginaActual(1); }}
          />
        </div>
      </div>

      <div style={styles.tabContainer}>
        <button style={styles.tab(tab === 'pendientes')} onClick={() => { setTab('pendientes'); setPaginaActual(1); }}>
          Solicitudes ({clientes.filter(c => !c.is_approved).length})
        </button>
        <button style={styles.tab(tab === 'activos')} onClick={() => { setTab('activos'); setPaginaActual(1); }}>
          Clientes Activos ({clientes.filter(c => c.is_approved).length})
        </button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre / Empresa</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Créditos</th>
              <th style={styles.th}>País / RUT</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginados.map((c) => (
              <tr key={c.id}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 'bold' }}>{c.full_name} {c.apellido}</div>
                  <div style={{ fontSize: '11px', color: '#e11d48' }}>{c.company || 'PARTICULAR'}</div>
                </td>
                <td style={styles.td}>{c.email}</td>
                <td style={styles.td}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                    {c.credits || 0}
                  </div>
                </td>
                <td style={styles.td}>
                  <div>{c.country}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>{c.rut}</div>
                </td>
                <td style={styles.td}>
                  {tab === 'pendientes' ? (
                    <>
                      <button style={styles.btnApprove} onClick={() => handleAprobar(c.id, c.email)}>APROBAR</button>
                      <button style={styles.btnReject} onClick={() => handleEliminar(c.id)}>RECHAZAR</button>
                    </>
                  ) : (
                    <>
                      <button style={styles.btnReject} onClick={() => handleEliminar(c.id)}>ELIMINAR</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando datos...</td></tr>}
            {!loading && clientesPaginados.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No se encontraron resultados.</td></tr>}
          </tbody>
        </table>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={styles.pagination}>
            <button 
              onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); window.scrollTo(0,0); }} 
              disabled={paginaActual === 1} 
              style={{ ...styles.pageBtn(false), opacity: paginaActual === 1 ? 0.3 : 1 }}
            >
              ← ANTERIOR
            </button>
            {[...Array(totalPaginas).keys()].map(n => (
              <button 
                key={n + 1} 
                onClick={() => { setPaginaActual(n + 1); window.scrollTo(0,0); }} 
                style={styles.pageBtn(paginaActual === n + 1)}
              >
                {n + 1}
              </button>
            ))}
            <button 
              onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0,0); }} 
              disabled={paginaActual === totalPaginas} 
              style={{ ...styles.pageBtn(false), opacity: paginaActual === totalPaginas ? 0.3 : 1 }}
            >
              SIGUIENTE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clientes;