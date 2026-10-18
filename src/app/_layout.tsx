// Raíz: fuentes, apertura de la base cifrada, tema, reloj y navegación.
//
// El splash se mantiene hasta que las fuentes Y los datos están listos, así la
// primera pantalla sale entera y sin parpadeos.

import { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisoFlotante } from '@/components/ui';
import { MIN } from '@/lib/fechas';
import { iniciar, tic, useApp } from '@/store/app';
import { useColores } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function Raiz() {
  const [fuentes] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  const cargado = useApp((s) => s.cargado);
  const c = useColores();

  useEffect(() => {
    void iniciar();
  }, []);

  useEffect(() => {
    if (fuentes && cargado) void SplashScreen.hideAsync();
  }, [fuentes, cargado]);

  // El fondo de la ventana, para que no asome blanco en oscuro al cambiar de pantalla.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.fondo);
  }, [c]);

  // El reloj de la app: un tic al empezar cada minuto y otro al volver a primer plano (con
  // la app fuera, los temporizadores se paran). De él viven la cifra y la curva.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const programar = () => {
      id = setTimeout(() => {
        tic();
        programar();
      }, MIN - (Date.now() % MIN) + 50);
    };
    programar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      clearTimeout(id);
      tic();
      programar();
    });
    return () => {
      clearTimeout(id);
      sub.remove();
    };
  }, []);

  if (!fuentes || !cargado) return null;

  const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo }, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="toma" options={modal} />
        <Stack.Screen name="bebidas" options={modal} />
        <Stack.Screen name="ajustes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="fuentes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="copia" options={modal} />
      </Stack>
      <AvisoFlotante />
    </SafeAreaProvider>
  );
}
