import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, Href } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { getSession, getProfile, clearSession, getAllUserContracts, User } from '../../services/api';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ prestamos: 0, servicios: 0, completados: 0, activos: 0 });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const email = await getSession();
      if (email) {
        const profile = await getProfile(email);
        setUser(profile);
        
        // Cargar estadísticas de contratos
        const contracts = await getAllUserContracts(email);
        const prestamos = contracts.filter(c => c.type === 'prestamo').length;
        const servicios = contracts.filter(c => c.type === 'servicio').length;
        const completados = contracts.filter(c => c.status === 'pagado').length;
        const activos = contracts.filter(c => c.status === 'aceptado' || c.status === 'solicitado').length;
        setStats({ prestamos, servicios, completados, activos });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas salir de Pactia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            router.replace('/' as Href);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>
          {user?.nombres?.charAt(0) || user?.email?.charAt(0) || '?'}
        </Text>
      </View>

      {/* Información del usuario */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Información personal</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombres:</Text>
          <Text style={styles.infoValue}>{user?.nombres || 'No especificado'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DNI:</Text>
          <Text style={styles.infoValue}>{user?.dni || 'No especificado'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{user?.phone || 'No especificado'}</Text>
        </View>
      </View>

      {/* Información de Blockchain */}
      <View style={styles.blockchainCard}>
        <Text style={styles.blockchainTitle}>🔗 Algorand Blockchain</Text>
        <Text style={styles.blockchainLabel}>Dirección de tu wallet:</Text>
        <Text style={styles.blockchainAddress} numberOfLines={1} ellipsizeMode="middle">
          {user?.algorandAddress || 'No generada'}
        </Text>
        <Text style={styles.blockchainNote}>
          Esta dirección es única y se genera al crear tu cuenta.
          Todos tus contratos se registran aquí.
        </Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activos}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.prestamos}</Text>
          <Text style={styles.statLabel}>Préstamos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.servicios}</Text>
          <Text style={styles.statLabel}>Servicios</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completados}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
      </View>

      {/* Botón cerrar sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Pactia v1.0.0</Text>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.verdeOlivo,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.blanco,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.grisOscuro,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.azulMarino,
  },
  blockchainCard: {
    backgroundColor: Colors.azulMarino,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  blockchainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    marginBottom: 12,
  },
  blockchainLabel: {
    fontSize: 12,
    color: Colors.blanco,
    opacity: 0.7,
    marginBottom: 4,
  },
  blockchainAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.blanco,
    marginBottom: 12,
  },
  blockchainNote: {
    fontSize: 11,
    color: Colors.blanco,
    opacity: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.grisOscuro,
    marginTop: 4,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButtonText: {
    color: Colors.blanco,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.grisOscuro,
  },
});