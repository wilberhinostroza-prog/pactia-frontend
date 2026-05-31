import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  onClose,
  title,
  content,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollContent}>
            <Text style={styles.contentText}>{content}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
            <Text style={styles.acceptButtonText}>Cerrar</Text>
          </TouchableOpacity>
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
  modalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.grisOscuro,
  },
  scrollContent: {
    padding: 16,
  },
  contentText: {
    fontSize: 14,
    color: Colors.azulMarino,
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: Colors.verdeOlivo,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.blanco,
    fontSize: 16,
    fontWeight: '600',
  },
});