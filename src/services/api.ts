import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { User, Contract, Payment, Subscription, FREE_SERVICE_LIMIT } from '../types';
import { formatDateForDB } from '../utils/dateHelper';

// ==================== FLAG DE MIGRACIÓN ====================
const USE_SUPABASE = true;

const API_URL = CONFIG.API_URL;
const MODULE = 'API';

// ==================== SESIÓN ====================
export async function saveSession(email: string): Promise<void> {
  await SecureStore.setItemAsync('Pactia_userEmail', email);
}

export async function getSession(): Promise<string | null> {
  return await SecureStore.getItemAsync('Pactia_userEmail');
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync('Pactia_userEmail');
  await supabase.auth.signOut();
}

// ==================== FUNCIONES SUPABASE ====================

async function supabaseCheckEmail(email: string): Promise<boolean> {
  logger.info(MODULE, 'Verificando email en Supabase', { email });
  try {
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    return !!data;
  } catch (error) {
    return false;
  }
}

async function supabaseRegister(email: string, password: string): Promise<User> {
  logger.info(MODULE, 'Registrando usuario en Supabase', { email });
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Error al crear usuario');

    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        profile_complete: false,
      });
    if (profileError) throw new Error(profileError.message);

    await saveSession(email);

    // Retornar User completo con valores por defecto
    const newUser: User = {
      id: authData.user.id,
      email: authData.user.email!,
      phone: '',
      nombres: '',
      dni: '',
      country: 'Perú', // Default
      currency: 'PEN',
      currency_symbol: 'S/',
      algorand_address: '',
      profile_complete: false,
      created_at: new Date().toISOString(),
    };
    return newUser;
  } catch (error: any) {
    logger.error(MODULE, 'Error registrando en Supabase', error);
    throw error;
  }
}

