import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // Registro
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Registro exitoso. Revisa tu email para confirmar.');
      } else {
        // Login (Aquí faltaba el .auth)
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/'); 
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const styles = {
    // ESTE BLOQUE ARREGLA LOS BORDES Y LA POSICIÓN
    container: {
      height: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0a0a0a',
      fontFamily: 'sans-serif', // Mantiene la letra de tu Dashboard
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      position: 'absolute',
      top: 0,
      left: 0
    },
    loginBox: {
      backgroundColor: '#111',
      padding: '50px',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '400px',
      border: '1px solid #222',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      fontFamily: 'sans-serif' // Reforzamos la letra aquí también
    },
    logo: {
      fontSize: '28px',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '10px',
      letterSpacing: '1px',
      color: 'white'
    },
    subtitle: {
      fontSize: '12px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '30px',
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px', textTransform: 'uppercase' },
    input: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '4px',
      color: 'white',
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif' // Asegura que lo que escribes tenga la misma letra
    },
    button: {
      width: '100%',
      backgroundColor: '#e11d48',
      color: 'white',
      padding: '14px',
      border: 'none',
      fontWeight: 'bold',
      cursor: 'pointer',
      borderRadius: '2px',
      marginTop: '10px',
      fontFamily: 'sans-serif'
    },
    toggleText: {
      textAlign: 'center',
      marginTop: '20px',
      fontSize: '13px',
      color: '#888'
    },
    link: { color: '#e11d48', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.logo}>
          TORRES<span style={{ color: '#e11d48' }}>AGUAYO</span>
        </div>
        <div style={styles.subtitle}>Portal Distribuidores</div>

        <form onSubmit={handleAuth}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input 
              style={styles.input} 
              type="email" 
              placeholder="tu@email.com"
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input 
              style={styles.input} 
              type="password" 
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" style={styles.button}>
            {isRegistering ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div style={styles.toggleText}>
          {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <span style={styles.link} onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Ingresa aquí' : 'Regístrate aquí'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;