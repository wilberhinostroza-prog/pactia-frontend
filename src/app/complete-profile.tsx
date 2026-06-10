import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { router, Href } from 'expo-router';
import { Colors } from '../constants/Colors';
import { getSession, completeProfile, getProfile } from '../services/api';
import countryData from '../data/country-codes.json';

interface Country {
  pais: string;
  codigo: string;
  min: number;
  max: number;
  regex: string;
  ejemplo: string;
  moneda: string;
  simbolo: string;
}

export default function CompleteProfileScreen() {
  const [email, setEmail] = useState<string>('');
  const [nombres, setNombres] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    loadSession();
    // Cargar país por defecto (Perú)
    const defaultCountry = countryData.find(c => c.pais === 'Perú') || countryData[0];
    setSelectedCountry(defaultCountry);
  }, []);

  const loadSession = async () => {
    try {
      const userEmail = await getSession();
      if (userEmail) {
        setEmail(userEmail);
        try {
          const profile = await getProfile(userEmail);
          if (profile.profile_complete) {
            setNombres(profile.nombres || '');
            setDni(profile.dni || '');
            // Extraer solo el número si viene con código (simplificado)
            const savedPhone = profile.phone || '';
            const phoneMatch = savedPhone.match(/\d+$/);
            if (phoneMatch) {
              setPhone(phoneMatch[0]);
            } else {
              setPhone(savedPhone);
            }
          }
        } catch (error) {
          // Perfil no existe aún
        }
      } else {
        Alert.alert('Sesión no encontrada', 'Por favor regístrate primero');
        router.replace('/register' as Href);
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const isValidDNI = (dni: string) => {
    const dniRegex = /^[0-9]{8}$/;
    return dniRegex.test(dni);
  };

  const isValidPhone = (phoneNumber: string, country: Country | null): boolean => {
    if (!country) return false;
    const phoneRegex = new RegExp(country.regex);
    return phoneRegex.test(phoneNumber);
  };

  const getFullPhoneNumber = (): string => {
    if (!selectedCountry) return phone;
    return `${selectedCountry.codigo} ${phone}`;
  };

  const handleSubmit = async () => {
    if (!nombres.trim()) {
      Alert.alert('Error', 'Por favor ingresa tus nombres completos');
      return;
    }

    if (nombres.trim().length < 3) {
      Alert.alert('Error', 'Ingresa nombres válidos (mínimo 3 caracteres)');
      return;
    }

    if (!isValidDNI(dni)) {
      Alert.alert('Error', 'DNI inválido. Debe tener 8 dígitos');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Error', 'Por favor selecciona tu país');
      return;
    }

    if (!isValidPhone(phone, selectedCountry)) {
      Alert.alert(
        'Error', 
        `Teléfono inválido para ${selectedCountry.pais}. Debe tener ${selectedCountry.min} dígitos.\nEjemplo: ${selectedCountry.ejemplo}`
      );
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      // 🔥 MODIFICACIÓN AQUÍ: Enviar país, moneda y símbolo
      await completeProfile(
        email, 
        nombres.trim(), 
        dni.trim(), 
        cleanPhone,
        selectedCountry.pais,      // ← AGREGAR: nombre del país
        selectedCountry.moneda,    // ← Ya estaba
        selectedCountry.simbolo    // ← Ya estaba
      );
      
      Alert.alert(
        '¡Perfil completado!',
        `Tu información ha sido guardada correctamente.\nPaís: ${selectedCountry.pais}\nTeléfono: ${cleanPhone}`,
        [
          {
            text: 'Ir a la app',
            onPress: () => router.replace('/home' as Href),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        selectedCountry?.codigo === item.codigo && styles.countryItemSelected,
      ]}
      onPress={() => {
        setSelectedCountry(item);
        setCountryModalVisible(false);
        setPhone('');
      }}
    >
      <Text style={styles.countryName}>{item.pais}</Text>
      <Text style={styles.countryCode}>{item.codigo}</Text>
    </TouchableOpacity>
  );

  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Completa tu perfil</Text>
          <Text style={styles.subtitle}>
            Estos datos son obligatorios para usar Pactia
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.emailContainer}>
            <Text style={styles.emailLabel}>Email registrado:</Text>
            <Text style={styles.emailValue}>{email}</Text>
          </View>

          <View style={styles.divider} />

          {/* Nombres completos */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nombres completos <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Carlos Pérez Gómez"
              placeholderTextColor={Colors.grisOscuro}
              value={nombres}
              onChangeText={setNombres}
              autoCapitalize="words"
            />
          </View>

          {/* DNI */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              DNI <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="8 dígitos"
              placeholderTextColor={Colors.grisOscuro}
              value={dni}
              onChangeText={setDni}
              keyboardType="numeric"
              maxLength={8}
            />
            {dni.length > 0 && !isValidDNI(dni) && (
              <Text style={styles.errorText}>El DNI debe tener 8 dígitos</Text>
            )}
          </View>

          {/* País y teléfono */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              País y teléfono <Text style={styles.required}>*</Text>
            </Text>
            
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setCountryModalVisible(true)}
            >
              <Text style={styles.countrySelectorText}>
                {selectedCountry ? `${selectedCountry.pais} (${selectedCountry.codigo})` : 'Seleccionar país'}
              </Text>
              <Text style={styles.countrySelectorArrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.phoneRow}>
              {selectedCountry && (
                <View style={styles.countryCodeContainer}>
                  <Text style={styles.countryCodeText}>{selectedCountry.codigo}</Text>
                </View>
              )}
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder={selectedCountry ? `Ej: ${selectedCountry.ejemplo}` : 'Número de teléfono'}
                placeholderTextColor={Colors.grisOscuro}
                value={phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  if (selectedCountry && cleaned.length <= selectedCountry.max) {
                    setPhone(cleaned);
                  } else if (!selectedCountry) {
                    setPhone(cleaned.slice(0, 15));
                  }
                }}
                keyboardType="numeric"
              />
            </View>

            {selectedCountry && phone.length > 0 && !isValidPhone(phone, selectedCountry) && (
              <Text style={styles.errorText}>
                El número debe tener {selectedCountry.min} dígito{selectedCountry.min !== 1 ? 's' : ''} (ej: {selectedCountry.ejemplo})
              </Text>
            )}
            {selectedCountry && (
              <Text style={styles.hintText}>
                {selectedCountry.pais}: {selectedCountry.min} dígito{selectedCountry.min !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Nota de seguridad */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              ⚠️ Estos datos serán verificados para garantizar la confianza entre usuarios.
            </Text>
          </View>

          {/* Botón continuar */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.blanco} />
            ) : (
              <Text style={styles.submitButtonText}>Guardar y continuar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para seleccionar país */}
      <Modal
        visible={countryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar país</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={countryData}
              keyExtractor={(item) => item.codigo}
              renderItem={renderCountryItem}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.blanco,
    opacity: 0.8,
  },
  card: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emailContainer: {
    backgroundColor: Colors.grisClaro,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.azulMarino,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grisClaro,
    marginBottom: 20,
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
  required: {
    color: Colors.rojoError,
  },
  input: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.azulMarino,
  },
  errorText: {
    fontSize: 12,
    color: Colors.rojoError,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    color: Colors.grisOscuro,
    marginTop: 4,
  },
  countrySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  countrySelectorText: {
    fontSize: 16,
    color: Colors.azulMarino,
  },
  countrySelectorArrow: {
    fontSize: 14,
    color: Colors.grisOscuro,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCodeContainer: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.verdeOlivo,
  },
  phoneInput: {
    flex: 1,
  },
  noteContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 12,
    color: '#E67E22',
    textAlign: 'center',
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
  modalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    width: '85%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.grisOscuro,
    padding: 4,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  countryItemSelected: {
    backgroundColor: Colors.verdeOlivo + '20',
  },
  countryName: {
    fontSize: 16,
    color: Colors.azulMarino,
  },
  countryCode: {
    fontSize: 14,
    color: Colors.verdeOlivo,
    fontWeight: '600',
  },
});