async function supabaseLogin(identifier: string, password: string): Promise<User> {
  logger.info(MODULE, 'Iniciando sesión en Supabase', { identifier });
  try {
    let email = identifier;
    if (!identifier.includes('@')) {
      const { data: userData, error: findError } = await supabase
        .from('users')
        .select('email')
        .eq('phone', identifier)
        .single();
      if (findError || !userData) throw new Error('Usuario no encontrado');
      email = userData.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Error al iniciar sesión');

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    await saveSession(data.user.email!);

    // Retornar User completo
    const user: User = {
      id: profile?.id || data.user.id,
      email: data.user.email!,
      phone: profile?.phone || '',
      nombres: profile?.nombres || '',
      dni: profile?.dni || '',
      country: profile?.country || 'Perú',
      currency: profile?.currency || 'PEN',
      currency_symbol: profile?.currency_symbol || 'S/',
      algorand_address: profile?.algorand_address || '',
      profile_complete: profile?.profile_complete || false,
      created_at: profile?.created_at || new Date().toISOString(),
    };
    return user;
  } catch (error: any) {
    logger.error(MODULE, 'Error en login con Supabase', error);
    throw error;
  }
}

// Completar perfil (con país y moneda)
async function supabaseCompleteProfile(
  email: string,
  nombres: string,
  dni: string,
  phone: string,
  country?: string,
  currency?: string,
  currencySymbol?: string
): Promise<void> {
  logger.info(MODULE, 'Completando perfil en Supabase', { email });
  try {
    const { data: userData, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (findError || !userData) throw new Error('Usuario no encontrado');

    const updateData: any = {
      nombres,
      dni,
      phone,
      profile_complete: true,
    };
    if (country) updateData.country = country;
    if (currency) updateData.currency = currency;
    if (currencySymbol) updateData.currency_symbol = currencySymbol;

    const { error } = await supabase.from('users').update(updateData).eq('id', userData.id);
    if (error) throw new Error(error.message);
  } catch (error: any) {
    logger.error(MODULE, 'Error completando perfil en Supabase', error);
    throw error;
  }
}

async function supabaseGetProfile(email: string): Promise<User> {
  try {
    const { data: userData, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (findError || !userData) throw new Error('Usuario no encontrado');

    const user: User = {
      id: userData.id,
      email: userData.email,
      phone: userData.phone || '',
      nombres: userData.nombres || '',
      dni: userData.dni || '',
      country: userData.country || 'Perú',
      currency: userData.currency || 'PEN',
      currency_symbol: userData.currency_symbol || 'S/',
      algorand_address: userData.algorand_address || '',
      profile_complete: userData.profile_complete || false,
      created_at: userData.created_at || new Date().toISOString(),
    };
    return user;
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo perfil', error);
    throw error;
  }
}

async function supabaseFindUserByPhone(phone: string): Promise<{ success: boolean; email: string; phone: string; nombres?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, phone, nombres')
      .eq('phone', phone)
      .single();
    if (error || !data) throw new Error('Usuario no encontrado');
    return { success: true, email: data.email, phone: data.phone, nombres: data.nombres };
  } catch (error) {
    logger.error(MODULE, 'Error buscando por teléfono', error);
    throw error;
  }
}

async function supabaseGetUserByEmail(email: string): Promise<User> {
  return supabaseGetProfile(email);
}

async function supabaseGetSubscription(email: string): Promise<Subscription> {
  // Por ahora retornar suscripción gratuita
  // TODO: Implementar cuando tengas tabla de suscripciones
  return { active: false, plan: 'free' };
}

async function supabaseUpgradeSubscription(email: string, plan: 'monthly' | 'yearly'): Promise<void> {
  logger.info(MODULE, 'Upgrading subscription', { email, plan });
  // TODO: Implementar pago con Stripe u otro
  console.warn('Supabase: upgradeSubscription no implementado');
}

async function supabaseRequestLoan(
  type: 'prestamo' | 'servicio',
  debtorPhone: string,
  creditorPhone: string,
  requestedAmount: number,
  proposedDueDate: string,  // Formato DD/MM/YYYY
  description: string
): Promise<Contract> {
  try {
    const { data: debtorData } = await supabase
      .from('users')
      .select('nombres')
      .eq('phone', debtorPhone)
      .single();
    const { data: creditorData } = await supabase
      .from('users')
      .select('nombres')
      .eq('phone', creditorPhone)
      .single();

    const contractId = `CT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Convertir fecha para BD
    const dueDateForDB = formatDateForDB(proposedDueDate);

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        id: contractId,
        type,
        debtor_phone: debtorPhone,
        debtor_name: debtorData?.nombres || debtorPhone,
        creditor_phone: creditorPhone,
        creditor_name: creditorData?.nombres || creditorPhone,
        requested_amount: requestedAmount,
        proposed_due_date: dueDateForDB,  // ← Formato YYYY-MM-DD
        description,
        status: 'solicitado',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapContractFromDB(data);
  } catch (error: any) {
    logger.error(MODULE, 'Error creando solicitud en Supabase', error);
    throw error;
  }
}

// ==================== FUNCIONES SUPABASE COMPLETAS ====================

async function supabaseGetPendingRequests(creditorPhone: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('creditor_phone', creditorPhone)
      .eq('status', 'solicitado')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapContractFromDB);
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo solicitudes pendientes', error);
    return [];
  }
}

async function supabaseGetSentRequests(phone: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('debtor_phone', phone)
      .eq('status', 'solicitado')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapContractFromDB);
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo solicitudes enviadas', error);
    return [];
  }
}

async function supabaseApproveLoan(
  contractId: string,
  approvedAmount: number,
  approvedDueDate: string,  // Formato DD/MM/YYYY
  depositProofUri?: string,
  depositProofFileName?: string
): Promise<Contract> {
  try {
    const { data: existingContract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    // Convertir fecha para BD
    const dueDateForDB = formatDateForDB(approvedDueDate);
    const now = new Date();
    const nowISO = now.toISOString();
    const todayDate = nowISO.split('T')[0];

    const updateData: any = {
      status: 'aceptado',
      approved_amount: approvedAmount,
      approved_due_date: dueDateForDB,
      remaining_amount: approvedAmount,
    };

    if (depositProofUri) {
      updateData.deposit_proof_uri = depositProofUri;
      updateData.deposit_proof_file_name = depositProofFileName;
      updateData.deposit_proof_date = nowISO;
      updateData.deposit_proof_date_only = todayDate;  // ← NUEVO
    }

    if (!existingContract.debtor_name) {
      const { data: debtorData } = await supabase
        .from('users')
        .select('nombres')
        .eq('phone', existingContract.debtor_phone)
        .single();
      updateData.debtor_name = debtorData?.nombres || existingContract.debtor_phone;
    }

    if (!existingContract.creditor_name) {
      const { data: creditorData } = await supabase
        .from('users')
        .select('nombres')
        .eq('phone', existingContract.creditor_phone)
        .single();
      updateData.creditor_name = creditorData?.nombres || existingContract.creditor_phone;
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapContractFromDB(data);
  } catch (error: any) {
    logger.error(MODULE, 'Error aprobando solicitud', error);
    throw error;
  }
}

async function supabaseRejectLoan(contractId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'rechazado' })
      .eq('id', contractId);
    if (error) throw new Error(error.message);
  } catch (error: any) {
    logger.error(MODULE, 'Error rechazando solicitud', error);
    throw error;
  }
}

async function supabaseGetActiveDebts(debtorPhone: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`*, payments:payments(*)`)
      .eq('debtor_phone', debtorPhone)
      .in('status', ['aceptado', 'activo']);
    if (error) throw new Error(error.message);
    return (data || []).map(contract => ({
      ...mapContractFromDB(contract),
      payments: contract.payments?.map(mapPaymentFromDB) || [],
    }));
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo deudas activas', error);
    return [];
  }
}

async function supabaseGetActiveLent(phone: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`*, payments:payments(*)`)
      .eq('creditor_phone', phone)
      .in('status', ['aceptado', 'activo']);
    if (error) throw new Error(error.message);
    return (data || []).map(contract => ({
      ...mapContractFromDB(contract),
      payments: contract.payments?.map(mapPaymentFromDB) || [],
    }));
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo préstamos activos', error);
    return [];
  }
}

async function supabaseGetAllUserContracts(phone: string): Promise<Contract[]> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .or(`debtor_phone.eq.${phone},creditor_phone.eq.${phone}`)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapContractFromDB);
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo todos los contratos', error);
    return [];
  }
}

async function supabaseGetContractById(contractId: string): Promise<Contract> {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`*, payments:payments(*)`)
      .eq('id', contractId)
      .single();
    if (error) throw new Error(error.message);
    const contract = mapContractFromDB(data);
    contract.payments = data.payments?.map(mapPaymentFromDB) || [];
    return contract;
  } catch (error: any) {
    logger.error(MODULE, 'Error obteniendo contrato por ID', error);
    throw error;
  }
}

async function supabaseMakePayment(
  contractId: string,
  amount: number,
  proofUri?: string,
  proofFileName?: string
): Promise<Contract> {
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (contractError) throw new Error(contractError.message);

    const remaining = contract.remaining_amount || contract.approved_amount;
    const paymentType = amount === remaining ? 'total' : 'parcial';
    const paymentId = `PMT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const nowISO = now.toISOString();
    const todayDate = nowISO.split('T')[0];

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        contract_id: contractId,
        amount,
        type: paymentType,
        proof_uri: proofUri,
        proof_file_name: proofFileName,
        confirmed: false,
        date: nowISO,
        payment_date: todayDate,  // ← NUEVO
      });
    if (paymentError) throw new Error(paymentError.message);

    const { data: updatedContract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', contractId);

    const result = mapContractFromDB(updatedContract);
    result.payments = payments?.map(mapPaymentFromDB) || [];
    return result;
  } catch (error: any) {
    logger.error(MODULE, 'Error realizando pago', error);
    throw error;
  }
}

async function supabaseConfirmPayment(contractId: string, paymentId: string, creditorPhone: string): Promise<Contract> {
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (contractError) throw new Error(contractError.message);
    if (contract.creditor_phone !== creditorPhone) throw new Error('No tienes permiso');

    const now = new Date();
    const nowISO = now.toISOString();
    const todayDate = nowISO.split('T')[0];

    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        confirmed: true, 
        confirmed_at: nowISO,
        confirmed_date: todayDate  // ← NUEVO
      })
      .eq('id', paymentId);
    if (updateError) throw new Error(updateError.message);

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', contractId);
    if (paymentsError) throw new Error(paymentsError.message);

    const confirmedTotal = payments.filter(p => p.confirmed).reduce((sum, p) => sum + p.amount, 0);
    const originalAmount = contract.approved_amount || contract.requested_amount;
    const remainingAmount = originalAmount - confirmedTotal;
    const newStatus = remainingAmount <= 0 ? 'pagado' : 'activo';

    const updateContractData: any = {
      remaining_amount: remainingAmount,
      status: newStatus,
    };

    // Si el contrato se completa (pagado), guardar completed_date
    if (newStatus === 'pagado') {
      updateContractData.completed_at = nowISO;
      updateContractData.completed_date = todayDate;  // ← NUEVO
    }

    const { error: contractUpdateError } = await supabase
      .from('contracts')
      .update(updateContractData)
      .eq('id', contractId);
    if (contractUpdateError) throw new Error(contractUpdateError.message);

    const { data: updatedContract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const result = mapContractFromDB(updatedContract);
    result.payments = payments.map(mapPaymentFromDB);
    return result;
  } catch (error: any) {
    logger.error(MODULE, 'Error confirmando pago', error);
    throw error;
  }
}

