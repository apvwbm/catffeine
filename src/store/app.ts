// El estado de la app: un único store con todos los datos en memoria.
//
// Contrato de cada acción: primero SQLite (síncrono), luego `set()`. Así lo que se ve
// es siempre lo que está guardado, y la pantalla cambia en el mismo tick.
//
// Lo calculado (cafeína, totales, horas) NO vive aquí: se deriva en `hooks.ts` con las
// funciones puras de `lib/motor.ts`.

import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as db from '@/lib/db';
import { AJUSTES_DEFECTO, BEBIDAS_SEMILLA } from '@/lib/esquema';
import type { Ajustes, Bebida, Toma } from '@/types';

export type Aviso = { texto: string; deshacer?: () => void; id: number };

type Estado = db.Todo & {
  cargado: boolean;
  aviso: Aviso | null;
  /** El reloj de la app: `_layout` lo adelanta cada minuto y al volver a primer plano. */
  ahora: number;
};

export const nuevoId = () => randomUUID();

export const useApp = create<Estado>(() => ({
  cargado: false,
  aviso: null,
  ahora: Date.now(),
  tomas: [],
  bebidas: BEBIDAS_SEMILLA,
  ajustes: AJUSTES_DEFECTO,
}));

const get = useApp.getState;
const set = useApp.setState;

// ── Arranque y reloj ─────────────────────────────────────────────────────────

export async function iniciar() {
  await db.abrir();
  set({ ...db.cargar(), cargado: true, ahora: Date.now() });
}

/** Tras importar una copia. */
export const recargar = () => set({ ...db.cargar() });

export const tic = () => set({ ahora: Date.now() });

// ── Avisos ───────────────────────────────────────────────────────────────────

let siguienteAviso = 0;
export const avisar = (texto: string, deshacer?: () => void) => set({ aviso: { texto, deshacer, id: ++siguienteAviso } });
export const cerrarAviso = () => set({ aviso: null });

// ── Tomas ────────────────────────────────────────────────────────────────────

const porHora = (tomas: Toma[]) => tomas.sort((a, b) => a.ts - b.ts);

export function guardarToma(x: Toma) {
  db.guardarToma(x);
  set({ tomas: porHora([...get().tomas.filter((t) => t.id !== x.id), x]) });
}

function quitarToma(id: string) {
  db.borrarToma(id);
  set({ tomas: get().tomas.filter((t) => t.id !== id) });
}

/** Una toma nueva (un toque en Ahora u "Otra…"), con deshacer. */
export function apuntar(datos: Omit<Toma, 'id'>, texto: string) {
  const x: Toma = { ...datos, id: nuevoId() };
  guardarToma(x);
  avisar(texto, () => quitarToma(x.id));
}

export function borrarToma(id: string, texto: string) {
  const antes = get().tomas.find((t) => t.id === id);
  if (!antes) return;
  quitarToma(id);
  avisar(texto, () => guardarToma(antes));
}

// ── Bebidas ──────────────────────────────────────────────────────────────────
// Se guardan como una lista en `kv`: la semilla del catálogo no se escribe hasta que el
// usuario cambia algo.

function guardarBebidas(bebidas: Bebida[]) {
  db.guardarKv('bebidas', bebidas);
  set({ bebidas });
}

/** Sustituye la bebida con ese id o la añade al final. */
export function guardarBebida(b: Bebida) {
  const lista = get().bebidas;
  guardarBebidas(lista.some((x) => x.id === b.id) ? lista.map((x) => (x.id === b.id ? b : x)) : [...lista, b]);
}

/** Borrar una bebida no toca las tomas: cada una guarda su copia de nombre y mg. */
export function borrarBebida(id: string, texto: string) {
  const lista = get().bebidas;
  const i = lista.findIndex((b) => b.id === id);
  if (i < 0) return;
  guardarBebidas(lista.filter((b) => b.id !== id));
  avisar(texto, () => {
    const ahora = get().bebidas;
    guardarBebidas([...ahora.slice(0, i), lista[i], ...ahora.slice(i)]);
  });
}

/** Sube (−1) o baja (+1) una bebida en la lista: es el orden de los botones de Ahora. */
export function ordenarBebidas(id: string, delta: -1 | 1) {
  const lista = [...get().bebidas];
  const i = lista.findIndex((b) => b.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  guardarBebidas(lista);
}

// ── Ajustes ──────────────────────────────────────────────────────────────────

export function cambiarAjustes(parcial: Partial<Ajustes>) {
  const ajustes = { ...get().ajustes, ...parcial };
  db.guardarKv('ajustes', ajustes);
  set({ ajustes });
}

export function borrarTodo() {
  db.borrarTodo();
  set({ ...db.cargar() });
}
