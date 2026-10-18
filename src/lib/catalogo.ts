// Constantes de referencia, cada una con su fuente. En la interfaz no se ve ninguna fecha;
// aquí sí: investigado el 2026-10-17. Si cambia una cifra, cambia su comentario.

import type { Ritmo } from '@/types';

// ── Modelo de cafeína ────────────────────────────────────────────────────────
// Un compartimento con absorción y eliminación de primer orden (función de Bateman): es
// el modelo que ajusta (Csajka 2005, https://pmc.ncbi.nlm.nih.gov/articles/PMC1884794/).
// Biodisponibilidad ≈ 100 %, el 99 % absorbido en 45 min (Blanchard & Sawers 1983,
// https://link.springer.com/doi/10.1007/BF00613933).

/**
 * Constante de absorción, h⁻¹. Con t½ = 5 h da el pico a los ~44 min, que cuadra con lo
 * medido en café (42 ± 5 min) y cola (39 ± 5) (Liguori 1997,
 * https://pubmed.ncbi.nlm.nih.gov/9329065/).
 * ponytail: un solo KA para todo. Pastillas y pre-entreno se absorben algo más despacio
 * (≈ 3,8 h⁻¹, pico ~55 min) y el chocolate mucho más (≈ 1,5 h⁻¹, pico ~1,5–2 h). Si hace
 * falta: `ka` por bebida, copiado en cada toma.
 */
export const KA = 5;

/**
 * Vida media en horas según el ritmo.
 * - normal 5 h: IOM, media ~5 h (rango 1,5–9,5); EFSA ~4 h (2–8); FSANZ 3–7 h; el modelo
 *   de Csajka da ≈ 5,4 h. https://www.efsa.europa.eu/sites/default/files/corporate_publications/files/efsaexplainscaffeine150527.pdf
 *   https://www.foodstandards.gov.au/sites/default/files/food-standards-code/proposals/Documents/P1056%20SD1%201st%20CFS%20Safety%20Assessment.pdf
 * - rápido 3 h: fumadores ≈ ×0,6 (3,5 h frente a 6,0 h) (Parsons & Neims 1978,
 *   https://pubmed.ncbi.nlm.nih.gov/657717/; Temple 2017,
 *   https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2017.00080/full).
 * - lento 10 h: ×2. Píldora anticonceptiva ×1,5–2,2; embarazo ~10 h a la semana 17 y ×3 al
 *   final (16–18 h). FSANZ, Csajka, Temple. La enfermedad hepática no se modela.
 */
export const VIDA_MEDIA: Record<Ritmo, number> = { rapido: 3, normal: 5, lento: 10 };

/**
 * Máximo de cafeína en el cuerpo durante TODA la noche, en mg. No hay ninguna cifra
 * publicada de "mg al acostarse": se calibra con el metaanálisis de Gardiner 2023
 * (https://eprints.leedsbeckett.ac.uk/id/eprint/9625/, 24 estudios, la cafeína quita ~45 min
 * de sueño): café de 107 mg ≥ 8,8 h antes de dormir y pre-entreno de 217,5 mg ≥ 13,2 h.
 * Con t½ = 5 h y KA = 5, 35 mg reproduce las dos (8,3 h y 13,4 h). Muy por debajo de los
 * 100 mg cerca de la hora de dormir que según EFSA 2015 pueden afectar al sueño
 * (https://www.efsa.europa.eu/en/efsajournal/pub/4102). Drake 2013
 * (https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/): 400 mg 6 h antes quitan más de 1 h.
 * **Va atado a la vida media normal**: si cambian los 5 h, recalibrar (~24 mg con 4 h). Los
 * ritmos rápido y lento NO cambian el umbral: cambian la curva.
 */
export const UMBRAL_SUENO = 35;

// ── Máximos ──────────────────────────────────────────────────────────────────

/** mg al día, adultos sanos: EFSA 2015 y FDA (https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much). */
export const MAXIMO_DIARIO = 400;
/** mg al día en embarazo y lactancia: EFSA 2015; ACOG < 200 (https://pubmed.ncbi.nlm.nih.gov/20664420/). */
export const MAXIMO_EMBARAZO = 200;
/** mg de una vez: EFSA 2015. La app es para adultos (EFSA: 3 mg/kg al día en menores; no se modela). */
export const DOSIS_MAXIMA = 200;

// ── Sueño ────────────────────────────────────────────────────────────────────

/** Minutos por ciclo. 70–100 el primero, 90–120 los siguientes (IOM 2006, https://www.ncbi.nlm.nih.gov/books/NBK19956/); la convención de sleepcalculator.com. */
export const CICLO = 90;
/** Minutos en dormirse: los adultos sanos tardan 10–20 (https://www.sleepfoundation.org/how-sleep-works/sleep-latency); sleepcalculator.com usa 15. */
export const DORMIRSE = 15;
/** Las opciones de Sueño, de más a menos. */
export const OPCIONES_CICLOS = [6, 5, 4, 3] as const;
/**
 * 5–6 ciclos = 7 h 30 min – 9 h. Adultos 7–9 h (Hirshkowitz 2015, NSF,
 * https://doi.org/10.1016/j.sleh.2014.12.010); AASM/SRS ≥ 7 h (Watson 2015,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC4442216/).
 */
export const CICLOS_RECOMENDADOS: readonly number[] = [5, 6];

// ── Bebidas (semilla de la lista del usuario) ────────────────────────────────
// Nombres genéricos, sin marcas, traducidos con `bebida.<clave>`. Las favoritas por
// defecto en este orden: el espresso primero, que manda en el veredicto. Los mg varían
// mucho según el bar y la marca: la Ayuda de Tus bebidas lo dice y todo se puede editar.

