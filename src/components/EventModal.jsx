"use client";
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import styles from './EventModal.module.css';

const REQUERIMIENTOS_OPCIONES = [
  { id: 'coffeebreak', label: 'Coffee Break' },
  { id: 'extensiones', label: 'Extensiones Eléctricas' },
  { id: 'acomodo', label: 'Acomodo Especial (Aula/Herradura)' },
  { id: 'sonido', label: 'Equipo de Sonido' },
  { id: 'videoconferencia', label: 'Videoconferencia' },
];

export default function EventModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    nombre: '',
    evento: '',
    fecha: '',
    horaInicio: 7,
    horaFin: 8,
    numAsistentes: 40,
    requerimientos: [],
    salas: [], // Array de IDs: ['1', '2']
    notas: ''
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        nombre: initialData.nombre || '',
        evento: initialData.evento || '',
        fecha: initialData.fecha ? (typeof initialData.fecha === 'string' ? initialData.fecha.split('T')[0] : initialData.fecha.toISOString().split('T')[0]) : '',
        horaInicio: initialData.horaInicio || 7,
        horaFin: initialData.horaFin || 8,
        numAsistentes: initialData.numAsistentes || 40,
        requerimientos: initialData.requerimientos || [],
        salas: initialData.salasAsignadas ? initialData.salasAsignadas.split(',') : (initialData.salaInicial ? [initialData.salaInicial] : []),
        notas: initialData.notas || '',
        id: initialData.id
      });
    } else if (isOpen) {
      // Reset default
      setFormData({ nombre: '', evento: '', fecha: '', horaInicio: 7, horaFin: 8, numAsistentes: 40, requerimientos: [], salas: [], notas: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (id) => {
    setFormData(prev => {
      const isSelected = prev.requerimientos.includes(id);
      if (isSelected) {
        return { ...prev, requerimientos: prev.requerimientos.filter(req => req !== id) };
      } else {
        return { ...prev, requerimientos: [...prev.requerimientos, id] };
      }
    });
  };

  const toggleRoom = (id) => {
    setFormData(prev => {
      const isSelected = prev.salas.includes(id);
      return isSelected
        ? { ...prev, salas: prev.salas.filter(s => s !== id) }
        : { ...prev, salas: [...prev.salas, id] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.salas.length === 0) {
      alert("Debes seleccionar al menos una sala.");
      return;
    }
    // Convert current salas array back to string for the API format matching schema
    const payload = { ...formData, salasAsignadas: formData.salas.sort().join(',') };
    onSave(payload);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>

        <div className={styles.header}>
          <h2>{initialData?.id ? 'Editar Reserva' : 'Nueva Reserva de Sala'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={28} />
          </button>
        </div>

        <div className={styles.body}>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Nombre del Solicitante</label>
              <input required type="text" name="nombre" className={styles.input} value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan Pérez" />
            </div>
            <div className={styles.formGroup}>
              <label>Nombre del Evento</label>
              <input required type="text" name="evento" className={styles.input} value={formData.evento} onChange={handleChange} placeholder="Ej. Capacitación" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Fecha</label>
              <input required type="date" name="fecha" className={styles.input} value={formData.fecha} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>No. de Asistentes</label>
              <input required type="number" min="1" max="120" name="numAsistentes" className={styles.input} value={formData.numAsistentes} onChange={handleChange}
                title="Máximo 120 personas (3 salas combinadas)" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Hora Inicio (7-20)</label>
              <select name="horaInicio" className={styles.input} value={formData.horaInicio} onChange={handleChange}>
                {Array.from({ length: 14 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Hora Fin (8-21)</label>
              <select name="horaFin" className={styles.input} value={formData.horaFin} onChange={handleChange}>
                {Array.from({ length: 14 }, (_, i) => i + 8).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup} style={{ flex: 1.5 }}>
              <label>Salas a Reservar</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {['1', '2', '3'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleRoom(s)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--accent-color)', cursor: 'pointer',
                      background: formData.salas.includes(s) ? 'var(--accent-color)' : 'transparent',
                      color: formData.salas.includes(s) ? 'white' : 'var(--accent-color)',
                      fontWeight: 600
                    }}
                  >
                    Sala {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Requerimientos y Equipo</label>
            <div className={styles.reqGrid}>
              {REQUERIMIENTOS_OPCIONES.map(req => (
                <label key={req.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.requerimientos.includes(req.id)}
                    onChange={() => handleCheckbox(req.id)}
                  />
                  {req.label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '0.8rem' }}>
            <label>Notas para Intendencia</label>
            <textarea
              name="notas"
              className={styles.input}
              value={formData.notas}
              onChange={handleChange}
              placeholder="Ej. Favor de acomodar las sillas en herradura..."
              rows={2}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} />
            Guardar Evento
          </button>
        </div>

      </form>
    </div>
  );
}
