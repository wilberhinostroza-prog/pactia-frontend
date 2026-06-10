// src/types/index.ts
// Tipos centralizados para toda la aplicación

// ==================== USUARIOS ====================
export interface User {
  id: string;
  email: string;
  phone: string;
  nombres: string;
  dni: string;
  country: string;           // País del usuario (ej: "Perú", "Argentina")
  currency: string;          // Código de moneda (ej: "PEN", "USD")
  currency_symbol: string;   // Símbolo (ej: "S/", "$")
  algorand_address: string;
  profile_complete: boolean;
  created_at: string;
}

// ==================== CONTRATOS ====================
export type ContractType = 'prestamo' | 'servicio';
export type ContractStatus = 'solicitado' | 'aceptado' | 'activo' | 'pagado' | 'rechazado';

export interface Contract {
  id: string;
  type: ContractType;
  debtor_phone: string;
  debtor_name?: string;
  creditor_phone: string;
  creditor_name?: string;
  requested_amount: number;
  proposed_due_date: string;
  description: string;
  status: ContractStatus;
  approved_amount?: number;
  approved_due_date?: string;
  remaining_amount?: number;
  deposit_proof_uri?: string;
  deposit_proof_file_name?: string;
  deposit_proof_date?: string;
  created_at: string;
  completed_at?: string;
  algorand_tx_id?: string;
  payments?: Payment[];
  
  // ========== NUEVOS CAMPOS DE FECHA (SOLO FECHA) ==========
  created_date?: string;              // DATE: fecha de creación (sin hora)
  deposit_proof_date_only?: string;   // DATE: fecha del comprobante de depósito (sin hora)
  completed_date?: string;            // DATE: fecha de completado (sin hora)
}

// ==================== PAGOS ====================
export type PaymentType = 'parcial' | 'total';

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  date: string;
  type: PaymentType;
  notes?: string;
  proof_uri?: string;
  proof_file_name?: string;
  confirmed: boolean;
  confirmed_at?: string;
  
  // ========== NUEVOS CAMPOS DE FECHA (SOLO FECHA) ==========
  payment_date?: string;      // DATE: fecha del pago (sin hora)
  confirmed_date?: string;    // DATE: fecha de confirmación (sin hora)
}

// ==================== SUSCRIPCIONES ====================
export type PlanType = 'free' | 'monthly' | 'yearly';

export interface Subscription {
  active: boolean;
  plan: PlanType;
  expires_at?: string;
}

// ==================== CONSTANTES ====================
export const FREE_SERVICE_LIMIT = 10;