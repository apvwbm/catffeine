// Cómo se calcula: de dónde sale cada número, con sus fuentes (abren el navegador; la app
// sigue sin permiso INTERNET). Las cifras de los textos salen de `catalogo.ts`: si cambia
// una constante, el texto no se queda viejo.

import { Linking, View } from 'react-native';

import { Fila, Pantalla, Seccion, Texto } from '@/components/ui';
import { useT } from '@/hooks';
import { CICLO, DORMIRSE, DOSIS_MAXIMA, FUENTES, MAXIMO_DIARIO, MAXIMO_EMBARAZO, UMBRAL_SUENO, VIDA_MEDIA } from '@/lib/catalogo';

const APARTADOS = [
  { clave: 'cafeina', icono: 'activity' },
  { clave: 'tope', icono: 'clock' },
  { clave: 'maximos', icono: 'bar-chart-2' },
  { clave: 'sueno', icono: 'moon' },
  { clave: 'bebidas', icono: 'coffee' },
] as const;

const CIFRAS = { ...VIDA_MEDIA, mg: UMBRAL_SUENO, dia: MAXIMO_DIARIO, embarazo: MAXIMO_EMBARAZO, dosis: DOSIS_MAXIMA, ciclo: CICLO, dormirse: DORMIRSE };

export default function Fuentes() {
  const t = useT();
  return (
    <Pantalla titulo={t('aj.fuentes')} atras>
      {APARTADOS.map(({ clave, icono }) => (
        <Seccion key={clave} titulo={t(`fu.${clave}`)} icono={icono}>
          <Texto estilo="cuerpo">{t(`fu.${clave}Texto`, CIFRAS)}</Texto>
          <View>
            {FUENTES[clave].map((f) => (
              <Fila key={f.url} titulo={f.cita} subtitulo={f.donde} icono="external-link" onPress={() => void Linking.openURL(f.url)} />
            ))}
          </View>
        </Seccion>
      ))}
      <Texto estilo="apoyo" tono="texto2">
        {t('aj.adultos')}
      </Texto>
    </Pantalla>
  );
}
