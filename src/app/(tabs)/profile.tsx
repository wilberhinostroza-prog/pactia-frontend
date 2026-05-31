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
import { getSession, getUserByEmail, clearSession, getAllUserContracts, Contract } from '../../services/api';
import { normalizers } from '../../utils/validators';

// Función para obtener el saldo real basado SOLO en pagos confirmados
const getRealRemainingAmount = (contract: Contract): number => {
  const originalAmount = contract.approvedAmount || contract.requestedAmount || 0;
  const confirmedTotal = contract.payments
    ?.filter(p => p.confirmed)
    .reduce((sum, p) => sum + p.amount, 0) || 0;
  return originalAmount - confirmedTotal;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrestamos: 0,
    totalServicios: 0,
    totalDebt: 0,      // Saldo pendiente que debo
    totalLent: 0,      // Saldo pendiente que me deben
    completedCount: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const email = await getSession();
      if (email) {
        const profile = await getUserByEmail(email);
        setUser(profile);
        
        // Cargar contratos para estadísticas
        const contracts = await getAllUserContracts(profile.phone);
        calculateStats(contracts, profile.phone);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contracts: Contract[], userPhone: string) => {
  // Filtrar contratos completados (pagados)
  const completed = contracts.filter(c => c.status === 'pagado');
  
  // Contar préstamos y servicios
  const prestamos = contracts.filter(c => c.type === 'prestamo').length;
  const servicios = contracts.filter(c => c.type === 'servicio').length;
  
  // Calcular saldo pendiente que me deben (como acreedor)
  // Usar remainingAmount directamente (ya está actualizado en backend)
  const lentContracts = contracts.filter(c => c.creditorPhone === userPhone && c.status !== 'pagado');
  const totalLent = lentContracts.reduce((sum, contract) => {
    return sum + (contract.remainingAmount || contract.approvedAmount || contract.requestedAmount || 0);
  }, 0);
  
  // Calcular saldo pendiente que debo (como deudor)
  const debtContracts = contracts.filter(c => c.debtorPhone === userPhone && c.status !== 'pagado');
  const totalDebt = debtContracts.reduce((sum, contract) => {
    return sum + (contract.remainingAmount || contract.approvedAmount || contract.requestedAmount || 0);
  }, 0);
  
  setStats({
    totalPrestamos: prestamos,
    totalServicios: servicios,
    totalDebt,
    totalLent,
    completedCount: completed.length,
  });
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
      {/* Información del usuario - Sin avatar */}
      <View style={styles.infoCard}>
        <Text style={styles.userName}>{user?.nombres || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.userDetails}>
          <Text style={styles.userDetailText}>📄 DNI: {user?.dni || 'No especificado'}</Text>
          <Text style={styles.userDetailText}>📞 Teléfono: {user?.phone || 'No especificado'}</Text>
        </View>
      </View>

      {/* Tarjetas de estadísticas principales */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalPrestamos + stats.totalServicios}</Text>
          <Text style={styles.statLabel}>Pactos totales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completedCount}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
      </View>

      {/* Estadísticas de montos (saldo pendiente real) */}
      <View style={styles.moneyStatsContainer}>
        <View style={styles.moneyStatCard}>
          <Text style={styles.moneyStatLabel}>💰 Me deben (pendiente)</Text>
          <Text style={styles.moneyStatValue}>{normalizers.currency(stats.totalLent)}</Text>
        </View>
        <View style={[styles.moneyStatCard, styles.moneyStatCardDebt]}>
          <Text style={styles.moneyStatLabel}>📉 Debo (pendiente)</Text>
          <Text style={styles.moneyStatValue}>{normalizers.currency(stats.totalDebt)}</Text>
        </View>
      </View>

      {/* Resumen por tipo */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen por tipo</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>💰</Text>
            <Text style={styles.summaryLabel}>Préstamos</Text>
            <Text style={styles.summaryValue}>{stats.totalPrestamos}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🤝</Text>
            <Text style={styles.summaryLabel}>Servicios</Text>
            <Text style={styles.summaryValue}>{stats.totalServicios}</Text>
          </View>
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
  // Tarjeta de información del usuario
  infoCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.grisOscuro,
    marginBottom: 12,
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.grisClaro,
    paddingTop: 12,
    marginTop: 4,
  },
  userDetailText: {
    fontSize: 13,
    color: Colors.azulMarino,
    marginBottom: 4,
  },
  // Grid de estadísticas principales
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginTop: 4,
  },
  // Estadísticas de montos
  moneyStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  moneyStatCard: {
    flex: 1,
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.verdeOlivo,
  },
  moneyStatCardDebt: {
    borderLeftColor: '#E74C3C',
  },
  moneyStatLabel: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 4,
  },
  moneyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  // Resumen por tipo
  summaryCard: {
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.grisOscuro,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.grisClaro,
  },
  // Botón cerrar sesión
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