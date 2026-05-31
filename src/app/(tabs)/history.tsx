import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { getSession, getUserByEmail, getAllUserContracts, Contract } from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useAsync } from '../../hooks/useAsync';
import { logger } from '../../utils/logger';
import { normalizers } from '../../utils/validators';
import { router } from 'expo-router';

const MODULE = 'HistoryScreen';

interface GroupedByType {
  prestamo: Contract[];
  servicio: Contract[];
}

interface GroupedByRole {
  deudor: Contract[];
  acreedor: Contract[];
}

export default function HistoryScreen() {
  const [userPhone, setUserPhone] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const { loading, execute: executeLoad } = useAsync({
    module: MODULE,
    onError: (error) => {
      logger.error(MODULE, 'Error cargando historial', error);
    },
  });

  useEffect(() => {
    loadUserAndHistory();
  }, []);

  const loadUserAndHistory = async () => {
    try {
      const email = await getSession();
      if (email) {
        const user = await getUserByEmail(email);
        if (user && user.phone) {
          setUserPhone(user.phone);
          await loadHistory(user.phone);
        }
      }
    } catch (error) {
      logger.error(MODULE, 'Error loading user', error);
    }
  };

  const loadHistory = async (phone: string) => {
    if (!phone) return;
    
    const allContracts = await executeLoad(getAllUserContracts(phone), 'Cargando historial');
    if (allContracts) {
      // Mostrar contratos pagados o rechazados
      const completed = allContracts.filter((c: Contract) => c.status === 'pagado' || c.status === 'rechazado');
      setContracts(completed);
      logger.info(MODULE, 'Historial cargado', { total: completed.length });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userPhone) {
      await loadHistory(userPhone);
    }
    setRefreshing(false);
  };

  const handleContractPress = (contractId: string) => {
    router.push(`/loan-detail?contractId=${contractId}`);
  };

  const getTypeIcon = (type: string) => type === 'prestamo' ? '💰' : '🤝';
  const getTypeTitle = (type: string) => type === 'prestamo' ? 'Préstamos' : 'Servicios';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pagado': return '✅';
      case 'rechazado': return '❌';
      default: return '📄';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pagado': return 'Completado';
      case 'rechazado': return 'Rechazado';
      default: return status;
    }
  };

  // Función para obtener el texto del rol según el tipo de contrato
  const getRoleText = (contract: Contract, isDeudor: boolean): string => {
    if (contract.type === 'prestamo') {
      return isDeudor ? 'Pediste prestado' : 'Prestaste';
    } else {
      return isDeudor ? 'Servicio solicitado' : 'Servicio brindado';
    }
  };

  // Función para obtener el icono del rol según el tipo de contrato
  const getRoleIcon = (contract: Contract, isDeudor: boolean): string => {
  if (contract.type === 'prestamo') {
    return isDeudor ? '📥' : '📤';
    } else {
      return '🤝'; // Icono único para servicios
    }
  };

  // Agrupar por tipo
  const groupByType = (contracts: Contract[]): GroupedByType => {
    return contracts.reduce((acc, contract) => {
      if (contract.type === 'prestamo') {
        acc.prestamo.push(contract);
      } else {
        acc.servicio.push(contract);
      }
      return acc;
    }, { prestamo: [], servicio: [] } as GroupedByType);
  };

  // Agrupar por rol (deudor/acreedor)
  const groupByRole = (contracts: Contract[], userPhone: string): GroupedByRole => {
    return contracts.reduce((acc, contract) => {
      if (contract.debtorPhone === userPhone) {
        acc.deudor.push(contract);
      } else {
        acc.acreedor.push(contract);
      }
      return acc;
    }, { deudor: [], acreedor: [] } as GroupedByRole);
  };

  // Calcular estadísticas por grupo de contratos
  const getStats = (contracts: Contract[]) => {
    const completedContracts = contracts.filter(c => c.status === 'pagado');
    const totalAmount = completedContracts.reduce((sum, c) => sum + (c.approvedAmount || c.requestedAmount || 0), 0);
    return { 
      count: contracts.length,
      completedCount: completedContracts.length,
      totalAmount
    };
  };

  const toggleType = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
    setExpandedRole(null);
  };

  const toggleRole = (role: string) => {
    setExpandedRole(expandedRole === role ? null : role);
  };

  // Función para obtener el nombre o teléfono de la contraparte
  const getCounterpartyDisplay = (contract: Contract, isDeudor: boolean): string => {
    if (isDeudor) {
      return contract.creditorName || contract.creditorPhone;
    } else {
      return contract.debtorName || contract.debtorPhone;
    }
  };

  const renderContractCard = (contract: Contract, userPhone: string) => {
    const isDeudor = contract.debtorPhone === userPhone;
    const counterpartyDisplay = getCounterpartyDisplay(contract, isDeudor);
    const counterpartyPhone = isDeudor ? contract.creditorPhone : contract.debtorPhone;
    const counterpartyName = isDeudor ? contract.creditorName : contract.debtorName;
    const roleText = getRoleText(contract, isDeudor);
    const roleIcon = getRoleIcon(contract, isDeudor);
    const counterpartyLabel = isDeudor 
      ? (contract.type === 'prestamo' ? 'Acreedor' : 'Proveedor')
      : (contract.type === 'prestamo' ? 'Deudor' : 'Cliente');
    
    return (
      <TouchableOpacity
        key={contract.id}
        style={styles.contractCard}
        onPress={() => handleContractPress(contract.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contractHeader}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleIcon}>{roleIcon}</Text>
            <Text style={styles.roleText}>{roleText}</Text>
          </View>
          <View style={[styles.statusBadge, contract.status === 'rechazado' && styles.statusRejectedBadge]}>
            <Text style={[styles.statusText, contract.status === 'rechazado' && styles.statusRejectedText]}>
              {getStatusIcon(contract.status)} {getStatusText(contract.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.counterparty}>
          {counterpartyLabel}: {counterpartyDisplay}
          {counterpartyName && counterpartyName !== counterpartyPhone && (
            <Text style={styles.counterpartyPhone}> ({counterpartyPhone})</Text>
          )}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {contract.description}
        </Text>

        <View style={styles.contractFooter}>
          <Text style={styles.amount}>
            Monto: {normalizers.currency(contract.requestedAmount)}
          </Text>
          <Text style={styles.date}>
            {contract.completedAt 
              ? new Date(contract.completedAt).toLocaleDateString('es-PE')
              : new Date(contract.createdAt).toLocaleDateString('es-PE')
            }
          </Text>
        </View>

        {contract.payments && contract.payments.length > 0 && (
          <Text style={styles.paymentsCount}>
            📋 {contract.payments.length} pago{contract.payments.length !== 1 ? 's' : ''}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRoleSection = (
    roleKey: string,
    title: string,
    icon: string,
    contracts: Contract[],
    userPhone: string,
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    const stats = getStats(contracts);
    
    if (stats.count === 0) return null;

    return (
      <View style={styles.roleContainer}>
        <TouchableOpacity style={styles.roleHeader} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.roleTitleContainer}>
            <Text style={styles.roleHeaderIcon}>{icon}</Text>
            <Text style={styles.roleTitle}>{title}</Text>
          </View>
          <View style={styles.roleStats}>
            <Text style={styles.roleCount}>{stats.count} pacto{stats.count !== 1 ? 's' : ''}</Text>
            {stats.completedCount > 0 && (
              <Text style={styles.roleCompleted}>✓ {stats.completedCount}</Text>
            )}
            {stats.totalAmount > 0 && (
              <Text style={styles.roleTotal}>{normalizers.currency(stats.totalAmount)}</Text>
            )}
            <Text style={styles.roleExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.roleContent}>
            {contracts.map(contract => renderContractCard(contract, userPhone))}
          </View>
        )}
      </View>
    );
  };

  const renderTypeSection = (
    typeKey: string,
    title: string,
    icon: string,
    contracts: Contract[],
    userPhone: string,
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    const stats = getStats(contracts);
    const groupedByRole = groupByRole(contracts, userPhone);
    
    if (stats.count === 0) return null;

    // Textos para los roles según el tipo
    const debtorTitle = title === 'Préstamos' ? 'Pediste prestado' : 'Servicios solicitados';
    const creditorTitle = title === 'Préstamos' ? 'Prestaste' : 'Servicios brindados';
    const debtorIcon = title === 'Préstamos' ? '📥' : '🤝';
    const creditorIcon = title === 'Préstamos' ? '📤' : '🤝';

    return (
      <View style={styles.typeContainer}>
        <TouchableOpacity style={styles.typeHeader} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.typeTitleContainer}>
            <Text style={styles.typeIcon}>{icon}</Text>
            <Text style={styles.typeTitle}>{title}</Text>
          </View>
          <View style={styles.typeStats}>
            <Text style={styles.typeCount}>{stats.count} pacto{stats.count !== 1 ? 's' : ''}</Text>
            {stats.completedCount > 0 && (
              <Text style={styles.typeCompleted}>✓ {stats.completedCount}</Text>
            )}
            {stats.totalAmount > 0 && (
              <Text style={styles.typeTotal}>{normalizers.currency(stats.totalAmount)}</Text>
            )}
            <Text style={styles.typeExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.typeContent}>
            {renderRoleSection(
              'deudor',
              debtorTitle,
              debtorIcon,
              groupedByRole.deudor,
              userPhone,
              expandedRole === `${typeKey}_deudor`,
              () => toggleRole(`${typeKey}_deudor`)
            )}
            {renderRoleSection(
              'acreedor',
              creditorTitle,
              creditorIcon,
              groupedByRole.acreedor,
              userPhone,
              expandedRole === `${typeKey}_acreedor`,
              () => toggleRole(`${typeKey}_acreedor`)
            )}
          </View>
        )}
      </View>
    );
  };

  const groupedByType = groupByType(contracts);

  if (loading && contracts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <>
      <LoadingOverlay visible={loading} message="Cargando..." />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>
            {contracts.length} pacto{contracts.length !== 1 ? 's' : ''} en total
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {contracts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No hay historial</Text>
              <Text style={styles.emptyText}>
                Los pactos completados aparecerán aquí
              </Text>
            </View>
          ) : (
            <>
              {renderTypeSection(
                'prestamo',
                'Préstamos',
                '💰',
                groupedByType.prestamo,
                userPhone,
                expandedType === 'prestamo',
                () => toggleType('prestamo')
              )}
              
              {renderTypeSection(
                'servicio',
                'Servicios',
                '🤝',
                groupedByType.servicio,
                userPhone,
                expandedType === 'servicio',
                () => toggleType('servicio')
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.blanco,
    fontSize: 16,
  },
  header: {
    backgroundColor: Colors.azulMarino,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.blanco,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.blanco,
    opacity: 0.7,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
  },
  typeContainer: {
    marginBottom: 16,
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeHeader: {
    padding: 16,
    backgroundColor: Colors.blanco,
  },
  typeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  typeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCount: {
    fontSize: 12,
    color: Colors.grisOscuro,
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeCompleted: {
    fontSize: 12,
    color: Colors.verdeExito,
    fontWeight: '500',
  },
  typeTotal: {
    fontSize: 12,
    color: Colors.verdeOlivo,
    fontWeight: '500',
  },
  typeExpandIcon: {
    fontSize: 12,
    color: Colors.grisOscuro,
  },
  typeContent: {
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  roleContainer: {
    marginTop: 8,
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleHeader: {
    padding: 12,
    backgroundColor: Colors.blanco,
  },
  roleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleHeaderIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.azulMarino,
  },
  roleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleCount: {
    fontSize: 11,
    color: Colors.grisOscuro,
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  roleCompleted: {
    fontSize: 11,
    color: Colors.verdeExito,
  },
  roleTotal: {
    fontSize: 11,
    color: Colors.verdeOlivo,
  },
  roleExpandIcon: {
    fontSize: 10,
    color: Colors.grisOscuro,
  },
  roleContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: Colors.grisClaro,
  },
  contractCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.azulMarino,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: Colors.verdeExito + '20',
  },
  statusRejectedBadge: {
    backgroundColor: Colors.rojoError + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.verdeExito,
  },
  statusRejectedText: {
    color: Colors.rojoError,
  },
  counterparty: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  counterpartyPhone: {
    fontSize: 10,
    color: Colors.grisOscuro,
    fontWeight: 'normal',
  },
  description: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 8,
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  date: {
    fontSize: 10,
    color: Colors.grisOscuro,
  },
  paymentsCount: {
    fontSize: 10,
    color: Colors.azulMarino,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
  },
});