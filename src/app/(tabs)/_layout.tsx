import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function TabsLayout() {
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
        tabBarStyle: {
        backgroundColor: Colors.azulMarino,
        borderTopColor: Colors.verdeOlivo,
        borderTopWidth: 2,
        height: 70,
        paddingBottom: 10,
        paddingTop: 8,
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
          fontWeight: '600',   // ← Negrita
          marginBottom: 4,     // ← Espacio
        },
        tabBarIconStyle: {
          marginTop: 4,        // ← Espacio para el ícono
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
          <Ionicons name="notifications-outline" size={28} color={color} />
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