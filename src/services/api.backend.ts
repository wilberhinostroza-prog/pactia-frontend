import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

const API_URL = CONFIG.API_URL;
const MODULE = 'API.Backend';

// ==================== TIPOS ====================
export interface User {
  email: string;
  phone: string;
  algorandAddress: string;
  profileComplete: boolean;
  nombres?: string;
  dni?: string;
}

export interface Contract {
  id: string;
  type: 'prestamo' | 'servicio';
  debtorPhone: string;
  debtorName?: string;
  creditorPhone: string;
  creditorName?: string;
  requestedAmount: number;
  proposedDueDate: string;
  description: string;
  status: 'solicitado' | 'aceptado' | 'activo' | 'pagado' | 'rechazado';
  approvedAmount?: number;
  approvedDueDate?: string;
  remainingAmount?: number;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    type: 'parcial' | 'total';
    notes?: string;
    proofUri?: string;
    proofFileName?: string;
    confirmed: boolean;
    confirmedAt?: string;
  }>;
  createdAt: string;
  completedAt?: string;
  algorandTxId?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  type: 'parcial' | 'total';
  notes?: string;
  proofUri?: string;
  proofFileName?: string;
  confirmed: boolean;
  confirmedAt?: string;
}

// ==================== SESIÓN ====================
export async function saveSession(email: string): Promise<void> {
  await SecureStore.setItemAsync('Pactia_userEmail', email);
}

export async function getSession(): Promise<string | null> {
  return await SecureStore.getItemAsync('Pactia_userEmail');
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync('Pactia_userEmail');
}

// ==================== AUTENTICACIÓN ====================
export async function checkEmail(email: string): Promise<boolean> {
  logger.info(MODULE, 'Verificando email', { email });
  try {
    const res = await fetch(`${API_URL}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    logger.success(MODULE, 'Email verificado', { exists: data.exists });
    return data.exists;
  } catch (error) {
    logger.error(MODULE, 'Error verificando email', error);
    throw error;
  }
}

export async function register(email: string, password: string): Promise<User> {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await saveSession(email);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error registrando', error);
    throw error;
  }
}

export async function login(identifier: string, password: string): Promise<User> {
  logger.info(MODULE, 'Iniciando sesión', { identifier });
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await saveSession(data.email);
    logger.success(MODULE, 'Sesión iniciada', { email: data.email });
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error en login', error);
    throw error;
  }
}

export async function completeProfile(email: string, nombres: string, dni: string, phone: string): Promise<void> {
  logger.info(MODULE, 'Completando perfil', { email });
  try {
    const res = await fetch(`${API_URL}/auth/complete-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombres, dni, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    logger.success(MODULE, 'Perfil completado', { email });
  } catch (error) {
    logger.error(MODULE, 'Error completando perfil', error);
    throw error;
  }
}

export async function getProfile(email: string): Promise<User> {
  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo perfil', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User> {
  return getProfile(email);
}

export async function findUserByPhone(phone: string): Promise<{ success: boolean; email: string; phone: string; nombres?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/find-by-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error buscando por teléfono', error);
    throw error;
  }
}

export async function getSubscription(email: string): Promise<{ active: boolean; plan: string; expiresAt?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.subscription;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo suscripción', error);
    return { active: false, plan: 'free' };
  }
}

export async function upgradeSubscription(email: string, plan: 'monthly' | 'yearly'): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/auth/upgrade-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plan }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  } catch (error) {
    logger.error(MODULE, 'Error actualizando suscripción', error);
    throw error;
  }
}

// ==================== CONTRATOS ====================
export async function requestLoan(
  type: 'prestamo' | 'servicio',
  debtorPhone: string,
  creditorPhone: string,
  requestedAmount: number,
  proposedDueDate: string,
  description: string
): Promise<Contract> {
  try {
    const res = await fetch(`${API_URL}/loans/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, debtorPhone, creditorPhone, requestedAmount, proposedDueDate, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contract;
  } catch (error) {
    logger.error(MODULE, 'Error creando solicitud', error);
    throw error;
  }
}

export async function getPendingRequests(creditorPhone: string): Promise<Contract[]> {
  try {
    const res = await fetch(`${API_URL}/loans/pending-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditorPhone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.requests;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo solicitudes', error);
    return [];
  }
}

export async function getSentRequests(phone: string): Promise<Contract[]> {
  try {
    const res = await fetch(`${API_URL}/loans/sent-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.requests;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo solicitudes enviadas', error);
    return [];
  }
}

export async function approveLoan(
  contractId: string,
  approvedAmount: number,
  approvedDueDate: string,
  depositProofUri?: string,
  depositProofFileName?: string
): Promise<Contract> {
  try {
    const res = await fetch(`${API_URL}/loans/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, approvedAmount, approvedDueDate, depositProofUri, depositProofFileName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contract;
  } catch (error) {
    logger.error(MODULE, 'Error aprobando solicitud', error);
    throw error;
  }
}

export async function rejectLoan(contractId: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/loans/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  } catch (error) {
    logger.error(MODULE, 'Error rechazando solicitud', error);
    throw error;
  }
}

export async function getActiveDebts(debtorPhone: string): Promise<Contract[]> {
  try {
    const res = await fetch(`${API_URL}/loans/active-debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debtorPhone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.loans;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo deudas activas', error);
    return [];
  }
}

export async function getActiveLent(phone: string): Promise<Contract[]> {
  try {
    const res = await fetch(`${API_URL}/loans/active-lent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.loans;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo préstamos activos como acreedor', error);
    return [];
  }
}

export async function getAllUserContracts(phone: string): Promise<Contract[]> {
  try {
    const res = await fetch(`${API_URL}/loans/all-contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contracts;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo todos los contratos', error);
    return [];
  }
}

export async function getContractById(contractId: string): Promise<Contract> {
  try {
    const res = await fetch(`${API_URL}/contracts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contract;
  } catch (error) {
    logger.error(MODULE, 'Error obteniendo contrato', error);
    throw error;
  }
}

export async function makePayment(
  contractId: string,
  amount: number,
  proofUri?: string,
  proofFileName?: string
): Promise<Contract> {
  try {
    const res = await fetch(`${API_URL}/loans/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, amount, proofUri, proofFileName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contract;
  } catch (error) {
    logger.error(MODULE, 'Error realizando pago', error);
    throw error;
  }
}

export async function confirmPayment(contractId: string, paymentId: string, creditorPhone: string): Promise<Contract> {
  try {
    const res = await fetch(`${API_URL}/loans/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, paymentId, creditorPhone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.contract;
  } catch (error) {
    logger.error(MODULE, 'Error confirmando pago', error);
    throw error;
  }
}

export async function getApprovedServicesCount(phone: string): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/loans/approved-services-count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.count;
  } catch (error) {
    logger.error(MODULE, 'Error contando servicios aprobados', error);
    return 0;
  }
}

export async function canRequestService(phone: string): Promise<{ canRequest: boolean; currentCount: number; limit: number }> {
  try {
    const res = await fetch(`${API_URL}/loans/can-request-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error verificando límite de servicios', error);
    return { canRequest: true, currentCount: 0, limit: 4 };
  }
}

export async function verifyContractOnAlgorand(contractId: string, algorandTxId: string): Promise<{
  success: boolean;
  transactionId: string;
  explorerUrl: string;
}> {
  try {
    const res = await fetch(`${API_URL}/contracts/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, algorandTxId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Error verificando contrato', error);
    throw error;
  }
}