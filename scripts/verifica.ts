// Verificación de la lógica pura: `npm run verifica`.
//
// Asserts a mano, agrupados por bloques, sin framework: todo lo que se verifica son
// funciones puras y el script entero tarda un segundo. Las migraciones se prueban con
// el `node:sqlite` de Node. Lo único que NO se puede probar aquí es lo nativo
// (SQLCipher, la alarma): eso se prueba en el móvil.

// El cambio de hora de España, pase lo que pase en la máquina que lo ejecute.
process.env.TZ = 'Europe/Madrid';

import { DatabaseSync } from 'node:sqlite';

import { CATALOGO, FUENTES, MAXIMO_DIARIO, UMBRAL_SUENO, VIDA_MEDIA } from '../src/lib/catalogo';
import { AJUSTES_DEFECTO, BEBIDAS_SEMILLA, mezclarAjustes, migrar, normalizarBebidas, TABLAS, VERSION_ESQUEMA } from '../src/lib/esquema';
import { duracion, hora, horaFrase, horasEnPunto, MIN, minutosDe, numero, vuelta } from '../src/lib/fechas';
import { nombreDe, traducir, type Clave } from '../src/lib/i18n';
import {
  curva,
  enCuerpo,
  estadisticas,
  horasDespertar,
  horasDormir,
  instanteDeHora,
  maxDuranteNoche,
  maximoDiario,
  noche,
  porDia,
  restante,
  ritmoDe,
  totalDia,
  ultimaToma,
  ultimosDias,
  vidaMedia,
} from '../src/lib/motor';
import type { Toma } from '../src/types';

let fallos = 0;
let total = 0;
const igual = (nombre: string, real: unknown, esperado: unknown) => {
  total++;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.log(`  ✗ ${nombre}\n      esperado ${b}\n      real     ${a}`);
  }
};
const ok = (nombre: string, cond: boolean) => igual(nombre, cond, true);
const bloque = (nombre: string) => console.log(`── ${nombre} ──`);

// ── Fábricas ─────────────────────────────────────────────────────────────────

/** Instante local: `t(2026, 10, 18, 22, 0)` = 18-10-2026 22:00 (mes de 1 a 12). */
const t = (a: number, m: number, d: number, h = 0, min = 0) => new Date(a, m - 1, d, h, min).getTime();
/** 'HH:MM' de un instante, para comparar a ojo. */
const hm = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};
let n = 0;
const toma = (mg: number, ts: number, extra: Partial<Toma> = {}): Toma => ({ id: String(++n), bebida: null, clave: null, nombre: '', mg, ts, ...extra });
const NORMAL = VIDA_MEDIA.normal;
const SIETE = 7 * 60;

// ── modelo de cafeína ────────────────────────────────────────────────────────
bloque('modelo de cafeína');
{
  igual('nada en el instante de tomarla', restante(100, 0, NORMAL), 0);
  igual('nada antes de tomarla', enCuerpo([toma(100, t(2026, 10, 18, 9))], t(2026, 10, 18, 8), NORMAL), 0);
  let pico = 0;
  for (let m = 1; m <= 120; m++) if (restante(100, m / 60, NORMAL) > restante(100, pico / 60, NORMAL)) pico = m;
  ok(`pico entre 30 y 45 min (sale a los ${pico})`, pico >= 30 && pico <= 45);
  const media = restante(100, NORMAL, NORMAL);
  ok(`tras una vida media, la mitad (±2 mg): ${media.toFixed(1)}`, Math.abs(media - 50) <= 2);
  const a6 = (vm: number) => restante(100, 6, vm);
  ok('a las 6 h: rápido < normal < lento', a6(VIDA_MEDIA.rapido) < a6(NORMAL) && a6(NORMAL) < a6(VIDA_MEDIA.lento));
  const dos = [toma(100, t(2026, 10, 18, 9)), toma(50, t(2026, 10, 18, 12))];
  const a15 = t(2026, 10, 18, 15);
  ok('las tomas se suman', Math.abs(enCuerpo(dos, a15, NORMAL) - (restante(100, 6, NORMAL) + restante(50, 3, NORMAL))) < 1e-9);
  const puntos = curva(dos, t(2026, 10, 18, 7), t(2026, 10, 19, 7), NORMAL);
  igual('curva: cada 15 min, extremos incluidos', puntos.length, 24 * 4 + 1);
  igual('curva: empieza en 0', puntos[0].mg, 0);
  igual('ritmo → vida media', [vidaMedia({ ritmo: 'rapido', embarazo: false }), vidaMedia({ ritmo: 'normal', embarazo: false }), vidaMedia({ ritmo: 'lento', embarazo: false })], [3, 5, 10]);
  igual('el embarazo fija el ritmo lento', [ritmoDe({ ritmo: 'rapido', embarazo: true }), vidaMedia({ ritmo: 'rapido', embarazo: true })], ['lento', 10]);
  igual('máximo diario normal y en embarazo', [maximoDiario({ embarazo: false }), maximoDiario({ embarazo: true })], [400, 200]);
}

