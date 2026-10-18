// La curva de Ahora: la cafeína en el cuerpo cada 10 min desde que te levantas hasta que
// te levantas mañana. Con Views, sin librería de gráficos: una columna por punto con el
// relleno debajo y un trazo que va del punto anterior al suyo (así la línea no se corta en
// las subidas). La noche va sombreada con su luna, el umbral de sueño es una línea
// discontinua y "ahora" un punto sobre la curva: lo que queda a su derecha es la previsión,
// más clara. De noche, lo que pasa del umbral va en ocre (el aviso de Ahora lo dice).

import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { Icono } from '@/components/ui';
import { useFormato } from '@/hooks';
import { horasEnPunto } from '@/lib/fechas';
import { BORDE, espacio, typo, useColores, useEstilos, type Paleta } from '@/theme';

const ALTO = 120;
const EJE = 20;
const TRAZO = 2;
const PUNTO = 12;
const RAYAS = 40;

export function Curva({ puntos, mg, dormir, ahora, umbral, descripcion }: { puntos: { ts: number; mg: number }[]; mg: number; dormir: number; ahora: number; umbral: number; descripcion: string }) {
  const { t, horaDe } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const desde = puntos[0].ts;
  const hasta = puntos[puntos.length - 1].ts;
  const pct = (ts: number) => Math.min(1, Math.max(0, (ts - desde) / (hasta - desde)));
  const x = (ts: number) => `${pct(ts) * 100}%` as DimensionValue;
  // Con margen por arriba, y nunca tan baja que el umbral quede pegado al techo.
  const escala = Math.max(umbral * 2.5, ...puntos.map((p) => p.mg)) * 1.1;
  const y = (mg: number) => (mg / escala) * ALTO;
  const alturas = puntos.map((p) => y(p.mg));
  // Las horas de los extremos se saldrían de la gráfica.
  const marcas = horasEnPunto(desde, hasta, 6).filter((ts) => pct(ts) > 0.05 && pct(ts) < 0.95);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={descripcion}>
      <View style={[s.grafica, { height: ALTO }]}>
        <View style={[s.noche, { left: x(dormir) }]}>
          <Icono nombre="moon" tam={12} tinte={c.texto2} />
        </View>
        <View style={s.columnas}>
          {puntos.map((p, i) => {
            const alto = alturas[i];
            const antes = alturas[i - 1] ?? alto;
            return (
              <View key={p.ts} style={[s.columna, p.ts > ahora && s.prevision]}>
                <View style={[s.relleno, { height: alto }]} />
                {/* Sin cafeína no hay trazo: el eje ya marca el cero. */}
                {Math.max(alto, antes) > 0.5 && (
                  <View style={[s.trazo, { bottom: Math.min(alto, antes) - TRAZO / 2, height: Math.abs(alto - antes) + TRAZO }, p.ts > dormir && p.mg > umbral && { backgroundColor: c.ocre }]} />
                )}
              </View>
            );
          })}
        </View>
        <View style={[s.rayas, { bottom: y(umbral) }]}>
          {Array.from({ length: RAYAS }, (_, i) => (
            <View key={i} style={s.raya} />
          ))}
        </View>
        <Text style={[typo.micro, s.etiquetaUmbral, { bottom: y(umbral) + 2 }]}>{t('curva.umbral', { mg: umbral })}</Text>
        <View style={[s.ahora, { left: x(ahora) }]} />
        <View style={[s.punto, { left: x(ahora), bottom: y(mg) - PUNTO / 2 }]} />
        {/* Cerca del final, la etiqueta va a la izquierda de la raya para no salirse. */}
        <Text style={[typo.micro, s.etiquetaAhora, pct(ahora) > 0.85 ? { right: `${(1 - pct(ahora)) * 100}%`, marginRight: espacio.xs } : { left: x(ahora), marginLeft: espacio.xs }]}>
          {t('curva.ahora')}
        </Text>
      </View>
      <View style={s.eje}>
        {marcas.map((ts) => (
          <Text key={ts} style={[typo.micro, s.hora, { left: x(ts) }]}>
            {horaDe(ts)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    grafica: { borderBottomWidth: BORDE, borderBottomColor: c.linea },
    noche: { position: 'absolute', top: 0, bottom: 0, right: 0, alignItems: 'flex-end', padding: espacio.xs, backgroundColor: c.noche },
    columnas: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' },
    columna: { flex: 1 },
    prevision: { opacity: 0.45 },
    relleno: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.acento, opacity: 0.15 },
    trazo: { position: 'absolute', left: 0, right: 0, backgroundColor: c.acento },
    rayas: { position: 'absolute', left: 0, right: 0, height: BORDE, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
    raya: { width: 4, height: BORDE, backgroundColor: c.texto2 },
    etiquetaUmbral: { position: 'absolute', right: 0, color: c.texto },
    ahora: { position: 'absolute', top: 0, bottom: 0, width: BORDE, backgroundColor: c.lineaFuerte },
    punto: { position: 'absolute', width: PUNTO, height: PUNTO, marginLeft: -PUNTO / 2, borderRadius: PUNTO / 2, backgroundColor: c.acento, borderWidth: 2, borderColor: c.fondo },
    etiquetaAhora: { position: 'absolute', top: 0, color: c.texto },
    eje: { height: EJE },
    hora: { position: 'absolute', top: espacio.xs, width: 64, marginLeft: -32, textAlign: 'center', color: c.texto2 },
  });
