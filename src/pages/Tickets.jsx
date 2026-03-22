import React from 'react';

const Tickets = () => {
  
  // --- FUNCIÓN PARA GENERAR EL MENSAJE DE WHATSAPP ---
  const abrirWhatsappSoporte = () => {
    const telefonoSoporte = "569XXXXXXXX"; // <-- REEMPLAZA CON TU NÚMERO (con código de país)
    const mensaje = encodeURIComponent(
      "Hola *Torres Aguayo MMS* 🏎️, necesito soporte técnico con un archivo. ¿Me podrían ayudar?"
    );
    const url = `https://wa.me/${telefonoSoporte}?text=${mensaje}`;
    
    window.open(url, '_blank');
  };

  const styles = {
    mainContent: { flex: 1, padding: '0', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    card: { 
      backgroundColor: 'white', 
      margin: '30px', 
      padding: '40px', 
      borderRadius: '4px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
    },
    btnTicket: { 
      backgroundColor: '#e11d48', 
      color: 'white', 
      padding: '12px 24px', 
      border: 'none', 
      marginTop: '20px', 
      fontWeight: 'bold', 
      cursor: 'pointer',
      marginRight: '10px'
    },
    btnWhatsapp: { 
      backgroundColor: '#25D366', 
      color: 'white', 
      padding: '12px 24px', 
      border: 'none', 
      marginTop: '20px', 
      fontWeight: 'bold', 
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    }
  };

  return (
    <div style={styles.mainContent}>
      <div style={styles.card}>
        <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', textTransform: 'uppercase' }}>
          SOPORTE TÉCNICO
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
          ¿Tienes problemas con un archivo? Abre un ticket de soporte o contáctanos directamente por WhatsApp. Nuestro equipo te ayudará en un plazo de 15 a 45 minutos.
        </p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {/* Botón normal de Ticket */}
          <button style={styles.btnTicket}>
            NUEVO TICKET
          </button>

          {/* NUEVO: Botón de WhatsApp */}
          <button 
            style={styles.btnWhatsapp} 
            onClick={abrirWhatsappSoporte}
          >
            <span style={{ fontSize: '18px' }}>💬</span> 
            SOPORTE POR WHATSAPP
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tickets;