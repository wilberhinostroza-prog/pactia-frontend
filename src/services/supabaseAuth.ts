import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

const MODULE = 'SupabaseAuth';

export interface User {
  id: string;
  email: string;
  phone: string;
  nombres: string;
  dni: string;
  algorandAddress: string;
  profileComplete: boolean;
}

// Registrar usuario
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Crear perfil en la tabla users
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          profile_complete: false,
        });
      
      if (profileError) throw profileError;
    }
    
    return { user: data.user as unknown as User, error: null };
  } catch (error: any) {
    logger.error(MODULE, 'Error en signUp', error);
    return { user: null, error: error.message };
  }
}

// Iniciar sesión (email o teléfono)
export async function signIn(identifier: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    // Detectar si es email o teléfono
    const isEmail = identifier.includes('@');
    
    let email = identifier;
    if (!isEmail) {
      // Buscar email por teléfono
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('phone', identifier)
        .single();
      
      if (!userData) {
        return { user: null, error: 'Usuario no encontrado' };
      }
      email = userData.email;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    return { user: data.user as unknown as User, error: null };
  } catch (error: any) {
    logger.error(MODULE, 'Error en signIn', error);
    return { user: null, error: error.message };
  }
}

// Cerrar sesión
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Obtener usuario actual
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile as User;
}