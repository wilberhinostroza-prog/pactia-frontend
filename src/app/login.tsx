import React, { useState } from 'react';
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
import { login } from '../services/api';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Ingresa tu email o teléfono');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Ingresa tu contraseña');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(identifier, password);
      
      if (user.profileComplete) {
        router.replace('/(tabs)/home' as Href);
      } else {
        router.replace('/complete-profile' as Href);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Pactia</Text>
          <Text style={styles.subtitle}>Iniciar sesión</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email o teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com o 987654321"
              placeholderTextColor={Colors.grisOscuro}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="default"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••"
                placeholderTextColor={Colors.grisOscuro}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.blanco} />
            ) : (
              <Text style={styles.loginButtonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>o</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/register' as Href)}
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta? <Text style={styles.registerLinkBold}>Regístrate</Text>
            </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
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
  loginButton: {
    backgroundColor: Colors.verdeOlivo,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.blanco,
    fontSize: 18,
    fontWeight: 'bold',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grisOscuro,
    opacity: 0.3,
  },
  separatorText: {
    marginHorizontal: 16,
    color: Colors.grisOscuro,
    fontSize: 14,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    color: Colors.blanco,
    opacity: 0.8,
  },
  registerLinkBold: {
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
});