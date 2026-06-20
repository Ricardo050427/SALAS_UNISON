"use client";
import React, { useState } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import EventModal from '@/components/EventModal';
import EventDetailsModal from '@/components/EventDetailsModal';
import ExportModal from '@/components/ExportModal';
import { getEvents, createEvent, deleteEvent, updateEvent } from '@/app/actions';
import styles from './page.module.css';
import { PlusCircle, ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarCheck, Download, Search, AlertTriangle } from 'lucide-react';

export default function Home() {
  const getValidWeekday = (date) => {
    const d = new Date(date);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Sat -> Mon
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sun -> Mon
    return d;
  };

  const [view, setView] = useState('day'); // 'day' | 'week'
  const [currentDate, setCurrentDate] = useState(getValidWeekday(new Date()));
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [lastCreatedEventId, setLastCreatedEventId] = useState(null);
  const [toastError, setToastError] = useState(null);
  const [showSubdivisions, setShowSubdivisions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return events.filter(e =>
      e.evento.toLowerCase().includes(term) ||
      e.nombre.toLowerCase().includes(term)
    );
  }, [searchTerm, events]);

  React.useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const res = await getEvents();
    if (res.events) setEvents(res.events);
  };

  const handleSaveEvent = async (formData) => {
    let res;
    if (formData.id) {
      res = await updateEvent(formData);
    } else {
      res = await createEvent(formData);
    }

    if (res.error) {
      setToastError(res.error);
      setTimeout(() => setToastError(null), 5000);
    } else {
      setLastCreatedEventId(res.event.id);
      setIsModalOpen(false);
      setModalData(null);
      loadEvents(); // Recargar eventos
    }
  };

  const handleDeleteEvent = async (id) => {
    const res = await deleteEvent(id);
    if (res.error) {
      setToastError(res.error);
      setTimeout(() => setToastError(null), 5000);
    } else {
      setSelectedEventDetails(null);
      loadEvents();
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEventDetails(null);
    setModalData(event);
    setIsModalOpen(true);
  };

  const handleExportOption = (option) => {
    const isoDate = format(currentDate, 'yyyy-MM-dd');
    if (option === 'specs') {
      window.open(`/export?view=${view}&date=${isoDate}`, '_blank');
    } else if (option === 'calendar') {
      window.open(`/export-calendar?view=${view}&date=${isoDate}&subdivisions=${showSubdivisions}`, '_blank');
    }
    setIsExportModalOpen(false);
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
      if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() - 2); // Sun -> Fri
      else if (newDate.getDay() === 6) newDate.setDate(newDate.getDate() - 1); // Sat -> Fri
    }
    if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
      if (newDate.getDay() === 6) newDate.setDate(newDate.getDate() + 2); // Sat -> Mon
      else if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() + 1); // Sun -> Mon
    }
    if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  let formattedDate = '';
  if (view === 'day') {
    formattedDate = format(currentDate, "EEEE, d 'de' MMMM", { locale: es });
  } else {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = addDays(start, 4);
    if (start.getMonth() === end.getMonth()) {
      formattedDate = `Semana del ${format(start, 'd')} al ${format(end, "d 'de' MMMM", { locale: es })}`;
    } else {
      formattedDate = `Semana del ${format(start, "d 'de' MMMM", { locale: es })} al ${format(end, "d 'de' MMMM", { locale: es })}`;
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Superior Header */}
        {!isFullscreen && (
          <header className={styles.header}>

            {/* Left: Brand & Date (Combined) */}
            <div className={styles.headerLeft}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--accent-hover), var(--accent-color))', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>8A</h1>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gestión de salas</span>
                </div>
              </div>

              <div style={{ borderLeft: '1px solid var(--surface-border)', height: '40px' }}></div>

              <div className={styles.dateDisplay} style={{ display: 'flex', flexDirection: 'column', maxWidth: '260px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', whiteSpace: 'normal' }}>{formattedDate}</h2>
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{format(currentDate, 'yyyy')}</span>
              </div>
            </div>

            <div className={styles.headerCenter}>
              {/* Search Bar */}
              <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={18} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar evento o solicitante..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />

                {isSearchFocused && searchTerm && (
                  <div className={styles.searchResults}>
                    {searchResults.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        No se encontraron resultados
                      </div>
                    ) : (
                      searchResults.map(event => (
                        <div
                          key={`search-${event.id}`}
                          className={styles.searchResultItem}
                          onClick={() => {
                            setSearchTerm('');
                            setIsSearchFocused(false);
                            setCurrentDate(getValidWeekday(new Date(new Date(event.fecha).getTime() + 12 * 60 * 60 * 1000)));
                            setSelectedEventDetails(event);
                          }}
                        >
                          <span className={styles.searchResultTitle}>{event.evento}</span>
                          <span className={styles.searchResultSub}>
                            {event.nombre} • {format(new Date(new Date(event.fecha).getTime() + 12 * 60 * 60 * 1000), "d MMM", { locale: es })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Center: View Toggles container removed from here to clean up center */}
            </div>

            {/* Right: Actions (Unified 3-column layout) */}
            <div className={styles.headerRight}>

              {/* Column 1: View Selector & Switch */}
              <div className={styles.headerColumn}>
                {/* View Toggles (Segmented control style) */}
                <div className={`${styles.viewTogglesContainer} ${view === 'week' ? styles.viewTogglesWeek : styles.viewTogglesDay}`}>
                  <button
                    onClick={() => setView('day')}
                    className={`${styles.viewToggleBtn} ${view === 'week' ? styles.viewToggleBtnWeek : styles.viewToggleBtnDay} ${view === 'day' ? styles.viewToggleBtnActive : ''}`}
                  >
                    <CalendarDays size={view === 'week' ? 14 : 18} />
                    <span>Vista Diaria</span>
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`${styles.viewToggleBtn} ${view === 'week' ? styles.viewToggleBtnWeek : styles.viewToggleBtnDay} ${view === 'week' ? styles.viewToggleBtnActive : ''}`}
                  >
                    <CalendarCheck size={view === 'week' ? 14 : 18} />
                    <span>Vista Semanal</span>
                  </button>
                </div>

                {/* Subdivisions switch */}
                {view === 'week' && (
                  <div
                    className={styles.switchContainerCompact}
                    onClick={() => setShowSubdivisions(!showSubdivisions)}
                  >
                    <span className={styles.switchLabelTextSmall}>Dividir salas</span>
                    <label className={styles.switchSmall} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={showSubdivisions}
                        onChange={(e) => setShowSubdivisions(e.target.checked)}
                      />
                      <span className={styles.sliderSmall}></span>
                    </label>
                  </div>
                )}
              </div>

              {/* Column 2: Navigation & Export */}
              <div className={styles.headerColumn}>
                {/* Navegación (< Hoy >) - Unified segmented design */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, height: '36px', boxSizing: 'border-box' }}>
                  <button className="btn-icon" onClick={handlePrev} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(0, 0, 0, 0.06)' }}>
                    <ChevronLeft size={14} color="var(--text-secondary)" />
                  </button>
                  <button className="btn-icon" onClick={() => setCurrentDate(getValidWeekday(new Date()))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', padding: '0 12px', height: '100%', fontSize: '0.8rem', borderRight: '1px solid rgba(0, 0, 0, 0.06)' }}>
                    Hoy
                  </button>
                  <button className="btn-icon" onClick={handleNext} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={14} color="var(--text-secondary)" />
                  </button>
                </div>

                {/* Exportar (Popup Modal) */}
                <button onClick={() => setIsExportModalOpen(true)} className={styles.exportBtnHeader}>
                  <Download size={14} /> Exportar
                </button>
              </div>

              {/* Column 3: Nuevo Evento (Spans full height of parent flex container) */}
              <button className={styles.newEventBtn} onClick={() => {
                setModalData({ fecha: format(currentDate, 'yyyy-MM-dd') });
                setIsModalOpen(true);
              }}>
                <PlusCircle size={18} />
                <span>Nuevo Evento</span>
              </button>
            </div>
          </header>
        )}

        {/* Calendar Workspace (Grid injected here) */}
        <div className={styles.workspace} style={{ display: 'flex' }}>
          {view === 'day' ? (
            <DayView
              currentDate={currentDate}
              events={events}
              lastCreatedEventId={lastCreatedEventId}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              onSlotClick={(h, room) => {
                setModalData({
                  horaInicio: h,
                  horaFin: h + 1,
                  salaInicial: room,
                  fecha: format(currentDate, 'yyyy-MM-dd')
                });
                setIsModalOpen(true);
              }}
              onEventClick={(ev) => setSelectedEventDetails(ev)}
              onPrevDay={handlePrev}
              onNextDay={handleNext}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              events={events}
              lastCreatedEventId={lastCreatedEventId}
              showSubdivisions={showSubdivisions}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              onSlotClick={(h, date, roomId) => {
                setModalData({
                  horaInicio: h,
                  horaFin: h + 1,
                  fecha: format(date, 'yyyy-MM-dd'),
                  salaInicial: roomId
                });
                setIsModalOpen(true);
              }}
              onEventClick={(ev) => setSelectedEventDetails(ev)}
            />
          )}
        </div>
      </main>

      {/* Selector de Exportación */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportOption}
      />

      {/* Creación de Reservas */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={modalData}
      />

      <EventDetailsModal
        isOpen={!!selectedEventDetails}
        event={selectedEventDetails}
        onClose={() => setSelectedEventDetails(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Floating Error Toast */}
      {toastError && (
        <div className={styles.toastError}>
          <AlertTriangle size={20} style={{ color: '#ffffff' }} />
          {toastError}
        </div>
      )}
    </div>
  );
}
