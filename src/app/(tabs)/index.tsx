// Ahora: cuánta cafeína tienes, hasta cuándo puedes tomar más, la curva del día, los
// botones para apuntar y lo que llevas hoy.

import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Curva } from '@/components/Curva';
import { Boton, Fila, Icono, Nota, Pantalla, Progreso, Seccion, Texto } from '@/components/ui';
import { useApuntar, useCafeina, useFormato } from '@/hooks';
import { MAX_FAVORITAS, UMBRAL_SUENO } from '@/lib/catalogo';
import { useApp } from '@/store/app';
import { BORDE, espacio, RADIO, TACTIL, typo, useColores, useEstilos, type Paleta } from '@/theme';

export default function Ahora() {
  const f = useFormato();
  const { t } = f;
  const c = useColores();
  const s = useEstilos(estilos);
  const d = useCafeina();
  const apuntar = useApuntar();
  const bebidas = useApp((x) => x.bebidas);
  const favoritas = useMemo(() => bebidas.filter((b) => b.favorita).slice(0, MAX_FAVORITAS), [bebidas]);
  const aSueno = () => router.navigate('/sueno');

  // Con la primera favorita: hasta cuándo, cuando quieras, u hoy ya no.
  const bebida = d.principal && f.nombre(d.principal);
  const veredicto = !bebida
    ? null
    : d.tope === null
      ? t('ahora.yaNo')
      : d.tope === d.noche.dormir
        ? t('ahora.cuandoQuieras', { bebida })
        : t('ahora.hasta', { bebida, hora: f.fraseDe(d.tope) });
  const titular = d.noche.esHoraDeDormir ? t('ahora.aDormir') : veredicto;

  return (
    <Pantalla
      titulo={t('tab.ahora')}
      derecha={
        <Pressable onPress={() => router.push('/ajustes')} hitSlop={8} style={s.ajustes} accessibilityRole="button" accessibilityLabel={t('aj.titulo')}>
          <Icono nombre="settings" tam={22} />
        </Pressable>
      }
    >
      {/* Lo grande es la frase (lo que puedes hacer); los mg van debajo, en pequeño. */}
      <View style={s.heroe}>
        {titular && (
          <Texto estilo="cifra" tono="acento">
            {titular}
          </Texto>
        )}
        <View style={s.linea}>
          <Icono nombre="coffee" tam={16} tinte={c.texto2} />
          <Texto tono="texto2">{t('ahora.enCuerpo', { mg: f.mg(Math.round(d.mg)) })}</Texto>
        </View>
        <Pressable onPress={aSueno} style={[s.linea, s.tactil]} accessibilityRole="button">
          <Icono nombre="moon" tam={16} tinte={c.texto2} />
          <Texto tono="texto2">
            {d.noche.esHoraDeDormir ? t('ahora.siDuermes', { hora: f.fraseDe(d.noche.despertar) }) : t('ahora.dormir', { hora: f.fraseDe(d.noche.dormir) })}
          </Texto>
          <Texto style={s.enlace}>{t(d.noche.esHoraDeDormir ? 'ahora.verSueno' : 'ahora.cambiar')}</Texto>
        </Pressable>
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
    linea: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, flexWrap: 'wrap' },
    tactil: { minHeight: TACTIL },
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
