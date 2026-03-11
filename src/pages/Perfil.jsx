import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Perfil = ({ session }) => {
  // 1. Mantenemos userMetadata solo para los créditos (hasta que los traigamos de la DB)
  const userMetadata = session?.user?.user_metadata;
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ is_online: true, mensaje: 'Cargando estado...' });

  const [profile, setProfile] = useState({
    full_name: '',
    apellido: '',
    phone: '',
    company: '',
    rut: '',
    actividad: '',
    country: 'Chile'
  });

  // --- CAMBIO CLAVE: El nombre del Header ahora viene del estado 'profile' ---
  const fullNameHeader = profile.full_name 
    ? `${profile.full_name} ${profile.apellido}`.trim() 
    : (userMetadata?.full_name || "USUARIO");

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from('configuracion_global').select('*').eq('id', 'atencion_cliente').single();
      if (data) setStatus({ is_online: data.is_online, mensaje: data.is_online ? data.mensaje_online : data.mensaje_offline });
    };
    fetchStatus();

    const getProfile = async () => {
      let userId = session?.user?.id;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            apellido: data.apellido || '',
            phone: data.phone || '',
            company: data.company || '',
            rut: data.rut || '',
            actividad: data.actividad || '',
            country: data.country || 'Chile'
          });
        }
      } catch (error) {
        console.error('Error cargando perfil:', error.message);
      }
    };
    
    getProfile();

    const channel = supabase.channel('status_perfil_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_global' }, payload => {
        setStatus({ is_online: payload.new.is_online, mensaje: payload.new.is_online ? payload.new.mensaje_online : payload.new.mensaje_offline });
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    let userId = session?.user?.id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      alert('Error: No se pudo identificar al usuario.');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      alert('✅ ¡Perfil actualizado correctamente!');
      
    } catch (error) {
      alert('Error al actualizar: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' },
    sidebar: { width: '260px', backgroundColor: '#000', color: 'white', display: 'flex', flexDirection: 'column', shrink: 0 },
    logo: { padding: '24px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #333', textDecoration: 'none', color: 'white', display: 'block' },
    navItem: { padding: '15px 24px', cursor: 'pointer', color: '#9ca3af', listStyle: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center' },
    navItemActive: { padding: '15px 24px', color: 'white', backgroundColor: '#e11d48', listStyle: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#f3f4f6' },
    header: { backgroundColor: 'white', padding: '15px 30px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    topBarStatus: { backgroundColor: status.is_online ? '#228b22' : '#e11d48', color: 'white', padding: '12px 20px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', transition: '0.5s' },
    formCard: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#333' },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '8px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>TORRES<span style={{color: '#e11d48'}}>AGUAYO</span></Link>
        <ul style={{ padding: 0, margin: 0, listStyle: 'none', flex: 1 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <li className="nav-item" style={styles.navItem}><span style={{ marginRight: '12px' }}>💠</span> DASHBOARD</li>
          </Link>
          <li className="nav-item" style={styles.navItemActive}><span style={{ marginRight: '12px' }}>👤</span> PERFIL</li>
          <Link to="/historial" style={{ textDecoration: 'none' }}>
            <li className="nav-item" style={styles.navItem}><span style={{ marginRight: '12px' }}>💳</span> CRÉDITOS</li>
          </Link>
          <Link to="/tickets" style={{ textDecoration: 'none' }}>
            <li className="nav-item" style={styles.navItem}><span style={{ marginRight: '12px' }}>💬</span> TICKETS</li>
          </Link>
          <Link to="/archivos" style={{ textDecoration: 'none' }}>
            <li className="nav-item" style={styles.navItem}><span style={{ marginRight: '12px' }}>📄</span> ARCHIVOS</li>
          </Link>
          <Link to="/simulador" style={{ textDecoration: 'none', marginTop: '20px', display: 'block' }}>
            <li className="nav-item" style={{ ...styles.navItem, fontSize: '13px', color: '#666' }}>
               SIMULA EL PRECIO DE UN ARCHIVO
            </li>
           </Link>
        </ul>
        <div style={{ borderTop: '1px solid #333', padding: '20px' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', backgroundColor: 'transparent', color: '#e11d48', border: '1px solid #e11d48', padding: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
            SALIR DE LA CUENTA
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBarStatus}>{status.mensaje}</div>
        
        <header style={styles.header}>
          <div style={{fontSize: '14px', fontWeight: 'bold', color: '#e11d48'}}>MI PERFIL DE USUARIO</div>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>
             {/* Cambiado fullNameHeader para que sea reactivo al input */}
            💳 {userMetadata?.credits || 0} CREDITS &nbsp;&nbsp; 👤 {fullNameHeader.toUpperCase()}
          </div>
        </header>

        <form onSubmit={handleUpdate} style={styles.formCard}>
          <div style={styles.sectionTitle}>👤 INFORMACIÓN PERSONAL</div>
          <div style={styles.inputGroup}>
            <div>
              <label style={styles.label}>NOMBRE</label>
              <input 
                style={styles.input} 
                type="text" 
                value={profile.full_name} 
                onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
              />
            </div>
            <div>
              <label style={styles.label}>APELLIDO</label>
              <input 
                style={styles.input} 
                type="text" 
                value={profile.apellido} 
                onChange={(e) => setProfile({...profile, apellido: e.target.value})} 
              />
            </div>
            <div style={{ gridColumn: 'span 2', width: '25%' }}>
              <label style={styles.label}>TELÉFONO</label>
              <input 
                style={styles.input} 
                type="text" 
                placeholder="+56 9 ..." 
                value={profile.phone} 
                onChange={(e) => setProfile({...profile, phone: e.target.value})} 
              />
            </div>
          </div>

          <div style={styles.sectionTitle}>📄 INFORMACIÓN DE FACTURACIÓN</div>
          <div style={styles.inputGroup}>
            <div>
              <label style={styles.label}>COMPAÑÍA</label>
              <input style={styles.input} type="text" placeholder="Nombre de tu taller" value={profile.company} onChange={(e) => setProfile({...profile, company: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>RUT / VAT</label>
              <input style={styles.input} type="text" placeholder="12.345.678-9" value={profile.rut} onChange={(e) => setProfile({...profile, rut: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>ACTIVIDAD</label>
              <input style={styles.input} type="text" placeholder="Giro comercial" value={profile.actividad} onChange={(e) => setProfile({...profile, actividad: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>PAÍS</label>
              <select style={styles.input} value={profile.country} onChange={(e) => setProfile({...profile, country: e.target.value})}>
                <option value="Chile">Chile</option>
                <option value="Argentina">Argentina</option>
                <option value="Peru">Perú</option>
              </select>
            </div>
          </div>

          <div style={styles.sectionTitle}>🔑 ACCESO</div>
          <div style={styles.inputGroup}>
            <div>
              <label style={styles.label}>E-MAIL</label>
              <input style={{...styles.input, backgroundColor: '#f9f9f9'}} type="email" value={session?.user?.email} disabled />
            </div>
            <div>
              <label style={styles.label}>CONTRASEÑA</label>
              <input style={styles.input} type="password" value="********" disabled />
              <p style={{fontSize: '11px', color: '#e11d48', cursor: 'pointer', marginTop: '8px', fontWeight: 'bold'}}>Cambiar contraseña</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
             <button type="submit" disabled={loading} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
             </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Perfil;