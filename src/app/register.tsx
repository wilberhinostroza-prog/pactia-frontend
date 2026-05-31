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

// Contenido de los términos
const dataTreatmentContent = `
Tratamiento de Datos Personales – Pactia
TRATAMIENTO DE DATOS PERSONALES

En cumplimiento de la Ley N.º 29733 – Ley de Protección de Datos Personales y su Reglamento, te informamos lo siguiente:

1. Los datos personales que proporcionas serán recopilados y tratados por Pactia únicamente para fines relacionados con el funcionamiento de la plataforma, incluyendo la creación y gestión de tu cuenta, la validación de identidad, la evaluación y formalización de pactos entre usuarios, la gestión de solicitudes y el fortalecimiento de la seguridad y confiabilidad de la aplicación.

2. El tratamiento de los datos se realizará exclusivamente dentro del ecosistema de Pactia y será utilizado para facilitar procesos de toma de decisiones entre usuarios, generar indicadores de confianza, prevenir fraudes y mejorar la experiencia de uso de la plataforma.

3. Pactia podrá utilizar mecanismos automatizados de análisis interno para generar indicadores de confianza, reputación, cumplimiento y seguridad entre usuarios, con el fin de facilitar la toma de decisiones dentro de la plataforma. Dichos indicadores no constituyen evaluaciones financieras, crediticias ni reportes oficiales de riesgo.

4. Con autorización expresa del usuario, Pactia podrá compartir determinada información personal, reputacional o relacionada con los pactos realizados con proveedores tecnológicos, entidades aliadas, servicios de validación, prevención de fraude o terceros vinculados al funcionamiento de la plataforma, únicamente para fines de seguridad, verificación, interoperabilidad y mejora de la experiencia del usuario.

5. Pactia no comercializa ni cede datos personales a terceros ajenos a la operación de la aplicación, salvo obligación legal, requerimiento de autoridad competente o autorización expresa del titular de los datos.

6. Los datos personales serán almacenados mediante medidas técnicas, organizativas y de seguridad razonables para evitar su pérdida, acceso no autorizado, alteración o uso indebido.

7. La tecnología blockchain utilizada por la plataforma podrá registrar evidencias digitales, identificadores criptográficos o referencias verificables relacionadas con los pactos realizados, evitando la exposición pública directa de datos personales sensibles.

8. Los datos personales serán conservados mientras la cuenta del usuario permanezca activa y durante el tiempo necesario para cumplir obligaciones legales, resolver controversias, prevenir fraudes y garantizar la trazabilidad de las operaciones realizadas en la plataforma.

9. El banco de datos personales es administrado por V7SaaS EIRL, responsable del tratamiento de los datos personales recopilados a través de la aplicación.

10. El titular de los datos puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO) mediante solicitud enviada al correo oficial registrado por la plataforma.

11. Pactia actúa como una plataforma tecnológica de intermediación digital y no garantiza el cumplimiento de los pactos, acuerdos u obligaciones asumidas entre usuarios.

12. Cada usuario es responsable de la veracidad de la información proporcionada, así como de las decisiones, compromisos y obligaciones que asuma dentro de la plataforma.

13. Al registrarte y utilizar Pactia, declaras haber leído y aceptado el presente tratamiento de datos personales y autorizas su uso conforme a las finalidades aquí descritas.

`;

