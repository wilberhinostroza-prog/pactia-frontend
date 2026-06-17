// Configuración centralizada de Pactia
import Constants from 'expo-constants';

console.log('📱 Constants.extra:', Constants.expoConfig?.extra);

export const CONFIG = {
  // Supabase
  //USE_SUPABASE: true,
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Blockchain
  BLOCKCHAIN: {
    EXPLORER_URL: 'https://lora.algokit.io/testnet/transaction',
    NETWORK: 'testnet',
  },
  
  // App
  APP: {
    NAME: 'Pactia',
    VERSION: '1.0.0',
  },
  
  // Validaciones
  VALIDATIONS: {
    DNI_LENGTH: 8,
    PHONE_LENGTH: 9,
    MIN_PASSWORD_LENGTH: 6,
    MIN_NAME_LENGTH: 3,
  },
  
  // Fechas
  /*DATE_FORMAT: 'YYYY-MM-DD',*/
  DATE_FORMAT: 'DD/MM/YYYY',
  
  // Estados de contrato
  CONTRACT_STATUS: {
    ACTIVE: 'activo',
    PAID: 'pagado',
    EXPIRED: 'vencido',
    PENDING: 'pendiente',
  },
  
  // Tipos de contrato
  CONTRACT_TYPES: {
    LOAN: 'prestamo',
    SERVICE: 'servicio',
  },
};
console.log('🔑 CONFIG.SUPABASE_URL:', CONFIG.SUPABASE_URL);
console.log('🔑 CONFIG.SUPABASE_ANON_KEY:', CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...');