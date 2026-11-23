// Cut thicknesses are chosen in inches (as Irish butchers quote them) and stored in cm (1" = 2.54 cm) for the maths.

export const inch = (inches: number): number => inches * 2.54;

/** Standard steak thickness: 1". */
export const STANDARD_STEAK_CM = inch(1);
/** Everyday steaks: ½" to 2". */
export const STEAK_CM = [0.5, 0.75, 1, 1.25, 1.5, 2].map(inch);
/** Thick-cut bone-in steaks and osso buco: 1¼" to 2½". */
export const THICK_CM = [1.25, 1.5, 2, 2.5].map(inch);
/** Minute steaks and stir-fry slices: ⅛" to ½". */
export const THIN_CM = [0.125, 0.25, 0.375, 0.5].map(inch);
/** Fillet steaks: 1" to 2". */
export const FILLET_CM = [1, 1.25, 1.5, 2].map(inch);

const FRACTIONS: [number, string][] = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [0.75, '¾'], [0.875, '⅞']];

/** 3.175 cm → 1¼". Rounds to the nearest ⅛ inch. */
export function inchLabel(cm: number): string {
  const eighths = Math.round((cm / 2.54) * 8);
  const whole = Math.floor(eighths / 8);
  const frac = FRACTIONS[eighths % 8][1];
  return `${whole > 0 || !frac ? whole : ''}${frac}"`;
}
