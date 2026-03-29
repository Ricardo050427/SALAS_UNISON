"use server";

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createEvent(formData) {
  try {
    // 1. Validaciones básicas de horario
    const inicio = parseInt(formData.horaInicio);
    const fin = parseInt(formData.horaFin);
    if (inicio >= fin) {
      return { error: 'La hora de inicio debe ser menor a la hora de fin.' };
    }

    // 2. Lógica de asignación de salas (Manual)
    const pax = parseInt(formData.numAsistentes);
    if (!formData.salasAsignadas) {
      return { error: 'Debe seleccionar al menos una sala.' };
    }
    const salasSolicitadas = formData.salasAsignadas.split(',');

    if (pax > salasSolicitadas.length * 40) {
      return { error: 'Capacidad insuficiente. Cada sala admite un máximo de 40 personas. Asigna más salas.' };
    }

    // Buscamos eventos en la misma fecha
    const fechaDate = new Date(formData.fecha);
    const existingEvents = await prisma.event.findMany({
      where: {
        fecha: fechaDate
      }
    });

    // Verificar cruces de horario
    const overlapEvents = existingEvents.filter(e => {
      // (StartA < EndB) and (EndA > StartB)
      return (inicio < e.horaFin) && (fin > e.horaInicio) && (e.id !== formData.id);
    });

    // Ver disponibilidad de las salas específicas seleccionadas
    let ocupadas = new Set();
    overlapEvents.forEach(e => {
      const salasStr = e.salasAsignadas.split(',');
      salasStr.forEach(s => ocupadas.add(s));
    });

    for (let s of salasSolicitadas) {
      if (ocupadas.has(s)) {
        return { error: `La Sala ${s} ya se encuentra ocupada en ese horario.` };
      }
    }

    const asignadas = salasSolicitadas;

    // Crear el evento en base de datos
    const newEvent = await prisma.event.create({
      data: {
        nombre: formData.nombre,
        evento: formData.evento,
        fecha: fechaDate,
        horaInicio: inicio,
        horaFin: fin,
        numAsistentes: pax,
        salasAsignadas: asignadas.join(','),
        requerimientos: formData.requerimientos,
        notas: formData.notas
      }
    });

    revalidatePath('/'); // Refresca la UI
    return { success: true, event: newEvent };

  } catch (error) {
    console.error(error);
    return { error: 'Error interno al guardar la reserva.' };
  }
}

export async function getEvents() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { horaInicio: 'asc' }
    });
    return { events };
  } catch (error) {
    return { error: 'Error al obtener eventos.' };
  }
}

export async function deleteEvent(id) {
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath('/');
    return { success: true };
  } catch(e) {
    return { error: 'Error al eliminar.' };
  }
}

export async function updateEvent(formData) {
  try {
    const inicio = parseInt(formData.horaInicio);
    const fin = parseInt(formData.horaFin);
    if (inicio >= fin) return { error: 'La hora de inicio debe ser menor a la hora de fin.' };

    const pax = parseInt(formData.numAsistentes);
    if (!formData.salasAsignadas) return { error: 'Debe seleccionar al menos una sala.' };
    const salasSolicitadas = formData.salasAsignadas.split(',');
    
    if (pax > salasSolicitadas.length * 40) {
      return { error: 'Capacidad insuficiente. Cada sala admite un máximo de 40 personas. Asigna más salas.' };
    }

    const fechaDate = new Date(formData.fecha);
    const existingEvents = await prisma.event.findMany({
      where: { fecha: fechaDate }
    });

    // Validar overlap excluyendo a sí mismo
    const overlapEvents = existingEvents.filter(e => {
      return (inicio < e.horaFin) && (fin > e.horaInicio) && (e.id !== formData.id);
    });

    let ocupadas = new Set();
    overlapEvents.forEach(e => {
      e.salasAsignadas.split(',').forEach(s => ocupadas.add(s));
    });

    for (let s of salasSolicitadas) {
      if (ocupadas.has(s)) return { error: `La Sala ${s} ya se encuentra ocupada.` };
    }

    const updatedEvent = await prisma.event.update({
      where: { id: formData.id },
      data: {
        nombre: formData.nombre,
        evento: formData.evento,
        fecha: fechaDate,
        horaInicio: inicio,
        horaFin: fin,
        numAsistentes: pax,
        salasAsignadas: salasSolicitadas.join(','),
        requerimientos: formData.requerimientos,
        notas: formData.notas
      }
    });

    revalidatePath('/');
    return { success: true, event: updatedEvent };
  } catch (error) {
    console.error(error);
    return { error: 'Error al actualizar.' };
  }
}
