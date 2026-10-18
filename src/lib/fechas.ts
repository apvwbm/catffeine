// Fechas, horas y números. Sin dependencias y sin `Intl`, para que el resultado sea el
// mismo en cualquier móvil y se pueda verificar en Node.
//
// Días como 'YYYY-MM-DD' en hora LOCAL, siempre. Nunca `toISOString()` ni
// `new Date('2026-01-05')`: los dos pasan por UTC y en España desplazan un día cerca de la
// medianoche. Instantes en epoch ms; horas del día en minutos desde medianoche.

import type { Idioma } from '@/types';

export const MIN = 60_000;
export const HORA = 60 * MIN;
export const DIA_MIN = 24 * 60;

const dos = (n: number) => String(n).padStart(2, '0');

export const aISO = (d: Date): string => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

/** El día local de un instante. */
export const diaDe = (ts: number): string => aISO(new Date(ts));

export const hoyISO = (): string => diaDe(Date.now());

export const desdeISO = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

/** `new Date(2026, 0, 32)` es el 1 de febrero: el propio Date resuelve los meses. */
export function addDias(iso: string, delta: number): string {
  const d = desdeISO(iso);
  return aISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

/** Días de `a` a `b`, con signo. Por `Date.UTC`: el día del cambio de hora mide 23 o 25 h. */
export function diasEntre(a: string, b: string): number {
  const [aa, am, ad] = a.split('-').map(Number);
  const [ba, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad)) / 86400000);
}

/** Minutos desde la medianoche local de un instante. */
export const minutosDe = (ts: number): number => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};

/** El instante en que el reloj marca `minutos` el día de `ts` (más `dias` días). */
export const aLas = (ts: number, minutos: number, dias = 0): number => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, Math.floor(minutos / 60), minutos % 60).getTime();
};

/** Los instantes en punto de [desde, hasta] cuya hora es múltiplo de `cada` (0:00, 6:00…). */
export function horasEnPunto(desde: number, hasta: number, cada: number): number[] {
  const d = new Date(desde);
  d.setMinutes(0, 0, 0);
  const marcas = [];
  for (let ts = d.getTime() < desde ? d.getTime() + HORA : d.getTime(); ts <= hasta; ts += HORA) {
    if (new Date(ts).getHours() % cada === 0) marcas.push(ts);
  }
  return marcas;
}

/** Módulo que no da negativos: horas del día que dan la vuelta por medianoche. */
export const vuelta = (minutos: number): number => ((minutos % DIA_MIN) + DIA_MIN) % DIA_MIN;

// ── Rótulos ──────────────────────────────────────────────────────────────────

/** Minutos desde medianoche → '7:30 AM' / '7:30'. */
export function hora(minutos: number, idioma: Idioma): string {
  const h = Math.floor(minutos / 60);
  const m = dos(minutos % 60);
  return idioma === 'es' ? `${h}:${m}` : `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export const horaDe = (ts: number, idioma: Idioma): string => hora(minutosDe(ts), idioma);

/** La hora dentro de una frase ("hasta {hora}"): en castellano, 'las 16:40' pero 'la 1:40'. */
export function horaFrase(minutos: number, idioma: Idioma): string {
  if (idioma === 'en') return hora(minutos, idioma);
  return `${Math.floor(minutos / 60) === 1 ? 'la' : 'las'} ${hora(minutos, idioma)}`;
}

/** '7 h 30 min', '9 h', '45 min': igual en los dos idiomas. */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return [h && `${h} h`, (m || !h) && `${m} min`].filter(Boolean).join(' ');
}

/** '1,250' / '1250'; en castellano el separador empieza en 10.000 (RAE). */
export function numero(n: number, idioma: Idioma): string {
  const s = String(Math.round(n));
  if (idioma === 'es' && Math.abs(n) < 10000) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, idioma === 'es' ? '.' : ',');
}

/** 'Oct 18' / '18 oct'. */
const MESES: Record<Idioma, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function fechaCorta(iso: string, idioma: Idioma): string {
  const d = desdeISO(iso);
  const mes = MESES[idioma][d.getMonth()];
  return idioma === 'es' ? `${d.getDate()} ${mes}` : `${mes} ${d.getDate()}`;
}
