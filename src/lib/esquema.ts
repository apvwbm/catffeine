// Esquema de la base de datos y valores por defecto. Sin dependencias de Expo, para
// que `scripts/verifica.ts` pueda probar las migraciones con el `node:sqlite` de Node.
//
// MIGRACIONES: cada entrada es el SQL que lleva de la versión i a la i + 1, y la
// versión vive en `PRAGMA user_version`. Reglas para no perder datos nunca:
//   - NUNCA editar una migración publicada; añadir otra al final.
//   - Solo cambios aditivos (`ADD COLUMN` con DEFAULT, tablas nuevas). Si hace falta
//     reestructurar una tabla: crear la nueva, copiar, borrar la vieja, renombrar.
// Las copias de seguridad llevan su `user_version`, así que una copia antigua se
// importa pasando por estas mismas migraciones.

import { CATALOGO } from './catalogo';
import { traducir } from './i18n';
import type { Ajustes, Bebida } from '@/types';

export const MIGRACIONES: string[] = [
  // 1 — esquema inicial. `bebida` es el id de la bebida (puede quedar huérfano si se
  // borra); `clave` y `nombre` son la copia para pintar la toma siempre igual.
  `
  CREATE TABLE kv (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);

  CREATE TABLE tomas (
    id TEXT PRIMARY KEY NOT NULL,
    bebida TEXT,
    clave TEXT,
    nombre TEXT NOT NULL DEFAULT '',
    mg INTEGER NOT NULL CHECK (mg >= 0),
    ts INTEGER NOT NULL
  );
  CREATE INDEX tomas_ts ON tomas (ts);
  `,
];

export const VERSION_ESQUEMA = MIGRACIONES.length;

/** Las tablas con datos (para copiar y para borrar). */
export const TABLAS = ['kv', 'tomas'] as const;

/**
 * Aplica las migraciones pendientes, cada una en su transacción junto con el cambio
 * de versión: o entra entera o no entra. `exec` abstrae el driver (expo-sqlite en la
 * app, node:sqlite en la verificación).
 */
export function migrar(exec: (sql: string) => void, version: number): number {
  if (version > VERSION_ESQUEMA) throw new Error('version-futura');
  for (let v = version; v < VERSION_ESQUEMA; v++) {
    try {
      exec(`BEGIN; ${MIGRACIONES[v]}; PRAGMA user_version = ${v + 1}; COMMIT;`);
    } catch (e) {
      exec('ROLLBACK');
      throw e;
    }
  }
  return VERSION_ESQUEMA;
}

/** Sin onboarding: te levantas a las 7:00, 5 ciclos (a dormir a las 23:15), ritmo normal. */
export const AJUSTES_DEFECTO: Ajustes = {
  idioma: 'en',
  despertar: 7 * 60,
  ciclos: 5,
  ritmo: 'normal',
  embarazo: false,
  ultimaCopia: null,
};

/** Lo guardado mezclado con los defectos: un ajuste nuevo no necesita migración. */
export const mezclarAjustes = (guardados: Partial<Ajustes>): Ajustes => ({ ...AJUSTES_DEFECTO, ...guardados });

/**
 * La lista del primer arranque. El id de cada bebida sembrada es su clave: así es estable
 * sin guardarla, y la semilla solo se escribe cuando el usuario cambia algo. El nombre se
 * traduce por la clave; el inglés guardado solo se ve si una versión vieja no la conoce.
 */
export const BEBIDAS_SEMILLA: Bebida[] = CATALOGO.map((b) => ({
  id: b.clave,
  clave: b.clave,
  nombre: traducir('en', `bebida.${b.clave}`),
  mg: b.mg,
  favorita: b.favorita,
}));

/** Cada bebida guardada mezclada con los defectos (por si una versión futura añade campos). */
export const normalizarBebidas = (guardadas: Partial<Bebida>[] | null): Bebida[] =>
  guardadas ? guardadas.map((b) => ({ id: '', clave: null, nombre: '', mg: 0, favorita: false, ...b })) : BEBIDAS_SEMILLA;
