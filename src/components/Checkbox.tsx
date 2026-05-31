import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string;
  linkText?: string;
  onLinkPress?: () => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  linkText,
  onLinkPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.label}>
        {label}
        {linkText && (
          <Text style={styles.link} onPress={onLinkPress}>
            {linkText}
          </Text>
        )}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.verdeOlivo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.verdeOlivo,
  },
  checkmark: {
    color: Colors.blanco,
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: Colors.blanco,
  },
  link: {
    color: Colors.verdeOlivo,
    textDecorationLine: 'underline',
    marginLeft: 4,
  },
});