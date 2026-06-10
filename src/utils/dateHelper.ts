// src/utils/dateHelper.ts

/**
 * Convierte fecha local (DD/MM/YYYY) o (YYYY-MM-DD) a formato YYYY-MM-DD para la BD
 * @param dateString - Fecha en formato DD/MM/YYYY o YYYY-MM-DD
 * @returns Fecha en formato YYYY-MM-DD
 */
export const formatDateForDB = (dateString: string): string => {
  if (!dateString) return '';
  
  // Si ya está en formato YYYY-MM-DD, devolver igual
  if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
    return dateString;
  }
  
  // Si está en formato DD/MM/YYYY, convertir
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // Si es otro formato, intentar crear fecha
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Error parsing date:', dateString);
  }
  
  return '';
};

/**
 * Convierte fecha de BD (YYYY-MM-DD) a formato local DD/MM/YYYY
 * @param dbDate - Fecha en formato YYYY-MM-DD de la BD
 * @returns Fecha en formato DD/MM/YYYY (para mostrar en inputs)
 */
export const formatDateFromDB = (dbDate: string): string => {
  if (!dbDate) return '';
  const [year, month, day] = dbDate.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Formatea timestamp a fecha local según la configuración del dispositivo
 * @param timestamp - Fecha ISO string
 * @param dateOnly - (Opcional) Fecha en formato DATE para mostrar directamente
 * @returns Fecha en formato local del dispositivo
 */
export const formatTimestampToDate = (timestamp: string, dateOnly?: string): string => {
  // Priorizar el campo DATE si existe
  if (dateOnly) {
    return formatDateFromDB(dateOnly);
  }
  if (!timestamp) return '';
  const date = new Date(timestamp);
  // Usar locale del dispositivo, no forzar Perú
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Formatea timestamp a fecha y hora local según configuración del dispositivo
 * @param timestamp - Fecha ISO string
 * @returns Fecha y hora en formato local
 */
export const formatTimestampToDateTime = (timestamp: string): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatea una fecha DATE de BD para mostrar en la UI según configuración del dispositivo
 * @param dbDate - Fecha en formato YYYY-MM-DD
 * @returns Fecha formateada según locale del dispositivo
 */
export const formatDisplayDate = (dbDate: string): string => {
  if (!dbDate) return '';
  const [year, month, day] = dbDate.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};