// Las tres pestañas: Ahora, Sueño e Historial.

import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from '@/components/ui';
import { useT } from '@/hooks';
import type { Clave } from '@/lib/i18n';
import { BORDE, typo, useColores } from '@/theme';

const PESTANAS: { nombre: string; titulo: Clave; icono: string }[] = [
  { nombre: 'index', titulo: 'tab.ahora', icono: 'coffee' },
  { nombre: 'sueno', titulo: 'tab.sueno', icono: 'moon' },
  { nombre: 'historial', titulo: 'tab.historial', icono: 'bar-chart-2' },
];

export default function LayoutPestanas() {
  const t = useT();
  const c = useColores();
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.acento,
        // texto2 y no texto3: texto3 no da AA.
        tabBarInactiveTintColor: c.texto2,
        // Alto y margen explícitos: con el alto por defecto la etiqueta de Archivo casi
        // se corta por abajo, sobre todo con la barra de gestos.
        tabBarStyle: {
          backgroundColor: c.fondo,
          borderTopColor: c.linea,
          borderTopWidth: BORDE,
          elevation: 0,
          height: 64 + bottom,
          paddingTop: 6,
          paddingBottom: bottom + 8,
        },
        tabBarLabelStyle: typo.micro,
        sceneStyle: { backgroundColor: c.fondo },
      }}
    >
      {PESTANAS.map(({ nombre, titulo, icono }) => (
        <Tabs.Screen
          key={nombre}
          name={nombre}
          options={{ title: t(titulo), tabBarIcon: ({ color: tinte }) => <Icono nombre={icono} tinte={String(tinte)} /> }}
        />
      ))}
    </Tabs>
  );
}
