// Base de datos local cifrada: expo-sqlite compilado con SQLCipher (ver el plugin en
// app.json).
//
// La clave son 32 bytes aleatorios generados en el primer arranque y guardados en
// SecureStore (Android Keystore / iOS Keychain). Se pasa como clave en bruto
// (`x'…'`), lo que evita la derivación PBKDF2 en cada arranque: abrir es instantáneo.
//
// En Expo Go no hay SQLCipher: `PRAGMA key` se ignora y la base queda SIN cifrar.
// `estaCifrada()` lo dice, y las copias cifradas se niegan a funcionar ahí.
//
// Todo es síncrono a propósito: con los datos de una persona, cada consulta tarda
// microsegundos y así el store escribe y pinta en el mismo tick.

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { mezclarAjustes, migrar, normalizarBebidas, TABLAS } from './esquema';
import type { Ajustes, Bebida, Toma } from '@/types';

const NOMBRE = 'catffeine.db';
const CLAVE_SECURE_STORE = 'catffeine.clave';

let db: SQLite.SQLiteDatabase;
let cifrada = false;

/** false en Expo Go, que no trae SQLCipher. */
export const estaCifrada = () => cifrada;

export const conexion = () => db;

async function claveCifrado(): Promise<string> {
  const guardada = await SecureStore.getItemAsync(CLAVE_SECURE_STORE);
  if (guardada) return guardada;
  const nueva = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(CLAVE_SECURE_STORE, nueva);
  return nueva;
}

export const versionDe = (base: SQLite.SQLiteDatabase): number =>
  base.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

export async function abrir(): Promise<void> {
  const clave = await claveCifrado();
  db = SQLite.openDatabaseSync(NOMBRE);
  db.execSync(`PRAGMA key = "x'${clave}'"`);
  cifrada = db.getFirstSync('PRAGMA cipher_version') !== null;
  migrar((sql) => db.execSync(sql), versionDe(db));
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export type Todo = { tomas: Toma[]; bebidas: Bebida[]; ajustes: Ajustes };

function kv<T>(clave: string): T | null {
  const fila = db.getFirstSync<{ valor: string }>('SELECT valor FROM kv WHERE clave = ?', clave);
  return fila ? (JSON.parse(fila.valor) as T) : null;
}

export function cargar(): Todo {
  return {
    tomas: db.getAllSync<Toma>('SELECT id, bebida, clave, nombre, mg, ts FROM tomas ORDER BY ts'),
    bebidas: normalizarBebidas(kv<Partial<Bebida>[]>('bebidas')),
    ajustes: mezclarAjustes(kv<Partial<Ajustes>>('ajustes') ?? {}),
  };
}

// ── Escritura ────────────────────────────────────────────────────────────────
// INSERT … ON CONFLICT DO UPDATE y nunca INSERT OR REPLACE (ver AGENTS.md).

export const guardarToma = (x: Toma) =>
  db.runSync(
    `INSERT INTO tomas (id, bebida, clave, nombre, mg, ts) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET bebida = excluded.bebida, clave = excluded.clave, nombre = excluded.nombre, mg = excluded.mg, ts = excluded.ts`,
    [x.id, x.bebida, x.clave, x.nombre, x.mg, x.ts],
  );

export const borrarToma = (id: string) => db.runSync('DELETE FROM tomas WHERE id = ?', id);

export const guardarKv = (clave: 'ajustes' | 'bebidas', valor: unknown) =>
  db.runSync('INSERT INTO kv (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor', [clave, JSON.stringify(valor)]);

export function borrarTodo() {
  db.withTransactionSync(() => {
    for (const t of TABLAS) db.execSync(`DELETE FROM ${t}`);
  });
}