// ── ciclos de sueño ──────────────────────────────────────────────────────────
bloque('ciclos de sueño');
{
  igual(
    'me levanto a las 7:00 → 21:45, 23:15, 0:45, 2:15',
    horasDormir(SIETE).map((h) => [h.ciclos, hora(h.min, 'es')]),
    [
      [6, '21:45'],
      [5, '23:15'],
      [4, '0:45'],
      [3, '2:15'],
    ],
  );
  igual('da la vuelta: levantarse a la 1:00 con 6 ciclos → 15:45', hora(horasDormir(60)[0].min, 'es'), '15:45');
  igual(
    'me acuesto ya a las 23:00 → 8:15, 6:45, 5:15, 3:45',
    horasDespertar(t(2026, 10, 18, 23)).map((h) => hm(h.ts)),
    ['8:15', '6:45', '5:15', '3:45'],
  );

  const a22 = noche(t(2026, 10, 18, 22), SIETE, 5);
  ok('a las 22:00 aún no es hora de dormir', !a22.esHoraDeDormir);
  igual('a las 22:00: dormir 23:15 y despertar mañana 7:00', [a22.dormir, a22.despertar], [t(2026, 10, 18, 23, 15), t(2026, 10, 19, 7)]);
  ok('a las 23:30 es hora de dormir', noche(t(2026, 10, 18, 23, 30), SIETE, 5).esHoraDeDormir);
  const a3 = noche(t(2026, 10, 19, 3), SIETE, 5);
  ok('a las 3:00 es hora de dormir (la noche empezó ayer)', a3.esHoraDeDormir && a3.dormir === t(2026, 10, 18, 23, 15));
  igual('a las 8:00, dormir a las 23:15 de ese día', noche(t(2026, 10, 19, 8), SIETE, 5).dormir, t(2026, 10, 19, 23, 15));
  igual('a las 7:00 en punto la noche ya es la siguiente', noche(t(2026, 10, 19, 7), SIETE, 5).despertar, t(2026, 10, 20, 7));

  // 25-10-2026: a las 3:00 se atrasa a las 2:00. La noche tiene una hora más de reloj.
  const cambio = noche(t(2026, 10, 24, 20), SIETE, 5);
  igual('cambio de hora: dormir a las 0:15, no a las 23:15', hm(cambio.dormir), '0:15');
  igual('cambio de hora: 7 h 45 min reales hasta las 7:00', (cambio.despertar - cambio.dormir) / MIN, 465);
  igual('cambio de hora: despertar el 25 a las 7:00', cambio.despertar, t(2026, 10, 25, 7));
}

