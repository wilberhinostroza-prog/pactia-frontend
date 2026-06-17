// src/hooks/useInterstitialAd.ts
import { useCallback, useRef } from 'react';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// En desarrollo usa el ID de prueba. En producción, usa tu ID real de AdMob.
const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL // ID de prueba global de Google
  : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy'; // <--- CAMBIA ESTO

/**
 * Hook personalizado para manejar anuncios intersticiales con un temporizador de espera.
 * Muestra un anuncio a pantalla completa y espera a que el usuario lo cierre.
 */
export const useInterstitialAd = () => {
  const interstitialAdRef = useRef<InterstitialAd | null>(null);
  const isAdLoaded = useRef(false);

  const loadAd = useCallback(() => {
    // 1. Crea una nueva instancia del anuncio
    const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // 2. Escucha el evento LOADED para saber cuándo está listo
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        isAdLoaded.current = true;
        console.log('✅ Anuncio intersticial cargado.');
      }
    );

    // 3. Escucha el evento CLOSED para limpiar la referencia después de mostrarlo
    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('👀 Anuncio cerrado por el usuario.');
        // Limpia la referencia para que se pueda cargar uno nuevo
        interstitialAdRef.current = null;
        isAdLoaded.current = false;
      }
    );

    // 4. Carga el anuncio
    interstitial.load();

    // 5. Guarda la referencia y los listeners para limpiarlos después
    interstitialAdRef.current = interstitial;

    // (Opcional) Limpieza de listeners si el componente se desmonta
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAd = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // Si el anuncio ya está cargado y listo, lo muestra
      if (interstitialAdRef.current && isAdLoaded.current) {
        console.log('📱 Mostrando anuncio intersticial...');
        interstitialAdRef.current.show();
        // El evento CLOSED resolverá la promesa, pero usamos un listener temporal para saber cuándo terminó.
        const unsubscribeOnClosed = interstitialAdRef.current!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('✅ Anuncio mostrado y cerrado.');
            unsubscribeOnClosed();
            resolve(true);
          }
        );
      } else {
        // Si el anuncio no está listo, no muestra nada y resuelve la promesa
        console.warn('⚠️ El anuncio intersticial no está listo. Cargándolo para la próxima.');
        // Intenta cargarlo para la próxima vez
        loadAd();
        resolve(false); // Indica que no se mostró el anuncio
      }
    });
  }, [loadAd]);

  return { showAd, loadAd };
};