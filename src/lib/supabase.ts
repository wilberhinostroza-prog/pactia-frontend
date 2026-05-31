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

const supabaseUrl = CONFIG.SUPABASE_URL || 'https://wvesdeutvzjazmvalweg.supabase.co';
const supabaseAnonKey = CONFIG.SUPABASE_ANON_KEY || 'sb_publishable_hIUeTuMXMewLWpJ3Xqjwyg_ce1IPGRh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});