// ── hora tope ────────────────────────────────────────────────────────────────
bloque('hora tope');
{
  const a8 = t(2026, 10, 18, 8);
  const { dormir, despertar } = noche(a8, SIETE, 5);
  igual('sin tomas, espresso de 64 mg hasta las 18:40', hm(ultimaToma([], 64, a8, dormir, despertar, NORMAL, UMBRAL_SUENO) ?? 0), '18:40');
  const mucha = [toma(400, t(2026, 10, 18, 7, 30))];
  igual('con mucha cafeína ya tomada, hoy ya no', ultimaToma(mucha, 64, a8, dormir, despertar, NORMAL, UMBRAL_SUENO), null);
  igual('descafeinado: cuando quieras (= la hora de dormir)', ultimaToma([], 3, a8, dormir, despertar, NORMAL, UMBRAL_SUENO), dormir);
  igual('si ya es hora de dormir, hoy ya no', ultimaToma([], 3, dormir + MIN, dormir, despertar, NORMAL, UMBRAL_SUENO), null);
  const tope = ultimaToma([], 64, a8, dormir, despertar, NORMAL, UMBRAL_SUENO) ?? 0;
  ok('la hora tope cumple y 5 min después ya no', maxDuranteNoche([toma(64, tope)], dormir, despertar, NORMAL) <= UMBRAL_SUENO && maxDuranteNoche([toma(64, tope + 5 * MIN)], dormir, despertar, NORMAL) > UMBRAL_SUENO);
  const lento = ultimaToma([], 64, a8, dormir, despertar, VIDA_MEDIA.lento, UMBRAL_SUENO) ?? 0;
  ok('con ritmo lento, la hora tope es antes', lento < tope);

  // Una toma 10 min antes de dormir aún no se ha absorbido al acostarte: el pico es durmiendo.
  const tarde = [toma(100, dormir - 10 * MIN)];
  const alAcostarte = enCuerpo(tarde, dormir, NORMAL);
  const pico = maxDuranteNoche(tarde, dormir, despertar, NORMAL);
  ok(`detecta el pico de una toma 10 min antes de dormir (${alAcostarte.toFixed(0)} → ${pico.toFixed(0)} mg)`, pico - alAcostarte > 30);
  igual('noche sin tomas: 0', maxDuranteNoche([], dormir, despertar, NORMAL), 0);
}

// ── la hora del modal ────────────────────────────────────────────────────────
bloque('hora del modal');
{
  const a10 = t(2026, 10, 18, 10);
  igual('una hora anterior a ahora es de hoy', instanteDeHora(9 * 60, a10), t(2026, 10, 18, 9));
  igual('la hora de ahora es de hoy', instanteDeHora(10 * 60, a10), a10);
  igual('una hora posterior a ahora es de ayer', instanteDeHora(23 * 60, a10), t(2026, 10, 17, 23));
}