export const CATALOGO = [
  // USDA 212 mg/100 g (https://fdc.nal.usda.gov/food-details/171891/nutrients); 63–80 según fuente.
  { clave: 'espresso', mg: 64, favorita: true },
  // 2 × espresso.
  { clave: 'doble', mg: 128, favorita: false },
  // 1 carga, lo normal en un bar europeo.
  { clave: 'con_leche', mg: 64, favorita: true },
  // 1 carga.
  { clave: 'americano', mg: 64, favorita: false },
  // 2 cargas, lo habitual.
  { clave: 'flat_white', mg: 128, favorita: false },
  // USDA 40 mg/100 g × 240 ml (https://fdc.nal.usda.gov/food-details/171890/nutrients).
  { clave: 'filtro', mg: 96, favorita: true },
  // USDA (https://fdc.nal.usda.gov/food-details/174130/nutrients).
  { clave: 'soluble', mg: 62, favorita: false },
  // Starbucks Cold Brew 355 ml = 155.
  { clave: 'cold_brew', mg: 155, favorita: false },
  // USDA 1 mg/100 g (https://fdc.nal.usda.gov/food-details/171889/nutrients); hasta 20 en cadenas.
  { clave: 'descafeinado', mg: 3, favorita: false },
  // USDA 20 mg/100 g (https://fdc.nal.usda.gov/food-details/173227/nutrients); EFSA ~50.
  { clave: 'te_negro', mg: 48, favorita: true },
  // USDA 12 mg/100 g (https://fdc.nal.usda.gov/food-details/171917/nutrients).
  { clave: 'te_verde', mg: 29, favorita: false },
  // 2 g a 19–44 mg/g (Kochman 2020, https://pmc.ncbi.nlm.nih.gov/articles/PMC7796401/).
  { clave: 'matcha', mg: 64, favorita: false },
  // ~78 por taza (Heck & de Mejia 2007; confianza baja).
  { clave: 'mate', mg: 80, favorita: false },
  // 330 ml, web del fabricante (32–33); vale también para la versión zero.
  { clave: 'cola', mg: 32, favorita: true },
  // 330 ml, web del fabricante.
  { clave: 'cola_light', mg: 42, favorita: false },
  // 250 ml a 32 mg/100 ml (web del fabricante; EFSA usa 320 mg/l).
  { clave: 'energetica', mg: 80, favorita: true },
  // 500 ml a 32 mg/100 ml.
  { clave: 'energetica_grande', mg: 160, favorita: false },
  // Media de 100 productos 254 ± 80 (Jagim 2019, https://pmc.ncbi.nlm.nih.gov/articles/PMC6413194/); las etiquetas fallan mucho.
  { clave: 'preentreno', mg: 250, favorita: false },
  // 70–85 % (https://fdc.nal.usda.gov/food-details/170273/nutrients).
  { clave: 'chocolate_negro', mg: 40, favorita: false },
  // USDA 20 mg/100 g (https://fdc.nal.usda.gov/food-details/167587/nutrients).
  { clave: 'chocolate_leche', mg: 10, favorita: false },
  // Dosis OTC de 100–200 mg (21 CFR 340.50, https://www.law.cornell.edu/cfr/text/21/340.50).
  { clave: 'pastilla', mg: 100, favorita: false },
] as const;

/** Como mucho 6 favoritas: son los botones de Ahora. */
export const MAX_FAVORITAS = 6;

// ── Fuentes (la pantalla Cómo se calcula) ────────────────────────────────────
// Las principales de arriba, por apartado. Citas y revistas son nombres propios: no se
// traducen. Si añades un apartado, añade también sus textos `fu.<apartado>` en i18n.

export const FUENTES = {
  cafeina: [
    { cita: 'Csajka et al. 2005', donde: 'Br J Clin Pharmacol', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1884794/' },
    { cita: 'Liguori et al. 1997', donde: 'Pharmacol Biochem Behav', url: 'https://pubmed.ncbi.nlm.nih.gov/9329065/' },
    { cita: 'Parsons & Neims 1978', donde: 'Clin Pharmacol Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/657717/' },
    { cita: 'Temple et al. 2017', donde: 'Front Psychiatry', url: 'https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2017.00080/full' },
  ],
  tope: [
    { cita: 'Gardiner et al. 2023', donde: 'Sleep Med Rev', url: 'https://eprints.leedsbeckett.ac.uk/id/eprint/9625/' },
    { cita: 'Drake et al. 2013', donde: 'J Clin Sleep Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/' },
  ],
  maximos: [
    { cita: 'EFSA 2015', donde: 'EFSA Journal', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/4102' },
    { cita: 'FDA', donde: 'U.S. Food & Drug Administration', url: 'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much' },
    { cita: 'ACOG 2010', donde: 'Obstet Gynecol', url: 'https://pubmed.ncbi.nlm.nih.gov/20664420/' },
  ],
  sueno: [
    { cita: 'Institute of Medicine 2006', donde: 'Sleep Disorders and Sleep Deprivation', url: 'https://www.ncbi.nlm.nih.gov/books/NBK19956/' },
    { cita: 'Hirshkowitz et al. 2015', donde: 'Sleep Health', url: 'https://doi.org/10.1016/j.sleh.2014.12.010' },
    { cita: 'Watson et al. 2015', donde: 'J Clin Sleep Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4442216/' },
  ],
  bebidas: [
    { cita: 'USDA FoodData Central', donde: 'U.S. Department of Agriculture', url: 'https://fdc.nal.usda.gov/' },
    { cita: 'Jagim et al. 2019', donde: 'Nutrients', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6413194/' },
  ],
} as const;
