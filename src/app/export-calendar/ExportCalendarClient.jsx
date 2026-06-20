"use client";
import React, { useEffect } from 'react';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import styles from './export-calendar.module.css';

export default function ExportCalendarClient({
  view,
  dateStr,
  showSubdivisions,
  events,
  formattedDate,
  printedOn,
}) {
  const currentDate = new Date(dateStr + 'T12:00:00');

  useEffect(() => {
    document.body.classList.add('print-mode');

    // Trigger print after a short delay to let the calendar render
    const timer = setTimeout(() => {
      window.print();
    }, 1200);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('print-mode');
    };
  }, []);

  return (
    <div className={styles.printPageContainer}>
      <div className={styles.printHeader}>
        <h1>8A - Gestión de salas</h1>
        <h2>{formattedDate}</h2>
        <span>Impreso el: {printedOn}</span>
      </div>

      <div className={styles.printCalendarWrapper}>
        {view === 'day' ? (
          <DayView
            currentDate={currentDate}
            events={events}
            isExportMode={true}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            events={events}
            showSubdivisions={showSubdivisions}
            isExportMode={true}
          />
        )}
      </div>
    </div>
  );
}
