import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
// IMPORTAMOS EL LOGO SVG DESDE SRC
import logoImg from '../magic_torresaguayo.svg';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [compania, setCompania] = useState('');
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${nombre} ${apellido}`,
              phone: telefono,
              company: compania,
              role: 'user'
            }
          }
        });
        if (error) throw error;
        alert('Registro exitoso. Un administrador revisará tu solicitud y te notificará por email cuando tu acceso sea activado.');
      } else {
        const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (loginError) throw loginError;

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

          if (profile && !profile.is_approved) {
            await supabase.auth.signOut();
            alert("⚠️ Acceso en espera: Tu cuenta aún no ha sido aprobada por el administrador.");
            return;
          }
          navigate('/'); 
        }
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const styles = {
    container: {
      height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center',
      alignItems: 'center', backgroundColor: '#0a0a0a', fontFamily: 'sans-serif',
      margin: 0, padding: 0, position: 'absolute', top: 0, left: 0
    },
    loginBox: {
      backgroundColor: '#111', padding: '40px', borderRadius: '8px', width: '100%',
      maxWidth: '450px', border: '1px solid #222', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    },
    // NUEVO ESTILO PARA EL CONTENEDOR DEL LOGO
    logoContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    },
    logoImg: {
      width: '300px', // Ajusta este tamaño según prefieras
      height: 'auto'
    },
    subtitle: { fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '2px' },
    inputGroup: { marginBottom: '15px' },
    row: { display: 'flex', gap: '10px', marginBottom: '15px' },
    label: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#888', marginBottom: '5px', textTransform: 'uppercase' },
    input: {
      width: '100%', padding: '12px', backgroundColor: '#1a1a1a', border: '1px solid #333',
      borderRadius: '4px', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '14px'
    },
    passContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
    eyeBtn: {
      position: 'absolute', right: '10px', background: 'none', border: 'none',
      cursor: 'pointer', color: '#666', fontSize: '16px', display: 'flex', alignItems: 'center'
    },
    button: {
      width: '100%', backgroundColor: '#e11d48', color: 'white', padding: '14px',
      border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', marginTop: '10px'
    },
    toggleText: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' },
    link: { color: '#e11d48', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px', textDecoration: 'none' },
    forgotPass: { 
      display: 'block', textAlign: 'right', marginTop: '8px', fontSize: '11px', 
      color: '#666', textDecoration: 'none', transition: '0.3s' 
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        
        {/* REEMPLAZAMOS EL TEXTO POR LA IMAGEN SVG */}
        <div style={styles.logoContainer}>
          <img src={logoImg} alt="Torres Aguayo" style={styles.logoImg} />
        </div>

        <div style={styles.subtitle}>{isRegistering ? 'Crea tu cuenta de Distribuidor' : 'Portal Distribuidores'}</div>

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Nombre</label>
                  <input style={styles.input} type="text" placeholder="Ej: Juan" onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Apellido</label>
                  <input style={styles.input} type="text" placeholder="Ej: Navarro" onChange={(e) => setApellido(e.target.value)} required />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Compañía / Taller</label>
                <input style={styles.input} type="text" placeholder="Nombre de tu empresa" onChange={(e) => setCompania(e.target.value)} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>WhatsApp / Teléfono</label>
                <input style={styles.input} type="tel" placeholder="+569..." onChange={(e) => setTelefono(e.target.value)} required />
              </div>
            </>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="tu@email.com" onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.passContainer}>
              <input 
                style={{ ...styles.input, paddingRight: '40px' }} 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? '🔒' : '👁️'}
              </button>
            </div>
            
            {!isRegistering && (
              <Link to="/recuperar-password" style={styles.forgotPass}>
                ¿Olvidaste tu contraseña?
              </Link>
            )}
          </div>

          <button type="submit" style={styles.button}>
            {isRegistering ? 'REGISTRARSE' : 'INICIAR SESIÓN'}
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