const termsContent = `
TÉRMINOS Y CONDICIONES DE USO – PACTIA
1. Aceptación de los Términos

Al registrarte, acceder o utilizar la plataforma Pactia, declaras haber leído, comprendido y aceptado los presentes Términos y Condiciones, así como las políticas relacionadas con el tratamiento de datos personales y funcionamiento de la plataforma.

2. Descripción del Servicio

Pactia es una plataforma tecnológica digital destinada a facilitar la creación, registro y gestión de pactos, acuerdos y mecanismos de confianza entre usuarios.

La plataforma permite documentar compromisos relacionados con préstamos, servicios u otros acuerdos privados entre particulares, utilizando herramientas digitales y tecnologías de verificación.

Pactia no administra dinero de los usuarios, no actúa como entidad financiera, ni garantiza el cumplimiento de las obligaciones asumidas entre las partes.

3. Registro y Uso de la Plataforma

Para utilizar la plataforma, el usuario deberá proporcionar información veraz, actualizada y verificable.

El usuario se compromete a:

Utilizar la plataforma de manera lícita y responsable.
No proporcionar información falsa o engañosa.
No utilizar Pactia para actividades ilícitas, fraudulentas o contrarias al orden público.
Respetar las normas de convivencia, seguridad digital y buena fe entre usuarios.
Cumplir con los compromisos y pactos registrados dentro de la plataforma.

Cada usuario es responsable de las decisiones, acuerdos y obligaciones que asuma mediante el uso de Pactia.

4. Tecnología Blockchain y Registro de Pactos

Pactia podrá utilizar tecnología blockchain, incluyendo la red Algorand u otras tecnologías equivalentes, para registrar evidencias digitales, identificadores criptográficos o referencias verificables relacionadas con los pactos realizados en la plataforma.

Estos registros tienen como finalidad fortalecer la trazabilidad, integridad y verificabilidad de la información registrada.

El uso de blockchain no implica la publicación abierta de información personal sensible.

5. Indicadores de Confianza y Seguridad

Pactia podrá implementar mecanismos internos de reputación, validación y análisis automatizado con la finalidad de mejorar la seguridad, confianza y experiencia de uso entre usuarios.

Los indicadores generados por la plataforma son exclusivamente referenciales y no constituyen evaluaciones financieras, crediticias ni reportes oficiales de riesgo.

6. Suspensión o Restricción de Cuentas

Pactia podrá suspender, restringir o cancelar cuentas de usuarios que:

Incumplan los presentes términos.
Realicen actividades fraudulentas o sospechosas.
Generen riesgos para la seguridad de la comunidad.
Utilicen la plataforma de manera abusiva o ilícita.

La plataforma podrá adoptar medidas preventivas para proteger la integridad del sistema y de sus usuarios.

7. Protección de Datos Personales

Los datos personales proporcionados por los usuarios serán tratados conforme a la Ley N.º 29733 – Ley de Protección de Datos Personales y de acuerdo con la Política de Tratamiento de Datos Personales de Pactia.

8. Limitación de Responsabilidad

Pactia actúa exclusivamente como una plataforma tecnológica de intermediación digital.

La plataforma no garantiza el cumplimiento efectivo de los acuerdos registrados entre usuarios ni asume responsabilidad por incumplimientos, conflictos, pérdidas, daños o perjuicios derivados de las relaciones establecidas entre las partes.

Cada usuario asume plena responsabilidad por la información proporcionada y por las obligaciones que decida aceptar dentro de la plataforma.

9. Modificaciones

Pactia se reserva el derecho de modificar, actualizar o reemplazar los presentes Términos y Condiciones en cualquier momento.

Las modificaciones entrarán en vigencia desde su publicación en la plataforma.

10. Contacto

Para consultas, soporte o solicitudes relacionadas con la plataforma, el usuario podrá comunicarse mediante los canales oficiales de atención de Pactia.
`;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [acceptedDataTreatment, setAcceptedDataTreatment] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const { loading: checkingEmail, execute: executeCheckEmail } = useAsync({
    module: MODULE,
    onError: (error) => {
      setToastMessage(error.message || 'No se pudo verificar el email');
      setToastVisible(true);
    },
  });

  const { loading: registering, execute: executeRegister } = useAsync({
    module: MODULE,
    onSuccess: () => {
      logger.success(MODULE, 'Usuario registrado exitosamente', { email });
      Alert.alert('Éxito', 'Cuenta creada correctamente', [
        { text: 'Continuar', onPress: () => router.push(ROUTES.COMPLETE_PROFILE as any) }
      ]);
    },
    onError: (error) => {
      setToastMessage(error.message || 'No se pudo registrar');
      setToastVisible(true);
    },
  });

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
    return emailAvailable && acceptedDataTreatment && acceptedTerms;
  };

  const handleRegister = async () => {
    const cleanEmail = normalizers.email(email);
    
    if (!emailAvailable) {
      setToastMessage('Verifica primero que el email esté disponible');
      setToastVisible(true);
      return;
    }

    if (!validators.password(password)) {
      setToastMessage('La contraseña debe tener al menos 8 caracteres');
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

    await executeRegister(register(cleanEmail, password), 'Registrando usuario');
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

            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={Colors.grisOscuro}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!checkingEmail && !registering}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor={Colors.grisOscuro}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!checkingEmail && !registering}
              />
            </View>

            {/* Términos legales */}
            <View style={styles.termsContainer}>
              <Checkbox
                checked={acceptedDataTreatment}
                onPress={() => setAcceptedDataTreatment(!acceptedDataTreatment)}
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
                onPress={() => setAcceptedTerms(!acceptedTerms)}
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