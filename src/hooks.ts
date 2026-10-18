// Hooks de lectura: traducción, formato y todo lo derivado del store.
//
// Las pantallas no calculan nada: sacan de aquí el estado ya derivado, memoizado sobre
// las porciones del store de las que depende. `ahora` cambia cada minuto, así que la
// cifra y la curva viven solas.

import { useMemo } from 'react';

import { UMBRAL_SUENO } from '@/lib/catalogo';
import { aLas, diaDe, duracion, fechaCorta, hora, horaFrase, MIN, minutosDe, numero } from '@/lib/fechas';
import { nombreDe, traducir, type T } from '@/lib/i18n';
import {
  curva,
  enCuerpo,
  estadisticas,
  horasDespertar,
  horasDormir,
  maxDuranteNoche,
  maximoDiario,
  noche,
  porDia,
  ultimaToma,
  ultimosDias,
  vidaMedia,
} from '@/lib/motor';
import { useApp } from '@/store/app';
import type { Toma } from '@/types';

export function useT(): T {
  const idioma = useApp((s) => s.ajustes.idioma);
  return useMemo(() => (clave, vars) => traducir(idioma, clave, vars), [idioma]);
}

export function useFormato() {
  const idioma = useApp((s) => s.ajustes.idioma);
  const t = useT();
  return useMemo(
    () => ({
      t,
      idioma,
      hora: (min: number) => hora(min, idioma),
      horaDe: (ts: number) => hora(minutosDe(ts), idioma),
      /** Para dentro de una frase: "hasta las 16:40". */
      frase: (min: number) => horaFrase(min, idioma),
      fraseDe: (ts: number) => horaFrase(minutosDe(ts), idioma),
      duracion,
      numero: (n: number) => numero(n, idioma),
      mg: (n: number) => t('g.mg', { n: numero(n, idioma) }),
      fecha: (iso: string) => fechaCorta(iso, idioma),
      nombre: (x: { clave: string | null; nombre: string }) => nombreDe(t, x),
    }),
    [idioma, t],
  );
}

export const useAhora = () => useApp((s) => s.ahora);

const SEMANA = 7 * 24 * 60 * MIN;
const CUARTO = 15 * MIN;

/**
 * Solo cuentan las tomas de la última semana: lo de antes ya no deja nada (1000 mg con el
 * ritmo lento dejan 0,01 mg a los 7 días) y así las cuentas de cada minuto son cortas.
 */
const recientes = (tomas: Toma[], ahora: number) => tomas.filter((t) => t.ts > ahora - SEMANA);

/** Todo lo de la pestaña Ahora: cifra, noche, veredicto, curva y lo de hoy. */
export function useCafeina() {
  const tomas = useApp((s) => s.tomas);
  const bebidas = useApp((s) => s.bebidas);
  const ajustes = useApp((s) => s.ajustes);
  const ahora = useAhora();
  return useMemo(() => {
    const vm = vidaMedia(ajustes);
    const cuentan = recientes(tomas, ahora);
    const n = noche(ahora, ajustes.despertar, ajustes.ciclos);
    const hoy = diaDe(ahora);
    const deHoy = tomas.filter((t) => diaDe(t.ts) === hoy);
    const principal = bebidas.find((b) => b.favorita) ?? bebidas[0] ?? null;
    const tope = principal && !n.esHoraDeDormir ? ultimaToma(cuentan, principal.mg, ahora, n.dormir, n.despertar, vm, UMBRAL_SUENO) : null;
    // La curva va desde que te levantas hoy (o desde la primera toma, si fue antes) hasta
    // que te levantas mañana, cada 10 min.
    const levantarte = aLas(n.despertar, ajustes.despertar, -1);
    const desde = Math.floor(Math.min(levantarte, deHoy[0]?.ts ?? Infinity) / CUARTO) * CUARTO;
    return {
      ahora,
      mg: enCuerpo(cuentan, ahora, vm),
      noche: n,
      principal,
      tope,
      deHoy,
      totalHoy: deHoy.reduce((s, t) => s + t.mg, 0),
      maximo: maximoDiario(ajustes),
      /** Lo más alto que llegará esta noche (lo que queda de ella, si ya ha empezado). */
      picoNoche: maxDuranteNoche(cuentan, Math.max(n.dormir, ahora), n.despertar, vm),
      puntos: curva(cuentan, desde, n.despertar, vm, 10 * MIN),
    };
  }, [tomas, bebidas, ajustes, ahora]);
}

/** La pestaña Sueño: horas de acostarse con su cafeína y horas de despertarse. */
export function useSueno() {
  const tomas = useApp((s) => s.tomas);
  const ajustes = useApp((s) => s.ajustes);
  const ahora = useAhora();
  return useMemo(() => {
    const vm = vidaMedia(ajustes);
    const cuentan = recientes(tomas, ahora);
    return {
      acostarse: horasDormir(ajustes.despertar).map((h) => {
        const n = noche(ahora, ajustes.despertar, h.ciclos);
        return { ...h, pico: maxDuranteNoche(cuentan, Math.max(n.dormir, ahora), n.despertar, vm) };
      }),
      despertarse: horasDespertar(ahora),
      mg: enCuerpo(cuentan, ahora, vm),
    };
  }, [tomas, ajustes, ahora]);
}

export function useHistorial() {
  const tomas = useApp((s) => s.tomas);
  const ajustes = useApp((s) => s.ajustes);
  const hoy = diaDe(useAhora());
  return useMemo(() => {
    const maximo = maximoDiario(ajustes);
    const dias = ultimosDias(hoy, 14);
    return { dias, mg: porDia(tomas, dias), maximo, cifras: estadisticas(tomas, hoy, maximo), hoy };
  }, [tomas, ajustes, hoy]);
}
