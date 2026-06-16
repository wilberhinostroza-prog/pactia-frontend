import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { checkEmail, register } from '../services/api';
import { validators, normalizers } from '../utils/validators';
import { logger } from '../utils/logger';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ErrorToast } from '../components/ErrorToast';
import { useAsync } from '../hooks/useAsync';
import { ROUTES } from '../types/routes';
import { Checkbox } from '../components/Checkbox';
import { TermsModal } from '../components/TermsModal';

const MODULE = 'RegisterScreen';

// Contenido de los términos (igual que antes)
const dataTreatmentContent = `...`; // Mantener el mismo contenido
const termsContent = `...`; // Mantener el mismo contenido

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [acceptedDataTreatment, setAcceptedDataTreatment] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  // Estados para validación de contraseña en tiempo real
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const { loading: checkingEmail, execute: executeCheckEmail } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'No se pudo verificar el email');
      setToastVisible(true);
    },
  });

  const { loading: registering, execute: executeRegister } = useAsync({
    module: MODULE,
    onSuccess: (user) => {
      logger.success(MODULE, 'Usuario registrado exitosamente', { email });
      if (user && user.profile_complete) {
        Alert.alert('Éxito', 'Cuenta creada correctamente', [
          { text: 'Continuar', onPress: () => router.push('/(tabs)/home' as any) }
        ]);
      } else {
        Alert.alert('Éxito', 'Cuenta creada correctamente', [
          { text: 'Completar perfil', onPress: () => router.push('/complete-profile' as any) }
        ]);
      }
    },
    onError: (error) => {
      setToastMessage(error.message || 'No se pudo registrar');
      setToastVisible(true);
    },
  });

  // Validar contraseña en tiempo real
  const validatePassword = (text: string) => {
    setPassword(text);
    setPasswordValidation({
      minLength: text.length >= 8,
      hasUpperCase: /[A-Z]/.test(text),
      hasNumber: /[0-9]/.test(text),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(text),
    });
  };

  // Verificar si la contraseña es válida
  const isPasswordValid = () => {
    return passwordValidation.minLength && 
           passwordValidation.hasUpperCase && 
           passwordValidation.hasNumber && 
           passwordValidation.hasSpecialChar;
  };

  // Verificar si las contraseñas coinciden
  const doPasswordsMatch = () => {
    return password === confirmPassword && password.length > 0;
  };

  // Verificar si se pueden activar los checkboxes
  const canActivateTerms = () => {
    return emailAvailable === true && isPasswordValid() && doPasswordsMatch();
  };

  const handleCheckEmail = async () => {
    const cleanEmail = normalizers.email(email);
    
    if (!validators.email(cleanEmail)) {
      setToastMessage('Ingresa un email válido');
      setToastVisible(true);
      return;
    }

    const exists = await executeCheckEmail(checkEmail(cleanEmail), 'Verificando email');
    const isAvailable = !exists;
    setEmailAvailable(isAvailable);
    
    if (isAvailable) {
      setToastMessage('✓ Email disponible');
      setToastVisible(true);
    } else {
      setToastMessage('✗ Email ya registrado');
      setToastVisible(true);
    }
  };

  const canRegister = () => {
    return emailAvailable === true && 
           isPasswordValid() && 
           doPasswordsMatch() && 
           acceptedDataTreatment && 
           acceptedTerms;
  };

  const handleRegister = async () => {
    const cleanEmail = normalizers.email(email);
    
    if (!emailAvailable) {
      setToastMessage('Verifica primero que el email esté disponible');
      setToastVisible(true);
      return;
    }

    if (!isPasswordValid()) {
      setToastMessage('La contraseña debe cumplir con todos los requisitos');
      setToastVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setToastMessage('Las contraseñas no coinciden');
      setToastVisible(true);
      return;
    }
   
    if (!acceptedDataTreatment) {
      setToastMessage('Debes aceptar el Tratamiento de Datos Personales');
      setToastVisible(true);
      return;
    }

    if (!acceptedTerms) {
      setToastMessage('Debes aceptar los Términos y Condiciones');
      setToastVisible(true);
      return;
    }

    const user = await register(cleanEmail, password);
    await executeRegister(Promise.resolve(user), 'Registrando usuario');
  };

  return (
    <>
      <LoadingOverlay visible={checkingEmail || registering} message={checkingEmail ? 'Verificando email...' : 'Creando tu cuenta...'} />
      <ErrorToast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
      
      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        title={modalTitle}
        content={modalContent}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Regístrate en Pactia</Text>
          </View>

          <View style={styles.form}>
            {/* Campo Email - Siempre activo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[styles.input, styles.emailInput]}
                  placeholder="tu@email.com"
                  placeholderTextColor={Colors.grisOscuro}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailAvailable(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!checkingEmail && !registering}
                />
                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    (checkingEmail || registering) && styles.checkButtonDisabled,
                  ]}
                  onPress={handleCheckEmail}
                  disabled={checkingEmail || registering || !validators.email(normalizers.email(email))}
                >
                  <Text style={styles.checkButtonText}>Verificar</Text>
                </TouchableOpacity>
              </View>
              {emailAvailable === true && (
                <Text style={styles.availableText}>✓ Email disponible</Text>
              )}
              {emailAvailable === false && (
                <Text style={styles.unavailableText}>✗ Email no disponible</Text>
              )}
            </View>

            {/* Campo Contraseña - Solo se activa si email está disponible */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={Colors.grisOscuro}
                  value={password}
                  onChangeText={validatePassword}
                  secureTextEntry={!showPassword}
                  editable={emailAvailable === true && !checkingEmail && !registering}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={emailAvailable !== true}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              
              {/* Validación de contraseña en tiempo real */}
              {emailAvailable === true && password.length > 0 && (
                <View style={styles.validationContainer}>
                  <Text style={[styles.validationText, passwordValidation.minLength ? styles.validText : styles.invalidText]}>
                    {passwordValidation.minLength ? '✓' : '○'} Mínimo 8 caracteres
                  </Text>
                  <Text style={[styles.validationText, passwordValidation.hasUpperCase ? styles.validText : styles.invalidText]}>
                    {passwordValidation.hasUpperCase ? '✓' : '○'} Al menos una mayúscula
                  </Text>
                  <Text style={[styles.validationText, passwordValidation.hasNumber ? styles.validText : styles.invalidText]}>
                    {passwordValidation.hasNumber ? '✓' : '○'} Al menos un número
                  </Text>
                  <Text style={[styles.validationText, passwordValidation.hasSpecialChar ? styles.validText : styles.invalidText]}>
                    {passwordValidation.hasSpecialChar ? '✓' : '○'} Al menos un carácter especial (!@#$%^&*)
                  </Text>
                </View>
              )}
            </View>

            {/* Campo Confirmar contraseña - Solo se activa si la contraseña es válida */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={Colors.grisOscuro}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={isPasswordValid() && !checkingEmail && !registering}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={!isPasswordValid()}
                >
                  <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              
              {/* Mensaje de coincidencia de contraseñas */}
              {confirmPassword.length > 0 && (
                <Text style={doPasswordsMatch() ? styles.availableText : styles.unavailableText}>
                  {doPasswordsMatch() ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                </Text>
              )}
            </View>

            {/* Términos legales - Solo se activan si email disponible y contraseña válida */}
            <View style={styles.termsContainer}>
              <Checkbox
                checked={acceptedDataTreatment}
                onPress={() => {
                  if (canActivateTerms()) {
                    setAcceptedDataTreatment(!acceptedDataTreatment);
                  }
                }}
                label="Acepto el "
                linkText="Tratamiento de Datos Personales"
                onLinkPress={() => {
                  setModalTitle('Tratamiento de Datos Personales');
                  setModalContent(dataTreatmentContent);
                  setTermsModalVisible(true);
                }}
              />
              
              <Checkbox
                checked={acceptedTerms}
                onPress={() => {
                  if (canActivateTerms()) {
                    setAcceptedTerms(!acceptedTerms);
                  }
                }}
                label="Acepto los "
                linkText="Términos y Condiciones"
                onLinkPress={() => {
                  setModalTitle('Términos y Condiciones');
                  setModalContent(termsContent);
                  setTermsModalVisible(true);
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                (!canRegister() || checkingEmail || registering) && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!canRegister() || checkingEmail || registering}
            >
              <Text style={styles.registerButtonText}>Registrarse</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push(ROUTES.LOGIN as any)}>
              <Text style={styles.loginLink}>
                ¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.blanco,
    opacity: 0.8,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blanco,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.azulMarino,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emailInput: {
    flex: 1,
  },
  checkButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
  },
  availableText: {
    color: Colors.verdeExito,
    fontSize: 12,
    marginTop: 4,
  },
  unavailableText: {
    color: Colors.rojoError,
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  eyeText: {
    fontSize: 20,
  },
  validationContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 8,
  },
  validationText: {
    fontSize: 11,
    marginVertical: 2,
  },
  validText: {
    color: Colors.verdeExito,
  },
  invalidText: {
    color: Colors.grisOscuro,
  },
  termsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  registerButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: Colors.blanco,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.blanco,
    opacity: 0.7,
  },
  loginLinkBold: {
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
});