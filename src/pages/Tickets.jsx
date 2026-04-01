import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Tickets = ({ session }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [asunto, setAsunto] = useState('');
  const [mensajeInicial, setMensajeInicial] = useState('');

  const ADMIN_EMAILS = ['scannerstorresaguayo@gmail.com', 'felipe.acuna2@mail.udp.cl', 'stockcarscl@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email?.toLowerCase());

  useEffect(() => { fetchTickets(); }, [session]);
  useEffect(() => { if (selectedTicket) fetchMessages(selectedTicket.id); }, [selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*, profiles:user_id(email, company, full_name)')
      .order('created_at', { ascending: false });
  
    if (!error) {
      setTickets(isAdmin ? data : data.filter(t => t.user_id === session.user.id));
    }
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // --- FUNCIÓN WHATSAPP ---
  const abrirWhatsappSoporte = () => {
    const telefonoSoporte = "56995161488";
    const texto = encodeURIComponent("Hola *Torres Aguayo MMS* 🏎️, necesito soporte técnico con un ticket.");
    window.open(`https://wa.me/${telefonoSoporte}?text=${texto}`, '_blank');
  };

  const enviarNotificacionEmail = async (destinatario, asuntoEmail, cuerpoHtml) => {
    try {
      await supabase.functions.invoke('swift-function', {
        body: { to: destinatario, subject: asuntoEmail, html: cuerpoHtml },
      });
    } catch (err) { console.error("Error email:", err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTicket) return;

    try {
      setUploadingFile(true);
      const nombreOriginal = file.name;
      const fileName = `${Date.now()}_${nombreOriginal.replace(/\s+/g, '_')}`;
      const filePath = `tickets/${selectedTicket.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('archivos-vehiculos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('archivos-vehiculos')
        .getPublicUrl(filePath);

      await insertarMensaje(`📎 Archivo enviado: ${nombreOriginal}`, publicUrl);
      
    } catch (error) {
      alert("Error al subir archivo: " + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const insertarMensaje = async (texto, fileUrl = null) => {
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      user_id: session.user.id,
      mensaje: texto,
      file_url: fileUrl,
      is_admin_reply: isAdmin
    });

    if (!error) {
      fetchMessages(selectedTicket.id);
      const emailDestino = isAdmin ? selectedTicket.profiles?.email : ADMIN_EMAILS.join(',');
      await enviarNotificacionEmail(
        emailDestino, 
        `Nuevo mensaje en ticket: ${selectedTicket.asunto}`, 
        `<p>${texto}</p>${fileUrl ? `<a href="${fileUrl}">Descargar Archivo</a>` : ''}`
      );
    }
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    setSendingMsg(true);
    await insertarMensaje(nuevoMensaje);
    setNuevoMensaje('');
    setSendingMsg(false);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
    if (selectedTicket?.id === id) setSelectedTicket(prev => ({ ...prev, estado: nuevoEstado }));
    await supabase.from('tickets').update({ estado: nuevoEstado }).eq('id', id);
  };

  const crearTicket = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('tickets').insert({
      user_id: session.user.id,
      asunto,
      mensaje_inicial: mensajeInicial,
      estado: 'Pendiente'
    });
    if (!error) {
      alert("✅ Ticket enviado.");
      await enviarNotificacionEmail(ADMIN_EMAILS.join(','), `NUEVO TICKET: ${asunto}`, `<p>${mensajeInicial}</p>`);
      setShowModal(false); setAsunto(''); setMensajeInicial(''); fetchTickets();
    }
  };

  const styles = {
    mainContent: { flex: 1, padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' },
    card: { backgroundColor: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' },
    btnTicket: { backgroundColor: '#e11d48', color: 'white', padding: '12px 24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' },
    btnWhatsapp: { backgroundColor: '#25D366', color: 'white', padding: '12px 24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    badge: (estado) => ({
      padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
      backgroundColor: estado === 'Resuelto' ? '#267358' : estado === 'En Curso' ? '#f59e0b' : '#e11d48', color: 'white'
    }),
    modal: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    chatBox: { backgroundColor: 'white', width: '90%', maxWidth: '600px', height: '85vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    message: (isAdminMsg) => ({
      alignSelf: isAdminMsg ? 'flex-start' : 'flex-end',
      backgroundColor: isAdminMsg ? '#f1f1f1' : '#e11d48',
      color: isAdminMsg ? '#333' : 'white',
      padding: '10px 15px', borderRadius: '10px', marginBottom: '10px', maxWidth: '80%', fontSize: '14px',
      wordBreak: 'break-word', overflowWrap: 'anywhere', display: 'flex', flexDirection: 'column'
    }),
  };

  return (
    <div style={styles.mainContent}>
      {/* HEADER ACTUALIZADO CON WHATSAPP */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ margin: 0, textTransform: 'uppercase' }}>Soporte Técnico</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={styles.btnWhatsapp} onClick={abrirWhatsappSoporte}>
              <span style={{ fontSize: '18px' }}>💬</span> SOPORTE POR WHATSAPP
            </button>
            {!isAdmin && (
              <button style={styles.btnTicket} onClick={() => setShowModal(true)}>NUEVO TICKET</button>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE TICKETS */}
      <div style={styles.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '12px', color: '#888' }}>
              <th style={{ padding: '12px' }}>FECHA</th>
              <th style={{ padding: '12px' }}>ASUNTO</th>
              {isAdmin && <th style={{ padding: '12px' }}>CLIENTE / EMPRESA</th>}
              <th style={{ padding: '12px' }}>ESTADO</th>
              <th style={{ padding: '12px' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}><strong>{t.asunto}</strong></td>
                {isAdmin && (
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{t.profiles?.company || 'Particular'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{t.profiles?.email}</div>
                  </td>
                )}
                <td style={{ padding: '12px' }}>
                  <span style={styles.badge(t.estado)}>{t.estado?.toUpperCase()}</span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => setSelectedTicket(t)} style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }}>VER CHAT</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CHAT */}
      {selectedTicket && (
        <div style={styles.modal}>
          <div style={styles.chatBox}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
              <div>
                <h4 style={{ margin: 0 }}>{selectedTicket.asunto}</h4>
                {isAdmin && (
                  <select value={selectedTicket.estado} onChange={(e) => cambiarEstado(selectedTicket.id, e.target.value)} style={{ marginTop: '5px' }}>
                    <option value="Pendiente">PENDIENTE</option>
                    <option value="En Curso">EN CURSO</option>
                    <option value="Resuelto">RESUELTO</option>
                  </select>
                )}
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f9f9f9' }}>
              <div style={styles.message(false)}><strong>Inicio:</strong><br/>{selectedTicket.mensaje_inicial}</div>
              {messages.map(m => (
                <div key={m.id} style={styles.message(m.is_admin_reply)}>
                  {m.mensaje}
                  {m.file_url && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                      <a href={m.file_url} target="_blank" rel="noreferrer" style={{ color: m.is_admin_reply ? '#e11d48' : 'white', fontWeight: 'bold' }}>
                        📥 DESCARGAR ARCHIVO
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={enviarRespuesta} style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ cursor: 'pointer', fontSize: '20px' }}>
                {uploadingFile ? '⏳' : '📎'}
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
              <input 
                style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }} 
                placeholder="Escribe un mensaje..." 
                value={nuevoMensaje} 
                onChange={(e) => setNuevoMensaje(e.target.value)} 
              />
              <button type="submit" style={styles.btnTicket} disabled={sendingMsg}>ENVIAR</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO TICKET */}
      {showModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.card, width: '400px' }}>
            <h3>Nueva Consulta</h3>
            <form onSubmit={crearTicket}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ASUNTO</label>
              <input style={{ width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd' }} required value={asunto} onChange={e => setAsunto(e.target.value)} />
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>MENSAJE</label>
              <textarea style={{ width: '100%', padding: '10px', height: '100px', border: '1px solid #ddd' }} required value={mensajeInicial} onChange={e => setMensajeInicial(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={styles.btnTicket}>ENVIAR</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...styles.btnTicket, backgroundColor: '#666' }}>CERRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;