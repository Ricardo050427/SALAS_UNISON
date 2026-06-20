"use client";
import React from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import styles from './ExportModal.module.css';

export default function ExportModal({ isOpen, onClose, onExport }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Exportar Agenda</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.infoText}>
            Selecciona el formato de exportación preferido para la vista actual:
          </p>

          <div className={styles.exportOptions}>
            <button 
              className={styles.optionButton} 
              onClick={() => onExport('calendar')}
            >
              <div className={styles.optionIconContainer} style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' }}>
                <Calendar size={28} />
              </div>
              <div className={styles.optionContent}>
                <h3>Exportar calendario</h3>
                <p>Genera una vista visual completa de la distribución de eventos en formato cuadrícula.</p>
              </div>
            </button>

            <button 
              className={styles.optionButton} 
              onClick={() => onExport('specs')}
            >
              <div className={styles.optionIconContainer} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                <FileText size={28} />
              </div>
              <div className={styles.optionContent}>
                <h3>Exportar especificaciones</h3>
                <p>Genera un reporte detallado en formato tabla con requerimientos, notas y asistentes.</p>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
