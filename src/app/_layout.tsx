import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Colors } from '../constants/Colors';
import { ensureSharedFolder } from '../services/sharedFiles';
//import { useNotifications } from '../hooks/useNotifications';

export default function RootLayout() {
  // Crear carpeta compartida al iniciar la app
  //useNotifications(); // ← Agregar esta línea
  useEffect(() => {
    ensureSharedFolder();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.azulMarino,
          },
          headerTintColor: Colors.blanco,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: 'Pactia',
          headerBackTitle: 'Atrás',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ 
            title: 'Iniciar sesión',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            title: 'Crear cuenta',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="complete-profile" 
          options={{ 
            title: 'Completar perfil',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="loan-detail" 
          options={{ 
            title: 'Detalle del pacto',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="view-proof" 
          options={{ 
            title: 'Comprobante',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </>
  );
}