// ── totales y estadísticas ───────────────────────────────────────────────────
bloque('totales y estadísticas');
{
  const tomas = [
    toma(64, t(2026, 10, 17, 9), { clave: 'espresso' }),
    toma(64, t(2026, 10, 17, 16), { clave: 'espresso' }),
    toma(96, t(2026, 10, 17, 23, 50), { clave: 'filtro' }),
    toma(80, t(2026, 10, 18, 0, 30), { clave: 'energetica' }),
    toma(48, t(2026, 10, 18, 18), { clave: 'te_negro' }),
  ];
  igual('total de un día', totalDia(tomas, '2026-10-17'), 224);
  igual('una toma a las 00:30 cuenta para el día nuevo', totalDia(tomas, '2026-10-18'), 128);
  igual('día sin tomas: 0', totalDia(tomas, '2026-10-16'), 0);
  igual('últimos 3 días, del más antiguo a hoy', ultimosDias('2026-10-18', 3), ['2026-10-16', '2026-10-17', '2026-10-18']);
  igual('por día', porDia(tomas, ultimosDias('2026-10-18', 3)), [0, 224, 128]);

  const e = estadisticas(tomas, '2026-10-18', MAXIMO_DIARIO);
  igual('media: desde el primer día con tomas', e?.media, Math.round((224 + 128) / 2));
  igual('días por encima del máximo', estadisticas(tomas, '2026-10-18', 200)?.diasEncima, 1);
  igual('hora habitual de la última: mediana (23:50 y 18:00 → 20:55)', hora(e?.horaUltima ?? 0, 'es'), '20:55');
  igual('la más tomada', e?.favorita, { clave: 'espresso', nombre: '' });
  igual('sin tomas en los últimos 30 días: null', estadisticas(tomas, '2026-12-31', MAXIMO_DIARIO), null);
  const viejas = [toma(500, t(2026, 9, 1, 9)), toma(50, t(2026, 10, 18, 9))];
  igual('lo de hace más de 30 días no cuenta', estadisticas(viejas, '2026-10-18', MAXIMO_DIARIO)?.diasEncima, 0);
  igual('las sin clave se agrupan por nombre', estadisticas([toma(10, t(2026, 10, 18, 9), { nombre: 'Kombucha' }), toma(10, t(2026, 10, 18, 10), { nombre: 'Kombucha' }), toma(10, t(2026, 10, 18, 11), { clave: 'cola' })], '2026-10-18', 400)?.favorita, { clave: null, nombre: 'Kombucha' });
}

// ── formato ──────────────────────────────────────────────────────────────────
bloque('formato');
{
  igual('hora en 12 h', [hora(0, 'en'), hora(450, 'en'), hora(720, 'en'), hora(1395, 'en')], ['12:00 AM', '7:30 AM', '12:00 PM', '11:15 PM']);
  igual('hora en 24 h', [hora(0, 'es'), hora(450, 'es'), hora(1395, 'es')], ['0:00', '7:30', '23:15']);
  igual('hora en una frase: "las" y "la 1"', [horaFrase(1000, 'es'), horaFrase(100, 'es'), horaFrase(100, 'en')], ['las 16:40', 'la 1:40', '1:40 AM']);
  igual('duración', [duracion(450), duracion(540), duracion(45), duracion(0)], ['7 h 30 min', '9 h', '45 min', '0 min']);
  igual('números', [numero(1250, 'en'), numero(1250, 'es'), numero(12500, 'es'), numero(90, 'en')], ['1,250', '1250', '12.500', '90']);
  igual('vuelta por medianoche', [vuelta(-15), vuelta(1440), vuelta(30)], [1425, 0, 30]);
  igual('minutos desde medianoche', minutosDe(t(2026, 10, 18, 16, 40)), 1000);
  igual('horas de referencia cada 6 h', horasEnPunto(t(2026, 10, 18, 7), t(2026, 10, 19, 7), 6).map(hm), ['12:00', '18:00', '0:00', '6:00']);
  igual('horas de referencia: incluye la primera si cae en punto', horasEnPunto(t(2026, 10, 18, 6), t(2026, 10, 18, 12), 6).map(hm), ['6:00', '12:00']);
}

