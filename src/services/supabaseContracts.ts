import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Contract } from './api';

const MODULE = 'SupabaseContracts';

// Obtener contratos activos del deudor
export async function getActiveDebts(phone: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('debtor_phone', phone)
    .in('status', ['aceptado', 'activo']);
  
  if (error) {
    logger.error(MODULE, 'Error obteniendo deudas', error);
    return [];
  }
  
  return data as Contract[];
}

// Obtener contratos activos del acreedor
export async function getActiveLent(phone: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('creditor_phone', phone)
    .in('status', ['aceptado', 'activo']);
  
  if (error) {
    logger.error(MODULE, 'Error obteniendo préstamos activos', error);
    return [];
  }
  
  return data as Contract[];
}

// Crear solicitud
export async function createRequest(
  type: string,
  debtorPhone: string,
  creditorPhone: string,
  requestedAmount: number,
  proposedDueDate: string,
  description: string
): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      type,
      debtor_phone: debtorPhone,
      creditor_phone: creditorPhone,
      requested_amount: requestedAmount,
      proposed_due_date: proposedDueDate,
      description,
      status: 'solicitado',
    })
    .select()
    .single();
  
  if (error) {
    logger.error(MODULE, 'Error creando solicitud', error);
    return null;
  }
  
  return data as Contract;
}

// Aprobar solicitud
export async function approveRequest(
  contractId: string,
  approvedAmount: number,
  approvedDueDate: string,
  depositProofUri?: string,
  depositProofFileName?: string
): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .update({
      status: 'aceptado',
      approved_amount: approvedAmount,
      approved_due_date: approvedDueDate,
      remaining_amount: approvedAmount,
      deposit_proof_uri: depositProofUri,
      deposit_proof_file_name: depositProofFileName,
      deposit_proof_date: new Date().toISOString(),
    })
    .eq('id', contractId)
    .select()
    .single();
  
  if (error) {
    logger.error(MODULE, 'Error aprobando solicitud', error);
    return null;
  }
  
  return data as Contract;
}