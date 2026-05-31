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
} from 'react-native';
import { router, Href } from 'expo-router';
import { Colors } from '../constants/Colors';
import { getSession, completeProfile, getProfile } from '../services/api';

export default function CompleteProfileScreen() {
  const [email, setEmail] = useState<string>('');
  const [nombres, setNombres] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');  // ← Cambiado de telefono a phone
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Cargar email de la sesión al iniciar
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const userEmail = await getSession();
      if (userEmail) {
        setEmail(userEmail);
        // Opcional: cargar datos existentes si ya tiene perfil
        try {
          const profile = await getProfile(userEmail);
          if (profile.profileComplete) {
            setNombres(profile.nombres || '');
            setDni(profile.dni || '');
            setPhone(profile.phone || '');
          }
        } catch (error) {
          // Perfil no existe aún, está bien
        }
      } else {
        // No hay sesión, redirigir a registro
        Alert.alert('Sesión no encontrada', 'Por favor regístrate primero');
        router.replace('/register' as Href);
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Validar DNI (8 dígitos para Perú)
  const isValidDNI = (dni: string) => {
    const dniRegex = /^[0-9]{8}$/;
    return dniRegex.test(dni);
  };

  // Validar teléfono (9 dígitos para Perú)
  const isValidPhone = (telefono: string) => {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(telefono);
  };

  const handleSubmit = async () => {
    // Validaciones
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

    if (!isValidPhone(phone)) {
      Alert.alert('Error', 'Teléfono inválido. Debe tener 9 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      await completeProfile(email, nombres.trim(), dni.trim(), phone.trim());
      
      Alert.alert(
        '¡Perfil completado!',
        'Tu información ha sido guardada correctamente. Ahora puedes usar Pactia.',
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

          {/* Teléfono */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Teléfono <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="9 dígitos (ej: 987654321)"
              placeholderTextColor={Colors.grisOscuro}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={9}
            />
            {phone.length > 0 && !isValidPhone(phone) && (
              <Text style={styles.errorText}>El teléfono debe tener 9 dígitos</Text>
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
});