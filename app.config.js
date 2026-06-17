// frontend/Pactia/app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "Pactia",
    slug: "Pactia",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "pactia",
    userInterfaceStyle: "automatic",
    
    ios: {
      icon: "./assets/expo.icon",
      infoPlist: {
        "NSCameraUsageDescription": "Pactia necesita acceso a la cámara para tomar fotos de comprobantes.",
        "NSPhotoLibraryUsageDescription": "Pactia necesita acceso a tu galería para adjuntar comprobantes de pago."
      }
    },
    
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#2C3E50"
      },
      package: "com.pactia.app",
      intentFilters: [
        {
          action: "android.intent.action.SEND",
          data: [
            {
              mimeType: "image/jpeg"
            },
            {
              mimeType: "image/png"
            },
            {
              mimeType: "image/webp"
            },
            {
              mimeType: "image/*"
            }
          ],
          category: ["android.intent.category.DEFAULT"]
        }
      ],
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_CONTACTS"
      ]
    },
    
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          "iosAppId": "ca-app-pub-3940256099942544~1458002511",
          "androidAppId": "ca-app-pub-3940256099942544~3347511713"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ],
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#2C3E50",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "Permite a Pactia acceder a tus contactos para que puedas seleccionar fácilmente a tus amigos y familiares para préstamos y servicios."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Pactia necesita acceso a tu galería para adjuntar comprobantes de pago.",
          "cameraPermission": "Pactia necesita acceso a tu cámara para tomar fotos de comprobantes."
        }
      ],
      "expo-notifications",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "expo-sharing"
    ],
    
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "2895fb67-3616-46c7-8cee-53739fa77fc2"
      }
    }
  }
};