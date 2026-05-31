import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date, formattedDate: string) => void;
  initialDate?: Date;
  title?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
  title = 'Seleccionar fecha',
}) => {
  const [tempDate, setTempDate] = useState(initialDate || new Date());
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Para Android: usar un estado separado para controlar la visibilidad
  const handleAndroidOpen = () => {
    setAndroidPickerVisible(true);
  };

  const handleAndroidChange = (event: any, selectedDate?: Date) => {
    // Cerrar el picker independientemente de la acción
    setAndroidPickerVisible(false);
    
    if (event.type === 'set' && selectedDate) {
      // Usuario confirmó la fecha
      const formattedDate = formatDate(selectedDate);
      onConfirm(selectedDate, formattedDate);
      onClose();
    } else if (event.type === 'dismissed') {
      // Usuario canceló
      onClose();
    }
  };

  // Para iOS: manejo del spinner
  const handleIOSConfirm = () => {
    const formattedDate = formatDate(tempDate);
    onConfirm(tempDate, formattedDate);
    onClose();
  };

  const handleIOSChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Android: usamos el picker nativo controlado por estado separado
  if (Platform.OS === 'android') {
    return (
      <>
        {/* Este picker solo aparece cuando androidPickerVisible es true */}
        {androidPickerVisible && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            onChange={handleAndroidChange}
          />
        )}
        {/* Controlamos la apertura desde el modal padre */}
        {visible && !androidPickerVisible && handleAndroidOpen()}
      </>
    );
  }

  // iOS: usamos Modal con DateTimePicker tipo spinner
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.iosContainer}>
          <View style={styles.iosHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.iosCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.iosTitle}>{title}</Text>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={styles.iosConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={handleIOSChange}
          />
          <View style={styles.iosPreview}>
            <Text style={styles.iosPreviewLabel}>Fecha seleccionada:</Text>
            <Text style={styles.iosPreviewDate}>{formatDate(tempDate)}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosContainer: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    width: '90%',
    overflow: 'hidden',
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  iosCancelText: {
    fontSize: 16,
    color: Colors.grisOscuro,
  },
  iosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.azulMarino,
  },
  iosConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.verdeOlivo,
  },
  iosPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grisClaro,
    alignItems: 'center',
  },
  iosPreviewLabel: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginBottom: 4,
  },
  iosPreviewDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
});