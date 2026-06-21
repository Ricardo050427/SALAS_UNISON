import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfWeek, addDays } from 'date-fns';

function icsEscape(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').replace(/\r/g, '');
}

function toICSLocal(dateStr, hour) {
  const [y, m, d] = dateStr.split('-');
  const hh = String(hour).padStart(2, '0');
  return `${y}${m}${d}T${hh}0000`;
}

function toICSStamp() {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${n.getUTCFullYear()}${pad(n.getUTCMonth()+1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'all';
    const dateStr = searchParams.get('date');

    let events;

    if (view === 'day' && dateStr) {
      const dayStart = new Date(dateStr + 'T00:00:00.000Z');
      const dayEnd   = new Date(dateStr + 'T23:59:59.999Z');
      events = await prisma.event.findMany({
        where: { fecha: { gte: dayStart, lte: dayEnd } },
        orderBy: { horaInicio: 'asc' },
      });
    } else if (view === 'week' && dateStr) {
      const ref = new Date(dateStr + 'T12:00:00');
      const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
      const weekEnd   = addDays(weekStart, 4);
      events = await prisma.event.findMany({
        where: {
          fecha: {
            gte: new Date(weekStart.toISOString().split('T')[0] + 'T00:00:00.000Z'),
            lte: new Date(weekEnd.toISOString().split('T')[0]   + 'T23:59:59.999Z'),
          },
        },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      });
    } else {
      events = await prisma.event.findMany({ orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }] });
    }

    const stamp = toICSStamp();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//8A Gestión de Salas//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:8A Salas',
    ];

    for (const ev of events) {
      const fechaStr = typeof ev.fecha === 'string'
        ? ev.fecha.split('T')[0]
        : new Date(ev.fecha).toISOString().split('T')[0];

      const rooms = ev.salasAsignadas.split(',').map(s => `Sala ${s.trim()}`).join(', ');
      const reqs  = Array.isArray(ev.requerimientos) ? ev.requerimientos.join(', ') : '';
      const descParts = [
        `Solicitante: ${ev.nombre}`,
        `Asistentes: ${ev.numAsistentes}`,
        `Salas: ${rooms}`,
        reqs  ? `Requerimientos: ${reqs}` : null,
        ev.notas ? `Notas: ${ev.notas}` : null,
      ].filter(Boolean);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:8a-salas-${ev.id}@agenda8a`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${toICSLocal(fechaStr, ev.horaInicio)}`);
      lines.push(`DTEND:${toICSLocal(fechaStr, ev.horaFin)}`);
      lines.push(`SUMMARY:${icsEscape(ev.evento)}`);
      lines.push(`ORGANIZER;CN=${icsEscape(ev.nombre)}:MAILTO:noreply@agenda8a`);
      lines.push(`LOCATION:${icsEscape(rooms)}`);
      lines.push(`DESCRIPTION:${icsEscape(descParts.join('\n'))}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="agenda-8a.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('ICS error:', err);
    return NextResponse.json({ error: 'Error generando el calendario' }, { status: 500 });
  }
}
