import prisma from '@/lib/prisma';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ExportCalendarClient from './ExportCalendarClient';

export const dynamic = 'force-dynamic';

export default async function ExportCalendarPage({ searchParams }) {
  const params = await searchParams;
  const view = params?.view || 'day';
  const dateStr = (params?.date || format(new Date(), 'yyyy-MM-dd')).split('T')[0];
  const showSubdivisions = params?.subdivisions === 'true';

  // Fetch events from DB on the server
  let events = [];
  try {
    events = await prisma.event.findMany({
      orderBy: { horaInicio: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching events for calendar export:', error);
  }

  // Build formatted date string server-side
  const currentDate = new Date(dateStr + 'T12:00:00');
  let formattedDate = '';
  if (view === 'day') {
    formattedDate = format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } else {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = addDays(start, 4);
    if (start.getMonth() === end.getMonth()) {
      formattedDate = `Semana del ${format(start, 'd')} al ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    } else {
      formattedDate = `Semana del ${format(start, "d 'de' MMMM", { locale: es })} al ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
    }
  }

  const printedOn = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  return (
    <ExportCalendarClient
      view={view}
      dateStr={dateStr}
      showSubdivisions={showSubdivisions}
      events={events}
      formattedDate={formattedDate}
      printedOn={printedOn}
    />
  );
}
