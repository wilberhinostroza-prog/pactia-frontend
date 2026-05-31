import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';

interface ErrorToastProps {
  visible: boolean;
  message: string;
  onHide?: () => void;
  duration?: number;
}

export const ErrorToast = ({ visible, message, onHide, duration = 3000 }: ErrorToastProps) => {
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide?.());
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: Colors.rojoError,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: Colors.blanco,
    fontSize: 14,
    textAlign: 'center',
  },
});