// Ahora: cuánta cafeína tienes, hasta cuándo puedes tomar más, la curva del día, los
// botones para apuntar y lo que llevas hoy.

import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Curva } from '@/components/Curva';
import { Boton, Fila, Icono, Nota, Pantalla, Progreso, Seccion, Texto } from '@/components/ui';
import { useCafeina, useFormato } from '@/hooks';
import { MAX_FAVORITAS, UMBRAL_SUENO } from '@/lib/catalogo';
import { apuntar, useApp } from '@/store/app';
import { BORDE, espacio, RADIO, TACTIL, typo, useColores, useEstilos, type Paleta } from '@/theme';

export default function Ahora() {
  const f = useFormato();
  const { t } = f;
  const c = useColores();
  const s = useEstilos(estilos);
  const d = useCafeina();
  const bebidas = useApp((x) => x.bebidas);
  const favoritas = useMemo(() => bebidas.filter((b) => b.favorita).slice(0, MAX_FAVORITAS), [bebidas]);
  const aSueno = () => router.navigate('/sueno');

  // Con la primera favorita: hasta cuándo, cuando quieras, u hoy ya no.
  const bebida = d.principal && f.nombre(d.principal);
  const veredicto = !bebida
    ? null
    : d.tope === null
      ? t('ahora.yaNo', { hora: f.fraseDe(d.noche.dormir) })
      : d.tope === d.noche.dormir
        ? t('ahora.cuandoQuieras', { bebida })
        : t('ahora.hasta', { bebida, hora: f.fraseDe(d.tope) });

  return (
    <Pantalla
      titulo={t('tab.ahora')}
      derecha={
        <Pressable onPress={() => router.push('/ajustes')} hitSlop={8} style={s.ajustes} accessibilityRole="button" accessibilityLabel={t('aj.titulo')}>
          <Icono nombre="settings" tam={22} />
        </Pressable>
      }
    >
      <View style={s.heroe}>
        <Texto estilo="micro" tono="texto2">
          {t('ahora.enCuerpo')}
        </Texto>
        <Texto estilo="heroe" tono="acento">
          {f.mg(Math.round(d.mg))}
        </Texto>
        {d.noche.esHoraDeDormir ? (
          <View style={{ gap: espacio.xs }}>
            <Texto estilo="cuerpo">{t('ahora.aDormir', { hora: f.fraseDe(d.noche.despertar) })}</Texto>
            <Boton texto={t('ahora.verSueno')} variante="texto" icono="moon" onPress={aSueno} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <>
            {veredicto && <Texto estilo="cuerpo">{veredicto}</Texto>}
            <Pressable onPress={aSueno} style={s.dormir} accessibilityRole="button">
              <Icono nombre="moon" tam={16} tinte={c.texto2} />
              <Texto tono="texto2">{t('ahora.dormir', { hora: f.fraseDe(d.noche.dormir) })}</Texto>
              <Texto style={s.enlace}>{t('ahora.cambiar')}</Texto>
            </Pressable>
          </>
        )}
      </View>
      {d.picoNoche > UMBRAL_SUENO && <Nota tono="aviso" icono="moon" texto={t('ahora.quedara', { mg: Math.round(d.picoNoche) })} />}

      <Curva
        puntos={d.puntos}
        mg={d.mg}
        dormir={d.noche.dormir}
        ahora={d.ahora}
        umbral={UMBRAL_SUENO}
        descripcion={t('curva.desc', { ahora: Math.round(d.mg), noche: Math.round(d.picoNoche) })}
      />

      <Seccion titulo={t('ahora.apuntar')} icono="plus">
        <View style={s.favoritas}>
          {favoritas.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => apuntar({ bebida: b.id, clave: b.clave, nombre: f.nombre(b), mg: b.mg, ts: Date.now() }, t('ahora.apuntada', { bebida: f.nombre(b) }))}
              style={({ pressed }) => [s.favorita, pressed && { backgroundColor: c.superficie }]}
              accessibilityRole="button"
              accessibilityLabel={`${f.nombre(b)}, ${f.mg(b.mg)}`}
            >
              <Text style={[typo.cuerpo, { color: c.texto }]} numberOfLines={2}>
                {f.nombre(b)}
              </Text>
              <Text style={[typo.dato, { color: c.texto2 }]}>{f.mg(b.mg)}</Text>
            </Pressable>
          ))}
        </View>
        <Boton texto={t('ahora.otra')} variante="secundario" icono="plus" onPress={() => router.push('/toma')} />
      </Seccion>

      <Seccion titulo={t('ahora.hoy')} icono="calendar">
        <Texto estilo="dato">{t('ahora.deMaximo', { n: f.numero(d.totalHoy), max: d.maximo })}</Texto>
        <Progreso hecho={d.totalHoy} total={d.maximo} />
        {d.totalHoy > d.maximo && <Nota tono="aviso" texto={t('ahora.pasado')} />}
        <View>
          {[...d.deHoy].reverse().map((x) => (
            <Fila key={x.id} titulo={f.nombre(x)} subtitulo={f.horaDe(x.ts)} derecha={f.mg(x.mg)} onPress={() => router.push({ pathname: '/toma', params: { id: x.id } })} />
          ))}
        </View>
      </Seccion>
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    ajustes: { width: TACTIL, height: TACTIL, alignItems: 'flex-end', justifyContent: 'center' },
    heroe: { gap: espacio.sm, paddingTop: espacio.sm },
    dormir: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, minHeight: TACTIL, flexWrap: 'wrap' },
    enlace: { textDecorationLine: 'underline' },
    favoritas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
    favorita: {
      // Dos columnas: la mitad menos medio hueco.
      flexBasis: '48%',
      flexGrow: 1,
      minHeight: 72,
      padding: espacio.md,
      gap: espacio.xs,
      justifyContent: 'space-between',
      borderWidth: BORDE,
      borderColor: c.lineaFuerte,
      borderRadius: RADIO,
    },
  });
