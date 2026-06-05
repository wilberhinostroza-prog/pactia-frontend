import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePickerLib from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors } from '../constants/Colors';
import { useSharedFiles } from '../hooks/useSharedFiles';

const { width } = Dimensions.get('window');

interface ImagePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (uri: string, fileName: string) => void;
  title?: string;
  confirmButtonText?: string;
}

type TabType = 'camera' | 'gallery' | 'shared';

// Configuración de compresión (similar a WhatsApp)
const COMPRESSION_CONFIG = {
  // Para imágenes estándar (comprobantes)
  standard: {
    maxWidth: 1600,      // 1600px en el lado más largo
    quality: 0.2,        // Compresión 70%
  },
  // Para imágenes que requieren más calidad (opcional)
  high: {
    maxWidth: 1920,
    quality: 0.85,
  },
};

export const ImagePicker: React.FC<ImagePickerProps> = ({
  visible,
  onClose,
  onSelectImage,
  title = 'Adjuntar comprobante',
  confirmButtonText = 'Adjuntar',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isCompressing, setIsCompressing] = useState(false);
  
  const { sharedImages, loadSharedImages } = useSharedFiles();

  const getImageDimensions = (uri: string) => {
    Image.getSize(uri, (imgWidth, imgHeight) => {
      const maxWidth = width - 80;
      const ratio = imgWidth / imgHeight;
      let finalWidth = maxWidth;
      let finalHeight = maxWidth / ratio;
      
      if (finalHeight > 300) {
        finalHeight = 300;
        finalWidth = finalHeight * ratio;
      }
      
      setImageDimensions({ width: finalWidth, height: finalHeight });
    });
  };

  // Función para comprimir y redimensionar imagen
  const compressImage = async (uri: string): Promise<string> => {
    try {
      setIsCompressing(true);
      
      // Obtener dimensiones originales
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
      });
      
      // Determinar el lado más largo
      const isLandscape = dimensions.width >= dimensions.height;
      const maxDimension = COMPRESSION_CONFIG.standard.maxWidth;
      
      let resize: { width?: number; height?: number } = {};
      if (isLandscape) {
        resize = { width: maxDimension };
      } else {
        resize = { height: maxDimension };
      }
      
      // Aplicar redimensionamiento y compresión
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize }],
        {
          compress: COMPRESSION_CONFIG.standard.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('✅ Imagen comprimida:', {
        original: uri,
        comprimida: manipulatedImage.uri,
        tamañoOriginal: dimensions,
      });
      
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return uri; // Devolver original si falla la compresión
    } finally {
      setIsCompressing(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePickerLib.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar fotos');
      return;
    }

    const result = await ImagePickerLib.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Comprimir la imagen antes de usarla
      const compressedUri = await compressImage(asset.uri);
      setSelectedImage(compressedUri);
      getImageDimensions(compressedUri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería');
      return;
    }

    const result = await ImagePickerLib.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Comprimir la imagen antes de usarla
      const compressedUri = await compressImage(asset.uri);
      setSelectedImage(compressedUri);
      getImageDimensions(compressedUri);
    }
  };

  const selectSharedImage = (uri: string, name: string) => {
    setSelectedImage(uri);
    getImageDimensions(uri);
  };

  const handleConfirm = () => {
    if (selectedImage) {
      const fileName = `proof_${Date.now()}.jpg`;
      onSelectImage(selectedImage, fileName);
      setSelectedImage(null);
      onClose();
    } else {
      Alert.alert('Sin imagen', 'Por favor selecciona una imagen');
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'shared') {
      loadSharedImages();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {/* Indicador de compresión */}
          {isCompressing && (
            <View style={styles.compressingOverlay}>
              <ActivityIndicator size="large" color={Colors.verdeOlivo} />
              <Text style={styles.compressingText}>Optimizando imagen...</Text>
            </View>
          )}

          {/* Selector de pestañas */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'camera' && styles.tabActive]}
              onPress={() => handleTabChange('camera')}
            >
              <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>
                📷 Cámara
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'gallery' && styles.tabActive]}
              onPress={() => handleTabChange('gallery')}
            >
              <Text style={[styles.tabText, activeTab === 'gallery' && styles.tabTextActive]}>
                🖼️ Galería
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'shared' && styles.tabActive]}
              onPress={() => handleTabChange('shared')}
            >
              <Text style={[styles.tabText, activeTab === 'shared' && styles.tabTextActive]}>
                📥 Compartidos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contenido según pestaña */}
          {activeTab === 'camera' && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
                <Text style={styles.optionIcon}>📷</Text>
                <Text style={styles.optionText}>Tomar foto</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'gallery' && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
                <Text style={styles.optionIcon}>🖼️</Text>
                <Text style={styles.optionText}>Elegir de galería</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'shared' && (
            <ScrollView style={styles.sharedContainer} showsVerticalScrollIndicator={false}>
              {sharedImages.length === 0 ? (
                <View style={styles.emptySharedContainer}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyTitle}>No hay imágenes compartidas</Text>
                  <Text style={styles.emptyText}>
                    Comparte una imagen desde Yape, Plin o tu galería y aparecerá aquí
                  </Text>
                </View>
              ) : (
                sharedImages.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.sharedImageItem,
                      selectedImage === img.uri && styles.sharedImageItemSelected
                    ]}
                    onPress={() => selectSharedImage(img.uri, img.name)}
                  >
                    <Image source={{ uri: img.uri }} style={styles.sharedThumbnail} />
                    <View style={styles.sharedInfo}>
                      <Text style={styles.sharedFileName} numberOfLines={1}>
                        {img.name}
                      </Text>
                      {selectedImage === img.uri && (
                        <Text style={styles.selectedBadge}>✓ Seleccionada</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {/* Vista previa de la imagen seleccionada */}
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image 
                source={{ uri: selectedImage }} 
                style={[
                  styles.previewImage,
                  imageDimensions.width ? { width: imageDimensions.width, height: imageDimensions.height } : {}
                ]} 
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  setSelectedImage(null);
                  setImageDimensions({ width: 0, height: 0 });
                }}
              >
                <Text style={styles.removeButtonText}>✕ Eliminar y seleccionar otra</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !selectedImage && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!selectedImage}
            >
              <Text style={styles.confirmButtonText}>{confirmButtonText}</Text>
            </TouchableOpacity>
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
  modalContent: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.verdeOlivo,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.grisOscuro,
  },
  tabTextActive: {
    color: Colors.blanco,
  },
  optionsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  optionButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    width: '100%',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: Colors.azulMarino,
  },
  sharedContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  emptySharedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.grisOscuro,
    textAlign: 'center',
  },
  sharedImageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grisClaro,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  sharedImageItemSelected: {
    backgroundColor: Colors.verdeOlivo + '20',
    borderWidth: 1,
    borderColor: Colors.verdeOlivo,
  },
  sharedThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  sharedInfo: {
    flex: 1,
  },
  sharedFileName: {
    fontSize: 12,
    color: Colors.azulMarino,
  },
  selectedBadge: {
    fontSize: 10,
    color: Colors.verdeOlivo,
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    borderRadius: 12,
    backgroundColor: Colors.grisClaro,
    marginBottom: 8,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.rojoError + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: Colors.rojoError,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.grisOscuro,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.verdeOlivo,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: Colors.blanco,
    fontWeight: '600',
  },
  compressingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: 20,
  },
  compressingText: {
    marginTop: 12,
    color: Colors.blanco,
    fontSize: 14,
  },
});