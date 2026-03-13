import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Archivos = ({ session }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = [
    'scannerstorresaguayo@gmail.com',
    'felipe.acuna2@mail.udp.cl',
    'stockcarscl@gmail.com'
  ];

  const isAdmin =
    session?.user?.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => {
    const fetchArchivos = async () => {
      try {
        setLoading(true);
        if (!session?.user?.id) return;
    
        // 1. Iniciamos la query
        let query = supabase
          .from('archivos')
          .select(`
            *,
            profiles:user_id (
              company,
              email
            )
          `);
        
          
        // 2. REVISIÓN CRÍTICA: 
        // Si NO es admin, filtramos estrictamente por su propio ID
        if (!isAdmin) {
          console.log("Filtrando para usuario normal:", session.user.id);
          query = query.eq('user_id', session.user.id);
        } else {
          console.log("Cargando todo para Administrador");
        }
    
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        setArchivos(data || []);
      } catch (error) {
        console.error("Error al cargar archivos:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivos();
  }, [session, isAdmin]);

  // --- NUEVA FUNCIÓN PARA SUBIR ARCHIVO MODIFICADO (SOLO ADMIN) ---
  const handleUploadModificado = async (archivoId, file, patente, clienteEmail) => {
    try {
      if (!file) return;
      setLoading(true);

      const fileName = `${Date.now()}_${patente}_MODIFICADO.bin`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('archivos-vehiculos')
        .upload(`procesados/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(`procesados/${fileName}`);

      // Actualizamos la columna mod_file_url y el estado a completado
      const { error: dbError } = await supabase
        .from('archivos')
        .update({ 
          mod_file_url: publicUrl, 
          estado: 'completado' 
        })
        .eq('id', archivoId);

      if (dbError) throw dbError;

      // Gatillamos el aviso automático por correo que ya tienes
      await handleStatusChange(archivoId, 'completado', clienteEmail, patente);

      alert("Archivo MODIFICADO cargado con éxito.");
      
    } catch (error) {
      console.error("Error al subir modificado:", error.message);
      alert("Error al subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (archivoId, nuevoEstado, clienteEmail, patente) => {
    try {
      // 1. Actualización en la Base de Datos
      const { error } = await supabase
        .from('archivos')
        .update({ estado: nuevoEstado })
        .eq('id', archivoId);
  
      if (error) throw error;
  
      // 2. Envío de Correo mediante Supabase Edge Function (swift-function)
      if (clienteEmail) {
        const subjectText = nuevoEstado === 'completado' 
          ? `✅ Archivo Listo - Patente ${patente}` 
          : `🔍 Archivo en Revisión - Patente ${patente}`;
  
        // Invocamos la función de servidor para evitar errores de CORS y proteger la API Key
        const { data: funcData, error: funcError } = await supabase.functions.invoke('swift-function', {
          body: {
            to: clienteEmail,
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
          },
        });

        if (funcError) {
          console.error("Error en Edge Function:", funcError);
        } else {
          console.log("Correo enviado exitosamente:", funcData);
        }
      }
  
      setArchivos(prev => prev.map(a => a.id === archivoId ? { ...a, estado: nuevoEstado } : a));
      alert("Estado actualizado y cliente notificado vía email.");
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  // ESTILOS ACTUALIZADOS PARA MÓVIL (Responsivos)
  const styles = {
    mainContent: { 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#f3f4f6',
      width: '100%',
      minHeight: '100vh'
    },
    tableCard: { 
      backgroundColor: 'white', 
      margin: '10px',      // Reducido de 30px a 10px para móviles
      padding: '15px',     // Reducido de 30px a 15px
      borderRadius: '4px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      overflow: 'hidden'   // Evita que el contenido se salga
    },
    // Contenedor con scroll horizontal para la tabla
    responsiveContainer: {
      width: '100%',
      overflowX: 'auto',   // Esto permite deslizar la tabla en celulares
      WebkitOverflowScrolling: 'touch'
    },
    table: { 
      width: '100%', 
      borderCollapse: 'collapse', 
      marginTop: '20px',
      minWidth: '600px'    // Asegura que la tabla no se aplaste tanto
    },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'white',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    },
    selectAdmin: {
      padding: '5px',
      fontSize: '10px',
      fontWeight: 'bold',
      borderRadius: '4px',
      border: '1px solid #ddd',
      cursor: 'pointer',
      textTransform: 'uppercase',
      outline: 'none',
      backgroundColor: 'white'
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
          <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '5px 12px', fontSize: '10px', fontWeight: 'bold' }}>
            {isAdmin ? "MODO ADMINISTRADOR" : "PORTAL OFICIAL"}
          </div>
        </div>

        <h2 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase', color: '#333' }}>
          {isAdmin ? "Gestión Global" : "Mis Archivos"}
        </h2>

        {/* CONTENEDOR RESPONSIVO AGREGADO AQUÍ */}
        <div style={styles.responsiveContainer}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* BOTÓN ORIGINAL (Siempre visible si existe file_url) */}
                        {archivo.file_url && (
                          <button
                            onClick={() => window.open(archivo.file_url, '_blank')}
                            style={{ 
                              color: '#666', border: '1px solid #ddd', background: '#fff', 
                              cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', 
                              padding: '5px', textTransform: 'uppercase', borderRadius: '4px' 
                            }}
                          >
                            📄 ORIGINAL
                          </button>
                        )}

                        {/* BOTÓN MODIFICADO (Visible si existe mod_file_url) */}
                        {archivo.mod_file_url ? (
                          <button
                            onClick={() => window.open(archivo.mod_file_url, '_blank')}
                            style={{ 
                              color: 'white', border: 'none', background: '#22c55e', 
                              cursor: 'pointer', fontWeight: 'bold', fontSize: '9px', 
                              padding: '5px', textTransform: 'uppercase', borderRadius: '4px' 
                            }}
                          >
                            🚀 MODIFICADO
                          </button>
                        ) : (
                          /* Si soy Admin y NO hay archivo modificado aún, muestro el SUBIR */
                          isAdmin && (
                            <label style={{
                              backgroundColor: '#000', color: '#e11d48', padding: '5px',
                              fontSize: '9px', cursor: 'pointer', borderRadius: '4px',
                              border: '1px solid #e11d48', textAlign: 'center', fontWeight: 'bold'
                            }}>
                              {loading ? '...' : '📤 SUBIR MOD'}
                              <input 
                                type="file" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleUploadModificado(
                                  archivo.id, 
                                  e.target.files[0], 
                                  archivo.patente, 
                                  archivo.profiles?.email
                                )}
                              />
                            </label>
                          )
                        )}
                      </div>
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
        </div>

        <p style={{ marginTop: '20px', fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
          * {isAdmin ? "Desliza lateralmente si no ves todas las columnas." : "Procesados disponibles por 30 días."}
        </p>
      </div>
    </div>
  );
};

export default Archivos;