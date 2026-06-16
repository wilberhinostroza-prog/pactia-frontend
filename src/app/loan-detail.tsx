import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { getContractById, verifyContractOnAlgorand, getSession, getUserByEmail } from '../services/api';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ErrorToast } from '../components/ErrorToast';
import { useAsync } from '../hooks/useAsync';
import { normalizers } from '../utils/validators';
import { logger } from '../utils/logger';
import { User } from '../types';
import { formatDateFromDB, formatTimestampToDate, formatTimestampToDateTime, formatDisplayDate } from '../utils/dateHelper';

const MODULE = 'LoanDetailScreen';

export default function LoanDetailScreen() {
  const { contractId } = useLocalSearchParams();
  const [contract, setContract] = useState<any>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState<string>('S/');

  const { loading, execute: executeLoad } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'Error cargando detalles');
      setToastVisible(true);
    },
  });

  const { loading: verifying, execute: executeVerify } = useAsync({
    module: MODULE,
    onSuccess: (result) => {
      if (result?.explorerUrl) {
        Linking.openURL(result.explorerUrl);
      }
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al verificar en blockchain');
      setToastVisible(true);
    },
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (contractId) {
      loadContractDetails();
    }
  }, [contractId]);

  const loadCurrentUser = async () => {
    try {
      const email = await getSession();
      if (email) {
        const user = await getUserByEmail(email);
        setCurrentUser(user);
        if (user.currency_symbol) {
          setCurrencySymbol(user.currency_symbol);
        }
      }
    } catch (error) {
      logger.error(MODULE, 'Error cargando usuario actual', error);
    }
  };

  const loadContractDetails = async () => {
    const contractData = await executeLoad(getContractById(contractId as string), 'Cargando detalles');
    if (contractData) {
      setContract(contractData);
      logger.info(MODULE, 'Detalles cargados', { contractId });
    }
  };

  const handleVerifyBlockchain = async () => {
    const txId = contract?.algorandTxId || contract?.algorand_tx_id;
    if (!txId) {
      setToastMessage('Este contrato no tiene registro en blockchain');
      setToastVisible(true);
      return;
    }
    await executeVerify(
      verifyContractOnAlgorand(contract.id, txId),
      'Verificando en blockchain'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado': return '#F39C12';
      case 'aceptado': return Colors.verdeOlivo;
      case 'activo': return Colors.verdeOlivo;
      case 'pagado': return Colors.verdeExito;
      case 'rechazado': return Colors.rojoError;
      default: return Colors.grisOscuro;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'solicitado': return 'Solicitado';
      case 'aceptado': return 'Aprobado';
      case 'activo': return 'Activo';
      case 'pagado': return 'Pagado';
      case 'rechazado': return 'Rechazado';
      default: return status;
    }
  };

  // Obtener campo de forma segura (soporta snake_case y camelCase)
  const getField = (obj: any, camelField: string, snakeField: string): any => {
    return obj[camelField] !== undefined ? obj[camelField] : obj[snakeField];
  };

  // Obtener monto original (aprobado o solicitado)
  const getOriginalAmount = (contract: any): number => {
    const approved = getField(contract, 'approvedAmount', 'approved_amount');
    const requested = getField(contract, 'requestedAmount', 'requested_amount');
    return approved || requested || 0;
  };

  // Función para obtener el saldo real basado SOLO en pagos confirmados
  const getRealRemainingAmount = (contract: any): number => {
    const originalAmount = getOriginalAmount(contract);
    const confirmedTotal = contract.payments
      ?.filter((p: any) => p.confirmed)
      .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    return originalAmount - confirmedTotal;
  };

  // Función para obtener el total pagado (solo confirmados)
  const getConfirmedTotalPaid = (contract: any): number => {
    return contract.payments
      ?.filter((p: any) => p.confirmed)
      .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  };

  // Formatear moneda con símbolo dinámico
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toFixed(2)}`;
  };

  // Formatear fecha
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Contrato no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPaid = getConfirmedTotalPaid(contract);
  const remaining = getRealRemainingAmount(contract);
  const depositProofUri = getField(contract, 'depositProofUri', 'deposit_proof_uri');
  const depositProofFileName = getField(contract, 'depositProofFileName', 'deposit_proof_file_name');
  const depositProofDate = getField(contract, 'depositProofDate', 'deposit_proof_date');
  const approvedAmount = getField(contract, 'approvedAmount', 'approved_amount');
  const approvedDueDate = getField(contract, 'approvedDueDate', 'approved_due_date');
  const createdAt = getField(contract, 'createdAt', 'created_at');
  const completedAt = getField(contract, 'completedAt', 'completed_at');
  const txId = getField(contract, 'algorandTxId', 'algorand_tx_id');

  return (
    <>
      <LoadingOverlay visible={verifying} message="Verificando en blockchain..." />
      <ErrorToast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Encabezado con estado */}
        <View style={[styles.header, { backgroundColor: getStatusColor(contract.status) + '10' }]}>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
              {getStatusText(contract.status)}
            </Text>
          </View>
          <Text style={styles.contractId}>ID: {contract.id}</Text>
        </View>

        {/* Tipo de contrato */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {contract.type === 'prestamo' ? '💰 Préstamo' : '🤝 Servicio'}
          </Text>
        </View>

        {/* Participantes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Participantes</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deudor:</Text>
            <Text style={styles.infoValue}>
              {contract.debtor_name || contract.debtorName || contract.debtor_phone || contract.debtorPhone}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Acreedor:</Text>
            <Text style={styles.infoValue}>
              {contract.creditor_name || contract.creditorName || contract.creditor_phone || contract.creditorPhone}
            </Text>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Descripción</Text>
          <Text style={styles.description}>{contract.description}</Text>
        </View>

        {/* Montos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Montos</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monto solicitado:</Text>
            <Text style={styles.infoValue}>{formatCurrency(contract.requested_amount || contract.requestedAmount || 0)}</Text>
          </View>
          {approvedAmount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto aprobado:</Text>
              <Text style={styles.infoValueBold}>{formatCurrency(approvedAmount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total pagado (confirmado):</Text>
            <Text style={styles.infoValueSuccess}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Saldo pendiente:</Text>
            <Text style={styles.infoValueBold}>{formatCurrency(remaining > 0 ? remaining : 0)}</Text>
          </View>
        </View>

        {/* Fechas */}
       
          <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Fechas</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha propuesta:</Text>
            <Text style={styles.infoValue}>
              {formatDateFromDB(contract.proposed_due_date || contract.proposedDueDate)}
            </Text>
          </View>
          {approvedDueDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha acordada:</Text>
              <Text style={styles.infoValueBold}>
                {formatDateFromDB(approvedDueDate)}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Creado:</Text>
            <Text style={styles.infoValue}>
              {formatTimestampToDate(createdAt, contract.created_date)}
            </Text>
          </View>
          {completedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completado:</Text>
              <Text style={styles.infoValue}>
                {formatTimestampToDate(completedAt, contract.completed_date)}
              </Text>
            </View>
          )}
        </View>

       {/* Comprobante de depósito / Evidencia del servicio */}
        {depositProofUri && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {contract?.type === 'prestamo' ? '🏦 Comprobante de depósito' : '📎 Evidencia del servicio'}
            </Text>
            {depositProofDate && (
              <Text style={styles.depositInfo}>
                {contract?.type === 'prestamo' 
                  ? 'El acreedor realizó el depósito el: ' 
                  : 'La evidencia fue subida el: '}
                {formatTimestampToDate(depositProofDate, contract?.deposit_proof_date_only)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.viewProofButton}
              onPress={() => {
                router.push({
                  pathname: '/view-proof',
                  params: { 
                    uri: depositProofUri, 
                    fileName: depositProofFileName || (contract?.type === 'prestamo' ? 'comprobante-deposito' : 'evidencia-servicio')
                  }
                });
              }}
            >
              <Text style={styles.viewProofText}>
                {contract?.type === 'prestamo' ? '📎 Ver comprobante de depósito' : '📎 Ver evidencia del servicio'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Historial de pagos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Historial de pagos</Text>
            {contract.payments && contract.payments.length > 0 ? (
              // Ordenar pagos de más antiguo a más reciente usando date (timestamp)
          [...contract.payments]
            .sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return dateA - dateB;
            })
            .map((payment: any, index: number) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentNumber}>Pago #{index + 1}</Text>
                  <Text style={[styles.paymentType, payment.type === 'total' ? styles.totalPayment : styles.partialPayment]}>
                    {payment.type === 'total' ? 'Pago total' : 'Pago parcial'}
                  </Text>
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <Text style={styles.paymentDate}>
                    {payment.payment_date 
                      ? formatDateFromDB(payment.payment_date)
                      : formatTimestampToDate(payment.date)
                    }
                  </Text>
                </View>
                
                {/* Indicador de estado de confirmación */}
                <View style={styles.paymentStatus}>
                  <Text style={[styles.paymentStatusText, payment.confirmed ? styles.statusConfirmed : styles.statusPending]}>
                    {payment.confirmed ? '✓ Confirmado por el acreedor' : '⏳ Pendiente de confirmación'}
                  </Text>
                </View>
                
                {payment.proof_uri && (
                  <TouchableOpacity
                    style={styles.viewProofButton}
                    onPress={() => {
                      router.push({
                        pathname: '/view-proof',
                        params: { uri: payment.proof_uri, fileName: payment.proof_file_name || 'comprobante' }
                      });
                    }}
                  >
                    <Text style={styles.viewProofText}>📎 Ver comprobante de pago</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
        ) : (
          <Text style={styles.noPayments}>No hay pagos registrados</Text>
        )}
      </View>

        {/* Blockchain - Solo mostrar si hay transacción */}
        {txId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔗 Blockchain</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction ID:</Text>
              <Text style={styles.txId} numberOfLines={1}>{txId}</Text>
            </View>
            <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyBlockchain}>
              <Text style={styles.verifyButtonText}>Ver en explorador</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón volver */}
        <TouchableOpacity style={styles.backButtonFull} onPress={() => router.back()}>
          <Text style={styles.backButtonFullText}>← Volver al historial</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 20,
  },
  header: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.blanco,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contractId: {
    fontSize: 10,
    color: Colors.grisOscuro,
  },
  card: {
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.grisOscuro,
    width: 110,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.azulMarino,
    flex: 1,
    textAlign: 'right',
  },
  infoValueBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    flex: 1,
    textAlign: 'right',
  },
  infoValueSuccess: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.verdeExito,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grisClaro,
    marginVertical: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.azulMarino,
    lineHeight: 20,
  },
  depositInfo: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 12,
  },
  paymentItem: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.azulMarino,
  },
  paymentType: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  totalPayment: {
    backgroundColor: Colors.verdeExito + '20',
    color: Colors.verdeExito,
  },
  partialPayment: {
    backgroundColor: Colors.verdeOlivo + '20',
    color: Colors.verdeOlivo,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  paymentDate: {
    fontSize: 11,
    color: Colors.grisOscuro,
  },
  paymentStatus: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.grisClaro,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusConfirmed: {
    color: Colors.verdeExito,
  },
  statusPending: {
    color: '#F39C12',
  },
  viewProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.azulMarino + '10',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewProofText: {
    fontSize: 12,
    color: Colors.azulMarino,
    fontWeight: '500',
    marginLeft: 4,
  },
  noPayments: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    paddingVertical: 20,
  },
  txId: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.grisOscuro,
    flex: 1,
    marginLeft: 8,
    textAlign: 'right',
  },
  verifyButton: {
    backgroundColor: Colors.azulMarino,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  verifyButtonText: {
    color: Colors.blanco,
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
  },
  backButtonFull: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonFullText: {
    color: Colors.azulMarino,
    fontSize: 16,
    fontWeight: '500',
  },
});