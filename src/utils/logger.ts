const isDev = __DEV__;

export const logger = {
  info: (module: string, message: string, data?: any) => {
    if (isDev) {
      console.log(`[${module}] ℹ️ ${message}`, data !== undefined ? data : '');
    }
  },
  
  warn: (module: string, message: string, data?: any) => {
    if (isDev) {
      console.warn(`[${module}] ⚠️ ${message}`, data !== undefined ? data : '');
    }
  },
  
  error: (module: string, message: string, error?: any) => {
    console.error(`[${module}] ❌ ${message}`, error || '');
  },
  
  success: (module: string, message: string, data?: any) => {
    if (isDev) {
      console.log(`[${module}] ✅ ${message}`, data !== undefined ? data : '');
    }
  },
  
  debug: (module: string, message: string, data?: any) => {
    if (isDev) {
      console.debug(`[${module}] 🔍 ${message}`, data !== undefined ? data : '');
    }
  },
  
  api: (method: string, url: string, status?: number, data?: any) => {
    if (isDev) {
      const emoji = status && status >= 400 ? '❌' : '✅';
      console.log(`[API] ${emoji} ${method} ${url}${status ? ` (${status})` : ''}`, data || '');
    }
  },
};