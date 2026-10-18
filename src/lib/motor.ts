// TODA la lógica de CAtFFEINE: cafeína en el cuerpo, la noche, los ciclos de sueño, la
// hora tope del último café y las estadísticas. Funciones puras; las cubre `verifica`.
//
// Unidades: mg enteros; instantes en epoch ms (diferencias físicamente correctas también
// con el cambio de hora); horas del día en minutos desde medianoche. Los días para agrupar
// son el día local de cada toma.
// ponytail: el día es el natural: una toma a las 00:30 cuenta para el día nuevo.

import { CICLO, DORMIRSE, DOSIS_MAXIMA, KA, MAXIMO_DIARIO, MAXIMO_EMBARAZO, OPCIONES_CICLOS, VIDA_MEDIA } from './catalogo';
import { addDias, aLas, diaDe, diasEntre, HORA, MIN, minutosDe, vuelta } from './fechas';
import type { Ajustes, Ritmo, Toma } from '@/types';

/** Lo único de una toma que importa para la cafeína. */
type Dosis = Pick<Toma, 'mg' | 'ts'>;

export const maximoDiario = (a: Pick<Ajustes, 'embarazo'>): number => (a.embarazo ? MAXIMO_EMBARAZO : MAXIMO_DIARIO);
/** El embarazo fija el ritmo lento sin tocar el guardado: al quitarlo, vuelve el tuyo. */
export const ritmoDe = (a: Pick<Ajustes, 'ritmo' | 'embarazo'>): Ritmo => (a.embarazo ? 'lento' : a.ritmo);
export const vidaMedia = (a: Pick<Ajustes, 'ritmo' | 'embarazo'>): number => VIDA_MEDIA[ritmoDe(a)];

// ── Cafeína ──────────────────────────────────────────────────────────────────

/**
 * mg que quedan en el cuerpo `horas` después de tomar `mg` (función de Bateman):
 * A(Δ) = D · ka / (ka − ke) · (e^(−ke·Δ) − e^(−ka·Δ)), con ke = ln 2 / vida media.
 */
export function restante(mg: number, horas: number, vm: number): number {
  if (horas <= 0) return 0;
  const ke = Math.LN2 / vm;
  return ((mg * KA) / (KA - ke)) * (Math.exp(-ke * horas) - Math.exp(-KA * horas));
}

/** mg en el cuerpo en el instante `ts`: la suma de las tomas anteriores. */
export const enCuerpo = (tomas: Dosis[], ts: number, vm: number): number =>
  tomas.reduce((suma, t) => suma + restante(t.mg, (ts - t.ts) / HORA, vm), 0);

/** Puntos para la gráfica, de `desde` a `hasta` incluidos. */
export function curva(tomas: Dosis[], desde: number, hasta: number, vm: number, paso = 15 * MIN): { ts: number; mg: number }[] {
  const puntos = [];
  for (let ts = desde; ts <= hasta; ts += paso) puntos.push({ ts, mg: enCuerpo(tomas, ts, vm) });
  return puntos;
}

// ── Sueño ────────────────────────────────────────────────────────────────────

/** Minutos de cama para `n` ciclos: dormirse más los ciclos. */
const enCama = (ciclos: number) => ciclos * CICLO + DORMIRSE;

export type Noche = { dormir: number; despertar: number; esHoraDeDormir: boolean };

/**
 * La noche que toca: `despertar` es la próxima vez que el reloj marque `despertarMin`
 * estrictamente después de `ahora`, y `dormir` se calcula restando minutos reales a ese
 * instante, así la noche del cambio de hora dura lo que tiene que durar.
 */
export function noche(ahora: number, despertarMin: number, ciclos: number): Noche {
  let despertar = aLas(ahora, despertarMin);
  if (despertar <= ahora) despertar = aLas(ahora, despertarMin, 1);
  const dormir = despertar - enCama(ciclos) * MIN;
  return { dormir, despertar, esHoraDeDormir: dormir <= ahora };
}

/** "Me levanto a las X": la hora de acostarse para 6, 5, 4 y 3 ciclos. */
export const horasDormir = (despertarMin: number) => OPCIONES_CICLOS.map((ciclos) => ({ ciclos, min: vuelta(despertarMin - enCama(ciclos)) }));

/** "Me acuesto ya": la hora de despertarse para 6, 5, 4 y 3 ciclos. */
export const horasDespertar = (ahora: number) => OPCIONES_CICLOS.map((ciclos) => ({ ciclos, ts: ahora + enCama(ciclos) * MIN }));

const PASO_NOCHE = 5 * MIN;

/** Los instantes de la noche que se miran, de 5 en 5 min. */
function muestras(dormir: number, despertar: number): number[] {
  const ts = [];
  for (let t = dormir; t <= despertar; t += PASO_NOCHE) ts.push(t);
  return ts;
}

