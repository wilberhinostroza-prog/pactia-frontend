import { IContract, IContractsRepository } from '../types';
import { createContract, getUserContracts, completeContract } from '../../services/api';

// Implementación actual con API
export class ApiContractsRepository implements IContractsRepository {
  async create(contract: Omit<IContract, 'id' | 'createdAt'>): Promise<IContract> {
    return await createContract(
      contract.type,
      contract.lenderEmail,
      contract.borrowerEmail,
      contract.description,
      contract.dueDate,
      contract.amount
    );
  }

  async getUserContracts(email: string): Promise<IContract[]> {
    return await getUserContracts(email);
  }

  async getById(contractId: string): Promise<IContract | null> {
    const contracts = await getUserContracts(''); // Necesitaríamos un endpoint específico
    return contracts.find(c => c.id === contractId) || null;
  }

  async complete(contractId: string, email: string): Promise<void> {
    await completeContract(contractId, email);
  }
}

// Singleton para usar en toda la app
export const contractsRepository = new ApiContractsRepository();