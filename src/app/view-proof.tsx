import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function ViewProofScreen() {
  const { uri, fileName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [imageExists, setImageExists] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    checkImage();
  }, []);

  const checkImage = async () => {
    try {
      const imageUri = uri as string;
      
      Image.getSize(imageUri, (imgWidth, imgHeight) => {
        const maxWidth = width - 40;
        const maxHeight = height - 150;
        
        let finalWidth = maxWidth;
        let finalHeight = (maxWidth / imgWidth) * imgHeight;
        
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = (maxHeight / imgHeight) * imgWidth;
        }
        
        setImageDimensions({ width: finalWidth, height: finalHeight });
        setImageExists(true);
        setLoading(false);
      }, () => {
        checkLocalFile(imageUri);
      });
    } catch (error) {
      setLoading(false);
      setImageExists(false);
    }
  };

  const checkLocalFile = async (imageUri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(imageUri);
      if (info.exists) {
        Image.getSize(imageUri, (imgWidth, imgHeight) => {
          const maxWidth = width - 40;
          const maxHeight = height - 150;
          
          let finalWidth = maxWidth;
          let finalHeight = (maxWidth / imgWidth) * imgHeight;
          
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (maxHeight / imgHeight) * imgWidth;
          }
          
          setImageDimensions({ width: finalWidth, height: finalHeight });
          setImageExists(true);
        });
      } else {
        setImageExists(false);
      }
      setLoading(false);
    } catch (error) {
      setImageExists(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.verdeOlivo} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!imageExists) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Imagen no disponible</Text>
        <Text style={styles.errorText}>
          El comprobante no se encuentra disponible.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        centerContent={true}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: uri as string }}
            style={[
              styles.image,
              { width: imageDimensions.width, height: imageDimensions.height }
            ]}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.blanco,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.grisClaro,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.grisOscuro,
    textAlign: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    backgroundColor: Colors.blanco,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: {
    borderRadius: 8,
  },
  infoContainer: {
    backgroundColor: Colors.blanco,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  fileName: {
    fontSize: 12,
    color: Colors.grisOscuro,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.verdeOlivo,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.blanco,
    fontSize: 16,
    fontWeight: '600',
  },
});