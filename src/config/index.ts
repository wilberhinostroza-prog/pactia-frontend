// Configuración centralizada de Pactia
export const CONFIG = {
  // API
  API_URL: 'https://backend-pactia.onrender.com/api',
  // API_URL: 'http://192.168.1.51:3001/api', // Cambia por tu IP
  USE_SUPABASE: false, // ← Cambiar a true cuando esté listo
  
  // Supabase
  SUPABASE_URL: 'https://wvesdeutvzjazmvalweg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_hIUeTuMXMewLWpJ3Xqjwyg_ce1IPGRh',
  
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