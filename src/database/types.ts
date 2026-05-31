// Tipos compartidos entre cualquier implementación de base de datos
export interface IUser {
  email: string;
  nombres?: string;
  dni?: string;
  telefono?: string;
  algorandAddress: string;
  profileComplete: boolean;
  createdAt: string;
}

export interface IContract {
  id: string;
  type: 'prestamo' | 'servicio';
  lenderEmail: string;
  borrowerEmail: string;
  amount?: number;
  description: string;
  status: 'activo' | 'pagado' | 'vencido' | 'pendiente';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  algorandTxId?: string;
}

// Interfaz que deben implementar todos los repositorios
export interface IContractsRepository {
  create(contract: Omit<IContract, 'id' | 'createdAt'>): Promise<IContract>;
  getUserContracts(email: string): Promise<IContract[]>;
  getById(contractId: string): Promise<IContract | null>;
  complete(contractId: string, email: string): Promise<void>;
}

export interface IUsersRepository {
  getUser(email: string): Promise<IUser | null>;
  createProfile(email: string, nombres: string, dni: string, telefono: string): Promise<void>;
  updateProfile(email: string, data: Partial<IUser>): Promise<void>;
}