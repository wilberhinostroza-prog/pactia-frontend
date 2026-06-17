import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { 
  getSession, 
  getUserByEmail, 
  getPendingRequests, 
  getSentRequests,
  approveLoan, 
  rejectLoan, 
  getAllUserContracts,
  getSubscription,
  upgradeSubscription,
  getApprovedServicesCount,
} from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ErrorToast } from '../../components/ErrorToast';
import { SuccessToast } from '../../components/SuccessToast';
import { useAsync } from '../../hooks/useAsync';
import { logger } from '../../utils/logger';
import { normalizers } from '../../utils/validators';
import { DatePicker } from '../../components/DatePicker';
import { ImagePicker } from '../../components/ImagePicker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { formatDateForDB } from '../../utils/dateHelper';

const MODULE = 'PendingRequestsScreen';
const FREE_SERVICE_LIMIT = 10; // ← Unificar con el límite global

export default function PendingRequestsScreen() {
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState<string>('S/');
  const [subscription, setSubscription] = useState({ active: false, plan: 'free' });
  const [approvedServicesCount, setApprovedServicesCount] = useState(0);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedDueDate, setApprovedDueDate] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success'>('error');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  
  // Estado para el calendario dentro del modal
  const [calendarVisible, setCalendarVisible] = useState(false);
  
  // Estado para el comprobante de depósito del acreedor
  const [depositImagePickerVisible, setDepositImagePickerVisible] = useState(false);
  const [depositImage, setDepositImage] = useState<{ uri: string; fileName: string } | null>(null);
  
  // Estados para secciones expandibles
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedDirection, setExpandedDirection] = useState<string | null>(null);

  // Estado para el modal de historial de crédito
  const [creditHistoryVisible, setCreditHistoryVisible] = useState(false);
  const [selectedDebtorPhone, setSelectedDebtorPhone] = useState('');
  const [selectedDebtorName, setSelectedDebtorName] = useState('');
  const [debtorContracts, setDebtorContracts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estado para modal de suscripción
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Estado para modal de límite de servicios
  const [serviceLimitModalVisible, setServiceLimitModalVisible] = useState(false);

  // Función para obtener campo de forma segura
  const getField = (obj: any, camelField: string, snakeField: string): any => {
    return obj[camelField] !== undefined ? obj[camelField] : obj[snakeField];
  };

  // Formatear moneda con símbolo dinámico
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toFixed(2)}`;
  };

  const { loading: loadingRequests, execute: executeLoadReceived } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'Error cargando solicitudes');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: loadingSent, execute: executeLoadSent } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'Error cargando solicitudes enviadas');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: approving, execute: executeApprove } = useAsync({
    module: MODULE,
    onSuccess: () => {
      const type = selectedRequest?.type;
      const message = type === 'prestamo' 
        ? '✓ Préstamo aprobado' 
        : '✓ Servicio aprobado';
      setToastMessage(message);
      setToastType('success');
      setToastVisible(true);
      setModalVisible(false);
      
      // Recargar datos
      if (userPhone) {
        loadReceivedRequests(userPhone);
        loadSentRequests(userPhone);
        loadApprovedServicesCount(userPhone);
      }
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al aprobar');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: rejecting, execute: executeReject } = useAsync({
    module: MODULE,
    onSuccess: () => {
      setToastMessage('✓ Solicitud rechazada');
      setToastType('success');
      setToastVisible(true);
      if (userPhone) {
        loadAllRequests(userPhone);
      }
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al rechazar');
      setToastType('error');
      setToastVisible(true);
    },
  });

  useEffect(() => {
    loadUserAndRequests();
  }, []);

  const loadUserAndRequests = async () => {
    try {
      const email = await getSession();
      if (email) {
        setUserEmail(email);
        const user = await getUserByEmail(email);
        setCurrentUser(user);
        
        // Cargar símbolo de moneda
        if (user.currency_symbol) {
          setCurrencySymbol(user.currency_symbol);
        }
        
        const sub = await getSubscription(email);
        setSubscription(sub);
        
        if (user && user.phone) {
          setUserPhone(user.phone);
          await loadAllRequests(user.phone);
          await loadApprovedServicesCount(user.phone);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadAllRequests = async (phone: string) => {
    if (!phone) return;
    await Promise.all([
      loadReceivedRequests(phone),
      loadSentRequests(phone),
    ]);
  };

  const loadReceivedRequests = async (phone: string) => {
    const pendingRequests = await executeLoadReceived(getPendingRequests(phone), 'Cargando solicitudes recibidas');
    if (pendingRequests) {
      const pending = pendingRequests.filter((c: any) => c.status === 'solicitado');
      setReceivedRequests(pending);
      logger.info(MODULE, 'Solicitudes recibidas cargadas', { total: pending.length });
    }
  };

  const loadSentRequests = async (phone: string) => {
    const sentRequestsData = await executeLoadSent(getSentRequests(phone), 'Cargando solicitudes enviadas');
    if (sentRequestsData) {
      setSentRequests(sentRequestsData);
      logger.info(MODULE, 'Solicitudes enviadas cargadas', { total: sentRequestsData.length });
    }
  };

  const loadApprovedServicesCount = async (phone: string) => {
    const count = await getApprovedServicesCount(phone);
    setApprovedServicesCount(count);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userPhone) {
      await loadAllRequests(userPhone);
      await loadApprovedServicesCount(userPhone);
    }
    setRefreshing(false);
  };

  const canAcceptService = (): boolean => {
    if (subscription.active) return true;
    return approvedServicesCount < FREE_SERVICE_LIMIT;
  };

  const canViewCreditHistory = (contractType: string): boolean => {
    if (contractType !== 'prestamo') return false;
    return subscription.active;
  };

  const viewCreditHistory = async (debtorPhone: string, debtorName?: string) => {
    if (!canViewCreditHistory('prestamo')) return;
    
    setSelectedDebtorPhone(debtorPhone);
    setSelectedDebtorName(debtorName || debtorPhone);
    setCreditHistoryVisible(true);
    setLoadingHistory(true);
    
    try {
      const allContracts = await getAllUserContracts(debtorPhone);
      setDebtorContracts(allContracts);
    } catch (error) {
      setToastMessage('Error cargando historial de crédito');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenApproveModal = (request: any) => {
  if (request.type === 'servicio' && !canAcceptService()) {
    setServiceLimitModalVisible(true);
    return;
  }
  setSelectedRequest(request);
  
  // Obtener el monto correcto (requested_amount o requestedAmount)
  const requestedAmount = request.requested_amount || request.requestedAmount || 0;
  setApprovedAmount(requestedAmount.toString());
  
  const dueDate = request.proposed_due_date || request.proposedDueDate || '';
  setApprovedDueDate(dueDate);
  setDepositImage(null);
  setModalVisible(true);
};

  const handleUpgradeSubscription = async (plan: 'monthly' | 'yearly') => {
    setUpgrading(true);
    try {
      await upgradeSubscription(userEmail, plan);
      const updatedSub = await getSubscription(userEmail);
      setSubscription(updatedSub);
      setSubscriptionModalVisible(false);
      setToastMessage(`✓ Suscripción ${plan === 'monthly' ? 'mensual' : 'anual'} activada`);
      setToastType('success');
      setToastVisible(true);
      if (userPhone) {
        await loadApprovedServicesCount(userPhone);
      }
    } catch (error) {
      setToastMessage('Error al activar suscripción');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setUpgrading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const amount = parseFloat(approvedAmount);
    if (isNaN(amount) || amount <= 0) {
      setToastMessage('Monto inválido');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!approvedDueDate || approvedDueDate.length !== 10) {
      setToastMessage('Fecha inválida (DD/MM/AAAA)');
      setToastType('error');
      setToastVisible(true);
      return;
    }
    const dueDateForDB = formatDateForDB(approvedDueDate);

    await executeApprove(
      approveLoan(
        selectedRequest.id, 
        amount, 
        dueDateForDB,
        depositImage?.uri,
        depositImage?.fileName
      ), 
      'Aprobando'
    );
  };

  const handleAttachDepositProof = async (uri: string, fileName: string) => {
    setIsUploadingProof(true);
    setToastMessage('Subiendo comprobante...');
    setToastType('success');
    setToastVisible(true);
  
    try {
      // Obtener la extensión del archivo
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
    
      // Leer la imagen como base64 usando fetch (más confiable)
      const response = await fetch(uri);
      const blob = await response.blob();
    
      // Convertir blob a base64 usando FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover el prefijo "data:image/xxx;base64,"
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Generar una ruta única en el bucket
    const filePath = `deposits/${selectedRequest?.id}/${Date.now()}_${fileName}`;
    
    // Subir a Supabase Storage
    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, decode(base64), {
        contentType: mimeType,
        upsert: true,
      });
    
    if (error) throw error;
    
    // Obtener la URL pública
    const { data: urlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);
      setDepositImage({ uri: urlData.publicUrl, fileName });
      setToastMessage('✓ Comprobante subido correctamente');
      setToastType('success');
      setToastVisible(true);
    
    } catch (error: any) {
      console.error('Error subiendo comprobante:', error);
      setToastMessage(error.message || 'Error al subir el comprobante');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleReject = async (request: any) => {
    Alert.alert(
      'Rechazar solicitud',
      '¿Estás seguro que deseas rechazar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            await executeReject(rejectLoan(request.id), 'Rechazando solicitud');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado': return '#F39C12';
      case 'aceptado': return Colors.verdeOlivo;
      case 'pagado': return Colors.verdeExito;
      case 'rechazado': return Colors.rojoError;
      default: return Colors.grisOscuro;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'solicitado': return 'Pendiente';
      case 'aceptado': return 'Aprobado';
      case 'pagado': return 'Pagado';
      case 'rechazado': return 'Rechazado';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => type === 'prestamo' ? '💰' : '🤝';
  const getTypeTitle = (type: string) => type === 'prestamo' ? 'Préstamos' : 'Servicios';

  const groupByType = (contracts: any[]) => {
    return {
      prestamo: contracts.filter(c => c.type === 'prestamo'),
      servicio: contracts.filter(c => c.type === 'servicio'),
    };
  };

  const groupByDirection = (contracts: any[]) => {
    return {
      received: contracts.filter(c => (c.creditor_phone || c.creditorPhone) === userPhone),
      sent: contracts.filter(c => (c.debtor_phone || c.debtorPhone) === userPhone),
    };
  };

  const toggleType = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
    setExpandedDirection(null);
  };

  const toggleDirection = (direction: string) => {
    setExpandedDirection(expandedDirection === direction ? null : direction);
  };

  const renderRequestCard = (request: any, direction: 'received' | 'sent') => {
    const isReceived = direction === 'received';
    const debtorName = getField(request, 'debtorName', 'debtor_name');
    const debtorPhone = getField(request, 'debtorPhone', 'debtor_phone');
    const creditorName = getField(request, 'creditorName', 'creditor_name');
    const creditorPhone = getField(request, 'creditorPhone', 'creditor_phone');
    const requestedAmount = getField(request, 'requestedAmount', 'requested_amount');
    const proposedDueDate = getField(request, 'proposedDueDate', 'proposed_due_date');
    
    const counterparty = isReceived ? (debtorName || debtorPhone) : (creditorName || creditorPhone);
    const counterpartyLabel = isReceived ? 'Solicitante' : 'Enviado a';
    const showActions = isReceived && request.status === 'solicitado';

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeContainer}>
            <Text style={styles.cardTypeIcon}>{getTypeIcon(request.type)}</Text>
            <Text style={styles.cardTypeText}>
              {request.type === 'prestamo' ? 'Préstamo' : 'Servicio'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
              {getStatusText(request.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.counterparty}>
          {counterpartyLabel}: {counterparty}
        </Text>
        
        <Text style={styles.description} numberOfLines={2}>
          {request.description}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {request.type === 'prestamo' ? 'Monto solicitado:' : 'Detalle:'}
            </Text>
            <Text style={styles.detailValue}>
              {request.type === 'prestamo' 
                ? formatCurrency(requestedAmount)
                : request.description}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha propuesta:</Text>
            <Text style={styles.detailValue}>{proposedDueDate}</Text>
          </View>
        </View>

        {isReceived && request.type === 'prestamo' && (
          <>
            <TouchableOpacity
              style={[styles.creditButton, !subscription.active && styles.creditButtonDisabled]}
              onPress={() => viewCreditHistory(debtorPhone, debtorName)}
              disabled={!subscription.active}
            >
              <Text style={[styles.creditButtonText, !subscription.active && styles.creditButtonTextDisabled]}>
                📊 Ver historial de crédito
              </Text>
            </TouchableOpacity>
            
            {!subscription.active && (
              <View style={styles.upgradeMessageContainer}>
                <Text style={styles.upgradeMessageText}>
                  🔒 Para ver el historial de crédito debes estar suscrito
                </Text>
                <TouchableOpacity
                  style={styles.upgradeLink}
                  onPress={() => setSubscriptionModalVisible(true)}
                >
                  <Text style={styles.upgradeLinkText}>Ver planes de suscripción →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {showActions && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleOpenApproveModal(request)}
              disabled={approving || rejecting}
            >
              <Text style={styles.approveButtonText}>✓ Aprobar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(request)}
              disabled={approving || rejecting}
            >
              <Text style={styles.rejectButtonText}>✗ Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ... (el resto de los componentes modales y estilos continúan igual)
  // Los modales CreditHistoryModal, SubscriptionModal, ServiceLimitModal
  // y los estilos se mantienen igual, solo actualizando el símbolo de moneda
  // donde se use normalizers.currency() por formatCurrency()

  const renderDirectionSection = (
    directionKey: string,
    title: string,
    icon: string,
    contracts: any[],
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    if (contracts.length === 0) return null;

    return (
      <View style={styles.directionSection}>
        <TouchableOpacity style={styles.directionHeader} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.directionTitleContainer}>
            <Text style={styles.directionIcon}>{icon}</Text>
            <Text style={styles.directionTitle}>{title}</Text>
          </View>
          <View style={styles.directionStats}>
            <Text style={styles.directionCount}>{contracts.length} solicitud{contracts.length !== 1 ? 'es' : ''}</Text>
            <Text style={styles.directionExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.directionContent}>
            {contracts.map(contract => renderRequestCard(contract, directionKey === 'received' ? 'received' : 'sent'))}
          </View>
        )}
      </View>
    );
  };

  const renderTypeSection = (typeKey: string, title: string, icon: string, contracts: any[]) => {
    const directionGroups = groupByDirection(contracts);
    const totalCount = contracts.length;
    
    if (totalCount === 0) return null;

    const isExpanded = expandedType === typeKey;

    return (
      <View style={styles.typeSection}>
        <TouchableOpacity style={styles.typeHeader} onPress={() => toggleType(typeKey)} activeOpacity={0.7}>
          <View style={styles.typeTitleContainer}>
            <Text style={styles.typeIconLarge}>{icon}</Text>
            <Text style={styles.typeTitle}>{title}</Text>
          </View>
          <View style={styles.typeStats}>
            <Text style={styles.typeCount}>{totalCount} pacto{totalCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.typeExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.typeContent}>
            {renderDirectionSection(
              'received',
              'Recibidas',
              '📥',
              directionGroups.received,
              expandedDirection === `${typeKey}_received`,
              () => toggleDirection(`${typeKey}_received`)
            )}
            {renderDirectionSection(
              'sent',
              'Enviadas',
              '📤',
              directionGroups.sent,
              expandedDirection === `${typeKey}_sent`,
              () => toggleDirection(`${typeKey}_sent`)
            )}
          </View>
        )}
      </View>
    );
  };

  const allContracts = [...receivedRequests, ...sentRequests];
  const groupedByType = groupByType(allContracts);

  if (loadingRequests && loadingSent && receivedRequests.length === 0 && sentRequests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <>
      <LoadingOverlay visible={approving} message="Procesando..." />
      <LoadingOverlay visible={rejecting} message="Procesando..." />
      <LoadingOverlay visible={loadingHistory} message="Cargando historial..." />
      <LoadingOverlay visible={upgrading} message="Procesando suscripción..." />
      
      <ErrorToast visible={toastVisible && toastType === 'error'} message={toastMessage} onHide={() => setToastVisible(false)} />
      <SuccessToast visible={toastVisible && toastType === 'success'} message={toastMessage} onHide={() => setToastVisible(false)} />

      {/* CreditHistoryModal - actualizar formatos de moneda */}
      {/* SubscriptionModal - sin cambios */}
      {/* ServiceLimitModal - sin cambios */}

      <DatePicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={(date, formattedDate) => {
          setApprovedDueDate(formattedDate);
          setCalendarVisible(false);
        }}
        initialDate={new Date()}
        title="Seleccionar fecha"
      />

      <ImagePicker
        visible={depositImagePickerVisible}
        onClose={() => setDepositImagePickerVisible(false)}
        onSelectImage={handleAttachDepositProof}
        title="Adjuntar comprobante de depósito"
        confirmButtonText="Adjuntar"
      />

      {isUploadingProof && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={Colors.verdeOlivo} />
          <Text style={styles.uploadingText}>Subiendo comprobante...</Text>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Solicitudes</Text>
          <Text style={styles.subtitle}>
            Gestiona las solicitudes que recibes y envías
          </Text>
          <View style={styles.planIndicator}>
            <Text style={styles.planIndicatorText}>
              {subscription.active 
                ? `🔓 Plan ${subscription.plan === 'yearly' ? 'Anual' : 'Mensual'} activo` 
                : `🔒 Plan Gratuito (${FREE_SERVICE_LIMIT - approvedServicesCount} servicios disponibles)`}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderTypeSection('prestamo', 'Préstamos', '💰', groupedByType.prestamo)}
          {renderTypeSection('servicio', 'Servicios', '🤝', groupedByType.servicio)}
          
          {receivedRequests.length === 0 && sentRequests.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No hay solicitudes</Text>
              <Text style={styles.emptyText}>
                Cuando alguien te solicite un pacto o tú envíes uno, aparecerá aquí
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal para aprobar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedRequest?.type === 'prestamo' ? 'Aprobar préstamo' : 'Aprobar servicio'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedRequest?.type === 'prestamo' 
                ? 'Puedes ajustar el monto y la fecha' 
                : 'Confirma el monto y la fecha del servicio'}
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>
                {selectedRequest?.type === 'prestamo' ? `Monto a prestar (${currencySymbol})` : `Monto del servicio (${currencySymbol})`}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={approvedAmount}
                onChangeText={setApprovedAmount}
                keyboardType="numeric"
                placeholder={selectedRequest ? formatCurrency(selectedRequest.requested_amount || selectedRequest.requestedAmount || 0) : "0.00"}
              />
              {selectedRequest && (
              <Text style={styles.modalHint}>
                💡 Monto solicitado: {formatCurrency(selectedRequest.requested_amount || selectedRequest.requestedAmount || 0)}
              </Text>
              )}
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>
                {selectedRequest?.type === 'prestamo' ? 'Fecha de pago' : 'Fecha de realización'}
              </Text>
              <TouchableOpacity
                style={styles.modalDateButton}
                onPress={() => setCalendarVisible(true)}
              >
                <Text style={[styles.modalDateText, approvedDueDate ? styles.modalDateTextFilled : {}]}>
                  {approvedDueDate || 'Seleccionar fecha'}
                </Text>
                <Text style={styles.modalCalendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Botón para adjuntar comprobante/evidencia (para préstamos y servicios) */}
            <TouchableOpacity
              style={[styles.depositButton, depositImage && styles.depositButtonAttached]}
              onPress={() => setDepositImagePickerVisible(true)}
              >
              <Text style={styles.depositButtonText}>
                {depositImage 
                  ? '✓ Evidencia adjuntada' 
                  : (selectedRequest?.type === 'prestamo' 
                  ? '📎 Adjuntar comprobante de depósito' 
                  : '📎 Adjuntar evidencia del servicio')}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setDepositImage(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleApprove}
                disabled={approving}
              >
                <Text style={styles.modalConfirmText}>Aprobar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Los estilos se mantienen igual, solo actualizar el símbolo de moneda donde se use
// Copiar los estilos del archivo original

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
  planIndicator: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planIndicatorText: {
    fontSize: 11,
    color: Colors.blanco,
  },
  scrollContent: {
    padding: 16,
  },
  typeSection: {
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
  typeIconLarge: {
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
  },
  typeCount: {
    fontSize: 12,
    color: Colors.grisOscuro,
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
  directionSection: {
    marginTop: 8,
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    overflow: 'hidden',
  },
  directionHeader: {
    padding: 12,
    backgroundColor: Colors.blanco,
  },
  directionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  directionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  directionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.azulMarino,
  },
  directionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionCount: {
    fontSize: 11,
    color: Colors.grisOscuro,
    backgroundColor: Colors.grisClaro,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  directionExpandIcon: {
    fontSize: 10,
    color: Colors.grisOscuro,
  },
  directionContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: Colors.grisClaro,
  },
  requestCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  cardTypeText: {
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
  detailsContainer: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.grisOscuro,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.azulMarino,
  },
  creditButton: {
    backgroundColor: Colors.azulMarino + '10',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.azulMarino + '30',
  },
  creditButtonDisabled: {
    backgroundColor: Colors.grisClaro,
    borderColor: Colors.grisOscuro + '30',
  },
  creditButtonText: {
    color: Colors.azulMarino,
    fontSize: 12,
    fontWeight: '500',
  },
  creditButtonTextDisabled: {
    color: Colors.grisOscuro,
  },
  upgradeMessageContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  upgradeMessageText: {
    fontSize: 10,
    color: '#E67E22',
    marginBottom: 4,
  },
  upgradeLink: {
    paddingVertical: 2,
  },
  upgradeLinkText: {
    fontSize: 11,
    color: Colors.verdeOlivo,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.verdeOlivo,
  },
  approveButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
    fontSize: 12,
  },
  rejectButton: {
    backgroundColor: Colors.blanco,
    borderWidth: 1,
    borderColor: Colors.rojoError,
  },
  rejectButtonText: {
    color: Colors.rojoError,
    fontWeight: '600',
    fontSize: 12,
  },
  depositButton: {
    backgroundColor: Colors.azulMarino + '10',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.azulMarino + '30',
    borderStyle: 'dashed',
  },
  depositButtonAttached: {
    backgroundColor: Colors.verdeExito + '10',
    borderColor: Colors.verdeExito,
  },
  depositButtonText: {
    fontSize: 14,
    color: Colors.azulMarino,
    fontWeight: '500',
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
  creditModalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  creditModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  creditModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.grisOscuro,
    padding: 4,
  },
  debtorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    textAlign: 'center',
    marginTop: 12,
  },
  debtorPhone: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    marginBottom: 12,
  },
  scoreContainer: {
    backgroundColor: Colors.grisClaro,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  creditScroll: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  creditSection: {
    marginBottom: 20,
  },
  creditSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  creditSummary: {
    backgroundColor: Colors.grisClaro,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.azulMarino,
  },
  creditItem: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  creditItemDesc: {
    fontSize: 12,
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  creditItemAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  creditItemDate: {
    fontSize: 10,
    color: Colors.grisOscuro,
    marginTop: 2,
  },
  noDataText: {
    fontSize: 12,
    color: Colors.grisOscuro,
    fontStyle: 'italic',
    padding: 8,
  },
  closeModalButton: {
    backgroundColor: Colors.verdeOlivo,
    margin: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: Colors.blanco,
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionModalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  subscriptionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  subscriptionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    lineHeight: 20,
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grisClaro,
  },
  planCardPopular: {
    borderColor: Colors.verdeOlivo,
    backgroundColor: Colors.verdeOlivo + '05',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.verdeOlivo,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: Colors.blanco,
    fontSize: 10,
    fontWeight: '600',
  },
  planIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    marginBottom: 8,
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: 'normal',
    color: Colors.grisOscuro,
  },
  planSavings: {
    fontSize: 11,
    color: Colors.verdeExito,
    marginBottom: 8,
  },
  planFeatures: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginVertical: 2,
  },
  planButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  planButtonPopular: {
    backgroundColor: Colors.verdeOlivo,
    shadowColor: Colors.verdeOlivo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  planButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
  },
  subscriptionFooter: {
    fontSize: 11,
    color: Colors.grisOscuro,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.grisClaro,
  },
  cancelButtonText: {
    color: Colors.grisOscuro,
    fontSize: 14,
  },
  limitModalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  limitModalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  limitModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 12,
    textAlign: 'center',
  },
  limitModalDescription: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  limitModalSuggestion: {
    fontSize: 13,
    color: Colors.verdeOlivo,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  limitUpgradeButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  limitUpgradeButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
    fontSize: 14,
  },
  limitCancelButton: {
    paddingVertical: 8,
  },
  limitCancelButtonText: {
    color: Colors.grisOscuro,
    fontSize: 14,
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
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
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
  modalDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 12,
  },
  modalDateText: {
    fontSize: 16,
    color: Colors.grisOscuro,
  },
  modalDateTextFilled: {
    color: Colors.azulMarino,
  },
  modalCalendarIcon: {
    fontSize: 18,
    color: Colors.verdeOlivo,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
    backgroundColor: Colors.verdeOlivo,
  },
  modalConfirmText: {
    color: Colors.blanco,
    fontWeight: '600',
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
modalHint: {
  fontSize: 11,
  color: Colors.grisOscuro,
  marginTop: 4,
  fontStyle: 'italic',
},
});