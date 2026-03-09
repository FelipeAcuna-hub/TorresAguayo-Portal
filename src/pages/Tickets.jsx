import React from 'react';
import { Link } from 'react-router-dom';

const Tickets = () => {
  // Reutiliza los mismos estilos de Archivos.jsx aquí...
  return (
    <div style={{/* mismos estilos */}}>
      {/* Estructura de Sidebar y Header igual a los anteriores */}
      <div style={{margin: '30px', backgroundColor: 'white', padding: '40px'}}>
        <h2 style={{borderBottom: '1px solid #eee', paddingBottom: '10px'}}>SOPORTE TÉCNICO</h2>
        <p style={{fontSize: '14px', color: '#666', marginTop: '20px'}}>¿Tienes problemas con un archivo? Abre un ticket de soporte y nuestro equipo te ayudará en un plazo de 15 a 45 minutos.</p>
        <button style={{backgroundColor: '#e11d48', color: 'white', padding: '12px 24px', border: 'none', marginTop: '20px', fontWeight: 'bold', cursor: 'pointer'}}>NUEVO TICKET</button>
      </div>
    </div>
  );
};

export default Tickets;