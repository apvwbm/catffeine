// Sueño: la calculadora de ciclos en los dos sentidos, con la cafeína que te quedará y un
// botón para poner la alarma. La hora de levantarse de aquí ES el ajuste de toda la app, y
// tocar una hora de acostarse la elige como tu hora de dormir.

import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ayuda, Boton, Icono, Nota, Pantalla, Seccion, Segmentado, SelectorHora, Texto } from '@/components/ui';
import { useFormato, useSueno } from '@/hooks';
import { ponerAlarma } from '@/lib/alarma';
import { CICLO, CICLOS_RECOMENDADOS, UMBRAL_SUENO } from '@/lib/catalogo';
import { minutosDe } from '@/lib/fechas';
import { avisar, cambiarAjustes, useApp } from '@/store/app';
import { BORDE, espacio, RADIO, TACTIL, typo, useColores, useEstilos, type Paleta } from '@/theme';

type Modo = 'levanto' | 'acuesto';

export default function Sueno() {
  const f = useFormato();
  const { t } = f;
  const c = useColores();
  const s = useEstilos(estilos);
  const [modo, setModo] = useState<Modo>('levanto');
  const a = useApp((x) => x.ajustes);
  const ahora = useApp((x) => x.ahora);
  const d = useSueno();
  const alarma = (min: number) => ponerAlarma(min, () => avisar(t('alarma.error')));

  return (
    <Pantalla titulo={t('tab.sueno')}>
      <Segmentado<Modo>
        opciones={[
          { valor: 'levanto', texto: t('sueno.levanto') },
          { valor: 'acuesto', texto: t('sueno.acuesto') },
        ]}
        valor={modo}
        onCambio={setModo}
      />

      {modo === 'levanto' ? (
        <>
          <SelectorHora valor={a.despertar} onCambio={(despertar) => cambiarAjustes({ despertar })} />
          <Seccion titulo={t('sueno.acostarte')} icono="moon">
            <View accessibilityRole="radiogroup">
              {d.acostarse.map((h) => {
                const alto = h.pico > UMBRAL_SUENO;
                return (
                  <FilaHora key={h.ciclos} hora={f.hora(h.min)} ciclos={h.ciclos} elegida={h.ciclos === a.ciclos} onPress={() => cambiarAjustes({ ciclos: h.ciclos })}>
                    {alto && (
                      <View style={s.cafeina} accessible accessibilityLabel={t('sueno.cafeina', { mg: Math.round(h.pico) })}>
                        <Icono nombre="coffee" tam={14} tinte={c.ocre} />
                        <Text style={[typo.dato, { color: c.ocre }]}>{f.mg(Math.round(h.pico))}</Text>
                      </View>
                    )}
                  </FilaHora>
                );
              })}
            </View>
          </Seccion>
          <Boton texto={t('sueno.alarma', { hora: f.frase(a.despertar) })} icono="bell" onPress={() => alarma(a.despertar)} />
        </>
      ) : (
        <>
          {d.mg > UMBRAL_SUENO && <Nota tono="aviso" texto={t('sueno.cafeinaAhora', { mg: Math.round(d.mg) })} />}
          <View>
            <Texto estilo="cuerpo">{t('sueno.siAhora', { hora: f.horaDe(ahora) })}</Texto>
            {d.despertarse.map((h) => (
              <FilaHora key={h.ciclos} hora={f.horaDe(h.ts)} ciclos={h.ciclos}>
                <Pressable
                  onPress={() => alarma(minutosDe(h.ts))}
                  style={({ pressed }) => [s.campana, pressed && { backgroundColor: c.superficie }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('sueno.alarma', { hora: f.fraseDe(h.ts) })}
                >
                  <Icono nombre="bell" />
                </Pressable>
              </FilaHora>
            ))}
          </View>
        </>
      )}

      <Ayuda>{t('sueno.ayuda')}</Ayuda>
    </Pantalla>
  );
}

/** "9:45 PM", "6 ciclos · 9 h", la marca de recomendado y lo que va a la derecha. */
function FilaHora({ hora, ciclos, elegida, onPress, children }: { hora: string; ciclos: number; elegida?: boolean; onPress?: () => void; children: ReactNode }) {
  const { t, duracion } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const contenido = (
    <>
      {elegida !== undefined && <View style={s.check}>{elegida && <Icono nombre="check" />}</View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typo.cifra, { color: c.texto }]}>{hora}</Text>
        <View style={s.detalle}>
          <Text style={[typo.apoyo, { color: c.texto2 }]}>
            {duracion(ciclos * CICLO)} · {t('sueno.ciclos', { n: ciclos })}
          </Text>
          {CICLOS_RECOMENDADOS.includes(ciclos) && (
            <View style={s.recomendado}>
              <Text style={[typo.micro, { color: c.verde }]}>{t('sueno.recomendado')}</Text>
            </View>
          )}
        </View>
      </View>
      {children}
    </>
  );
  if (!onPress) return <View style={s.fila}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.fila, pressed && { backgroundColor: c.superficie }]}
      accessibilityRole="radio"
      accessibilityState={{ selected: elegida }}
      accessibilityHint={elegida ? t('sueno.elegida') : undefined}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, minHeight: 64, paddingVertical: espacio.sm, borderBottomWidth: BORDE, borderBottomColor: c.linea },
    check: { width: 20 },
    detalle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espacio.sm },
    recomendado: { backgroundColor: c.verdeSuave, borderRadius: RADIO, paddingHorizontal: espacio.xs },
    cafeina: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
    campana: { width: TACTIL, height: TACTIL, alignItems: 'center', justifyContent: 'center', borderWidth: BORDE, borderColor: c.linea, borderRadius: RADIO },
  });
