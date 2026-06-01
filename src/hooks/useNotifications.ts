// @ts-nocheck
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configurar cómo se muestran las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Programar una notificación de recordatorio
export async function schedulePaymentReminder(
  contractId: string,
  title: string,
  body: string,
  secondsFromNow: number
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { contractId, screen: 'loan-detail' },
    },
    trigger: {
      seconds: secondsFromNow,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });
  return identifier;
}

// Cancelar todas las notificaciones
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Hook principal
export function useNotifications() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    requestPermissions();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notificación recibida:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && data.screen === 'loan-detail' && data.contractId) {
          router.push(`/loan-detail?contractId=${data.contractId}`);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
}

// Solicitar permisos de notificación
export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('⚠️ Permiso de notificaciones no concedido');
    return false;
  }
  
  // Configurar canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payment_reminders', {
      name: 'Recordatorios de pago',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#556B2F',
    });
  }
  
  return true;
}