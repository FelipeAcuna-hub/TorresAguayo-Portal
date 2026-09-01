import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme, DARK_GRADIENT, getSurfaceTokens } from '../ThemeContext';

const Perfil = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = getSurfaceTokens(isDark);

  // --- ESTADOS UNIFICADOS PARA CONTRASEÑA ---
  const [newPassword, setNewPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

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

  // --- FUNCIÓN PARA CAMBIAR CONTRASEÑA ---
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Por favor, escribe una nueva contraseña de al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      alert("✅ ¡Contraseña actualizada con éxito!");
      setNewPassword("");
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
    mainContent: { flex: 1, padding: '0', background: isDark ? DARK_GRADIENT : '#f3f4f6' },
    formCard: { backgroundColor: s.cardBg, margin: '30px', padding: '40px', borderRadius: '4px', boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.05)', border: `1px solid ${s.border}` },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: s.text },
    inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', color: s.textMuted, marginBottom: '8px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', border: `1px solid ${s.inputBorder}`, borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: s.inputBg, color: s.text }
  };

  return (
    <div style={styles.mainContent}>
      <form onSubmit={handleUpdate} style={styles.formCard}>
        <div style={styles.sectionTitle}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
          <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
        </svg>  INFORMACIÓN PERSONAL</div>
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

        <div style={styles.sectionTitle}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope-paper-fill" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M6.5 9.5 3 7.5v-6A1.5 1.5 0 0 1 4.5 0h7A1.5 1.5 0 0 1 13 1.5v6l-3.5 2L8 8.75zM1.059 3.635 2 3.133v3.753L0 5.713V5.4a2 2 0 0 1 1.059-1.765M16 5.713l-2 1.173V3.133l.941.502A2 2 0 0 1 16 5.4zm0 1.16-5.693 3.337L16 13.372v-6.5Zm-8 3.199 7.941 4.412A2 2 0 0 1 14 16H2a2 2 0 0 1-1.941-1.516zm-8 3.3 5.693-3.162L0 6.873v6.5Z" />
        </svg>  INFORMACIÓN DE FACTURACIÓN</div>
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

        <div style={styles.sectionTitle}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16">
          <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
        </svg>  ACCESO</div>
        <div style={styles.inputGroup}>
          <div>
            <label style={styles.label}>E-MAIL</label>
            <input
              style={{ ...styles.input, backgroundColor: s.headerBg }}
              type="email"
              value={session?.user?.email}
              disabled
            />
          </div>

          <div>
            <label style={styles.label}>NUEVA CONTRASEÑA</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                style={{ ...styles.input, paddingRight: '40px' }}
                type={mostrarPassword ? "text" : "password"}
                placeholder="Escribe tu nueva clave"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {mostrarPassword ? '🔒' : '👁️'}
              </button>
            </div>

            <p
              onClick={handlePasswordChange}
              style={{
                fontSize: '11px',
                color: '#D9241D',
                cursor: 'pointer',
                marginTop: '8px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
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