/**
 * Lo más alto que llega la cafeína durante la noche. Es el criterio de sueño: tiene que
 * estar por debajo del umbral TODA la noche, no solo al acostarte (una toma justo antes de
 * dormir aún no se ha absorbido al acostarte, pero hace el pico durmiendo).
 */
export const maxDuranteNoche = (tomas: Dosis[], dormir: number, despertar: number, vm: number): number =>
  Math.max(0, ...muestras(dormir, despertar).map((t) => enCuerpo(tomas, t, vm)));

/**
 * La hora más tardía en [ahora, dormir] a la que puedes tomarte `mg` sin pasar del umbral
 * en toda la noche. Recorre de 5 en 5 min desde `dormir` hacia atrás (sin suponer que sea
 * monótono: son unos cientos de pasos). `dormir` = cuando quieras; null = hoy ya no.
 */
export function ultimaToma(tomas: Dosis[], mg: number, ahora: number, dormir: number, despertar: number, vm: number, umbral: number): number | null {
  const ts = muestras(dormir, despertar);
  const base = ts.map((t) => enCuerpo(tomas, t, vm));
  for (let toma = dormir; toma >= ahora; toma -= PASO_NOCHE) {
    if (ts.every((t, i) => base[i] + restante(mg, (t - toma) / HORA, vm) <= umbral)) return toma;
  }
  return null;
}

/** El instante de una hora del día elegida en el modal: si es posterior a ahora, es de ayer. */
export function instanteDeHora(minutos: number, ahora: number): number {
  const hoy = aLas(ahora, minutos);
  return hoy > ahora ? aLas(ahora, minutos, -1) : hoy;
}

// ── Totales y estadísticas ───────────────────────────────────────────────────

/** mg por día local, en un solo recorrido. */
function totales(tomas: Dosis[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tomas) {
    const dia = diaDe(t.ts);
    m.set(dia, (m.get(dia) ?? 0) + t.mg);
  }
  return m;
}

export const totalDia = (tomas: Dosis[], dia: string): number => totales(tomas).get(dia) ?? 0;

/**
 * Si apuntar `mg` más pasa de lo recomendado: primero el máximo diario (lo que llevas ese
 * día más esta), si no la dosis única. Una bebida sin cafeína nunca avisa.
 */
export function excede(llevas: number, mg: number, maximo: number): 'diario' | 'dosis' | null {
  if (mg <= 0) return null;
  if (llevas + mg > maximo) return 'diario';
  return mg > DOSIS_MAXIMA ? 'dosis' : null;
}

export function porDia(tomas: Dosis[], dias: string[]): number[] {
  const m = totales(tomas);
  return dias.map((d) => m.get(d) ?? 0);
}

/** Los `n` días que acaban hoy, del más antiguo a hoy. */
export const ultimosDias = (hoy: string, n: number): string[] => Array.from({ length: n }, (_, i) => addDias(hoy, i - n + 1));

export type Estadisticas = {
  /** Media diaria desde la primera toma de la ventana (como mucho 30 días). */
  media: number;
  diasEncima: number;
  /** Mediana de la hora de la última toma de cada día con tomas, en minutos. */
  horaUltima: number;
  /** La bebida más tomada (por veces), con su clave y nombre para pintarla. */
  favorita: Pick<Toma, 'clave' | 'nombre'>;
};

/** Las cifras de los últimos 30 días; null si no hay tomas en ellos. */
export function estadisticas(tomas: Toma[], hoy: string, maximo: number, ventana = 30): Estadisticas | null {
  const desde = addDias(hoy, -(ventana - 1));
  const recientes = tomas.filter((t) => {
    const d = diaDe(t.ts);
    return d >= desde && d <= hoy;
  });
  if (!recientes.length) return null;

  const porDiaMg = totales(recientes);
  const primero = [...porDiaMg.keys()].sort()[0];
  const dias = diasEntre(primero, hoy) + 1;
  const total = recientes.reduce((s, t) => s + t.mg, 0);

  const ultimas = new Map<string, number>();
  for (const t of recientes) {
    const d = diaDe(t.ts);
    ultimas.set(d, Math.max(ultimas.get(d) ?? 0, t.ts));
  }
  const horas = [...ultimas.values()].map(minutosDe).sort((a, b) => a - b);
  const mitad = Math.floor(horas.length / 2);
  const horaUltima = horas.length % 2 ? horas[mitad] : Math.round((horas[mitad - 1] + horas[mitad]) / 2);

  const veces = new Map<string, { n: number; t: Toma }>();
  for (const t of recientes) {
    const k = t.clave ?? `#${t.nombre}`;
    veces.set(k, { n: (veces.get(k)?.n ?? 0) + 1, t });
  }
  const masTomada = [...veces.values()].reduce((a, b) => (b.n > a.n ? b : a)).t;

  return {
    media: Math.round(total / dias),
    diasEncima: [...porDiaMg.values()].filter((mg) => mg > maximo).length,
    horaUltima,
    favorita: { clave: masTomada.clave, nombre: masTomada.nombre },
  };
}
