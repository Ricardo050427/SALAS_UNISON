"use client";
import React from 'react';
import { Calendar, CalendarCheck, CalendarDays, Download, Settings } from 'lucide-react';
import styles from '../app/page.module.css';

export default function Sidebar({ view, setView, onExport }) {
  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <Calendar size={24} />
        </div>
        <div className={styles.brandText}>
          <h1>Salas Unison</h1>
          <span>Gestión de Espacios</span>
        </div>
      </div>

      {/* Navegación */}
      <nav className={styles.nav}>
        <div className={styles.navTitle}>Vistas de Agenda</div>
        <button 
          className={`${styles.viewBtn} ${view === 'day' ? styles.active : ''}`}
          onClick={() => setView('day')}
        >
          <CalendarDays size={18} />
          Vista Diaria
        </button>
        <button 
          className={`${styles.viewBtn} ${view === 'week' ? styles.active : ''}`}
          onClick={() => setView('week')}
        >
          <CalendarCheck size={18} />
          Vista Semanal
        </button>
      </nav>

      {/* Actions */}
      <div className={styles.actionSection}>
        <button className={styles.exportBtn} onClick={onExport}>
          <Download size={18} />
          Exportar Intendencia
        </button>
      </div>
    </aside>
  );
}
