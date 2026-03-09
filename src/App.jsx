import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importa todas tus páginas
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import Creditos from './pages/Creditos';
import Tickets from './pages/Tickets';
import Archivos from './pages/Archivos';
import UploadFile from './pages/UploadFile';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{backgroundColor: '#000', height: '100vh'}}></div>;

  return (
    <Router>
      <Routes>
        {/* Si no hay sesión, todas las rutas mandan a /login */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        {/* Rutas Protegidas */}
        <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/upload" element={session ? <UploadFile /> : <Navigate to="/login" />} />
        <Route path="/perfil" element={session ? <Perfil /> : <Navigate to="/login" />} />
        <Route path="/creditos" element={session ? <Creditos /> : <Navigate to="/login" />} />
        <Route path="/tickets" element={session ? <Tickets /> : <Navigate to="/login" />} />
        <Route path="/archivos" element={session ? <Archivos /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;