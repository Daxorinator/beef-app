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

/** Freezer capacity per kg of packed meat. Teagasc home-kill heifer: 143.2 kg of meat filled a 400 L freezer. */
export const FREEZER_LITRES_PER_KG: Sourced = d(Math.round((400 / 143.2) * 100) / 100, ['teagasc-heifer'], '400 L freezer ÷ 143.2 kg packed meat (Teagasc heifer)');

/**
 * Realistic take-home relative to commercial boning (AHDB grid). The Teagasc home-kill heifer returned 58.4 % of
 * carcass as meat, 7–10 points below the commercial grid yield for its grade (RESEARCH §3.3): craft butchers trim
 * harder and the customer gets less. Midpoint 8.5 points of ~67 % ≈ 12.7 % relative. All cut weights and counts use
 * this level; the commercial figure is shown only as an upper bound. The extra trim goes to the fat/trim pool.
 */
export const HOME_BUTCHER_FACTOR: Sourced = d(
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
