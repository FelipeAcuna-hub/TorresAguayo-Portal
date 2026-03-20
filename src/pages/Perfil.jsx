import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Perfil = ({ session }) => {
  const [loading, setLoading] = useState(false);
  // --- NUEVO ESTADO PARA CONTRASEÑA ---
  const [newPassword, setNewPassword] = useState(""); 
  
  const [profile, setProfile] = useState({
    full_name: '',
    apellido: '',
    phone: '',
    company: '',
    rut: '',
    actividad: '',
    country: 'Chile',
    credits: 0
  });

  useEffect(() => {
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
            country: data.country || 'Chile',
            credits: data.credits || 0
          });
        }
      } catch (error) {
        console.error('Error cargando perfil:', error.message);
      }
    };

    getProfile();
  }, [session]);

  // --- NUEVA FUNCIÓN PARA CAMBIAR CONTRASEÑA ---
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Por favor, escribe una nueva contraseña de al menos 6 caracteres en el campo de texto.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      alert("✅ ¡Contraseña actualizada con éxito!");
      setNewPassword(""); // Limpia el campo después de la actualización
    } catch (error) {
      alert("Error al cambiar contraseña: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      alert('✅ ¡Perfil actualizado correctamente!');
    } catch (error) {
      alert('Error al actualizar: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    mainContent: { flex: 1, padding: '0', backgroundColor: '#f3f4f6' },
    formCard: { backgroundColor: 'white', margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#333' },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '8px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }
  };

  return (
    <div style={styles.mainContent}>
      <form onSubmit={handleUpdate} style={styles.formCard}>
        <div style={styles.sectionTitle}>👤 INFORMACIÓN PERSONAL</div>
        <div style={styles.inputGroup}>
          <div>
            <label style={styles.label}>NOMBRE</label>
            <input
              style={styles.input}
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>
          <div>
            <label style={styles.label}>APELLIDO</label>
            <input
              style={styles.input}
              type="text"
              value={profile.apellido}
              onChange={(e) => setProfile({ ...profile, apellido: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: 'span 2', width: '25%' }}>
            <label style={styles.label}>TELÉFONO</label>
            <input
              style={styles.input}
              type="text"
              placeholder="+56 9 ..."
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
        </div>

        <div style={styles.sectionTitle}>📄 INFORMACIÓN DE FACTURACIÓN</div>
        <div style={styles.inputGroup}>
          <div>
            <label style={styles.label}>COMPAÑÍA</label>
            <input style={styles.input} type="text" placeholder="Nombre de tu taller" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>RUT / VAT</label>
            <input style={styles.input} type="text" placeholder="12.345.678-9" value={profile.rut} onChange={(e) => setProfile({ ...profile, rut: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>ACTIVIDAD</label>
            <input style={styles.input} type="text" placeholder="Giro comercial" value={profile.actividad} onChange={(e) => setProfile({ ...profile, actividad: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>PAÍS</label>
            <select style={styles.input} value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })}>
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
            <input style={{ ...styles.input, backgroundColor: '#f9f9f9' }} type="email" value={session?.user?.email} disabled />
          </div>
          <div>
            <label style={styles.label}>NUEVA CONTRASEÑA</label>
            {/* Cambiamos value="********" por el estado newPassword para que puedas escribir */}
            <input 
              style={styles.input} 
              type="password" 
              placeholder="Escribe tu nueva clave"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} 
            />
            {/* Ahora el texto tiene la función handlePasswordChange al hacer clic */}
            <p 
              onClick={handlePasswordChange}
              style={{ fontSize: '11px', color: '#e11d48', cursor: 'pointer', marginTop: '8px', fontWeight: 'bold' }}
            >
              {loading ? 'Procesando...' : 'Aplicar cambio de contraseña'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="submit" disabled={loading} style={{ backgroundColor: '#000', color: 'white', border: 'none', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Perfil;