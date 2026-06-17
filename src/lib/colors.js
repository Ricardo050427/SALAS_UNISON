export const COLOR_MAP = {
  naranja: 'linear-gradient(135deg, #f97316, #ea580c)',
  azul: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  verde: 'linear-gradient(135deg, #10b981, #047857)',
  morado: 'linear-gradient(135deg, #8b5cf6, #5b21b6)',
  rosa: 'linear-gradient(135deg, #ec4899, #be185d)',
  amarillo: 'linear-gradient(135deg, #eab308, #ca8a04)'
};

export const COLOR_OPTIONS = [
  { id: 'naranja', value: '#f97316', label: 'Naranja' },
  { id: 'azul', value: '#3b82f6', label: 'Azul' },
  { id: 'verde', value: '#10b981', label: 'Verde' },
  { id: 'morado', value: '#8b5cf6', label: 'Morado' },
  { id: 'rosa', value: '#ec4899', label: 'Rosa' },
  { id: 'amarillo', value: '#eab308', label: 'Amarillo' }
];

export function getEventGradient(colorName, horaInicio) {
  if (colorName && COLOR_MAP[colorName]) {
    return COLOR_MAP[colorName];
  }
  // Fallback a alternancia clásica si no hay color guardado (compatibilidad con registros existentes)
  const isOdd = horaInicio % 2 !== 0;
  return isOdd 
    ? 'linear-gradient(135deg, #ea580c, #9a3412)' 
    : 'linear-gradient(135deg, #2563eb, #1e3a8a)';
}

export function formatRooms(salasStr) {
  if (!salasStr) return '';
  const array = salasStr.toString().split(',').map(s => s.trim()).filter(Boolean).sort();
  if (array.length === 0) return '';
  if (array.length === 1) {
    return `Sala ${array[0]}`;
  } else if (array.length === 2) {
    return `Sala ${array[0]} y ${array[1]}`;
  } else {
    const last = array.pop();
    return `Sala ${array.join(', ')} y ${last}`;
  }
}
