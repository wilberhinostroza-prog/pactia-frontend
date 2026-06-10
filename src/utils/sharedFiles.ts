import * as FileSystem from 'expo-file-system/legacy';

// Ruta de la carpeta compartida
const SHARED_FOLDER = `${FileSystem.documentDirectory}pactia_shared/`;

// Crear carpeta si no existe
export async function ensureSharedFolder() {
  try {
    const folderInfo = await FileSystem.getInfoAsync(SHARED_FOLDER);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(SHARED_FOLDER, { intermediates: true });
      console.log('📁 Carpeta compartida creada:', SHARED_FOLDER);
    }
  } catch (error) {
    console.error('Error creando carpeta compartida:', error);
  }
  return SHARED_FOLDER;
}

// Guardar imagen compartida
export async function saveSharedImage(uri: string): Promise<string> {
  try {
    await ensureSharedFolder();
    const fileName = `shared_${Date.now()}.jpg`;
    const newPath = `${SHARED_FOLDER}${fileName}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: newPath
    });
    
    console.log('📸 Imagen guardada:', newPath);
    return newPath;
  } catch (error) {
    console.error('Error guardando imagen:', error);
    throw error;
  }
}

// Obtener todas las imágenes compartidas
export async function getSharedImages(): Promise<{ uri: string; name: string; date: Date }[]> {
  try {
    await ensureSharedFolder();
    
    const files = await FileSystem.readDirectoryAsync(SHARED_FOLDER);
    
    const images = await Promise.all(
      files.map(async (file) => {
        const info = await FileSystem.getInfoAsync(`${SHARED_FOLDER}${file}`);
        return {
          uri: info.uri,
          name: file,
          date: new Date(), // Usamos fecha actual como fallback
        };
      })
    );
    
    return images.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error('Error leyendo imágenes compartidas:', error);
    return [];
  }
}

// Limpiar imágenes antiguas (más de 7 días)
export async function cleanOldSharedImages() {
  try {
    const images = await getSharedImages();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (const image of images) {
      if (image.date.getTime() < weekAgo) {
        await FileSystem.deleteAsync(image.uri);
        console.log('🗑️ Imagen eliminada:', image.name);
      }
    }
  } catch (error) {
    console.error('Error limpiando imágenes:', error);
  }
}