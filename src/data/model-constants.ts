// Constants the calculation engine needs beyond the raw research tables.
//
// Basis: the ABSOLUTE meat / fat / bone level comes from the AHDB 2010 EUROP yield grid (commercial boning, trimmed
// primals + 93 % VL lean trim), which matches Irish home-butcher reality far better than the AHDB Beef Yield Guide
// (≤ 10 mm fat, 85 % VL trim: ~77 % meat at R4H). The Yield Guide is used only for HOW the meat is distributed
// between regions and the trim pool.
// Every value is sourced or derived
// from sourced values (note starts "Derived:"); data.test.ts includes them in its provenance checks.
import type { Sourced } from '../model/types';
import { AGEING_SHRINK, AHDB_REFERENCE_CARCASS } from './grading';

const d = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived: ${note}` });

/**
 * The AHDB Beef Yield Guide reference carcass is R4H. On the 15-point scales that is conformation R = 8 and
 * fat 4H ≈ 12 (the 4H column of the AHDB 2010 grid; grading.ts AHDB_GRID.fatColScores). Anchoring here makes the
 * grade-scaling ratios exactly 1 for the reference carcass.
 */
export const REFERENCE_GRADE_SCORES = { conformation: 8, fat: 12, sourceIds: ['ahdb-yield-guide', 'ahdb-europ-yield'] };

/** Days of maturation behind the AHDB Beef Yield Guide figures. */
export const REFERENCE_HANGING_DAYS = 14;

/** SDSU cumulative shrink (% of hot weight) interpolated by day; beyond day 21, +0.1 % per day (SDSU). */
export function sdsuShrinkPct(days: number): number {
  const { days: ds, lossPct, dailyAfterDay3Pct } = AGEING_SHRINK;
  if (days <= 0) return 0;
  if (days <= ds[0]) return (lossPct[0] * days) / ds[0];
  for (let i = 1; i < ds.length; i++) {
    if (days <= ds[i]) {
      const t = (days - ds[i - 1]) / (ds[i] - ds[i - 1]);
      return lossPct[i - 1] + t * (lossPct[i] - lossPct[i - 1]);
    }
  }
  return lossPct[lossPct.length - 1] + (days - ds[ds.length - 1]) * dailyAfterDay3Pct;
}

/**
 * Hanging loss as % of the Irish cold carcass weight. EU cold weight is warm weight − 2 % (2017/1182 Art. 14(3)),
 * so only SDSU shrink beyond 2 % of hot weight is new loss, re-expressed on the 98 % cold basis.
 */
export function hangingLossPctOfCold(days: number): number {
  const cold = AGEING_SHRINK.coldWeightDeductionPct;
  return (Math.max(0, sdsuShrinkPct(days) - cold) / (100 - cold)) * 100;
}

/**
 * Cutting loss (% of carcass): the part of AHDB's 2.61 % "drip/cutting loss" after 14 days that is not hanging
 * shrink. 2.61 − hanging loss at 14 days (SDSU 3.8 % hot → 1.84 % of cold) = 0.77 %.
 */
export const CUTTING_LOSS_PCT: Sourced = d(
  AHDB_REFERENCE_CARCASS.dripLossPct - hangingLossPctOfCold(REFERENCE_HANGING_DAYS),
  ['ahdb-yield-guide', 'sdsu-ageing', 'eu-2017-1182'],
  'AHDB drip/cutting loss 2.61 % at 14 days minus SDSU hanging shrink to day 14 on the EU cold-weight basis',
);

/**
 * Freezer space per kg of packed meat: about 1 L per 0.5–0.6 kg (RESEARCH §7), taken at 0.55 kg/L. Cross-checks: a half
 * beef needs about 6–8 cu ft (170–225 L); the Teagasc heifer's 143 kg filled a 400 L freezer (a full chest freezer is
 * never packed solid, so that is an upper bound).
 */
export const FREEZER_LITRES_PER_KG: Sourced = d(Math.round((1 / 0.55) * 100) / 100, ['teagasc-heifer'], '1 L per 0.5–0.6 kg packed meat (midpoint 0.55 kg/L); half beef 170–225 L; Teagasc heifer 143 kg in a 400 L freezer as the upper bound');

/**
 * Low end of the take-home band, relative to the commercial-boning (AHDB) estimate. The Teagasc home-kill heifer
 * returned 58.4 % of carcass as meat, about 7–10 points below AHDB's commercial yield for its grade (RESEARCH §3.3):
 * home butchers trim harder and keep more bone in. The midpoint, 8.5 points of ~67 %, is ≈ 13 % relative.
 */
export const HOME_BUTCHER_LOW_FACTOR: Sourced = d(
  Math.round((1 - 8.5 / 67) * 1000) / 1000,
  ['teagasc-heifer', 'ahdb-europ-yield'],
  'Teagasc heifer 58.4 % meat vs AHDB commercial saleable yield ~66–68 % at O−4−: 7–10 points lower (midpoint 8.5 of ~67 %)',
);

/**
 * Lean content of the trim pool. The absolute meat level is anchored on the AHDB 2010 grid, whose saleable yield
 * counts lean trim at 93 % visual lean, so the pool is 93 % VL. Mince at another lean % gains or sheds fat to the fat pool.
 */
export const TRIM_POOL_LEAN_PCT: Sourced = { value: 93, evidence: 'verified', sourceIds: ['ahdb-europ-yield'], note: 'AHDB 2010: saleable yield = trimmed primals + 93 % VL lean trim' };

/** Diced beef is trimmed to 95 % visual lean (AHDB 2010 dicing spec); applied when the trim pool is diced. */
export const DICED_LEAN_PCT: Sourced = { value: 95, evidence: 'verified', sourceIds: ['ahdb-europ-yield'], note: 'Clod, neck, brisket diced at ≥ 95 % visual lean' };
