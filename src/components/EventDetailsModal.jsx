import React, { useState } from 'react';
import styles from './EventModal.module.css'; // Reutilizamos estilos
import { Calendar, Users, CheckSquare, Clock, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventDetailsModal({ isOpen, event, onClose, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset del estado cuando se abre/cierra
  React.useEffect(() => {
    if (isOpen) setConfirmDelete(false);
  }, [isOpen]);

  if (!isOpen || !event) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Detalles del Evento</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={28} /></button>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{event.evento}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Solicitado por: <strong>{event.nombre}</strong></p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Calendar size={20} color="var(--accent-color)" />
              <div>
                <strong style={{ display: 'block' }}>Fecha</strong>
                <span>{format(new Date(event.fecha), "EEEE, d 'de' MMMM", { locale: es })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Clock size={20} color="var(--accent-color)" />
              <div>
                <strong style={{ display: 'block' }}>Horario</strong>
                <span>{event.horaInicio}:00 a {event.horaFin}:00</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Users size={20} color="var(--accent-color)" />
              <div>
                <strong style={{ display: 'block' }}>Salas & Asistentes</strong>
                <span>Sala(s): {event.salasAsignadas} | {event.numAsistentes} pax</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckSquare size={20} color="var(--accent-color)" />
              <div>
                <strong style={{ display: 'block' }}>Requerimientos</strong>
                {event.requerimientos && event.requerimientos.length > 0 ? (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                    {event.requerimientos.map(r => <li key={r}>{r}</li>)}
                  </ul>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Ninguno</span>
                )}
              </div>
            </div>

          </div>
          
          {event.notas && (
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notas a Intendencia</strong>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{event.notas}</p>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <span style={{ color: '#b91c1c', fontSize: '0.9rem', fontWeight: 500 }}>¿Eliminar reserva?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button onClick={() => onDelete(event.id)} style={{ background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px', fontWeight: 600 }}>Sí, eliminar</button>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setConfirmDelete(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => {e.currentTarget.style.background = '#fef2f2';}}
                  onMouseOut={(e) => {e.currentTarget.style.background = 'transparent';}}
                >
                  <Trash2 size={16} /> Eliminar
                </button>
                <button 
                  onClick={() => onEdit(event)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-color)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => {e.currentTarget.style.opacity = 0.9;}}
                  onMouseOut={(e) => {e.currentTarget.style.opacity = 1;}}
                >
                  <Edit2 size={16} /> Editar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
