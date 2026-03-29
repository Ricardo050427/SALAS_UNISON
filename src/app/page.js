"use client";
import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import EventModal from '@/components/EventModal';
import EventDetailsModal from '@/components/EventDetailsModal';
import { getEvents, createEvent, deleteEvent, updateEvent } from '@/app/actions';
import styles from './page.module.css';
import { PlusCircle, ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarCheck, Download, Search } from 'lucide-react';

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
      alert(res.error);
    } else {
      setLastCreatedEventId(res.event.id);
      setIsModalOpen(false);
      setModalData(null);
      loadEvents(); // Recargar eventos
    }
  };
  
  const handleDeleteEvent = async (id) => {
    const res = await deleteEvent(id);
    if(res.error) alert(res.error);
    else {
      setSelectedEventDetails(null);
      loadEvents();
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEventDetails(null);
    setModalData(event);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const isoDate = format(currentDate, 'yyyy-MM-dd');
    window.open(`/export?view=${view}&date=${isoDate}`, '_blank');
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

  const formattedDate = format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : "'Semana del' d", { locale: es });

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Superior Header */}
        <header className={styles.header}>
          
          {/* Left: Brand & Date (Combined) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
            
            <div className={styles.dateDisplay}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{formattedDate}</h2>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{format(currentDate, 'yyyy')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1, paddingLeft: '2rem' }}>
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

            {/* Center: View Toggles */}
            <div style={{ display: 'flex', background: 'var(--surface-color)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)', gap: '4px' }}>
              <button 
                onClick={() => setView('day')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: view === 'day' ? 'var(--accent-color)' : 'transparent', color: view === 'day' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
              >
                <CalendarDays size={18} /> Vista Diaria
              </button>
              <button 
                onClick={() => setView('week')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: view === 'week' ? 'var(--accent-color)' : 'transparent', color: view === 'week' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
              >
                <CalendarCheck size={18} /> Vista Semanal
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className={styles.headerActions} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }}>
              <Download size={18} /> Exportar
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--surface-color)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)' }}>
              <button className="btn-icon" onClick={handlePrev} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={20} color="var(--text-secondary)" />
              </button>
              <button className="btn-icon" onClick={() => setCurrentDate(getValidWeekday(new Date()))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)', padding: '0 8px'}}>
                Hoy
              </button>
              <button className="btn-icon" onClick={handleNext} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <button className="btn-primary" onClick={() => { setModalData(null); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--accent-color)', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}>
              <PlusCircle size={18} />
              Nuevo Evento
            </button>
          </div>
        </header>

        {/* Calendar Workspace (Grid injected here) */}
        <div className={styles.workspace} style={{ display: 'flex' }}>
          {view === 'day' ? (
            <DayView 
              currentDate={currentDate} 
              events={events} 
              lastCreatedEventId={lastCreatedEventId}
              onSlotClick={(h, room) => {
                setModalData({ 
                  horaInicio: h, 
                  horaFin: h + 1, 
                  salaInicial: room,
                  fecha: currentDate.toISOString().split('T')[0] 
                });
                setIsModalOpen(true);
              }}
              onEventClick={(ev) => setSelectedEventDetails(ev)}
            />
          ) : (
            <WeekView 
              currentDate={currentDate} 
              events={events} 
              lastCreatedEventId={lastCreatedEventId}
              onSlotClick={(h, date) => {
                setModalData({ horaInicio: h, horaFin: h + 1, fecha: date.toISOString().split('T')[0] });
                setIsModalOpen(true);
              }}
              onEventClick={(ev) => setSelectedEventDetails(ev)}
            />
          )}
        </div>
      </main>

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
    </div>
  );
}
