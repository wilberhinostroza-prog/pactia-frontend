import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Colors } from '../constants/Colors';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay = ({ visible, message = 'Cargando...' }: LoadingOverlayProps) => {
  if (!visible) return null;
  
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.verdeOlivo} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.blanco,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  message: {
    marginTop: 12,
    color: Colors.azulMarino,
    fontSize: 14,
    textAlign: 'center',
  },
});