import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const RecuperarPassword = () => {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });
    if (error) {
      alert("Error: " + error.message);
    } else {
      setMensaje("✅ Se ha enviado un enlace de recuperación.");
    }
    setLoading(false);
  };

  const styles = {
    container: {
      height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center',
      alignItems: 'center', backgroundColor: '#0a0a0a', fontFamily: 'sans-serif',
      margin: 0, padding: 0, position: 'absolute', top: 0, left: 0
    },
    box: {
      backgroundColor: '#111', padding: '40px', borderRadius: '8px', width: '100%',
      maxWidth: '450px', border: '1px solid #222', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    },
    logo: { fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '5px', color: 'white' },
    subtitle: { fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '2px' },
    label: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#888', marginBottom: '5px', textTransform: 'uppercase' },
    input: {
      width: '100%', padding: '12px', backgroundColor: '#1a1a1a', border: '1px solid #333',
      borderRadius: '4px', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '14px', marginBottom: '20px'
    },
    button: {
      width: '100%', backgroundColor: '#e11d48', color: 'white', padding: '14px',
      border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', marginTop: '10px'
    },
    link: { color: '#e11d48', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', fontSize: '13px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.logo}>
          TORRES<span style={{ color: '#e11d48' }}>AGUAYO</span>
        </div>
        <div style={styles.subtitle}>Recuperar acceso al portal</div>

        {mensaje ? (
          <div style={{ textAlign: 'center', color: 'white', padding: '20px 0' }}>
            <p style={{ fontSize: '14px' }}>{mensaje}</p>
            <Link to="/login" style={styles.link}>Volver al inicio</Link>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>Email de tu cuenta</label>
              <input 
                style={styles.input} 
                type="email" 
                placeholder="tu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'ENVIANDO...' : 'ENVIAR INSTRUCCIONES'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={styles.link}>Volver al inicio</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;