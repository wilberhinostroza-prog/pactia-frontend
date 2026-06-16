// src/utils/shareApk.ts
import { Share, Alert } from 'react-native';

// Enlace directo al APK (Google Drive, Dropbox, o tu servidor)
// TODO: Cambiar por el enlace real cuando tengas el APK alojado
const APK_DOWNLOAD_LINK = 'https://drive.google.com/file/d/1SPoyjlms_Ly_lYoLGsi_h2wuZmvsfpKU/view?usp=sharing'; // ← CAMBIAR AQUÍ

export const sharePactiaApk = async (contactName?: string, contactPhone?: string) => {
  try {
    // Mensaje personalizado para el contacto
    const message = contactName
      ? `¡Hola ${contactName}! Te invito a usar Pactia, la aplicación para documentar préstamos y servicios con tus contactos de forma segura.

        📱 Para instalar:
        1. Haz clic en el enlace: ${APK_DOWNLOAD_LINK}
        2. Descarga el archivo APK
        3. Habilita "Instalar desde orígenes desconocidos" en Ajustes (si es necesario)
        4. Abre el archivo para instalar

        ¡Es seguro y confidencial!`
      : `Te invito a usar Pactia, la aplicación para documentar préstamos y servicios de forma segura.

        📱 Para instalar:
        1. Haz clic en el enlace: ${APK_DOWNLOAD_LINK}
        2. Descarga el archivo APK
        3. Habilita "Instalar desde orígenes desconocidos" en Ajustes (si es necesario)
        4. Abre el archivo para instalar

        ¡Es seguro y confidencial!`;

    await Share.share({
      message: message,
      title: 'Invitación a Pactia',
    });
  } catch (error) {
    console.error('Error compartiendo enlace:', error);
    Alert.alert('Error', 'No se pudo compartir el enlace');
  }
};