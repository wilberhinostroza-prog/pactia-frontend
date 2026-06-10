import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { 
  getSession, 
  getUserByEmail, 
  getActiveDebts,
  getActiveLent,
  makePayment, 
  verifyContractOnAlgorand,
  confirmPayment,

} from '../../services/api';
import { Contract, Payment } from '../../types';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ErrorToast } from '../../components/ErrorToast';
import { SuccessToast } from '../../components/SuccessToast';
import { useAsync } from '../../hooks/useAsync';
import { logger } from '../../utils/logger';
import { normalizers } from '../../utils/validators';
import { router } from 'expo-router';
import { ImagePicker } from '../../components/ImagePicker';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { formatDateFromDB, formatTimestampToDate } from '../../utils/dateHelper';

const MODULE = 'HomeScreen';

interface GroupedContracts {
  prestamo: Contract[];
  servicio: Contract[];
}

export default function HomeScreen() {
  const [userPhone, setUserPhone] = useState<string>('');
  const [debtsContracts, setDebtsContracts] = useState<Contract[]>([]);
  const [lentContracts, setLentContracts] = useState<Contract[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success'>('error');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isUploadingPaymentProof, setIsUploadingPaymentProof] = useState(false);
  
  // Estados para la moneda del usuario
  const [currencySymbol, setCurrencySymbol] = useState<string>('S/');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Estados para el pago con adjunto
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [tempPaymentAmount, setTempPaymentAmount] = useState('');
  const [tempSelectedContract, setTempSelectedContract] = useState<Contract | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ uri: string; fileName: string } | null>(null);

  // Estado para pagos pendientes de confirmación
  const [pendingConfirmations, setPendingConfirmations] = useState<{ contract: Contract; payment: Payment }[]>([]);

  const { loading: loadingContracts, execute: executeLoadContracts } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'Error cargando préstamos');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: paying, execute: executePay } = useAsync({
    module: MODULE,
    onSuccess: () => {
      setToastMessage('✓ Pago registrado correctamente');
      setToastType('success');
      setToastVisible(true);
      if (userPhone) {
        loadContracts(userPhone);
      }
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al procesar pago');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: verifying, execute: executeVerify } = useAsync({
    module: MODULE,
    onSuccess: (result) => {
      Linking.openURL(result.explorerUrl);
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al verificar en blockchain');
      setToastType('error');
      setToastVisible(true);
    },
  });

  useEffect(() => {
    loadUserAndContracts();
  }, []);

  // Función para formatear moneda con símbolo dinámico
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toFixed(2)}`;
  };

  const loadUserAndContracts = async () => {
    try {
      const email = await getSession();
      if (email) {
        const user = await getUserByEmail(email);
        setCurrentUser(user);
        // Cargar símbolo de moneda
        if (user.currency_symbol) {
          setCurrencySymbol(user.currency_symbol);
        }
        if (user && user.phone) {
          setUserPhone(user.phone);
          await loadContracts(user.phone);
        } else {
          setToastMessage('Error: Tu cuenta no tiene teléfono registrado');
          setToastType('error');
          setToastVisible(true);
        }
      }
    } catch (error) {
      logger.error(MODULE, 'Error loading user', error);
      setToastMessage('Error al cargar tus datos');
      setToastType('error');
      setToastVisible(true);
    }
  };

  const loadContracts = async (phone: string) => {
    if (!phone) return;
    
    // Préstamos que debo (como deudor)
    const myDebts = await executeLoadContracts(getActiveDebts(phone), 'Cargando mis deudas');
    if (myDebts) {
      const active = myDebts.filter((c: Contract) => c.status === 'aceptado' || c.status === 'activo');
      setDebtsContracts(active);
    }
    
    // Préstamos que me deben (como acreedor)
    const myLent = await executeLoadContracts(getActiveLent(phone), 'Cargando préstamos activos');
    if (myLent) {
      setLentContracts(myLent);
    }
    
    // Cargar pagos pendientes de confirmación
    await loadPendingConfirmations(phone);
  };

  const loadPendingConfirmations = async (phone: string) => {
    const myLent = await getActiveLent(phone);
    const pending: { contract: Contract; payment: Payment }[] = [];
    
    myLent.forEach(contract => {
      contract.payments?.forEach(payment => {
        if (!payment.confirmed) {
          pending.push({ contract, payment });
        }
      });
    });
    
    setPendingConfirmations(pending);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userPhone) {
      await loadContracts(userPhone);
    }
    setRefreshing(false);
  };

  // Función para abrir el modal de pago
  const openPaymentModal = (contract: Contract) => {
    const realRemaining = getRealRemainingAmount(contract);
    if (realRemaining <= 0) {
      setToastMessage('Este pacto ya está pagado');
      setToastType('error');
      setToastVisible(true);
      return;
    }
    setTempSelectedContract(contract);
    setTempPaymentAmount('');
    setAttachedImage(null);
    setPaymentModalVisible(true);
  };

  // Función para manejar adjunto de comprobante desde el modal
  const handleAttachProofFromModal = async (uri: string, fileName: string) => {
    setIsUploadingPaymentProof(true);
    setToastMessage('Subiendo comprobante...');
    setToastType('success');
    setToastVisible(true);
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const filePath = `payments/${tempSelectedContract?.id}/${Date.now()}_${fileName}`;
      
      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, decode(base64), {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);
      
      setAttachedImage({ uri: urlData.publicUrl, fileName });
      setToastMessage('✓ Comprobante subido a la nube');
      setToastType('success');
      setToastVisible(true);
      
    } catch (error: any) {
      console.error('Error subiendo comprobante de pago:', error);
      setToastMessage(error.message || 'Error al subir el comprobante');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setIsUploadingPaymentProof(false);
    }
  };

  // Función para procesar pago con comprobante (obligatorio)
  const handlePaymentWithProof = async () => {
    if (!tempSelectedContract) return;

    // Validar que haya comprobante adjunto
    if (!attachedImage) {
      setToastMessage('Debes adjuntar un comprobante de pago');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    const amount = parseFloat(tempPaymentAmount);
    const realRemaining = getRealRemainingAmount(tempSelectedContract);

    if (isNaN(amount) || amount <= 0) {
      setToastMessage('Ingresa un monto válido');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (amount > realRemaining) {
      setToastMessage(`El monto no puede superar ${formatCurrency(realRemaining)}`);
      setToastType('error');
      setToastVisible(true);
      return;
    }

    setPaymentModalVisible(false);
    
    await executePay(
      makePayment(
        tempSelectedContract.id, 
        amount,
        attachedImage.uri,
        attachedImage.fileName
      ), 
      'Procesando pago'
    );
    
    setTempSelectedContract(null);
    setAttachedImage(null);
    setTempPaymentAmount('');
  };

  // Función para confirmar pago (como acreedor)
  const handleConfirmPayment = async (contractId: string, paymentId: string) => {
    try {
      await confirmPayment(contractId, paymentId, userPhone);
      await loadContracts(userPhone);
      setToastMessage('✓ Pago confirmado');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      setToastMessage('Error al confirmar pago');
      setToastType('error');
      setToastVisible(true);
    }
  };

  const handleContractPress = (contract: Contract) => {
    router.push(`/loan-detail?contractId=${contract.id}`);
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

  const getRealRemainingAmount = (contract: Contract): number => {
    const originalAmount = contract.approved_amount || contract.requested_amount || 0;
    const confirmedTotal = contract.payments
      ?.filter(p => p.confirmed)
      .reduce((sum, p) => sum + p.amount, 0) || 0;
    return originalAmount - confirmedTotal;
  };

  const getTypeIcon = (type: string) => type === 'prestamo' ? '💰' : '🤝';
  const getTypeTitle = (type: string) => type === 'prestamo' ? 'Préstamos' : 'Servicios';

  const getCounterpartyDisplay = (contract: Contract, isDebtor: boolean): string => {
    if (isDebtor) {
      return contract.creditor_name 
        ? `${contract.creditor_name} (${contract.creditor_phone})` 
        : contract.creditor_phone;
    } else {
      return contract.debtor_name 
        ? `${contract.debtor_name} (${contract.debtor_phone})` 
        : contract.debtor_phone;
    }
  };

  const groupByType = (contracts: Contract[]): GroupedContracts => {
    return contracts.reduce((acc, contract) => {
      if (contract.type === 'prestamo') {
        acc.prestamo.push(contract);
      } else {
        acc.servicio.push(contract);
      }
      return acc;
    }, { prestamo: [], servicio: [] } as GroupedContracts);
  };

  const getStats = (contracts: Contract[]) => {
    const totalAmount = contracts.reduce((sum, c) => sum + (c.approved_amount || c.requested_amount || 0), 0);
    const totalRemaining = contracts.reduce((sum, c) => {
      const original = c.approved_amount || c.requested_amount || 0;
      const confirmedTotal = c.payments?.filter(p => p.confirmed).reduce((s, p) => s + p.amount, 0) || 0;
      return sum + (original - confirmedTotal);
    }, 0);
    return { count: contracts.length, totalAmount, totalRemaining };
  };

  const debtsByType = groupByType(debtsContracts);
  const lentByType = groupByType(lentContracts);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderContractCard = (contract: Contract, role: 'debtor' | 'creditor') => {
    const isDebtor = role === 'debtor';
    const counterpartyLabel = isDebtor ? 'Acreedor' : 'Deudor';
    const counterpartyDisplay = getCounterpartyDisplay(contract, isDebtor);
    const realRemaining = getRealRemainingAmount(contract);
    const hasPending = contract.payments?.some(p => !p.confirmed) || false;
    
    // Obtener la fecha de vencimiento (priorizar approved_due_date sobre proposed_due_date)
    const dueDate = contract.approved_due_date || contract.proposed_due_date;

    return (
      <TouchableOpacity
        key={contract.id}
        style={styles.contractCard}
        onPress={() => handleContractPress(contract)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>{getTypeIcon(contract.type)}</Text>
            <Text style={styles.typeText}>
              {contract.type === 'prestamo' ? 'Préstamo' : 'Servicio'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
              {getStatusText(contract.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.counterparty}>
          {counterpartyLabel}: {counterpartyDisplay}
        </Text>
        
        <Text style={styles.description} numberOfLines={2}>
          {contract.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.amount}>
            Monto: {formatCurrency(contract.approved_amount || contract.requested_amount || 0)}
          </Text>
          <Text style={styles.dueDate}>
            Vence: {dueDate ? formatDateFromDB(dueDate) : 'No especificada'}
          </Text>
        </View>

        <View style={styles.remainingContainer}>
          <Text style={styles.remainingText}>
            Saldo pendiente: {formatCurrency(realRemaining)}
          </Text>
          {hasPending && (
            <Text style={styles.pendingText}>
              ⏳ {contract.payments?.filter(p => !p.confirmed).length} pago(s) pendiente(s) de confirmación
            </Text>
          )}
        </View>

        {isDebtor && (contract.status === 'aceptado' || contract.status === 'activo') && realRemaining > 0 && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => openPaymentModal(contract)}
          >
            <Text style={styles.payButtonText}>Realizar pago</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (
    title: string,
    icon: string,
    contracts: Contract[],
    role: 'debtor' | 'creditor',
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    const stats = getStats(contracts);
    
    if (contracts.length === 0 && !isExpanded) return null;

    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <View style={styles.sectionStats}>
            <Text style={styles.sectionCount}>{stats.count} pacto{stats.count !== 1 ? 's' : ''}</Text>
            <Text style={styles.sectionTotal}>Total: {formatCurrency(stats.totalAmount)}</Text>
            <Text style={styles.sectionRemaining}>Pendiente: {formatCurrency(stats.totalRemaining)}</Text>
            <Text style={styles.sectionExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {contracts.length === 0 ? (
              <Text style={styles.emptySectionText}>No hay {title.toLowerCase()} activos</Text>
            ) : (
              contracts.map(contract => renderContractCard(contract, role))
            )}
          </View>
        )}
      </View>
    );
  };

  if (loadingContracts && debtsContracts.length === 0 && lentContracts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
        <Text style={styles.loadingText}>Cargando tus pactos...</Text>
      </View>
    );
  }

  return (
    <>
      <LoadingOverlay visible={paying} message="Procesando pago..." />
      <LoadingOverlay visible={verifying} message="Verificando en blockchain..." />
      
      <ErrorToast visible={toastVisible && toastType === 'error'} message={toastMessage} onHide={() => setToastVisible(false)} />
      <SuccessToast visible={toastVisible && toastType === 'success'} message={toastMessage} onHide={() => setToastVisible(false)} />

      <ImagePicker
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onSelectImage={handleAttachProofFromModal}
        title="Adjuntar comprobante de pago"
      />
      
      {isUploadingPaymentProof && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={Colors.verdeOlivo} />
          <Text style={styles.uploadingText}>Subiendo comprobante...</Text>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Mis pactos</Text>
          <Text style={styles.subGreeting}>
            {debtsContracts.length + lentContracts.length} activos
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Sección: Préstamos que debo */}
          {renderSection(
            'Préstamos que debo',
            '💰',
            debtsContracts.filter(c => c.type === 'prestamo'),
            'debtor',
            expandedSection === 'debts_prestamo',
            () => toggleSection('debts_prestamo')
          )}

          {/* Sección: Servicios que debo */}
          {renderSection(
            'Servicios que debo',
            '🤝',
            debtsContracts.filter(c => c.type === 'servicio'),
            'debtor',
            expandedSection === 'debts_servicio',
            () => toggleSection('debts_servicio')
          )}

          {/* Separador entre deudas y préstamos otorgados */}
          {(debtsContracts.length > 0 && lentContracts.length > 0) && (
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Lo que me deben</Text>
              <View style={styles.separatorLine} />
            </View>
          )}

          {/* Sección: Préstamos que me deben */}
          {renderSection(
            'Préstamos que me deben',
            '💰',
            lentContracts.filter(c => c.type === 'prestamo'),
            'creditor',
            expandedSection === 'lent_prestamo',
            () => toggleSection('lent_prestamo')
          )}

          {/* Sección: Servicios que me deben */}
          {renderSection(
            'Servicios que me deben',
            '🤝',
            lentContracts.filter(c => c.type === 'servicio'),
            'creditor',
            expandedSection === 'lent_servicio',
            () => toggleSection('lent_servicio')
          )}

          {/* Sección: Pagos pendientes de confirmar (solo para acreedor) */}
          {pendingConfirmations.length > 0 && (
            <>
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>📋 Pagos pendientes de confirmar</Text>
                <View style={styles.separatorLine} />
              </View>
              
              {pendingConfirmations.map(({ contract, payment }) => (
                <View key={payment.id} style={styles.pendingPaymentCard}>
                  <View style={styles.pendingPaymentHeader}>
                    <Text style={styles.pendingPaymentDeudor}>
                      Deudor: {contract.debtor_name || contract.debtor_phone}
                    </Text>
                    <Text style={styles.pendingPaymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  
                  <Text style={styles.pendingPaymentDesc} numberOfLines={2}>
                    {contract.description}
                  </Text>
                  
                  <View style={styles.pendingPaymentDetails}>
                    <Text style={styles.pendingPaymentDate}>
                      📅 Pagado el: {formatTimestampToDate(payment.date, payment.payment_date)}
                    </Text>
                    <Text style={styles.pendingPaymentType}>
                      {payment.type === 'total' ? 'Pago total' : 'Pago parcial'}
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
                      <Text style={styles.viewProofText}>📎 Ver comprobante</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleConfirmPayment(contract.id, payment.id)}
                  >
                    <Text style={styles.confirmButtonText}>✓ Confirmar pago</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {debtsContracts.length === 0 && lentContracts.length === 0 && pendingConfirmations.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No tienes pactos activos</Text>
              <Text style={styles.emptyText}>
                Solicita tu primer préstamo o servicio desde el botón "+"
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal para pago parcial con adjunto (comprobante obligatorio) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => {
          setPaymentModalVisible(false);
          setTempSelectedContract(null);
          setAttachedImage(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Realizar pago</Text>
            
            {tempSelectedContract && (
              <>
                <Text style={styles.modalSubtitle}>
                  Pacto: {tempSelectedContract.type === 'prestamo' ? 'Préstamo' : 'Servicio'}
                </Text>
                <Text style={styles.modalBalance}>
                  Saldo pendiente: {formatCurrency(getRealRemainingAmount(tempSelectedContract))}
                </Text>
                
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Monto a pagar ({currencySymbol})</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={tempPaymentAmount}
                    onChangeText={setTempPaymentAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.attachProofButton, attachedImage && styles.attachProofButtonAttached]}
                  onPress={() => setImagePickerVisible(true)}
                >
                  <Text style={styles.attachProofButtonText}>
                    {attachedImage ? '✓ Comprobante adjuntado' : '📎 Adjuntar comprobante de pago *'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setPaymentModalVisible(false);
                      setTempSelectedContract(null);
                      setAttachedImage(null);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.modalConfirmButton,
                      (!attachedImage || paying) && styles.modalConfirmButtonDisabled
                    ]}
                    onPress={handlePaymentWithProof}
                    disabled={!attachedImage || paying}
                  >
                    <Text style={styles.modalConfirmText}>
                      {attachedImage ? 'Pagar' : 'Adjunta un comprobante'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.blanco,
  },
  subGreeting: {
    fontSize: 14,
    color: Colors.blanco,
    opacity: 0.7,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
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
  sectionHeader: {
    padding: 16,
    backgroundColor: Colors.blanco,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  sectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.grisOscuro,
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionTotal: {
    fontSize: 12,
    color: Colors.verdeOlivo,
    fontWeight: '500',
  },
  sectionRemaining: {
    fontSize: 12,
    color: Colors.azulMarino,
    fontWeight: '500',
  },
  sectionExpandIcon: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.grisClaro,
  },
  contractCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.grisOscuro,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  counterparty: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 8,
  },
  cardFooter: {
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
  dueDate: {
    fontSize: 10,
    color: Colors.grisOscuro,
  },
  remainingContainer: {
    marginTop: 4,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.azulMarino,
  },
  pendingText: {
    fontSize: 10,
    color: '#F39C12',
    marginTop: 4,
    fontStyle: 'italic',
  },
  payButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  payButtonText: {
    color: Colors.blanco,
    fontSize: 12,
    fontWeight: '600',
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
  emptySectionText: {
    fontSize: 12,
    color: Colors.grisOscuro,
    textAlign: 'center',
    paddingVertical: 16,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grisClaro,
  },
  separatorText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.grisOscuro,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.grisOscuro,
    marginBottom: 8,
  },
  modalBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.azulMarino,
  },
  attachProofButton: {
    backgroundColor: Colors.azulMarino + '10',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.azulMarino + '30',
    borderStyle: 'dashed',
  },
  attachProofButtonAttached: {
    backgroundColor: Colors.verdeExito + '10',
    borderColor: Colors.verdeExito,
  },
  attachProofButtonText: {
    fontSize: 14,
    color: Colors.azulMarino,
    fontWeight: '500',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.grisClaro,
  },
  modalCancelText: {
    color: Colors.grisOscuro,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.verdeOlivo,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: Colors.grisClaro,
  },
  modalConfirmText: {
    color: Colors.blanco,
    fontWeight: '600',
  },
  pendingPaymentCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  pendingPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingPaymentDeudor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  pendingPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  pendingPaymentDesc: {
    fontSize: 13,
    color: Colors.grisOscuro,
    marginBottom: 8,
  },
  pendingPaymentDate: {
    fontSize: 11,
    color: Colors.grisOscuro,
  },
  confirmButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: Colors.blanco,
    fontSize: 14,
    fontWeight: '600',
  },
  viewProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.azulMarino + '10',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  viewProofText: {
    fontSize: 12,
    color: Colors.azulMarino,
    fontWeight: '500',
    marginLeft: 4,
  },
  pendingPaymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingPaymentType: {
    fontSize: 11,
    color: Colors.verdeOlivo,
    fontWeight: '500',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    marginTop: 12,
    color: Colors.blanco,
    fontSize: 16,
  },
});