import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ActualizarPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    
    // Esta función de Supabase actualiza al usuario que viene con el token en la URL
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      alert("✅ Contraseña actualizada con éxito. Ya puedes iniciar sesión.");
      navigate('/login');
    }
    setLoading(false);
  };

  const styles = {
    container: {
      height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center',
      alignItems: 'center', backgroundColor: '#0a0a0a', fontFamily: 'sans-serif'
    },
    box: {
      backgroundColor: '#111', padding: '40px', borderRadius: '8px', width: '100%',
      maxWidth: '400px', border: '1px solid #222', textAlign: 'center'
    },
    title: { color: 'white', fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' },
    subtitle: { color: '#666', fontSize: '12px', marginBottom: '25px', textTransform: 'uppercase' },
    label: { display: 'block', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', color: '#888', marginBottom: '5px' },
    input: {
      width: '100%', padding: '12px', backgroundColor: '#1a1a1a', border: '1px solid #333',
      borderRadius: '4px', color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: '20px'
    },
    button: {
      width: '100%', backgroundColor: '#e11d48', color: 'white', padding: '14px',
      border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.title}>NUEVA CONTRASEÑA</div>
        <div style={styles.subtitle}>Ingresa tu nueva clave de acceso</div>

        <form onSubmit={handleUpdate}>
          <label style={styles.label}>NUEVA CONTRASEÑA</label>
          <input 
            type="password" 
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            style={styles.input}
          />

          <label style={styles.label}>CONFIRMAR CONTRASEÑA</label>
          <input 
            type="password" 
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActualizarPassword;