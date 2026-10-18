// Tipos del dominio. Instantes en epoch ms (`ts`); horas del día en minutos desde
// medianoche (0–1439); días como 'YYYY-MM-DD' en hora local (`lib/fechas.ts`).

import type { CATALOGO } from './lib/catalogo';

export type Idioma = 'es' | 'en';

/** Cómo de rápido eliminas la cafeína (la vida media sale de `catalogo.ts`). */
export type Ritmo = 'rapido' | 'normal' | 'lento';

export type ClaveBebida = (typeof CATALOGO)[number]['clave'];

export type Ajustes = {
  idioma: Idioma;
  /** Hora de levantarse, en minutos desde medianoche. Se cambia en Sueño. */
  despertar: number;
  /** Ciclos de sueño elegidos: de ahí sale la hora de dormir. */
  ciclos: number;
  ritmo: Ritmo;
  /** Embarazo o lactancia: baja el máximo diario. */
  embarazo: boolean;
  ultimaCopia: string | null;
};

/**
 * Una bebida de la lista del usuario. Con `clave`, el nombre se traduce
 * (`bebida.<clave>`); al renombrarla pasa a null. El orden de la lista es el de los botones
 * de Ahora, y la primera favorita manda en el veredicto.
 */
export type Bebida = {
  id: string;
  clave: ClaveBebida | null;
  nombre: string;
  mg: number;
  favorita: boolean;
};

/** Lo que te has tomado. Guarda su copia de nombre y mg: borrar la bebida no la toca. */
export type Toma = {
  id: string;
  /** Id de la bebida; puede quedar huérfano si se borra. */
  bebida: string | null;
  clave: ClaveBebida | null;
  nombre: string;
  mg: number;
  ts: number;
};
