// Apuntar una toma con todo (bebida, mg y cuándo) o editar una de hoy. Si la hora elegida
// es posterior a ahora, es de ayer.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Ayuda, Boton, CampoEntero, Chip, Chips, Nota, Pantalla, Seccion, SelectorHora } from '@/components/ui';
import { useAhora, useApuntar, useFormato } from '@/hooks';
import { DOSIS_MAXIMA } from '@/lib/catalogo';
import { diaDe, MIN, minutosDe } from '@/lib/fechas';
import { instanteDeHora } from '@/lib/motor';
import { borrarToma, guardarToma, useApp } from '@/store/app';
import type { Toma } from '@/types';

/** Los atajos de "Cuándo", en minutos hacia atrás. */
const HACE = [0, 15, 30, 60, 120];

export default function TomaModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const f = useFormato();
  const { t } = f;
  const ahora = useAhora();
  const apuntar = useApuntar();
  const bebidas = useApp((x) => x.bebidas);
  const existente = useApp((x) => (id ? x.tomas.find((y) => y.id === id) : undefined));

  // La bebida es una copia (id, clave y nombre): la de una toma vieja puede ya no existir.
  const [bebida, setBebida] = useState<Pick<Toma, 'bebida' | 'clave' | 'nombre'> | null>(
    existente ? { bebida: existente.bebida, clave: existente.clave, nombre: existente.nombre } : null,
  );
  const [mg, setMg] = useState(existente?.mg ?? 0);
  const [hora, setHora] = useState(existente ? minutosDe(existente.ts) : minutosDe(ahora));

  // Sin tocar la hora, una toma editada se queda en su instante exacto.
  const ts = existente && hora === minutosDe(existente.ts) ? existente.ts : instanteDeHora(hora, ahora);

  const guardar = () => {
    if (!bebida) return;
    if (existente) {
      guardarToma({ ...existente, ...bebida, mg, ts });
      router.back();
    } else apuntar({ ...bebida, mg, ts: instanteDeHora(hora, Date.now()) }, t('ahora.apuntada', { bebida: f.nombre(bebida) }), router.back);
  };

  return (
    <Pantalla
      titulo={existente ? t('toma.editar') : t('toma.nueva')}
      atras
      pie={<Boton texto={t('g.guardar')} icono="check" onPress={guardar} deshabilitado={!bebida} />}
    >
      <Seccion titulo={t('toma.bebida')} icono="coffee">
        <Chips>
          {bebidas.map((b) => (
            <Chip
              key={b.id}
              texto={`${f.nombre(b)} · ${f.mg(b.mg)}`}
              activo={bebida?.bebida === b.id}
              onPress={() => {
                setBebida({ bebida: b.id, clave: b.clave, nombre: f.nombre(b) });
                setMg(b.mg);
              }}
            />
          ))}
        </Chips>
      </Seccion>

      <CampoEntero etiqueta={t('toma.mg')} valor={mg} onCambio={setMg} error={t('toma.entero')} />
      {mg > DOSIS_MAXIMA && <Nota tono="aviso" texto={t('toma.dosis', { mg: DOSIS_MAXIMA })} />}

      <Seccion titulo={t('toma.cuando')} icono="clock">
        <Chips>
          {HACE.map((m) => {
            const min = minutosDe(ahora - m * MIN);
            return <Chip key={m} texto={m ? t('toma.hace', { t: f.duracion(m) }) : t('toma.ahora')} activo={hora === min} onPress={() => setHora(min)} />;
          })}
        </Chips>
        <SelectorHora etiqueta={t('toma.hora')} valor={hora} onCambio={setHora} />
        {diaDe(ts) !== diaDe(ahora) && <Ayuda>{t('toma.ayer', { hora: f.frase(hora) })}</Ayuda>}
      </Seccion>

      {existente && (
        <Boton
          texto={t('g.borrar')}
          variante="peligro"
          icono="trash-2"
          onPress={() => {
            borrarToma(existente.id, t('toma.borrada'));
            router.back();
          }}
        />
      )}
    </Pantalla>
  );
}