async function supabaseGetApprovedServicesCount(phone: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'servicio')
      .eq('creditor_phone', phone)
      .in('status', ['aceptado', 'activo', 'pagado']);
    if (error) throw new Error(error.message);
    return count || 0;
  } catch (error: any) {
    logger.error(MODULE, 'Error contando servicios aprobados', error);
    return 0;
  }
}

async function supabaseCanRequestService(phone: string): Promise<{ canRequest: boolean; currentCount: number; limit: number }> {
  const limit = FREE_SERVICE_LIMIT;
  try {
    const currentCount = await supabaseGetApprovedServicesCount(phone);
    return { canRequest: currentCount < limit, currentCount, limit };
  } catch (error) {
    return { canRequest: true, currentCount: 0, limit };
  }
}

function mapContractFromDB(data: any): Contract {
  return {
    id: data.id,
    type: data.type,
    debtor_phone: data.debtor_phone,
    debtor_name: data.debtor_name,
    creditor_phone: data.creditor_phone,
    creditor_name: data.creditor_name,
    requested_amount: data.requested_amount,
    proposed_due_date: data.proposed_due_date,
    description: data.description,
    status: data.status,
    approved_amount: data.approved_amount,
    approved_due_date: data.approved_due_date,
    remaining_amount: data.remaining_amount,
    deposit_proof_uri: data.deposit_proof_uri,
    deposit_proof_file_name: data.deposit_proof_file_name,
    deposit_proof_date: data.deposit_proof_date,
    created_at: data.created_at,
    completed_at: data.completed_at,
    algorand_tx_id: data.algorand_tx_id,
    payments: [],
    // ========== NUEVOS CAMPOS DE FECHA ==========
    created_date: data.created_date,
    deposit_proof_date_only: data.deposit_proof_date_only,
    completed_date: data.completed_date,
  };
}

