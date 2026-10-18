// Tokens de diseño. Dos paletas, claro y oscuro, según el tema del móvil y en vivo (la
// app se usa de noche, en la cama). Ninguna pantalla escribe un color literal: o sale de
// aquí, o no existe.
//
// **Un solo acento.** El índigo noche es la marca: el botón principal, la cifra héroe, la
// pestaña activa y las barras de la curva. Verde y ocre son estado y van SIEMPRE con texto
// o icono.
//
// Plano: bordes de 1 px y espacio en blanco, nunca sombras ni degradados.
//
// Los estilos que dependen del tema se escriben al final de cada archivo como función
// de la paleta (`const estilos = (c: Paleta) => StyleSheet.create(…)`) y se usan con
// `useEstilos(estilos)`, que los crea una vez por paleta.

import { useColorScheme, type TextStyle } from 'react-native';

export const CLARO = {
  fondo: '#FFFFFF',
  superficie: '#F5F5F7',
  linea: '#E5E5EA',
  lineaFuerte: '#1C1C22',

  texto: '#1C1C22',
  texto2: '#6B6B76',
  /** No da AA: solo placeholders y detalles que no son texto que haya que leer. */
  texto3: '#A1A1AA',

  acento: '#3B4A8C',
  acentoSuave: '#E8EBF6',
  /** La noche de la curva (1,3:1 con el fondo). Lo que va encima, en texto: texto2 no da AA. */
  noche: '#DDE1F3',
  sobreAcento: '#FFFFFF',

  verde: '#4A7559',
  verdeSuave: '#E5EEE7',
  ocre: '#966A22',
  ocreSuave: '#F6EEDF',

  velo: 'rgba(28,28,34,0.45)',
};

export type Paleta = typeof CLARO;

export const OSCURO: Paleta = {
  fondo: '#0F0F12',
  superficie: '#1A1A1F',
  linea: '#2A2A31',
  lineaFuerte: '#ECECF1',

  texto: '#ECECF1',
  texto2: '#A0A0AB',
  texto3: '#6B6B76',

  acento: '#A5B0F0',
  acentoSuave: '#23284A',
  noche: '#29305A',
  sobreAcento: '#0F0F12',

  verde: '#8DBE9C',
  verdeSuave: '#1C2A21',
  ocre: '#D9AE62',
  ocreSuave: '#2E2414',

  velo: 'rgba(0,0,0,0.6)',
};

export const useColores = (): Paleta => (useColorScheme() === 'dark' ? OSCURO : CLARO);

const cache = new WeakMap<object, Map<Paleta, unknown>>();

/** Estilos que dependen del tema: se crean una vez por paleta y se cachean. */
export function useEstilos<T>(crear: (c: Paleta) => T): T {
  const c = useColores();
  let porPaleta = cache.get(crear);
  if (!porPaleta) cache.set(crear, (porPaleta = new Map()));
  if (!porPaleta.has(c)) porPaleta.set(c, crear(c));
  return porPaleta.get(c) as T;
}

/** Múltiplos de 4. */
export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pantalla: 20 } as const;

/** Zona táctil mínima (las guías piden 44 pt; 48 es la de Android). */
export const TACTIL = 48;
export const RADIO = 4;
export const BORDE = 1;

export const fuente = {
  regular: 'Archivo_400Regular',
  semi: 'Archivo_600SemiBold',
  display: 'Archivo_800ExtraBold',
} as const;

/** Las cifras van con `tabular-nums`: si no, una cifra baila al cambiar un dígito. */
const NUM: TextStyle = { fontVariant: ['tabular-nums'] };

// Sin color: lo pone cada pantalla desde la paleta.
export const typo = {
  heroe: { fontFamily: fuente.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, ...NUM },
  cifra: { fontFamily: fuente.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, ...NUM },
  titulo: { fontFamily: fuente.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, textTransform: 'uppercase' },
  seccion: { fontFamily: fuente.display, fontSize: 13, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  cuerpo: { fontFamily: fuente.semi, fontSize: 16, lineHeight: 22 },
  texto: { fontFamily: fuente.regular, fontSize: 15, lineHeight: 21 },
  apoyo: { fontFamily: fuente.regular, fontSize: 13, lineHeight: 18 },
  dato: { fontFamily: fuente.semi, fontSize: 15, lineHeight: 20, ...NUM },
  micro: { fontFamily: fuente.semi, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;
