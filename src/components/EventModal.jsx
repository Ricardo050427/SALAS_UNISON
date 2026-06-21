"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import styles from './EventModal.module.css';
import { COLOR_OPTIONS } from '@/lib/colors';

const REQUERIMIENTOS_OPCIONES = [
  { id: 'coffeebreak',    label: 'Coffee Break' },
  { id: 'extensiones',   label: 'Extensiones Eléctricas' },
  { id: 'acomodo',       label: 'Acomodo Especial (Aula/Herradura)' },
  { id: 'sonido',        label: 'Equipo de Sonido' },
  { id: 'videoconferencia', label: 'Videoconferencia' },
];

export default function EventModal({ isOpen, onClose, onSave, initialData, events = [] }) {
  const [formData, setFormData] = useState({
    nombre: '', evento: '', fecha: '',
    horaInicio: 7, horaFin: 8,
    numAsistentes: '', requerimientos: [],
    salas: [], notas: '', color: '',
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        nombre:        initialData.nombre || '',
        evento:        initialData.evento || '',
        fecha:         initialData.fecha
          ? (typeof initialData.fecha === 'string'
              ? initialData.fecha.split('T')[0]
              : initialData.fecha.toISOString().split('T')[0])
          : '',
        horaInicio:    initialData.horaInicio || 7,
        horaFin:       initialData.horaFin    || 8,
        numAsistentes: initialData.numAsistentes || '',
        requerimientos: initialData.requerimientos || [],
        salas: initialData.salasAsignadas
          ? initialData.salasAsignadas.split(',')
          : (initialData.salaInicial ? [initialData.salaInicial] : []),
        notas:  initialData.notas  || '',
        color:  initialData.color  || '',
        id:     initialData.id,
      });
    } else if (isOpen) {
      setFormData({ nombre: '', evento: '', fecha: '', horaInicio: 7, horaFin: 8, numAsistentes: '', requerimientos: [], salas: [], notas: '', color: '' });
    }
  }, [initialData, isOpen]);

  // ── Disponibilidad en tiempo real ──────────────────────
  const occupiedRooms = useMemo(() => {
    if (!formData.fecha || !events.length) return new Set();
    const inicio = parseInt(formData.horaInicio);
    const fin    = parseInt(formData.horaFin);
    // No bloquear nada si el rango es inválido (evita confundir al usuario)
    if (inicio >= fin) return new Set();

    const occupied = new Set();
    events.forEach(ev => {
      // Al editar: excluir el propio evento
      if (formData.id && ev.id === formData.id) return;

      // Normalizar fecha a YYYY-MM-DD
      const evDate = typeof ev.fecha === 'string'
        ? ev.fecha.split('T')[0]
        : new Date(ev.fecha).toISOString().split('T')[0];
      if (evDate !== formData.fecha) return;

      // Overlap: (startA < endB) && (endA > startB)
      if (inicio < ev.horaFin && fin > ev.horaInicio) {
        ev.salasAsignadas.split(',').forEach(s => occupied.add(s.trim()));
      }
    });
    return occupied;
  }, [formData.fecha, formData.horaInicio, formData.horaFin, formData.id, events]);

  // Auto-deseleccionar salas que queden ocupadas al cambiar fecha/hora
  useEffect(() => {
    if (occupiedRooms.size === 0) return;
    setFormData(prev => {
      const newSalas = prev.salas.filter(s => !occupiedRooms.has(s));
      if (newSalas.length === prev.salas.length) return prev;
      return { ...prev, salas: newSalas };
    });
  }, [occupiedRooms]);
  // ──────────────────────────────────────────────────────

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (id) => {
    setFormData(prev => {
      const isSelected = prev.requerimientos.includes(id);
      return isSelected
        ? { ...prev, requerimientos: prev.requerimientos.filter(r => r !== id) }
        : { ...prev, requerimientos: [...prev.requerimientos, id] };
    });
  };

  const toggleRoom = (id) => {
    if (occupiedRooms.has(id)) return; // sala ocupada, no se puede seleccionar
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
      alert('Debes seleccionar al menos una sala.');
      return;
    }
    let selectedColor = formData.color;
    if (!selectedColor) {
      const colors = COLOR_OPTIONS.map(opt => opt.id);
      selectedColor = colors[Math.floor(Math.random() * colors.length)];
    }
    const payload = { ...formData, color: selectedColor, salasAsignadas: formData.salas.sort().join(',') };
    onSave(payload);
  };

  const hasDate     = !!formData.fecha;
  const validRange  = parseInt(formData.horaInicio) < parseInt(formData.horaFin);
  const showStatus  = hasDate && validRange;

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
              <input required type="number" min="1" max="120" name="numAsistentes" className={styles.input}
                value={formData.numAsistentes} onChange={handleChange}
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
                {['1', '2', '3'].map(s => {
                  const isOccupied = showStatus && occupiedRooms.has(s);
                  const isSelected = formData.salas.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleRoom(s)}
                      className={`${styles.roomBtn} ${isOccupied ? styles.roomBtnOccupied : isSelected ? styles.roomBtnSelected : ''}`}
                    >
                      <span>Sala {s}</span>
                      {/* Always rendered to reserve height — invisible when not occupied */}
                      <span className={styles.roomBtnOccupiedLabel} style={{ visibility: isOccupied ? 'visible' : 'hidden' }}>
                        Ocupada
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Requerimientos y Equipo</label>
            <div className={styles.reqGrid}>
              {REQUERIMIENTOS_OPCIONES.map(req => (
                <label key={req.id} className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formData.requerimientos.includes(req.id)} onChange={() => handleCheckbox(req.id)} />
                  {req.label}
                </label>
              ))}
            </div>
          </div>

          <div className={`${styles.formGroup} ${styles.colorSelectorGroup}`}>
            <label>Color</label>
            <div className={styles.colorSelector}>
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.colorCircle} ${formData.color === opt.id ? styles.selectedColor : ''}`}
                  style={{ backgroundColor: opt.value }}
                  onClick={() => setFormData(prev => ({ ...prev, color: opt.id }))}
                  title={opt.label}
                />
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
