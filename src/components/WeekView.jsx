"use client";
import React, { useMemo } from 'react';
import styles from './Calendar.module.css';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 to 20

const EVENT_COLORS = [
  'linear-gradient(135deg, #f97316, #ea580c)', // Naranja Brand
  'linear-gradient(135deg, #0ea5e9, #0284c7)', // Azul Océano
  'linear-gradient(135deg, #10b981, #059669)', // Verde Esmeralda
];

export default function WeekView({ currentDate, events = [], onSlotClick, onEventClick, lastCreatedEventId }) {
  
  // Lunes a Viernes de la semana actual
  const getWeekDays = (date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Comienza en Lunes
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  };
  
  const days = getWeekDays(currentDate);

  const getEventsForDay = (date) => {
    const targetDate = new Date(date).toISOString().split('T')[0];
    return events.filter(e => {
        const evDate = typeof e.fecha === 'string' ? e.fecha.split('T')[0] : new Date(e.fecha).toISOString().split('T')[0];
        return evDate === targetDate;
    });
  };

  // Alternancia por hora
  // Hora de inicio impar (7, 9, 11) -> Naranja Oscuro
  // Hora de inicio par (8, 10, 12) -> Azul Oscuro
  const getColorTemplate = (horaInicio) => {
    const isOdd = horaInicio % 2 !== 0;
    return isOdd 
      ? 'linear-gradient(135deg, #ea580c, #9a3412)' // Naranja Oscuro
      : 'linear-gradient(135deg, #2563eb, #1e3a8a)'; // Azul Oscuro
  };

  return (
    <div className={styles.calendarWrapper}>
      
      {/* Columna de Horas */}
      <div className={styles.timeCol}>
        <div className={styles.headerCorner}></div>
        {HOURS.map(h => (
          <div key={`time-${h}`} className={styles.timeSlot}>
            {h > 12 ? `${h-12} PM` : h === 12 ? '12 PM' : `${h} AM`}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 'min-content' }}>
        
        {/* Cabecera de Días */}
        <div className={styles.headerRow}>
          {days.map((day, i) => (
            <div key={`day-${i}`} className={styles.roomHeader}>
              {format(day, 'EEEE', { locale: es }).toUpperCase()}
              <span className={styles.roomSub}>{format(day, 'd MMM')}</span>
            </div>
          ))}
        </div>

        {/* Grilla Semanal */}
        <div className={styles.gridContent}>
          {days.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);

            return (
              <div key={`col-day-${dayIndex}`} className={styles.roomColumn}>
                
                {HOURS.map(h => (
                  <div 
                    key={`slot-day-${dayIndex}-${h}`} 
                    className={styles.gridSlot}
                    onClick={() => onSlotClick && onSlotClick(h, day)}
                  >
                  </div>
                ))}

                {/* Renderizar Eventos superpuestos fraccionados por Sala */}
                {dayEvents.map(event => {
                  const salas = event.salasAsignadas.split(',').map(Number).sort((a,b)=>a-b);
                  
                  // Agrupar salas en bloques contiguos (ej. 1,3 -> [ {start:1,span:1}, {start:3,span:1} ])
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

                  // Calculos de posición vertical con pequeños márgenes visuales
                  const startOffset = event.horaInicio - 7;
                  const duration = event.horaFin - event.horaInicio;
                  const top = startOffset * 80 + 4;
                  const height = duration * 80 - 8;
                  const bgGradient = getColorTemplate(event.horaInicio);

                  return blocksForEvent.map(block => {
                    const widthPercent = block.span * 33.33;
                    const leftPercent = (block.start - 1) * 33.33;
                    
                    const salaLabel = block.span > 1 
                      ? `S${block.start}-${block.start + block.span - 1}` 
                      : `Sala ${block.start}`;

                    return (
                      <div 
                        key={`${event.id}-block-${block.start}`}
                        className={`${styles.eventBlock} ${styles.weekEventBlock} ${event.id === lastCreatedEventId ? styles.animatePop : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`, 
                          background: bgGradient,
                          zIndex: (block.span > 1 ? 6 : 5)
                        }}
                        title={`[${salaLabel}] ${event.evento} | Solicitante: ${event.nombre}\nAsistentes: ${event.numAsistentes}\nReq: ${event.requerimientos.join(', ')}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(onEventClick) onEventClick(event);
                        }}
                      >
                        <div className={styles.eventTitle} style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                          <span style={{ fontWeight: '800', display: 'block', fontSize: '0.7em', textTransform: 'uppercase', opacity: 0.9 }}>{salaLabel}</span>
                          {event.evento}
                        </div>
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
