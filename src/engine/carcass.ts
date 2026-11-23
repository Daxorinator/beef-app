// Live weight → carcass → composition (meat / fat / bone / losses). Pure functions.
import { BREED_BY_ID } from '../data/breeds';
import { AHDB_GRID, AHDB_REFERENCE_CARCASS, CONFORMATION_SCORE, COW_KILLOUT_BY_FAT, FAT_SCORE } from '../data/grading';
import { CUTTING_LOSS_PCT, hangingLossPctOfCold, HOME_BUTCHER_FACTOR, REFERENCE_GRADE_SCORES, REFERENCE_HANGING_DAYS } from '../data/model-constants';
import { REFERENCE_BONE_PCT, REFERENCE_FAT_PCT, REGION_BY_ID } from '../data/regions';
import type { Animal, Conformation, FatClass } from '../model/types';

export interface Grade {
  conformation: Conformation;
  fatClass: FatClass;
  /** True when the user supplied the grade; false when breed/sex defaults were used. */
  fromUser: boolean;
}

export function effectiveGrade(a: Animal): Grade {
  const breed = BREED_BY_ID[a.breed];
  return {
    conformation: a.conformation ?? breed.defaultConformation[a.sex],
    fatClass: a.fatClass ?? breed.defaultFatClass[a.sex],
    fromUser: a.conformation !== undefined || a.fatClass !== undefined,
  };
}

/**
 * Kill-out % for the animal. Stored values are at the breed/sex default grade. Cows whose fat class differs from the
 * default are adjusted by the step between the two body-condition rows of COW_KILLOUT_BY_FAT.
 */
export function killOutPct(a: Animal, grade = effectiveGrade(a)): number {
  const breed = BREED_BY_ID[a.breed];
  const base = breed.killOutPct[a.sex].value;
  if (a.sex !== 'cow') return base;
  const rowOf = (f: FatClass) => COW_KILLOUT_BY_FAT.usdaGrades.find((g) => g.fatClasses.includes(f))!.irishPct;
  return base + rowOf(grade.fatClass) - rowOf(breed.defaultFatClass.cow);
}

export function carcassAndLive(a: Animal): { carcassKg: number; liveKg: number; killOut: number; liveIsEstimated: boolean } {
  const killOut = killOutPct(a);
  if (a.weightBasis === 'carcass') return { carcassKg: a.weightKg, liveKg: a.weightKg / (killOut / 100), killOut, liveIsEstimated: true };
  return { carcassKg: a.weightKg * (killOut / 100), liveKg: a.weightKg, killOut, liveIsEstimated: false };
}

// ───────── AHDB grid interpolation ─────────

function interp1(xs: readonly number[], x: number): { i: number; t: number; clamped: boolean } {
  // xs may be ascending or descending.
  const asc = xs[0] < xs[xs.length - 1];
  const lo = asc ? xs[0] : xs[xs.length - 1];
  const hi = asc ? xs[xs.length - 1] : xs[0];
  const clamped = x < lo || x > hi;
  const xc = Math.min(hi, Math.max(lo, x));
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    if ((xc >= Math.min(a, b) && xc <= Math.max(a, b))) return { i, t: a === b ? 0 : (xc - a) / (b - a), clamped };
  }
  return { i: xs.length - 2, t: 1, clamped };
}

/** Bilinear interpolation in an AHDB grid table on 15-point scores; clamps outside U−…P and fat 2…4H. */
export function gridValue(table: number[][], confScore: number, fatScore: number): { value: number; clamped: boolean } {
  const r = interp1(AHDB_GRID.confRowScores, confScore);
  const c = interp1(AHDB_GRID.fatColScores, fatScore);
  const v = (ri: number, ci: number) => table[ri][ci];
  const top = v(r.i, c.i) + c.t * (v(r.i, c.i + 1) - v(r.i, c.i));
  const bot = v(r.i + 1, c.i) + c.t * (v(r.i + 1, c.i + 1) - v(r.i + 1, c.i));
  return { value: top + r.t * (bot - top), clamped: r.clamped || c.clamped };
}

// ───────── Composition ─────────

/**
 * Distribution basis: AHDB Beef Yield Guide R4H carcass after 14 days, % of carcass. Region meat % values plus the
 * lean-trim pool total `YG_MEAT_PCT`; each region keeps its Yield Guide share of whatever meat the grid level gives.
 */
const YG_MEAT_PCT = (() => {
  const foreRibBone = REGION_BY_ID['fore-rib'].bonePctOfCarcass!.value;
  return 100 - REFERENCE_FAT_PCT.value - REFERENCE_BONE_PCT.value - foreRibBone - AHDB_REFERENCE_CARCASS.dripLossPct;
})();

export interface Composition {
  /** Multiplier on every Yield Guide region meat % and the trim pool %. */
  meatFactor: number;
  /** Multiplier on bone % figures (marrow bones) relative to the R4H grid carcass. */
  boneFactor: number;
  /** % of carcass. */
  fatPct: number;
  bonePct: number;
  hangingLossPct: number;
  cuttingLossPct: number;
  /** Realistic (home-butcher) take-home meat, % of carcass. */
  meatPct: number;
  /** Commercial-boning meat (AHDB grid), % of carcass: the upper bound. */
  commercialMeatPct: number;
  /** Extra trimming by a craft butcher (commercial − realistic): lean trimmed off and waste, not returnable fat. */
  homeTrimPct: number;
  gridClamped: boolean;
}

/**
 * Level basis: AHDB 2010 EUROP grid at the animal's grade (commercial boning 24–72 h, so no maturation loss yet).
 *  commercial meat = saleable S − hanging loss; realistic meat = commercial × HOME_BUTCHER_FACTOR (the rest is extra
 *  craft-butcher trim & waste, its own term); fat = fat trim T; bone pool = bone & waste (100 − S − T) less the cutting loss it
 *  contains (cutting waste is already in the grid's bone & waste, since the grid was measured after commercial boning).
 */
export function composition(grade: Grade, hangingDays: number): Composition {
  const conf = CONFORMATION_SCORE[grade.conformation];
  const fat = FAT_SCORE[grade.fatClass];
  const s = gridValue(AHDB_GRID.saleableYieldPct, conf, fat);
  const t = gridValue(AHDB_GRID.fatTrimPct, conf, fat);
  const refS = gridValue(AHDB_GRID.saleableYieldPct, REFERENCE_GRADE_SCORES.conformation, REFERENCE_GRADE_SCORES.fat).value;
  const refT = gridValue(AHDB_GRID.fatTrimPct, REFERENCE_GRADE_SCORES.conformation, REFERENCE_GRADE_SCORES.fat).value;
  const cuttingLossPct = CUTTING_LOSS_PCT.value;
  const hangingLossPct = hangingLossPctOfCold(hangingDays);
  const commercialMeatPct = s.value - hangingLossPct;
  const meatPct = commercialMeatPct * HOME_BUTCHER_FACTOR.value;
  const homeTrimPct = commercialMeatPct - meatPct;
  const fatPct = t.value;
  const bonePct = 100 - s.value - t.value - cuttingLossPct;
  const refBone = 100 - refS - refT - cuttingLossPct;
  return { meatFactor: meatPct / YG_MEAT_PCT, boneFactor: bonePct / refBone, fatPct, bonePct, hangingLossPct, cuttingLossPct, meatPct, commercialMeatPct, homeTrimPct, gridClamped: s.clamped || t.clamped };
}

export { YG_MEAT_PCT };
export { REFERENCE_HANGING_DAYS };
