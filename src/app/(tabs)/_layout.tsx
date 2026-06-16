import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { usePendingRequestsCount } from '../../hooks/usePendingRequestsCount';
import { sharePactiaApk } from '../../utils/shareApk';

// Componente de badge
const Badge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
};

export default function TabsLayout() {
  const { count: pendingRequestsCount } = usePendingRequestsCount();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.azulMarino,
        },
        headerTintColor: Colors.blanco,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => sharePactiaApk()}
          >
            <Text style={styles.inviteButtonText}>📤 Invitar Pactia a un amigo</Text>
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: Colors.azulMarino,
          borderTopColor: Colors.verdeOlivo,
          borderTopWidth: 2,
          height: 75,
          paddingBottom: 10,
          paddingTop: 8,
          bottom: 20,
          left: 10,
          right: 10,
          shadowColor: Colors.verdeOlivo,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarActiveTintColor: Colors.verdeOlivo,
        tabBarInactiveTintColor: Colors.grisOscuro,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Mis pactos',
          tabBarLabel: 'Inicio',
          headerTitle: 'Mis préstamos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="request-loan"
        options={{
          title: 'Solicitar',
          tabBarLabel: 'Solicitar',
          headerTitle: 'Solicitar préstamo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pending-requests"
        options={{
          title: 'Solicitudes',
          tabBarLabel: 'Solicitudes',
          headerTitle: 'Solicitudes recibidas',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications-outline" size={28} color={color} />
              <Badge count={pendingRequestsCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarLabel: 'Historial',
          headerTitle: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          headerTitle: 'Mi perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: Colors.rojoError,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.blanco,
    fontSize: 10,
    fontWeight: 'bold',
  },
  inviteButton: {
    marginRight: 16,
    backgroundColor: Colors.verdeOlivo + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  inviteButtonText: {
    color: Colors.blanco,
    fontSize: 12,
    fontWeight: '500',
  },
});