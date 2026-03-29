import prisma from '@/lib/prisma';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function ExportPage({ searchParams }) {
  const params = await searchParams; // Next.js 15+ needs await, but we handle carefully. Usually it's an object in NextJS 14. We'll use it directly if possible, or support Promise-based.
  const view = params?.view || 'day';
  
  const paramStr = params?.date || format(new Date(), 'yyyy-MM-dd');
  // Eliminamos cualquier 'T...' previo que pudiese venir y nos quedamos con el día
  const cleanDateStr = paramStr.split('T')[0]; 
  
  // Usamos T12:00:00 para operar con date-fns de forma segura en local
  const baseLocalTime = new Date(cleanDateStr + 'T12:00:00');

  let localStart = baseLocalTime;
  let localEnd = baseLocalTime;

  if (view === 'week') {
    localStart = startOfWeek(baseLocalTime, { weekStartsOn: 1 });
    localEnd = endOfWeek(baseLocalTime, { weekStartsOn: 1 });
  }

  // Covertimos de vuelta a string seguro "YYYY-MM-DD"
  const startStr = format(localStart, 'yyyy-MM-dd');
  const endStr = format(localEnd, 'yyyy-MM-dd');

  // Creamos Date objects UTC exactos como los guardó prisma por defecto (UTC Midnight)
  const startDate = new Date(startStr + "T00:00:00.000Z");
  const endDate   = new Date(endStr + "T23:59:59.999Z");

  const events = await prisma.event.findMany({
    where: {
      fecha: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: [
      { fecha: 'asc' },
      { horaInicio: 'asc' }
    ]
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
        <h2>Reporte de Agenda para Intendencia</h2>
        <span>Impreso el: {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '12px' }}>Fecha</th>
            <th style={{ padding: '12px' }}>Horario</th>
            <th style={{ padding: '12px' }}>Sala(s)</th>
            <th style={{ padding: '12px' }}>Evento / Responsable</th>
            <th style={{ padding: '12px' }}>Asistentes</th>
            <th style={{ padding: '12px' }}>Requerimientos y Notas</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan="6" style={{ padding: '12px', textAlign: 'center' }}>No hay eventos programados</td></tr>
          ) : (
            events.map(event => (
              <tr key={event.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{format(new Date(event.fecha), 'EE, d MMM', { locale: es })}</td>
                <td style={{ padding: '12px' }}>{event.horaInicio}:00 - {event.horaFin}:00</td>
                <td style={{ padding: '12px' }}>{event.salasAsignadas}</td>
                <td style={{ padding: '12px' }}>
                  <strong>{event.evento}</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>{event.nombre}</span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{event.numAsistentes}</td>
                <td style={{ padding: '12px' }}>
                  {event.requerimientos.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {event.requerimientos.map(r => <li key={r}>{r}</li>)}
                    </ul>
                  ) : <span style={{ color: '#94a3b8' }}>Sin requerimientos</span>}
                  
                  {event.notas && (
                    <div style={{ marginTop: '8px', padding: '6px', background: '#fef3c7', borderLeft: '3px solid #f59e0b', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <strong style={{ display: 'block', color: '#b45309', marginBottom: '2px' }}>Notas:</strong> 
                      {event.notas}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Auto-print param logic for client script */}
      <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { window.print(); }` }} />
    </div>
  );
}
