"use client";
import React, { useMemo, useState } from 'react';
import styles from './Calendar.module.css';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getEventGradient, formatRooms } from '@/lib/colors';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

// ── DnD sub-components ───────────────────────────────────

// Droppable row for subdivision mode (spans all 3 sub-slots of one day)
function WeekDropRow({ id, hour, date, isCurrentHour, isDayToday, isExportMode, onClick, children }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { hour, date } });
  return (
    <div
      ref={setNodeRef}
      className={[
        styles.weekGridRow,
        !isExportMode && isDayToday ? styles.currentDayCol : '',
        !isExportMode && isCurrentHour ? styles.currentHourRow : '',
        isOver ? styles.dragOverSlot : '',
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Droppable slot for non-subdivision mode
function WeekDropSlot({ id, hour, date, isCurrentHour, isDayToday, isExportMode, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { hour, date } });
  return (
    <div
      ref={setNodeRef}
      className={[
        styles.gridSlot,
        !isExportMode && isDayToday ? styles.currentDayCol : '',
        !isExportMode && isCurrentHour ? styles.currentHourRow : '',
        isOver ? styles.dragOverSlot : '',
      ].join(' ')}
      onClick={onClick}
    />
  );
}

// Draggable event block
function WeekDragEvent({ event, dragId, top, height, leftStyle, widthStyle, zIndex, isEventActive, lastCreatedEventId, onEventClick, title, children, onRegister }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { event },
  });
  const combinedRef = React.useCallback((node) => {
    setNodeRef(node);
    onRegister?.(dragId, node);
  }, [setNodeRef, dragId, onRegister]);
  return (
    <div
      ref={combinedRef}
      className={`${styles.eventBlock} ${styles.weekEventBlock} ${event.id === lastCreatedEventId ? styles.animatePop : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: leftStyle,
        width: widthStyle,
        background: getEventGradient(event.color, event.horaInicio),
        zIndex: isDragging ? 0 : zIndex,
        opacity: isDragging || isEventActive ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      {...listeners}
      {...attributes}
      title={title}
      onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────

export default function WeekView({
  currentDate, events = [], onSlotClick, onEventClick,
  lastCreatedEventId, showSubdivisions = true,
  isFullscreen = false, onToggleFullscreen,
  isExportMode = false, onDragEnd,
}) {
  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Today detection (Sat/Sun → Mon)
  const _rawToday = new Date();
  const _todayDay = _rawToday.getDay();
  if (_todayDay === 6) _rawToday.setDate(_rawToday.getDate() + 2);
  else if (_todayDay === 0) _rawToday.setDate(_rawToday.getDate() + 1);
  const todayStr    = format(_rawToday, 'yyyy-MM-dd');
  const currentHour = new Date().getHours();
  const todayInWeek = days.some(d => format(d, 'yyyy-MM-dd') === todayStr);

  const [activeEvent, setActiveEvent] = useState(null);
  const [activeDimensions, setActiveDimensions] = useState({ width: 160, height: 72 });

  const dragNodeMap = React.useRef(new Map());
  const registerDragNode = React.useCallback((id, node) => {
    if (node) dragNodeMap.current.set(id, node);
    else dragNodeMap.current.delete(id);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getEventsForDay = (date) => {
    const target = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      const evDate = typeof e.fecha === 'string' ? e.fecha.split('T')[0] : new Date(e.fecha).toISOString().split('T')[0];
      return evDate === target;
    });
  };

  // ── DnD handlers ───────────────────────────────────────
  const handleDragStart = ({ active }) => {
    const event = active.data.current.event;
    setActiveEvent(event);
    // Measure the actual DOM node — active.rect.current.initial is populated
    // asynchronously after onDragStart fires, so we use our own ref map.
    const node = dragNodeMap.current.get(active.id);
    if (node) {
      const rect = node.getBoundingClientRect();
      setActiveDimensions({ width: rect.width, height: rect.height });
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveEvent(null);
    if (!over || !onDragEnd) return;

    const event    = active.data.current.event;
    const { hour, date } = over.data.current;
    const duration = event.horaFin - event.horaInicio;

    if (hour + duration > 21) return; // out of calendar bounds

    const currentFechaStr = typeof event.fecha === 'string'
      ? event.fecha.split('T')[0]
      : new Date(event.fecha).toISOString().split('T')[0];

    if (hour === event.horaInicio && date === currentFechaStr) return; // no change

    onDragEnd({ ...event, horaInicio: hour, horaFin: hour + duration, fecha: date });
  };

  const handleDragCancel = () => setActiveEvent(null);
  // ──────────────────────────────────────────────────────

  const formatH = (hour) => hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.calendarWrapper}>

        {/* Time column */}
        <div className={styles.timeCol}>
          <div className={styles.headerCorner}>
            {!isExportMode && (
              <button className={styles.fullscreenBtn} onClick={onToggleFullscreen}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
          </div>
          {HOURS.map(h => {
            const isCurrentHour = !isExportMode && todayInWeek && h === currentHour;
            return (
              <div key={`time-${h}`} className={`${styles.timeSlot} ${isCurrentHour ? styles.currentHourTimeSlot : ''}`}>
                <span className={styles.timeStart}>{formatH(h)}</span>
                <span className={styles.timeSeparator}>↓</span>
                <span className={styles.timeEnd}>{formatH(h + 1)}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 'min-content' }}>

          {/* Day headers */}
          <div className={styles.headerRow}>
            {days.map((day, i) => {
              const isDayToday = format(day, 'yyyy-MM-dd') === todayStr;
              return showSubdivisions ? (
                <div key={`day-${i}`} className={styles.weekDayHeader}>
                  <div className={`${styles.weekDayHeaderTop} ${isDayToday ? styles.todayHeaderTop : ''}`}>
                    {format(day, 'EEEE', { locale: es }).toUpperCase()}
                    <span className={styles.roomSub}>{format(day, 'd MMM')}</span>
                  </div>
                  <div className={styles.weekDayHeaderBottom}>
                    <div className={styles.weekSubroomHeader}>Sala 1</div>
                    <div className={styles.weekSubroomHeader}>Sala 2</div>
                    <div className={styles.weekSubroomHeader}>Sala 3</div>
                  </div>
                </div>
              ) : (
                <div key={`day-${i}`} className={`${styles.roomHeader} ${isDayToday ? styles.roomHeaderToday : ''}`}>
                  {format(day, 'EEEE', { locale: es }).toUpperCase()}
                  <span className={styles.roomSub}>{format(day, 'd MMM')}</span>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className={styles.gridContent}>
            {days.map((day, dayIndex) => {
              const dayEvents  = getEventsForDay(day);
              const isDayToday = format(day, 'yyyy-MM-dd') === todayStr;
              const dateStr    = format(day, 'yyyy-MM-dd');

              return (
                <div
                  key={`col-day-${dayIndex}`}
                  className={`${styles.roomColumn} ${!isExportMode && isDayToday ? styles.currentDayCol : ''}`}
                >
                  {/* Drop slots per hour */}
                  {HOURS.map(h => {
                    const isCurrentHour = !isExportMode && todayInWeek && h === currentHour;
                    const slotId = `week-slot-${dateStr}-${h}`;

                    return showSubdivisions ? (
                      <WeekDropRow
                        key={slotId}
                        id={slotId}
                        hour={h}
                        date={dateStr}
                        isCurrentHour={isCurrentHour}
                        isDayToday={isDayToday}
                        isExportMode={isExportMode}
                        onClick={() => onSlotClick?.(h, day)}
                      >
                        {['1', '2', '3'].map(roomId => (
                          <div
                            key={`sub-${dateStr}-${h}-${roomId}`}
                            className={styles.weekGridSubSlot}
                            onClick={(e) => { e.stopPropagation(); onSlotClick?.(h, day, roomId); }}
                          />
                        ))}
                      </WeekDropRow>
                    ) : (
                      <WeekDropSlot
                        key={slotId}
                        id={slotId}
                        hour={h}
                        date={dateStr}
                        isCurrentHour={isCurrentHour}
                        isDayToday={isDayToday}
                        isExportMode={isExportMode}
                        onClick={() => onSlotClick?.(h, day)}
                      />
                    );
                  })}

                  {/* Event blocks */}
                  {dayEvents.map(event => {
                    const salas = event.salasAsignadas.split(',').map(Number).sort((a, b) => a - b);
                    const blocks = [];
                    let cs = salas[0], cspan = 1;
                    for (let i = 1; i < salas.length; i++) {
                      if (salas[i] === salas[i - 1] + 1) cspan++;
                      else { blocks.push({ start: cs, span: cspan }); cs = salas[i]; cspan = 1; }
                    }
                    blocks.push({ start: cs, span: cspan });

                    const top    = (event.horaInicio - 7) * 80 + 4;
                    const height = (event.horaFin - event.horaInicio) * 80 - 8;
                    const isEventActive = activeEvent?.id === event.id;

                    return blocks.map((block, bi) => {
                      const widthPct = block.span * 33.33;
                      const leftPct  = (block.start - 1) * 33.33;
                      const blockRooms = [];
                      for (let r = block.start; r < block.start + block.span; r++) blockRooms.push(r);
                      const salaLabel = formatRooms(blockRooms.join(','));

                      return (
                        <WeekDragEvent
                          key={`${event.id}-block-${block.start}`}
                          dragId={`week-evt-${event.id}-d${dayIndex}-b${bi}`}
                          event={event}
                          top={top}
                          height={height}
                          leftStyle={`calc(${leftPct}% + 2px)`}
                          widthStyle={`calc(${widthPct}% - 4px)`}
                          zIndex={block.span > 1 ? 6 : 5}
                          isEventActive={isEventActive}
                          lastCreatedEventId={lastCreatedEventId}
                          onEventClick={onEventClick}
                          onRegister={registerDragNode}
                          title={`[${salaLabel}] ${event.evento} | Solicitante: ${event.nombre}\nAsistentes: ${event.numAsistentes}\nReq: ${Array.isArray(event.requerimientos) ? event.requerimientos.join(', ') : ''}`}
                        >
                          <div className={styles.eventTitle} style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                            <span style={{ fontWeight: '800', display: 'block', fontSize: '0.7em', opacity: 0.9 }}>
                              {salaLabel.toUpperCase().replace(/\bY\b/g, 'y')}
                            </span>
                            {event.evento}
                          </div>
                        </WeekDragEvent>
                      );
                    });
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Drag ghost — same dimensions as the original element ── */}
      <DragOverlay>
        {activeEvent ? (
          <div style={{
            background: getEventGradient(activeEvent.color, activeEvent.horaInicio),
            width:  `${activeDimensions.width}px`,
            height: `${activeDimensions.height}px`,
            borderRadius: '10px',
            padding: '10px 12px',
            color: 'white',
            opacity: 0.92,
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            cursor: 'grabbing',
            fontSize: '0.8rem',
            fontWeight: 600,
            overflow: 'hidden',
            userSelect: 'none',
          }}>
            {activeEvent.evento}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
