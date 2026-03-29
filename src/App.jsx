import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importación del componente Layout (El que contiene Sidebar y Header)
import Layout from './components/Layout'; 

// Importación de tus páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Perfil from './pages/Perfil';
import Creditos from './pages/Creditos';
import Historial from './pages/Historial';
import Tickets from './pages/Tickets';
import Archivos from './pages/Archivos';
import Admin from './pages/Admin'; 
import UploadFile from './pages/UploadFile'; 
import Simulador from './pages/Simulador';
import Clientes from './pages/Clientes';

import RecuperarPassword from './pages/RecuperarPassword';
import ActualizarPassword from './pages/ActualizarPassword';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios en la autenticación (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Sesión actualizada. Rol:", session?.user?.app_metadata?.role);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pantalla de carga mientras se verifica la sesión
  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#000', 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        CARGANDO PORTAL...
      </div>
    );
  }

  // --- LÓGICA DE ADMINISTRADOR UNIFICADA (LOS 3 CORREOS + ROL) ---
  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin = 
    session?.user?.app_metadata?.role === 'admin' || 
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  return (
    <Router>
      <Routes>
        {/* RUTA PÚBLICA: Login */}
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/" />} 
        />

        {/* Agregamos las rutas de recuperación aquí afuera */}
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/actualizar-password" element={<ActualizarPassword />} />

        {/* --- GRUPO DE RUTAS PROTEGIDAS CON LAYOUT --- */}
        {/* Si hay sesión, carga Layout. Si no, manda a Login */}
        <Route element={session ? <Layout session={session} /> : <Navigate to="/login" />}>
          
          <Route path="/" element={<Dashboard session={session} />} />
          <Route path="/perfil" element={<Perfil session={session} />} />
          <Route path="/creditos" element={<Creditos session={session} />} />
          <Route path="/historial" element={<Historial session={session} />} />
          <Route path="/tickets" element={<Tickets session={session} />} />
          <Route path="/archivos" element={<Archivos session={session} />} />
          <Route path="/upload" element={<UploadFile session={session} />} />
          <Route path="/simulador" element={<Simulador session={session} />} />
          <Route path="/clientes" element={<Clientes session={session} />} />
          
          {/* Ruta Exclusiva para Administradores */}
          <Route 
            path="/admin" 
            element={isAdmin ? <Admin session={session} /> : <Navigate to="/" />} 
          />

        </Route>
        {/* --- FIN DEL GRUPO CON LAYOUT --- */}

        {/* Redirección por defecto si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;