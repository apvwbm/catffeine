// Tus bebidas: la estrella las hace botones de Ahora (hasta 6, en el orden de la lista; la
// primera favorita manda en el veredicto). Tocar una abre su nombre, sus mg, subir, bajar y
// borrar. Todo se guarda al momento. Borrar una bebida no toca las tomas.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ayuda, Boton, Campo, CampoEntero, Icono, Pantalla } from '@/components/ui';
import { useFormato } from '@/hooks';
import { MAX_FAVORITAS } from '@/lib/catalogo';
import { avisar, borrarBebida, guardarBebida, nuevoId, ordenarBebidas, useApp } from '@/store/app';
import { BORDE, espacio, RADIO, TACTIL, typo, useColores, useEstilos, type Paleta } from '@/theme';
import type { Bebida } from '@/types';

export default function Bebidas() {
  const f = useFormato();
  const { t } = f;
  const c = useColores();
  const s = useEstilos(estilos);
  const bebidas = useApp((x) => x.bebidas);
  const [abierta, setAbierta] = useState<string | null>(null);

  const estrella = (b: Bebida) => {
    if (!b.favorita && bebidas.filter((x) => x.favorita).length >= MAX_FAVORITAS) return avisar(t('beb.maxFavoritas'));
    guardarBebida({ ...b, favorita: !b.favorita });
  };

  const anadir = () => {
    const b: Bebida = { id: nuevoId(), clave: null, nombre: t('beb.nueva'), mg: 50, favorita: false };
    guardarBebida(b);
    setAbierta(b.id);
  };

  return (
    <Pantalla titulo={t('beb.titulo')} atras pie={<Boton texto={t('beb.anadir')} icono="plus" variante="secundario" onPress={anadir} />}>
      <Ayuda>{t('beb.ayuda')}</Ayuda>
      <View>
        {bebidas.map((b, i) => {
          const abiertaEsta = abierta === b.id;
          return (
            <View key={b.id} style={s.bebida}>
              <View style={s.fila}>
                <Pressable
                  onPress={() => estrella(b)}
                  hitSlop={6}
                  style={[s.estrella, b.favorita && { backgroundColor: c.lineaFuerte, borderColor: c.lineaFuerte }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: b.favorita }}
                  accessibilityLabel={`${t('beb.favorita')}: ${f.nombre(b)}`}
                >
                  <Icono nombre="star" tam={18} tinte={b.favorita ? c.fondo : c.texto2} />
                </Pressable>
                <Pressable
                  onPress={() => setAbierta(abiertaEsta ? null : b.id)}
                  style={s.nombre}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: abiertaEsta }}
                >
                  <Text style={[typo.cuerpo, { color: c.texto, flex: 1 }]}>{f.nombre(b)}</Text>
                  <Text style={[typo.dato, { color: c.texto2 }]}>{f.mg(b.mg)}</Text>
                  <Icono nombre={abiertaEsta ? 'chevron-up' : 'chevron-down'} tam={18} tinte={c.texto2} />
                </Pressable>
              </View>
              {abiertaEsta && (
                <View style={s.editor}>
                  {/* Renombrar quita la clave: el nombre deja de traducirse y pasa a ser tuyo. */}
                  <Campo etiqueta={t('beb.nombre')} value={f.nombre(b)} onChangeText={(nombre) => guardarBebida({ ...b, clave: null, nombre })} maxLength={40} />
                  <CampoEntero etiqueta={t('toma.mg')} valor={b.mg} onCambio={(mg) => guardarBebida({ ...b, mg })} error={t('toma.entero')} />
                  <View style={s.acciones}>
                    <Pressable onPress={() => ordenarBebidas(b.id, -1)} disabled={i === 0} style={[s.mover, i === 0 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={t('beb.subir')}>
                      <Icono nombre="arrow-up" />
                    </Pressable>
                    <Pressable
                      onPress={() => ordenarBebidas(b.id, 1)}
                      disabled={i === bebidas.length - 1}
                      style={[s.mover, i === bebidas.length - 1 && { opacity: 0.3 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('beb.bajar')}
                    >
                      <Icono nombre="arrow-down" />
                    </Pressable>
                    <Boton texto={t('g.borrar')} variante="peligro" icono="trash-2" onPress={() => borrarBebida(b.id, t('beb.borrada', { bebida: f.nombre(b) }))} style={{ marginLeft: 'auto' }} />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    bebida: { borderBottomWidth: BORDE, borderBottomColor: c.linea },
    fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, minHeight: TACTIL + espacio.sm },
    estrella: { width: 36, height: 36, borderWidth: BORDE, borderColor: c.linea, borderRadius: RADIO, alignItems: 'center', justifyContent: 'center' },
    nombre: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.md, minHeight: TACTIL },
    editor: { gap: espacio.md, paddingBottom: espacio.lg },
    acciones: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
    mover: { width: TACTIL, height: TACTIL, borderWidth: BORDE, borderColor: c.linea, borderRadius: RADIO, alignItems: 'center', justifyContent: 'center' },
  });