function mapPaymentFromDB(data: any): Payment {
  return {
    id: data.id,
    contract_id: data.contract_id,
    amount: data.amount,
    date: data.date,
    type: data.type,
    notes: data.notes,
    proof_uri: data.proof_uri,
    proof_file_name: data.proof_file_name,
    confirmed: data.confirmed,
    confirmed_at: data.confirmed_at,
    // ========== NUEVOS CAMPOS DE FECHA ==========
    payment_date: data.payment_date,
    confirmed_date: data.confirmed_date,
  };
}

async function supabaseVerifyContractOnAlgorand(contractId: string, algorandTxId: string): Promise<{
  success: boolean;
  transactionId: string;
  explorerUrl: string;
}> {
  logger.warn(MODULE, 'verifyContractOnAlgorand no implementado');
  return { success: false, transactionId: '', explorerUrl: '' };
}

// ==================== SELECCIÓN DE IMPLEMENTACIÓN ====================

let checkEmailImpl = supabaseCheckEmail;
let registerImpl = supabaseRegister;
let loginImpl = supabaseLogin;
let completeProfileImpl = supabaseCompleteProfile;
let getProfileImpl = supabaseGetProfile;
let findUserByPhoneImpl = supabaseFindUserByPhone;
let getUserByEmailImpl = supabaseGetUserByEmail;
let getSubscriptionImpl = supabaseGetSubscription;
let upgradeSubscriptionImpl = supabaseUpgradeSubscription;
let requestLoanImpl = supabaseRequestLoan;
let getPendingRequestsImpl = supabaseGetPendingRequests;
let getSentRequestsImpl = supabaseGetSentRequests;
let approveLoanImpl = supabaseApproveLoan;
let rejectLoanImpl = supabaseRejectLoan;
let getActiveDebtsImpl = supabaseGetActiveDebts;
let getActiveLentImpl = supabaseGetActiveLent;
let getAllUserContractsImpl = supabaseGetAllUserContracts;
let getContractByIdImpl = supabaseGetContractById;
let makePaymentImpl = supabaseMakePayment;
let confirmPaymentImpl = supabaseConfirmPayment;
let getApprovedServicesCountImpl = supabaseGetApprovedServicesCount;
let canRequestServiceImpl = supabaseCanRequestService;
let verifyContractOnAlgorandImpl = supabaseVerifyContractOnAlgorand;

