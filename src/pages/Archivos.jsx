import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com' // Agrega los que necesites
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    const fetchArchivos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;

        // Traemos archivos y unimos con profiles para obtener empresa y email
        let query = supabase
          .from('archivos')
          .select(`
            *,
            profiles:user_id (
              company,
              email
            )
          `);

        if (!isAdmin) {
          query = query.eq('user_id', session.user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        console.log("Datos recibidos:", data);
        setArchivos(data || []);
      } catch (error) {
        console.error("Error al cargar archivos:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivos();
  }, [session, isAdmin]);

  // FUNCIÓN ACTUALIZADA: Cambia estado y envía correo por Resend
  const handleStatusChange = async (archivoId, nuevoEstado, clienteEmail, patente) => {
    try {
      // 1. Actualización en Base de Datos
      const { error } = await supabase
        .from('archivos')
        .update({ estado: nuevoEstado })
        .eq('id', archivoId);
  
      if (error) throw error;
  
      // 2. Envío de Correo si el estado es 'completado' o 'en revision'
      if (import.meta.env.VITE_RESEND_API_KEY && clienteEmail) {
        const subjectText = nuevoEstado === 'completado' 
          ? `✅ Archivo Listo - Patente ${patente}` 
          : `🔍 Archivo en Revisión - Patente ${patente}`;
  
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Torres Aguayo MMS <noreply@torresaguayomms.cl>',
            to: [clienteEmail],
            subject: subjectText,
            html: `
              <div style="font-family: 'Helvetica', Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                  <div style="background-color: #000000; padding: 20px; text-align: center;">
                    <h1 style="color: #e11d48; margin: 0; font-size: 24px; letter-spacing: 2px;">TORRES AGUAYO MMS</h1>
                  </div>
                  <div style="padding: 30px; line-height: 1.6; color: #333;">
                    <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Actualización de Requerimiento</h2>
                    <p>Hola,</p>
                    <p>Te informamos que el archivo para el vehículo con patente <strong>${patente}</strong> ha cambiado su estado a:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0; font-weight: bold; font-size: 18px; text-align: center; text-transform: uppercase;">
                      ${nuevoEstado}
                    </div>
                    <p>Si el estado es <strong>COMPLETADO</strong>, ya puedes descargar tu archivo modificado desde el portal oficial.</p>
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="https://torresaguayomms.cl/archivos" style="background-color: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">IR AL PORTAL DE USUARIO</a>
                    </div>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                    <p>© 2026 Torres Aguayo MMS - Ingeniería en Reprogramación Automotriz</p>
                    <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                  </div>
                </div>
              </div>
            `
          }),
        });
      }
  
      setArchivos(prev => prev.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
      alert("Estado actualizado y cliente notificado vía email.");
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const styles = {
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' },
    tableCard: { backgroundColor: 'white', margin: '30px', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'white',
      textTransform: 'uppercase'
    },
    selectAdmin: {
      padding: '5px',
      fontSize: '11px',
      fontWeight: 'bold',
      borderRadius: '4px',
      border: '1px solid #ddd',
      cursor: 'pointer',
      textTransform: 'uppercase',
      outline: 'none'
    }
  };

  const getBadgeColor = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completado') return '#22c55e';
    if (e === 'pendiente') return '#f59e0b';
    if (e === 'en revision') return '#3b82f6';
    return '#e11d48';
  };

  return (
    <div style={styles.mainContent}>
      <div style={styles.tableCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>
        </div>

        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase', color: '#333' }}>
          {isAdmin ? "Gestión Global de Archivos" : "Historial de Archivos"}
        </h2>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              {isAdmin && <th style={styles.th}>Empresa</th>}
              <th style={styles.th}>Patente</th>
              <th style={styles.th}>Marca / Modelo</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {archivos.length > 0 ? (
              archivos.map((archivo) => (
                <tr key={archivo.id}>
                  <td style={styles.td}>
                    {new Date(archivo.created_at).toLocaleDateString('es-CL')}
                  </td>
                  {isAdmin && (
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#e11d48' }}>
                      {archivo.profiles?.company || 'PARTICULAR'}
                    </td>
                  )}
                  <td style={styles.td}>{archivo.patente}</td>
                  <td style={styles.td}>{archivo.marca_modelo}</td>
                  <td style={styles.td}>
                    {isAdmin ? (
                      <select
                        style={{
                          ...styles.selectAdmin,
                          color: getBadgeColor(archivo.estado),
                          borderColor: getBadgeColor(archivo.estado)
                        }}
                        value={archivo.estado}
                        onChange={(e) => handleStatusChange(
                          archivo.id,
                          e.target.value,
                          archivo.profiles?.email,
                          archivo.patente
                        )}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en revision">En Revisión</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    ) : (
                      <span style={{ ...styles.statusBadge, backgroundColor: getBadgeColor(archivo.estado) }}>
                        {archivo.estado}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {archivo.file_url && (
                      <button
                        onClick={() => window.open(archivo.file_url, '_blank')}
                        style={{ color: '#e11d48', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}
                      >
                        {isAdmin ? "Ver Archivo" : "Descargar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? "6" : "5"} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {loading ? 'Cargando archivos...' : 'No hay registros disponibles.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p style={{ marginTop: '20px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
          * {isAdmin ? "Como administrador puedes gestionar el flujo de trabajo." : "Los archivos procesados estarán disponibles para descarga por 30 días."}
        </p>
      </div>
    </div>
  );
};

export default Archivos;