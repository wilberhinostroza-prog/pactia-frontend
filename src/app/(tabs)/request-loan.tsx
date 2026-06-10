import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { getSession, getUserByEmail, findUserByPhone, requestLoan, canRequestService, getSubscription } from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ErrorToast } from '../../components/ErrorToast';
import { SuccessToast } from '../../components/SuccessToast';
import { useAsync } from '../../hooks/useAsync';
import { logger } from '../../utils/logger';
import { ContactPicker } from '../../components/ContactPicker';
import { DatePicker } from '../../components/DatePicker';
import countryCodes from '../../data/country-codes.json';
import { User } from '../../types';
import { formatDateForDB } from '../../utils/dateHelper';

const MODULE = 'RequestLoanScreen';
const FREE_SERVICE_LIMIT = 10;

type ContractType = 'prestamo' | 'servicio';

export default function RequestLoanScreen() {
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subscription, setSubscription] = useState({ active: false, plan: 'free' });
  const [contractType, setContractType] = useState<ContractType>('prestamo');
  const [creditorPhone, setCreditorPhone] = useState('');
  const [creditorName, setCreditorName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success'>('error');
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  
  // Estados para validación de teléfono por país
  const [phoneMinLength, setPhoneMinLength] = useState<number>(9);
  const [phoneMaxLength, setPhoneMaxLength] = useState<number>(9);
  const [userCountryName, setUserCountryName] = useState<string>('Perú');
  const [userCountryCode, setUserCountryCode] = useState<string>('+51');
  const [userCurrencySymbol, setUserCurrencySymbol] = useState<string>('S/');

  // Modal de límite de servicios
  const [serviceLimitModalVisible, setServiceLimitModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [serviceLimitInfo, setServiceLimitInfo] = useState({ currentCount: 0, limit: FREE_SERVICE_LIMIT });
  const [upgrading, setUpgrading] = useState(false);

  const { loading: searching, execute: executeSearch } = useAsync({
    module: MODULE,
    onSuccess: (data) => {
      setCreditorName(data.nombres || 'Usuario encontrado');
      setToastMessage('✓ Usuario encontrado');
      setToastType('success');
      setToastVisible(true);
    },
    onError: (error) => {
      setCreditorName('');
      setToastMessage(error.message || 'Usuario no encontrado');
      setToastType('error');
      setToastVisible(true);
    },
  });

  const { loading: requesting, execute: executeRequest } = useAsync({
    module: MODULE,
    onSuccess: () => {
      const typeText = contractType === 'prestamo' ? 'préstamo' : 'servicio';
      setToastMessage(`✓ Solicitud de ${typeText} enviada correctamente`);
      setToastType('success');
      setToastVisible(true);
      // Limpiar formulario
      setCreditorPhone('');
      setCreditorName('');
      setAmount('');
      setDueDate('');
      setDescription('');
      setTimeout(() => {
        router.push('/(tabs)/home');
      }, 1500);
    },
    onError: (error) => {
      setToastMessage(error.message || 'Error al enviar solicitud');
      setToastType('error');
      setToastVisible(true);
    },
  });

  useEffect(() => {
    loadUserData();
  }, []);

  // Función para cargar reglas de validación según el país
  const loadPhoneValidationRules = (countryName: string) => {
    try {
      const countryData = countryCodes.find(
        (c: any) => c.pais === countryName
      );
      
      if (countryData) {
        setPhoneMinLength(countryData.min);
        setPhoneMaxLength(countryData.max);
        setUserCountryCode(countryData.codigo);
        logger.info(MODULE, `Reglas cargadas para ${countryName}: ${countryData.min} dígitos, código: ${countryData.codigo}`);
      } else {
        // Si no encuentra el país, usa valores por defecto (Perú)
        logger.warn(MODULE, `País no encontrado: ${countryName}, usando defaults (9 dígitos)`);
        setPhoneMinLength(9);
        setPhoneMaxLength(9);
        setUserCountryCode('+51');
      }
    } catch (error) {
      logger.error(MODULE, 'Error cargando reglas de validación', error);
      setPhoneMinLength(9);
      setPhoneMaxLength(9);
      setUserCountryCode('+51');
    }
  };

  // Función para cargar moneda del usuario
  const loadUserCurrency = (currencySymbol?: string) => {
    if (currencySymbol) {
      setUserCurrencySymbol(currencySymbol);
    } else {
      setUserCurrencySymbol('S/');
    }
  };

  // Función modificada: carga datos del usuario incluyendo su país
  const loadUserData = async () => {
    const email = await getSession();
    if (email) {
      setUserEmail(email);
      const user = await getUserByEmail(email) as User;
      setUserPhone(user.phone);
      
       // Cargar moneda del usuario
        if (user.currency_symbol) {
        setUserCurrencySymbol(user.currency_symbol);
        } else {
          setUserCurrencySymbol('S/');
        }
      
      /// Cargar reglas de validación según el país del usuario (desde Supabase)
        if (user.country && user.country.trim() !== '') {
          setUserCountryName(user.country);
          loadPhoneValidationRules(user.country);
        } else {
            // Fallback: usar Perú por defecto
          logger.warn(MODULE, 'Usuario sin país en Supabase, usando Perú por defecto');
          setUserCountryName('Perú');
          loadPhoneValidationRules('Perú');
        }
      
      const sub = await getSubscription(email);
      setSubscription(sub);
    }
  };

  // Verificar límite de servicios antes de enviar solicitud
  const checkServiceLimit = async (): Promise<boolean> => {
    if (contractType !== 'servicio') return true;
    if (subscription.active) return true;
    
    try {
      const result = await canRequestService(userPhone);
      if (!result.canRequest) {
        setServiceLimitInfo({ currentCount: result.currentCount, limit: result.limit });
        setServiceLimitModalVisible(true);
        return false;
      }
      return true;
    } catch (error) {
      logger.error(MODULE, 'Error verificando límite', error);
      return true;
    }
  };

  // Función modificada: valida usando phoneMinLength
  const handleSearchCreditor = async () => {
    if (!creditorPhone || creditorPhone.length !== phoneMinLength) {
      setToastMessage(`Ingresa un teléfono válido de ${phoneMinLength} dígitos`);
      setToastType('error');
      setToastVisible(true);
      return;
    }
    await executeSearch(findUserByPhone(creditorPhone), 'Buscando usuario');
  };

  const handleSubmit = async () => {
    if (!creditorName) {
      setToastMessage('Primero busca y confirma al usuario');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (contractType === 'prestamo') {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setToastMessage('Ingresa un monto válido');
        setToastType('error');
        setToastVisible(true);
        return;
      }
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setToastMessage('Ingresa el monto del servicio');
        setToastType('error');
        setToastVisible(true);
        return;
      }
    }

    if (!dueDate) {
      setToastMessage('Ingresa una fecha propuesta');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!description.trim()) {
      setToastMessage('Ingresa una descripción');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    const canProceed = await checkServiceLimit();
    if (!canProceed) return;

    const amountNum = parseFloat(amount);
    const dueDateForDB = formatDateForDB(dueDate);
    
    await executeRequest(
      requestLoan(
        contractType,
        userPhone, 
        creditorPhone, 
        amountNum, 
        dueDateForDB, 
        description.trim()
      ),
      'Enviando solicitud'
    );
  };

  const handleSelectContact = (phoneNumber: string, name: string) => {
    setCreditorPhone(phoneNumber);
    setCreditorName('');
    executeSearch(findUserByPhone(phoneNumber), 'Buscando usuario');
  };

  const handleDateConfirm = (date: Date, formattedDate: string) => {
    setDueDate(formattedDate);
  };

  const handleUpgradeSubscription = async (plan: 'monthly' | 'yearly') => {
    setUpgrading(true);
    try {
      const { upgradeSubscription } = require('../../services/api');
      await upgradeSubscription(userEmail, plan);
      const { getSubscription } = require('../../services/api');
      const updatedSub = await getSubscription(userEmail);
      setSubscription(updatedSub);
      setSubscriptionModalVisible(false);
      setToastMessage(`✓ Suscripción ${plan === 'monthly' ? 'mensual' : 'anual'} activada`);
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      setToastMessage('Error al activar suscripción');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setUpgrading(false);
    }
  };

  // Modales (sin cambios)
  const ServiceLimitModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={serviceLimitModalVisible}
      onRequestClose={() => setServiceLimitModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.limitModalContent}>
          <Text style={styles.limitModalIcon}>⚠️</Text>
          <Text style={styles.limitModalTitle}>Límite de servicios alcanzado</Text>
          <Text style={styles.limitModalDescription}>
            El plan gratuito permite hasta {serviceLimitInfo.limit} servicios aprobados en total.
            Ya has participado en {serviceLimitInfo.currentCount} de {serviceLimitInfo.limit} servicios.
          </Text>
          <Text style={styles.limitModalSuggestion}>
            Para solicitar más servicios, necesitas suscribirte.
          </Text>
          
          <TouchableOpacity
            style={styles.limitUpgradeButton}
            onPress={() => {
              setServiceLimitModalVisible(false);
              setSubscriptionModalVisible(true);
            }}
          >
            <Text style={styles.limitUpgradeButtonText}>Ver planes de suscripción</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.limitCancelButton}
            onPress={() => setServiceLimitModalVisible(false)}
          >
            <Text style={styles.limitCancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const SubscriptionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={subscriptionModalVisible}
      onRequestClose={() => setSubscriptionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.subscriptionModalContent}>
          <View style={styles.subscriptionModalHeader}>
            <Text style={styles.subscriptionModalTitle}>🔓 Desbloquear servicios ilimitados</Text>
            <TouchableOpacity onPress={() => setSubscriptionModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subscriptionDescription}>
            Con la suscripción, puedes solicitar y aceptar servicios sin límite.
          </Text>

          <View style={styles.plansContainer}>
            <View style={styles.planCard}>
              <Text style={styles.planIcon}>📅</Text>
              <Text style={styles.planTitle}>Plan Mensual</Text>
              <Text style={styles.planPrice}>S/ 9.90 <Text style={styles.planPeriod}>/mes</Text></Text>
              <Text style={styles.planFeatures}>✓ Servicios ilimitados</Text>
              <Text style={styles.planFeatures}>✓ Historial de crédito ilimitado</Text>
              <Text style={styles.planFeatures}>✓ Cancelas cuando quieras</Text>
              <TouchableOpacity
                style={styles.planButton}
                onPress={() => handleUpgradeSubscription('monthly')}
                disabled={upgrading}
              >
                <Text style={styles.planButtonText}>Suscribirse</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.planCard, styles.planCardPopular]}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Más popular</Text>
              </View>
              <Text style={styles.planIcon}>🌟</Text>
              <Text style={styles.planTitle}>Plan Anual</Text>
              <Text style={styles.planPrice}>S/ 99 <Text style={styles.planPeriod}>/año</Text></Text>
              <Text style={styles.planSavings}>🎉 Ahorra 2 meses</Text>
              <Text style={styles.planFeatures}>✓ Todo lo del plan mensual</Text>
              <Text style={styles.planFeatures}>✓ 2 meses gratis</Text>
              <Text style={styles.planFeatures}>✓ Soporte prioritario</Text>
              <TouchableOpacity
                style={[styles.planButton, styles.planButtonPopular]}
                onPress={() => handleUpgradeSubscription('yearly')}
                disabled={upgrading}
              >
                <Text style={styles.planButtonText}>Suscribirse</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.subscriptionFooter}>
            🔒 Puedes cancelar tu suscripción en cualquier momento desde tu perfil.
          </Text>

          <TouchableOpacity style={styles.cancelButton} onPress={() => setSubscriptionModalVisible(false)}>
            <Text style={styles.cancelButtonText}>Quizás más tarde</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <LoadingOverlay visible={searching} message="Buscando usuario..." />
      <LoadingOverlay visible={requesting} message="Enviando solicitud..." />
      <LoadingOverlay visible={upgrading} message="Procesando suscripción..." />
      
      <ErrorToast visible={toastVisible && toastType === 'error'} message={toastMessage} onHide={() => setToastVisible(false)} />
      <SuccessToast visible={toastVisible && toastType === 'success'} message={toastMessage} onHide={() => setToastVisible(false)} />

      <ServiceLimitModal />
      <SubscriptionModal />
      
      <ContactPicker
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onSelectContact={handleSelectContact}
        title="Seleccionar contacto"
      />

      <DatePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={handleDateConfirm}
        initialDate={new Date()}
        title={contractType === 'prestamo' ? 'Fecha de pago' : 'Fecha del servicio'}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva solicitud</Text>
        <Text style={styles.subtitle}>¿Qué tipo de acuerdo deseas?</Text>

        <View style={styles.planIndicator}>
          <Text style={styles.planIndicatorText}>
            {subscription.active 
              ? `🔓 Plan ${subscription.plan === 'yearly' ? 'Anual' : 'Mensual'} activo` 
              : `🔒 Plan Gratuito (${FREE_SERVICE_LIMIT} servicios máximo)`}
          </Text>
        </View>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              contractType === 'prestamo' && styles.typeOptionActive,
            ]}
            onPress={() => setContractType('prestamo')}
          >
            <Text style={styles.typeIcon}>💰</Text>
            <Text
              style={[
                styles.typeOptionText,
                contractType === 'prestamo' && styles.typeOptionTextActive,
              ]}
            >
              Préstamo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              contractType === 'servicio' && styles.typeOptionActive,
            ]}
            onPress={() => setContractType('servicio')}
          >
            <Text style={styles.typeIcon}>🤝</Text>
            <Text
              style={[
                styles.typeOptionText,
                contractType === 'servicio' && styles.typeOptionTextActive,
              ]}
            >
              Servicio
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono de la otra persona *</Text>
            <View style={styles.row}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeText}>{userCountryCode}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder={`Ej: ${phoneMinLength} dígitos`}
                placeholderTextColor={Colors.grisOscuro}
                value={creditorPhone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  const limited = cleaned.slice(0, phoneMaxLength);
                  setCreditorPhone(limited);
                  setCreditorName('');
                }}
                keyboardType="numeric"
                maxLength={phoneMaxLength}
              />
              <TouchableOpacity
                style={styles.contactsButton}
                onPress={() => setContactPickerVisible(true)}
              >
                <Text style={styles.contactsButtonText}>👥</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearchCreditor}
                disabled={searching || creditorPhone.length !== phoneMinLength}
              >
                <Text style={styles.searchButtonText}>🔍</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.phoneHint}>
              {creditorPhone.length > 0 && creditorPhone.length < phoneMinLength && (
                <Text style={styles.phoneHintError}>⚠️ Debe tener {phoneMinLength} dígitos</Text>
              )}
              {creditorPhone.length === phoneMinLength && (
                <Text style={styles.phoneHintSuccess}>✓ Longitud correcta</Text>
              )}
              {creditorPhone.length > phoneMinLength && creditorPhone.length <= phoneMaxLength && (
                <Text style={styles.phoneHintInfo}>📱 {creditorPhone.length}/{phoneMaxLength} dígitos</Text>
              )}
            </Text>
            
            {creditorName ? (
              <Text style={styles.foundText}>✓ {creditorName}</Text>
            ) : creditorPhone.length === phoneMinLength ? (
              <Text style={styles.notFoundText}>✗ Usuario no encontrado</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {contractType === 'prestamo' ? `Monto (${userCurrencySymbol}) *` : `Monto del servicio (${userCurrencySymbol}) *`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`0.00`}
              placeholderTextColor={Colors.grisOscuro}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {contractType === 'prestamo' ? 'Motivo del préstamo *' : 'Descripción del servicio *'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={contractType === 'prestamo' 
                ? "Ej: Reparación de auto, pago de estudios..." 
                : "Ej: Diseño de logo, limpieza de casa..."}
              placeholderTextColor={Colors.grisOscuro}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {contractType === 'prestamo' ? 'Fecha propuesta de pago *' : 'Fecha propuesta para el servicio *'}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text style={[styles.dateButtonText, dueDate ? styles.dateButtonTextFilled : {}]}>
                {dueDate || 'Seleccionar fecha'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>
              {contractType === 'prestamo' 
                ? 'Toca para seleccionar la fecha de pago' 
                : 'Toca para seleccionar la fecha del servicio'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!creditorName || requesting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!creditorName || requesting}
        >
          <Text style={styles.submitButtonText}>
            {contractType === 'prestamo' ? 'Solicitar préstamo' : 'Solicitar servicio'}
          </Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grisOscuro,
    marginBottom: 16,
  },
  planIndicator: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    backgroundColor: Colors.verdeOlivo + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planIndicatorText: {
    fontSize: 11,
    color: Colors.verdeOlivo,
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.blanco,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grisClaro,
    gap: 8,
  },
  typeOptionActive: {
    borderColor: Colors.verdeOlivo,
    backgroundColor: Colors.verdeOlivo + '10',
  },
  typeIcon: {
    fontSize: 20,
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.grisOscuro,
  },
  typeOptionTextActive: {
    color: Colors.verdeOlivo,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.azulMarino,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeContainer: {
    backgroundColor: Colors.verdeOlivo + '20',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 60,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.verdeOlivo,
  },
  phoneInput: {
    flex: 1,
  },
  contactsButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  contactsButtonText: {
    fontSize: 20,
    color: Colors.blanco,
  },
  searchButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 18,
    color: Colors.blanco,
  },
  foundText: {
    color: Colors.verdeExito,
    fontSize: 12,
    marginTop: 4,
  },
  notFoundText: {
    color: Colors.rojoError,
    fontSize: 12,
    marginTop: 4,
  },
  phoneHint: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  phoneHintError: {
    color: Colors.rojoError,
  },
  phoneHintSuccess: {
    color: Colors.verdeExito,
  },
  phoneHintInfo: {
    color: Colors.grisOscuro,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grisClaro,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.grisOscuro,
  },
  dateButtonTextFilled: {
    color: Colors.azulMarino,
  },
  calendarIcon: {
    fontSize: 20,
    color: Colors.verdeOlivo,
  },
  hint: {
    fontSize: 11,
    color: Colors.grisOscuro,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.blanco,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: {
    fontSize: 20,
    color: Colors.grisOscuro,
    padding: 4,
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
});