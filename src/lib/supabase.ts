// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../config';

// Adaptador de SecureStore para Supabase (reemplaza AsyncStorage)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('Error removing item from SecureStore:', error);
    }
  },
};

// Usar las variables de entorno de CONFIG
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseAnonKey = CONFIG.SUPABASE_ANON_KEY;

// LOGS DE DEPURACIÓN - ELIMINAR DESPUÉS DE VERIFICAR
console.log('🔍 Inicializando Supabase...');
console.log('📡 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NO DEFINIDA');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Supabase URL o ANON_KEY no definidas en CONFIG');
  console.error('   URL:', supabaseUrl);
  console.error('   Key:', supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('✅ Supabase cliente creado');