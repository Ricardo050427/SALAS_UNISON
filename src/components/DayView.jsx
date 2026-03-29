"use client";
import React, { useMemo } from 'react';
import styles from './Calendar.module.css';
import { format } from 'date-fns';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 to 20 (7am to 8pm)
const ROOMS = [
  { id: '1', name: 'Sala 1', capacity: 40 },
  { id: '2', name: 'Sala 2', capacity: 40 },
  { id: '3', name: 'Sala 3', capacity: 40 },
];

const EVENT_COLORS = [
  'linear-gradient(135deg, #f97316, #ea580c)', // Naranja Brand
  'linear-gradient(135deg, #0ea5e9, #0284c7)', // Azul Océano
  'linear-gradient(135deg, #10b981, #059669)', // Verde Esmeralda
];

export default function DayView({ currentDate, events = [], onSlotClick, onEventClick, lastCreatedEventId }) {
  
  // Filtrar eventos del día actual
  const dayEvents = useMemo(() => {
    return events.filter(e => {
      // Comparación simple de fecha (YYYY-MM-DD)
      const eDate = new Date(e.fecha).toISOString().split('T')[0];
      const cDate = currentDate.toISOString().split('T')[0];
      return eDate === cDate;
    });
  }, [currentDate, events]);

  // Alternancia por hora
  // Hora de inicio impar (7, 9, 11) -> Naranja Oscuro
  // Hora de inicio par (8, 10, 12) -> Azul Oscuro
  const getColorTemplate = (horaInicio) => {
    const isOdd = horaInicio % 2 !== 0;
    return isOdd 
      ? 'linear-gradient(135deg, #ea580c, #9a3412)' // Naranja Oscuro (#ea580c to #9a3412)
      : 'linear-gradient(135deg, #2563eb, #1e3a8a)'; // Azul Oscuro (#2563eb to #1e3a8a)
  };

  const handleSlotClick = (hora, salaId) => {
    // Abrir modal de creación
    if(onSlotClick) onSlotClick(hora, salaId);
  };

  return (
    <div className={styles.calendarWrapper}>
      
      {/* Columna de Horas Fija */}
      <div className={styles.timeCol}>
        <div className={styles.headerCorner}></div>
        {HOURS.map(h => (
          <div key={`time-${h}`} className={styles.timeSlot}>
            {h > 12 ? `${h-12} PM` : h === 12 ? '12 PM' : `${h} AM`}
          </div>
        ))}
      </div>

      {/* Contenido Dinámico de Salas */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 'min-content' }}>
        
        {/* Cabecera de Salas Fija */}
        <div className={styles.headerRow}>
          {ROOMS.map(room => (
            <div key={`header-${room.id}`} className={styles.roomHeader}>
              {room.name}
              <span className={styles.roomSub}>Capacidad: {room.capacity} pax</span>
            </div>
          ))}
        </div>

        {/* Grilla de Salas */}
        <div className={styles.gridContent}>
          {ROOMS.map((room, roomIndex) => {
            
            return (
              <div key={`col-${room.id}`} className={styles.roomColumn}>
                
                {/* Bloques de Hora para hacer clics de creacion */}
                {HOURS.map(h => (
                  <div 
                    key={`slot-${room.id}-${h}`} 
                    className={styles.gridSlot}
                    onClick={() => handleSlotClick(h, room.id)}
                  >
                  </div>
                ))}

                {/* Renderizar Eventos superpuestos (Bloques que nacen en esta sala) */}
                {dayEvents.map(event => {
                  const salas = event.salasAsignadas.split(',').map(Number).sort((a,b)=>a-b);
                  
                  // Agrupar en bloques (1,3 -> [{start:1,span:1}, {start:3,span:1}])
                  const blocksForEvent = [];
                  let currentStart = salas[0];
                  let currentSpan = 1;
                  for (let i = 1; i < salas.length; i++) {
                     if (salas[i] === salas[i-1] + 1) { currentSpan++; }
                     else { 
                       blocksForEvent.push({ start: currentStart, span: currentSpan }); 
                       currentStart = salas[i]; 
                       currentSpan = 1; 
                     }
                  }
                  blocksForEvent.push({ start: currentStart, span: currentSpan });

                  // Filtrar solo los bloques que DEBEN iniciar en esta columna (room.id)
                  const targetBlocks = blocksForEvent.filter(b => b.start.toString() === room.id);
                  
                  if (targetBlocks.length === 0) return null; // Este evento no inicia ningún bloque en esta Sala
                  
                  // Renderizar cada bloque detectado para esta columna principal
                  return targetBlocks.map(block => {
                    const widthMultiplier = block.span;
                    
                    const startOffset = event.horaInicio - 7;
                    const duration = event.horaFin - event.horaInicio;
                    
                    // Aplicar GAPS internos (margen) para ver la cuadrícula debajo
                    const top = startOffset * 80 + 4; 
                    const height = duration * 80 - 8;
                    const bgGradient = getColorTemplate(event.horaInicio);
                    
                    return (
                      <div 
                        key={`${event.id}-block-${block.start}`}
                        className={`${styles.eventBlock} ${event.id === lastCreatedEventId ? styles.animatePop : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          width: `calc(${widthMultiplier * 100}% - 8px)`,
                          left: `4px`,
                          background: bgGradient,
                          zIndex: widthMultiplier > 1 ? 6 : 5
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(onEventClick) onEventClick(event);
                        }}
                        title={`Sala(s): ${event.salasAsignadas} | ${event.nombre}`}
                      >
                        <div className={styles.eventTitle}>{event.evento}</div>
                      </div>
                    );
                  });
                })}

              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
