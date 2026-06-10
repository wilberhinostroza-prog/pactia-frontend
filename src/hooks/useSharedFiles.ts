import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { saveSharedImage, getSharedImages } from '../utils/sharedFiles';

export function useSharedFiles() {
  const [lastSharedImage, setLastSharedImage] = useState<string | null>(null);
  const [sharedImages, setSharedImages] = useState<{ uri: string; name: string }[]>([]);

  // Cargar imágenes compartidas existentes
  const loadSharedImages = async () => {
    const images = await getSharedImages();
    setSharedImages(images.map(img => ({ uri: img.uri, name: img.name })));
  };

  // Manejar cuando la app recibe un archivo compartido
  useEffect(() => {
    loadSharedImages();

    const handleDeepLink = async (event: Linking.EventType) => {
      const url = event.url;
      console.log('🔗 Deep link recibido:', url);
      
      // Si es un archivo local (file://)
      if (url && url.startsWith('file://')) {
        const savedPath = await saveSharedImage(url);
        setLastSharedImage(savedPath);
        await loadSharedImages();
      }
    };

    // Suscribirse a eventos de deep link
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con un archivo compartido
    Linking.getInitialURL().then(async (url) => {
      if (url && url.startsWith('file://')) {
        const savedPath = await saveSharedImage(url);
        setLastSharedImage(savedPath);
        await loadSharedImages();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { lastSharedImage, sharedImages, loadSharedImages };
}