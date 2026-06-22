"use client";
import React, { useMemo, useState } from 'react';
import styles from './Calendar.module.css';
import { format } from 'date-fns';
import { getEventGradient, formatRooms } from '@/lib/colors';
import useDragEnabled from '@/lib/useDragEnabled';
import { Maximize2, Minimize2, Clock, User, Calendar } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const NO_SENSORS = []; // stable identity: drag disabled on touch / small screens
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

function DayDropSlot({ hour, roomId, isCurrentHour, onClick }) {
  // Kept droppable so dnd-kit has a target, but the dashed highlight now comes
  // from a footprint preview rendered at grid level (see `preview`).
  const { setNodeRef } = useDroppable({
    id: `day-slot-${roomId}-${hour}`,
    data: { hour, roomId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.gridSlot} ${isCurrentHour ? styles.currentHourRow : ''}`}
      onClick={onClick}
    />
  );
}

function DayDragEvent({ event, blockStart, span, top, height, widthStyle, zIndex, isEventActive, lastCreatedEventId, onEventClick, onRegister }) {
  const dragId = `day-evt-${event.id}-b${blockStart}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { event, blockStart, span },
  });
  const combinedRef = React.useCallback((node) => {
    setNodeRef(node);
    onRegister?.(dragId, node);
  }, [setNodeRef, dragId, onRegister]);
  return (
    <div
      ref={combinedRef}
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
  const [activeDimensions, setActiveDimensions] = useState({ width: 180, height: 72 });
  const [preview, setPreview] = useState(null); // footprint preview of where the event will land

  const dragNodeMap = React.useRef(new Map());
  const registerDragNode = React.useCallback((id, node) => {
    if (node) dragNodeMap.current.set(id, node);
    else dragNodeMap.current.delete(id);
  }, []);

  // Grid DOM node + live pointer position. We compute the drop room/hour from
  // raw pointer coordinates (not @dnd-kit collision), because that has proven
  // unreliable. A document-level capture-phase listener guarantees we always
  // know exactly where the cursor is at drop time.
  const gridRef = React.useRef(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });
  const moveListenerRef = React.useRef(null);
  const activeBlockRef = React.useRef(null); // { blockStart, span, duration, eventRooms }

  // Snap the pointer to a target cell, mirroring exactly what the drop will do.
  // Returns { hour, startRoom, span, newSalas } or null when the drop is invalid.
  const computeTarget = () => {
    const grid = gridRef.current;
    const blk = activeBlockRef.current;
    if (!grid || !blk) return null;
    const rect = grid.getBoundingClientRect();
    const { x, y } = pointerRef.current;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

    const colWidth = rect.width / ROOMS.length;
    const newRoom = Math.min(Math.max(Math.floor((x - rect.left) / colWidth), 0), ROOMS.length - 1) + 1;
    const hour = Math.min(Math.max(7 + Math.floor((y - rect.top) / 80), 7), 20);
    if (hour + blk.duration > 21) return null;

    const shift = newRoom - blk.blockStart;
    const shifted = blk.eventRooms.map(r => r + shift);
    if (shifted.some(r => r < 1 || r > 3)) return null;

    return {
      hour,
      startRoom: newRoom,
      span: blk.span,
      newSalas: [...shifted].sort((a, b) => a - b).join(','),
    };
  };

  const refreshPreview = () => {
    const t = computeTarget();
    setPreview(prev => {
      if (!t) return prev ? null : prev;
      if (prev && prev.hour === t.hour && prev.startRoom === t.startRoom && prev.span === t.span) return prev;
      return { hour: t.hour, startRoom: t.startRoom, span: t.span, duration: activeBlockRef.current.duration };
    });
  };

  const onDragPointerMove = (e) => {
    pointerRef.current = { x: e.clientX, y: e.clientY };
    refreshPreview();
  };

  const stopTrackingPointer = () => {
    if (moveListenerRef.current) {
      document.removeEventListener('pointermove', moveListenerRef.current, true);
      moveListenerRef.current = null;
    }
  };

  // 8 px activation distance preserves click events
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const dragEnabled = useDragEnabled(); // desktop only — see hook

  // Safety: drop the global listener if we unmount mid-drag
  React.useEffect(() => stopTrackingPointer, []);

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
  const handleDragStart = ({ active }) => {
    const { event, blockStart, span } = active.data.current;
    setActiveEvent(event);
    // active.rect.current.initial is populated asynchronously (after onDragStart fires),
    // so we measure the DOM node directly via our own ref map.
    const node = dragNodeMap.current.get(active.id);
    if (node) {
      const rect = node.getBoundingClientRect();
      setActiveDimensions({ width: rect.width, height: rect.height });
    }
    activeBlockRef.current = {
      blockStart,
      span,
      duration: event.horaFin - event.horaInicio,
      eventRooms: event.salasAsignadas.split(',').map(Number),
    };
    // Seed pointer from the activator event, paint an initial preview, then track globally.
    const act = active?.activatorEvent;
    if (act && typeof act.clientX === 'number') pointerRef.current = { x: act.clientX, y: act.clientY };
    refreshPreview();
    moveListenerRef.current = onDragPointerMove;
    document.addEventListener('pointermove', onDragPointerMove, true); // capture phase: always fires
  };

  const handleDragEnd = ({ active }) => {
    stopTrackingPointer();
    const target = computeTarget();
    const event = active.data.current.event;
    activeBlockRef.current = null;
    setActiveEvent(null);
    setPreview(null);
    if (!onDragEnd || !target) return;

    const duration = event.horaFin - event.horaInicio;
    const currentSalas = [...event.salasAsignadas.split(',').map(Number)].sort((a, b) => a - b).join(',');
    if (target.hour === event.horaInicio && target.newSalas === currentSalas) return;

    onDragEnd({ ...event, horaInicio: target.hour, horaFin: target.hour + duration, salasAsignadas: target.newSalas });
  };

  const handleDragCancel = () => {
    stopTrackingPointer();
    activeBlockRef.current = null;
    setActiveEvent(null);
    setPreview(null);
  };
  // ────────────────────────────────────────────────────

  const formatH = (hour) => hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

  return (
    <DndContext
      sensors={dragEnabled ? sensors : NO_SENSORS}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
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
          <div className={styles.gridContent} ref={gridRef}>
            {ROOMS.map((room) => (
              <div key={`col-${room.id}`} className={styles.roomColumn}>

                {/* Drop slots */}
                {HOURS.map(h => (
                  <DayDropSlot
                    key={`slot-${room.id}-${h}`}
                    hour={h}
                    roomId={room.id}
                    isCurrentHour={!isExportMode && isToday && h === currentHour}
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
                      span={block.span}
                      top={top}
                      height={height}
                      widthStyle={`calc(${block.span * 100}% - 8px)`}
                      zIndex={block.span > 1 ? 6 : 5}
                      isEventActive={isEventActive}
                      lastCreatedEventId={lastCreatedEventId}
                      onEventClick={onEventClick}
                      onRegister={registerDragNode}
                    />
                  ));
                })}
              </div>
            ))}

            {/* Footprint preview: same size as the event being dragged */}
            {preview && (
              <div
                className={styles.dropPreview}
                style={{
                  top: `${(preview.hour - 7) * 80 + 4}px`,
                  height: `${preview.duration * 80 - 8}px`,
                  left: `calc(${((preview.startRoom - 1) / ROOMS.length) * 100}% + 4px)`,
                  width: `calc(${(preview.span / ROOMS.length) * 100}% - 8px)`,
                }}
              />
            )}
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
