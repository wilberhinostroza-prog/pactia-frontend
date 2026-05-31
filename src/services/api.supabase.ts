// Este archivo se implementará cuando Supabase esté completamente configurado
// Por ahora es una plantilla vacía

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { User, Contract, Payment } from './api.backend';

const MODULE = 'API.Supabase';

// Re-exportar tipos
export type { User, Contract, Payment };

// Sesión
export async function saveSession(email: string): Promise<void> {
  // Supabase maneja sesión automáticamente
  console.log('Supabase: saveSession', email);
}

export async function getSession(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || null;
}

export async function clearSession(): Promise<void> {
  await supabase.auth.signOut();
}

// TODO: Implementar todas las funciones usando Supabase
// - checkEmail
// - register
// - login
// - completeProfile
// - getProfile
// - findUserByPhone
// - getSubscription
// - upgradeSubscription
// - requestLoan
// - getPendingRequests
// - getSentRequests
// - approveLoan
// - rejectLoan
// - getActiveDebts
// - getActiveLent
// - getAllUserContracts
// - getContractById
// - makePayment
// - confirmPayment
// - getApprovedServicesCount
// - canRequestService
// - verifyContractOnAlgorand