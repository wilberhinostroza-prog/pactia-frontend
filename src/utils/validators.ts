import { CONFIG } from '../config';

export const validators = {
  // Email
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  // DNI Perú (8 dígitos)
  dni: (dni: string): boolean => {
    const cleanDni = dni.replace(/\D/g, '');
    return /^\d{8}$/.test(cleanDni);
  },
  
  // Teléfono Perú (9 dígitos)
  phone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return /^\d{9}$/.test(cleanPhone);
  },
  
  /*// Contraseña
  password: (password: string): boolean => {
    return password.length >= CONFIG.VALIDATIONS.MIN_PASSWORD_LENGTH;
  },*/

  // Validación de contraseña fuerte
password: (password: string): boolean => {
  // Mínimo 8 caracteres, al menos una mayúscula, un número y un carácter especial
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
},

// Mensaje de error para contraseña
getPasswordRequirements: (): string => {
  return 'Debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (@$!%*?&)';
},
  
 /* // Fecha formato YYYY-MM-DD
  date: (date: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  },*/

  // Validar fecha real YYYY-MM-DD
  date: (date: string): boolean => {
  // Validar formato primero
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);

  // Crear fecha UTC
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  // Verificar que la fecha exista realmente
  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() + 1 === month &&
    parsedDate.getUTCDate() === day
  );
},
  
  // Monto positivo
  amount: (amount: number): boolean => {
    return amount > 0;
  },
  
  // Nombre no vacío
  name: (name: string): boolean => {
    return name.trim().length >= CONFIG.VALIDATIONS.MIN_NAME_LENGTH;
  },
};

export const normalizers = {
  // Limpiar email
  email: (email: string): string => {
    return email.trim().toLowerCase();
  },
  
  // Capitalizar nombre
  name: (name: string): string => {
    return name.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },
  
  // Limpiar DNI (solo números)
  dni: (dni: string): string => {
    return dni.replace(/\D/g, '');
  },
  
  // Limpiar teléfono (solo números)
  phone: (phone: string): string => {
    return phone.replace(/\D/g, '');
  },
  
  // Formatear monto a soles
 // Formatear monto a soles con separadores de miles y decimales
  currency: (amount: number): string => {
  // Formato: S/ 1,234.56 (comas para miles, punto para decimales)
  return `S/ ${amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
},
  
  // Formatear fecha
  date: (date: string): string => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  },
};