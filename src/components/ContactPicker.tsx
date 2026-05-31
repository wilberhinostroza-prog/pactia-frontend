import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Colors } from '../constants/Colors';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (phoneNumber: string, name: string) => void;
  title?: string;
}

export const ContactPicker: React.FC<ContactPickerProps> = ({
  visible,
  onClose,
  onSelectContact,
  title = 'Seleccionar contacto',
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          sort: 'firstName',
        });
        
        if (data.length > 0) {
          const formattedContacts: Contact[] = [];
          data.forEach(contact => {
            // Verificar que phoneNumbers existe y tiene al menos un elemento
            if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
              const firstPhone = contact.phoneNumbers[0];
              if (firstPhone && firstPhone.number) {
                // Tomar el primer número de teléfono del contacto
                let phoneNumber = firstPhone.number
                  .replace(/\s/g, '')
                  .replace(/[^0-9+]/g, '');
                
                // Solo agregar números de Perú (9 dígitos) o internacionales
                let cleanNumber = phoneNumber;
                if (phoneNumber.startsWith('+51')) {
                  cleanNumber = phoneNumber.substring(3);
                }
                if (cleanNumber.length === 9 && /^\d+$/.test(cleanNumber)) {
                  formattedContacts.push({
                    id: contact.id,
                    name: contact.name || 'Sin nombre',
                    phoneNumber: cleanNumber,
                  });
                } else if (phoneNumber.length === 9 && /^\d+$/.test(phoneNumber)) {
                  formattedContacts.push({
                    id: contact.id,
                    name: contact.name || 'Sin nombre',
                    phoneNumber: phoneNumber,
                  });
                }
              }
            }
          });
          setContacts(formattedContacts);
          setPermissionDenied(false);
        } else {
          setContacts([]);
        }
      } else {
        setPermissionDenied(true);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    loadContacts();
  };

  const filteredContacts = searchText
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.phoneNumber.includes(searchText)
      )
    : contacts;

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => {
        onSelectContact(item.phoneNumber, item.name);
        onClose();
      }}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.verdeOlivo} />
            <Text style={styles.loadingText}>Cargando contactos...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.centerContainer}>
            <Text style={styles.permissionIcon}>🔒</Text>
            <Text style={styles.permissionTitle}>Permiso denegado</Text>
            <Text style={styles.permissionText}>
              Pactia necesita acceso a tus contactos para que puedas seleccionar fácilmente a tus amigos y familiares.
            </Text>
            <Text style={styles.permissionHint}>
              Ve a Configuración {'>'} Privacidad {'>'} Contactos y activa el acceso para Pactia.
            </Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No hay contactos</Text>
            <Text style={styles.emptyText}>
              No se encontraron contactos con números de teléfono de 9 dígitos.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o teléfono..."
                placeholderTextColor={Colors.grisOscuro}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContactItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.azulMarino,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.blanco,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.blanco,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.grisOscuro,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionHint: {
    fontSize: 12,
    color: Colors.verdeOlivo,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: Colors.blanco,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grisClaro,
  },
  searchInput: {
    backgroundColor: Colors.grisClaro,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.azulMarino,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.verdeOlivo + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.azulMarino,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.grisOscuro,
    marginTop: 2,
  },
});