if (!USE_SUPABASE) {
  console.log('🟢 Usando backend Node.js (JSON) - Funciones no implementadas');
}

// ==================== EXPORTACIONES ====================

export const login = async (email: string, password: string): Promise<User> => {
  if (!email || !email.includes('@')) {
    throw new Error('Debes ingresar un email válido');
  }
  return loginImpl(email, password);
};

export const checkEmail = checkEmailImpl;
export const register = registerImpl;
export const completeProfile = completeProfileImpl;
export const getProfile = getProfileImpl;
export const findUserByPhone = findUserByPhoneImpl;
export const getUserByEmail = getUserByEmailImpl;
export const getSubscription = getSubscriptionImpl;
export const upgradeSubscription = upgradeSubscriptionImpl;
export const requestLoan = requestLoanImpl;
export const getPendingRequests = getPendingRequestsImpl;
export const getSentRequests = getSentRequestsImpl;
export const approveLoan = approveLoanImpl;
export const rejectLoan = rejectLoanImpl;
export const getActiveDebts = getActiveDebtsImpl;
export const getActiveLent = getActiveLentImpl;
export const getAllUserContracts = getAllUserContractsImpl;
export const getContractById = getContractByIdImpl;
export const makePayment = makePaymentImpl;
export const confirmPayment = confirmPaymentImpl;
export const getApprovedServicesCount = getApprovedServicesCountImpl;
export const canRequestService = canRequestServiceImpl;
export const verifyContractOnAlgorand = verifyContractOnAlgorandImpl;
export type { Contract, Payment, User, Subscription };