// ── bebidas y textos ─────────────────────────────────────────────────────────
bloque('bebidas y textos');
{
  const tr = (clave: Clave, v?: Record<string, string | number>) => traducir('es', clave, v);
  ok('todas las bebidas del catálogo tienen nombre en los dos idiomas', CATALOGO.every((b) => traducir('es', `bebida.${b.clave}`) && traducir('en', `bebida.${b.clave}`)));
  igual('6 favoritas en la semilla, el espresso primero', BEBIDAS_SEMILLA.filter((b) => b.favorita).map((b) => b.id), ['espresso', 'con_leche', 'filtro', 'te_negro', 'cola', 'energetica']);
  igual('nombre traducido con clave', nombreDe(tr, { clave: 'espresso', nombre: '' }), 'Café solo');
  igual('nombre propio sin clave', nombreDe(tr, { clave: null, nombre: 'Kombucha' }), 'Kombucha');
  igual('clave desconocida (de una versión futura): su nombre', nombreDe(tr, { clave: 'yerba', nombre: 'Yerba' }), 'Yerba');
  igual('variables', tr('ahora.hasta', { bebida: 'Café solo', hora: horaFrase(1120, 'es') }), 'Café solo sin problema hasta las 18:40');
  igual('sin bebidas guardadas: la semilla', normalizarBebidas(null), BEBIDAS_SEMILLA);
  igual('bebidas guardadas: se completan campo a campo', normalizarBebidas([{ id: 'x', nombre: 'Kombucha', mg: 10 }]), [{ id: 'x', clave: null, nombre: 'Kombucha', mg: 10, favorita: false }]);
  igual('lista vacía guardada: no se vuelve a sembrar', normalizarBebidas([]), []);
  igual('ajustes guardados se mezclan con los defectos', mezclarAjustes({ idioma: 'es' }), { ...AJUSTES_DEFECTO, idioma: 'es' });
  const urls = Object.values(FUENTES).flat().map((f) => f.url);
  ok('fuentes: todas por https y sin repetir', urls.every((u) => u.startsWith('https://')) && new Set(urls).size === urls.length);
  igual('por defecto: a las 7:00, 5 ciclos, ritmo normal', [AJUSTES_DEFECTO.despertar, AJUSTES_DEFECTO.ciclos, AJUSTES_DEFECTO.ritmo], [420, 5, 'normal']);
}

// ── migraciones ──────────────────────────────────────────────────────────────
bloque('migraciones');
{
  const base = new DatabaseSync(':memory:');
  const version = () => (base.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  igual('migra de 0 a la última', migrar((sql) => base.exec(sql), version()), VERSION_ESQUEMA);
  igual('user_version actualizada', version(), VERSION_ESQUEMA);
  const tablas = (base.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((x) => x.name);
  ok('existen todas las tablas', TABLAS.every((x) => tablas.includes(x)));
  let ejecuciones = 0;
  migrar(() => ejecuciones++, version());
  igual('volver a migrar no hace nada', ejecuciones, 0);
  let futura = false;
  try {
    migrar(() => {}, VERSION_ESQUEMA + 1);
  } catch {
    futura = true;
  }
  ok('una base de una versión futura se rechaza', futura);

  const insertar = (mg: number) => {
    try {
      base.prepare('INSERT INTO tomas (id, bebida, clave, nombre, mg, ts) VALUES (?, ?, ?, ?, ?, ?)').run(String(++n), null, null, 'X', mg, 0);
      return true;
    } catch {
      return false;
    }
  };
  ok('la base acepta 0 mg y más', insertar(0) && insertar(64));
  ok('la base rechaza mg negativos', !insertar(-1));
  base.prepare("INSERT INTO kv (clave, valor) VALUES ('ajustes', '{}') ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor").run();
  base.prepare('INSERT INTO kv (clave, valor) VALUES (\'ajustes\', \'{"idioma":"es"}\') ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor').run();
  igual('kv: ON CONFLICT DO UPDATE sustituye', base.prepare("SELECT valor FROM kv WHERE clave = 'ajustes'").get(), { valor: '{"idioma":"es"}' });

  // Una migración que falla no deja nada a medias.
  const otra = new DatabaseSync(':memory:');
  let fallo = false;
  try {
    migrar((sql) => otra.exec(sql.replace('CREATE TABLE tomas', 'CREATE TABLA tomas')), 0);
  } catch {
    fallo = true;
  }
  const tras = (otra.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number }).n;
  ok('migración rota: falla y no deja tablas a medias', fallo && tras === 0);
}

console.log(fallos ? `\n${fallos} de ${total} asserts FALLAN` : `\n${total} asserts OK`);
process.exit(fallos ? 1 : 0);
