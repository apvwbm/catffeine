// Ajustes. Cada cambio se guarda al momento. La hora de levantarse no está aquí: se cambia
// en Sueño. El umbral de sueño, la vida media y el máximo diario son constantes con su
// fuente (`catalogo.ts`), sin ajuste.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { Ayuda, Fila, Interruptor, Pantalla, Seccion, Segmentado, Texto } from '@/components/ui';
import { useFormato } from '@/hooks';
import { IDIOMAS } from '@/lib/i18n';
import { ritmoDe } from '@/lib/motor';
import { avisar, borrarTodo, cambiarAjustes, useApp } from '@/store/app';
import { useColores } from '@/theme';
import type { Ritmo } from '@/types';

// Abren el navegador: la app sigue sin permiso INTERNET.
const WEB = 'https://apvwbm.com/projects/catffeine';
// Antes de Google Play, quitar esta fila (política de pagos).
const KOFI = 'https://ko-fi.com/apvwbm';

const RITMOS: Ritmo[] = ['rapido', 'normal', 'lento'];

export default function Ajustes() {
  const { t, fecha } = useFormato();
  const c = useColores();
  const a = useApp((s) => s.ajustes);

  // Doble confirmación, y luego todo fuera de golpe.
  const borrar = () =>
    Alert.alert(t('aj.borrar'), t('aj.borrarConfirmar'), [
      { text: t('g.cancelar'), style: 'cancel' },
      {
        text: t('aj.borrar'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('aj.borrar'), t('aj.borrarSeguro'), [
            { text: t('g.cancelar'), style: 'cancel' },
            {
              text: t('aj.borrar'),
              style: 'destructive',
              onPress: () => {
                const texto = t('aj.borrado');
                borrarTodo();
                avisar(texto);
                router.dismissAll();
              },
            },
          ]),
      },
    ]);

  return (
    <Pantalla titulo={t('aj.titulo')} atras>
      <Segmentado etiqueta={t('aj.idioma')} opciones={IDIOMAS.map((i) => ({ valor: i.codigo, texto: i.nombre }))} valor={a.idioma} onCambio={(idioma) => cambiarAjustes({ idioma })} />

      <Seccion titulo={t('aj.ritmo')} icono="activity">
        <Segmentado
          opciones={RITMOS.map((r) => ({ valor: r, texto: t(`ritmo.${r}`) }))}
          valor={ritmoDe(a)}
          onCambio={(ritmo) => cambiarAjustes({ ritmo })}
          deshabilitado={a.embarazo}
        />
        <Ayuda>{t('aj.ritmoAyuda')}</Ayuda>
        <Interruptor titulo={t('aj.embarazo')} ayuda={t('aj.embarazoAyuda')} valor={a.embarazo} onCambio={(embarazo) => cambiarAjustes({ embarazo })} />
      </Seccion>

      <Seccion titulo={t('aj.datos')} icono="database">
        <Fila titulo={t('aj.bebidas')} icono="coffee" onPress={() => router.push('/bebidas')} chevron />
        <Fila titulo={t('aj.exportar')} icono="lock" onPress={() => router.push({ pathname: '/copia', params: { modo: 'exportar' } })} chevron />
        <Fila titulo={t('aj.importar')} icono="download" onPress={() => router.push({ pathname: '/copia', params: { modo: 'importar' } })} chevron />
        {a.ultimaCopia && <Ayuda>{t('aj.ultimaCopia', { fecha: fecha(a.ultimaCopia) })}</Ayuda>}
        <Fila titulo={t('aj.borrar')} icono="trash-2" tinteIcono={c.acento} onPress={borrar} />
      </Seccion>

      <Seccion titulo={t('aj.acerca')} icono="info">
        <Texto estilo="cuerpo">CAtFFEINE</Texto>
        <Ayuda>{t('aj.version', { v: Constants.expoConfig?.version ?? '' })}</Ayuda>
        <Texto estilo="apoyo" tono="texto2">
          {t('aj.adultos')}
        </Texto>
        <Texto estilo="apoyo" tono="texto2">
          {t('aj.privacidad')}
        </Texto>
        <Fila titulo={t('aj.fuentes')} icono="book-open" onPress={() => router.push('/fuentes')} chevron />
        <Fila titulo={t('aj.autor')} subtitulo={t('aj.autorAyuda')} icono="globe" onPress={() => void Linking.openURL(WEB)} />
        <Fila titulo={t('aj.cafe')} icono="coffee" onPress={() => void Linking.openURL(KOFI)} />
      </Seccion>
    </Pantalla>
  );
}
