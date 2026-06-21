"use client";
import React, { useMemo, useState } from 'react';
import styles from './Calendar.module.css';
import { format } from 'date-fns';
import { getEventGradient, formatRooms } from '@/lib/colors';
import { Maximize2, Minimize2, Clock, User, Calendar } from 'lucide-react';
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
const ROOMS = [
  { id: '1', name: 'Sala 1', capacity: 40 },
  { id: '2', name: 'Sala 2', capacity: 40 },
  { id: '3', name: 'Sala 3', capacity: 40 },
];
const SOLID_COLORS = {
  naranja: '#f97316', azul: '#3b82f6', verde: '#10b981',
  morado: '#8b5cf6', rosa: '#ec4899', amarillo: '#eab308',
};

// ── DnD sub-components (must be at module level to follow hooks rules) ──

function DayDropSlot({ hour, roomId, isCurrentHour, isHoverHour, onClick }) {
  const { setNodeRef } = useDroppable({
    id: `day-slot-${roomId}-${hour}`,
    data: { hour },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.gridSlot} ${isCurrentHour ? styles.currentHourRow : ''} ${isHoverHour ? styles.dragOverSlot : ''}`}
      onClick={onClick}
    />
  );
}

function DayDragEvent({ event, blockStart, top, height, widthStyle, zIndex, isEventActive, lastCreatedEventId, onEventClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `day-evt-${event.id}-b${blockStart}`,
    data: { event },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.eventBlock} ${event.id === lastCreatedEventId ? styles.animatePop : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width: widthStyle,
        left: '4px',
        background: getEventGradient(event.color, event.horaInicio),
        zIndex: isDragging ? 0 : zIndex,
        opacity: isDragging || isEventActive ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
    >
      <div className={styles.eventTitle}>{event.evento}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────

export default function DayView({
  currentDate, events = [], onSlotClick, onEventClick,
  lastCreatedEventId, onPrevDay, onNextDay,
  isFullscreen = false, onToggleFullscreen,
  isExportMode = false, onDragEnd,
}) {
  const touchStartX = React.useRef(null);
  const touchStartY = React.useRef(null);
  const prevDateRef = React.useRef(currentDate);

  const [animClass, setAnimClass] = useState('');
  const [activeEvent, setActiveEvent] = useState(null);
  const [dragOverHour, setDragOverHour] = useState(null);

  // 8 px activation distance preserves click events
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  React.useEffect(() => {
    if (!currentDate || !prevDateRef.current) return;
    const curr = currentDate.getTime();
    const prev = prevDateRef.current.getTime();
    if (curr > prev) setAnimClass(styles.slideLeft);
    else if (curr < prev) setAnimClass(styles.slideRight);
    prevDateRef.current = currentDate;
    const t = setTimeout(() => setAnimClass(''), 350);
    return () => clearTimeout(t);
  }, [currentDate]);

  const minSwipeDistance = 50;
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEndHandler = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > dy && Math.abs(dx) > minSwipeDistance) {
      if (dx > 0 && onNextDay) onNextDay();
      else if (dx < 0 && onPrevDay) onPrevDay();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const dayEvents = useMemo(() => {
    return events.filter(e => {
      const eDate = typeof e.fecha === 'string' ? e.fecha.split('T')[0] : new Date(e.fecha).toISOString().split('T')[0];
      return eDate === format(currentDate, 'yyyy-MM-dd');
    });
  }, [currentDate, events]);

  // Today detection (Sat/Sun → Mon)
  const _rawToday = new Date();
  const _td = _rawToday.getDay();
  if (_td === 6) _rawToday.setDate(_rawToday.getDate() + 2);
  else if (_td === 0) _rawToday.setDate(_rawToday.getDate() + 1);
  const todayStr   = format(_rawToday, 'yyyy-MM-dd');
  const isToday    = format(currentDate, 'yyyy-MM-dd') === todayStr;
  const currentHour = new Date().getHours();

  // Mobile grouping
  const groupedMobileEvents = {};
  dayEvents.forEach(ev => {
    if (!groupedMobileEvents[ev.horaInicio]) groupedMobileEvents[ev.horaInicio] = [];
    groupedMobileEvents[ev.horaInicio].push(ev);
  });
  const sortedMobileHours = Object.keys(groupedMobileEvents).map(Number).sort((a, b) => a - b);

  // ── DnD handlers ────────────────────────────────────
  const handleDragStart = ({ active }) => setActiveEvent(active.data.current.event);

  const handleDragOver = ({ over }) => {
    setDragOverHour(over?.data?.current?.hour ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveEvent(null);
    setDragOverHour(null);
    if (!over || !onDragEnd) return;

    const event    = active.data.current.event;
    const newHour  = over.data.current.hour;
    const duration = event.horaFin - event.horaInicio;

    if (newHour === event.horaInicio) return;
    if (newHour + duration > 21) return; // out of calendar bounds

    onDragEnd({ ...event, horaInicio: newHour, horaFin: newHour + duration });
  };

  const handleDragCancel = () => {
    setActiveEvent(null);
    setDragOverHour(null);
  };
  // ────────────────────────────────────────────────────

  const formatH = (hour) => hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* ── Desktop view ── */}
      <div className={`${styles.calendarWrapper} ${styles.desktopDayView}`}>

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
            const isCurrentHour = !isExportMode && isToday && h === currentHour;
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
          {/* Room headers */}
          <div className={styles.headerRow}>
            {ROOMS.map(room => (
              <div key={`header-${room.id}`} className={styles.roomHeader}>
                {room.name}
                <span className={styles.roomSub}>Capacidad: {room.capacity} asistentes</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className={styles.gridContent}>
            {ROOMS.map((room) => (
              <div key={`col-${room.id}`} className={styles.roomColumn}>

                {/* Drop slots */}
                {HOURS.map(h => (
                  <DayDropSlot
                    key={`slot-${room.id}-${h}`}
                    hour={h}
                    roomId={room.id}
                    isCurrentHour={!isExportMode && isToday && h === currentHour}
                    isHoverHour={dragOverHour === h}
                    onClick={() => onSlotClick?.(h, room.id)}
                  />
                ))}

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

                  const targetBlocks = blocks.filter(b => b.start.toString() === room.id);
                  if (targetBlocks.length === 0) return null;

                  const top    = (event.horaInicio - 7) * 80 + 4;
                  const height = (event.horaFin - event.horaInicio) * 80 - 8;
                  const isEventActive = activeEvent?.id === event.id;

                  return targetBlocks.map(block => (
                    <DayDragEvent
                      key={`${event.id}-block-${block.start}`}
                      event={event}
                      blockStart={block.start}
                      top={top}
                      height={height}
                      widthStyle={`calc(${block.span * 100}% - 8px)`}
                      zIndex={block.span > 1 ? 6 : 5}
                      isEventActive={isEventActive}
                      lastCreatedEventId={lastCreatedEventId}
                      onEventClick={onEventClick}
                    />
                  ));
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile agenda view (no drag) ── */}
      <div
        className={`${styles.mobileDayView} ${animClass}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEndHandler}
      >
        {dayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.35 }} />
            <p style={{ fontWeight: 500, margin: '0 0 4px 0' }}>Día libre</p>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No hay eventos programados</p>
          </div>
        ) : (
          sortedMobileHours.map(hour => {
            const eventsThisHour = [...groupedMobileEvents[hour]].sort((a, b) => {
              return (parseInt(a.salasAsignadas.split(',')[0]) || 0) - (parseInt(b.salasAsignadas.split(',')[0]) || 0);
            });
            return (
              <div key={`mob-${hour}`} className={styles.mobileHourBlock}>
                <div className={styles.mobileTimeDivider}>
                  <div className={styles.mobileTimeLine}></div>
                  <span>{hour}:00</span>
                  <div className={styles.mobileTimeLine}></div>
                </div>
                <div className={styles.mobileEventsList}>
                  {eventsThisHour.map(evt => {
                    const grad = getEventGradient(evt.color, evt.horaInicio);
                    return (
                      <div
                        key={`mob-evt-${evt.id}`}
                        className={`${styles.mobileEventCard} ${evt.id === lastCreatedEventId ? styles.animatePop : ''}`}
                        style={{ '--card-color': grad, '--card-color-solid': SOLID_COLORS[evt.color] || '#ea580c' }}
                        onClick={(e) => { e.stopPropagation(); onEventClick?.(evt); }}
                      >
                        <div className={styles.mobileEventHeader}>
                          <div className={styles.mobileEventTitle}>{evt.evento}</div>
                          <div className={styles.mobileRoomBadge} style={{ background: grad }}>
                            {formatRooms(evt.salasAsignadas).toUpperCase().replace(/\bY\b/g, 'y')}
                          </div>
                        </div>
                        <div className={styles.mobileEventBody}>
                          <div className={styles.mobileEventRow}>
                            <Clock size={16} className={styles.rowIcon} />
                            <span>{evt.horaInicio}:00 - {evt.horaFin}:00 hrs</span>
                          </div>
                          <div className={styles.mobileEventRow}>
                            <User size={16} className={styles.rowIcon} />
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.nombre}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Drag ghost overlay ── */}
      <DragOverlay>
        {activeEvent ? (
          <div style={{
            background: getEventGradient(activeEvent.color, activeEvent.horaInicio),
            height: `${(activeEvent.horaFin - activeEvent.horaInicio) * 80 - 8}px`,
            width: '180px',
            borderRadius: '10px',
            padding: '10px 12px',
            color: 'white',
            opacity: 0.92,
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            cursor: 'grabbing',
            fontSize: '0.85rem',
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
