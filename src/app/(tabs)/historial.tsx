// Historial: los mg de los últimos 14 días frente al máximo y las cifras de los últimos 30.

import { StyleSheet, Text, View } from 'react-native';

import { Fila, Pantalla, Seccion, Vacio } from '@/components/ui';
import { useFormato, useHistorial } from '@/hooks';
import { desdeISO } from '@/lib/fechas';
import { useApp } from '@/store/app';
import { BORDE, espacio, RADIO, typo, useColores, useEstilos, type Paleta } from '@/theme';

const ALTO = 140;

export default function Historial() {
  const f = useFormato();
  const { t } = f;
  const c = useColores();
  const s = useEstilos(estilos);
  const { dias, mg, maximo, cifras, hoy } = useHistorial();
  const hayAlgo = useApp((x) => x.tomas.length > 0);

  if (!hayAlgo) {
    return (
      <Pantalla titulo={t('tab.historial')}>
        <Vacio texto={t('his.vacio')} />
      </Pantalla>
    );
  }

  const escala = Math.max(maximo, ...mg) * 1.1;
  const y = (v: number) => (v / escala) * ALTO;

  return (
    <Pantalla titulo={t('tab.historial')}>
      <Seccion titulo={t('his.dias14')} icono="bar-chart-2">
        <View>
          <View style={[s.grafica, { height: ALTO }]}>
            <View style={[s.maximo, { bottom: y(maximo) }]} />
            <Text style={[typo.micro, s.etiquetaMaximo, { bottom: y(maximo) + 2 }]}>{t('his.maximo', { mg: maximo })}</Text>
            {dias.map((dia, i) => (
              <View key={dia} style={s.hueco} accessible accessibilityLabel={t('his.barra', { fecha: f.fecha(dia), mg: f.numero(mg[i]) })}>
                <View style={[s.columna, { height: mg[i] ? Math.max(2, y(mg[i])) : 0 }]} />
              </View>
            ))}
          </View>
          <View style={s.dias}>
            {dias.map((dia) => (
              <Text key={dia} style={[typo.micro, s.dia, { color: dia === hoy ? c.texto : c.texto2 }]}>
                {desdeISO(dia).getDate()}
              </Text>
            ))}
          </View>
        </View>
      </Seccion>

      {cifras && (
        <Seccion titulo={t('his.dias30')} icono="list">
          <Fila titulo={t('his.media')} derecha={f.mg(cifras.media)} />
          <Fila titulo={t('his.encima')} derecha={cifras.diasEncima === 1 ? t('g.dia') : t('g.dias', { n: cifras.diasEncima })} />
          <Fila titulo={t('his.ultima')} derecha={f.hora(cifras.horaUltima)} />
          {/* Debajo y no a la derecha: hay nombres largos. */}
          <Fila titulo={t('his.masTomada')} subtitulo={f.nombre(cifras.favorita)} />
        </Seccion>
      )}
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    grafica: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.xs, borderBottomWidth: BORDE, borderBottomColor: c.linea },
    hueco: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    columna: { width: '100%', backgroundColor: c.acento, borderTopLeftRadius: RADIO, borderTopRightRadius: RADIO },
    maximo: { position: 'absolute', left: 0, right: 0, height: BORDE, backgroundColor: c.texto2 },
    etiquetaMaximo: { position: 'absolute', left: 0, color: c.texto2 },
    dias: { flexDirection: 'row', gap: espacio.xs, paddingTop: espacio.xs },
    dia: { flex: 1, textAlign: 'center' },
  });
