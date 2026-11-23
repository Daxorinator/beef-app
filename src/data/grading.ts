// Reference tables for EUROP grades, yield and hanging loss. Constants only.
import type { Conformation, FatClass } from '../model/types';

/** 15-point scales used by Teagasc / AHDB regressions (E+ = 15 … P− = 1; 5+ = 15 … 1− = 1). */
export const CONFORMATION_SCORE: Record<Conformation, number> = {
  'E+': 15, E: 14, 'E-': 13,
  'U+': 12, U: 11, 'U-': 10,
  'R+': 9, R: 8, 'R-': 7,
  'O+': 6, O: 5, 'O-': 4,
  'P+': 3, P: 2, 'P-': 1,
};

export const FAT_SCORE: Record<FatClass, number> = {
  '1-': 1, '1': 2, '1+': 3,
  '2-': 4, '2': 5, '2+': 6,
  '3-': 7, '3': 8, '3+': 9,
  '4-': 10, '4': 11, '4+': 12,
  '5-': 13, '5': 14, '5+': 15,
};

/** Irish QPS target spec for prime cattle (Teagasc 2015). */
export const QPS_SPEC = {
  steer: { maxAgeMonths: 30, fat: ['2+', '4'] as FatClass[], minConformation: 'O' as Conformation },
  heifer: { maxAgeMonths: 30, fat: ['2+', '4'] as FatClass[], minConformation: 'O' as Conformation },
  youngBull: { maxAgeMonths: 16, fat: ['2+', '4'] as FatClass[], minConformation: 'O' as Conformation },
  sourceIds: ['teagasc-systems'],
};

/**
 * AHDB/EBLEX 2010 — saleable meat yield % of side (trimmed primals + 93% VL lean trim),
 * commercial boning 24–72 h post-slaughter, mean side 144.6 kg. Rows: conformation; cols: fat 2, 3, 4L, 4H.
 * Grid coverage U− … P only; extrapolate with care.
 */
export const AHDB_GRID = {
  fatCols: ['2', '3', '4L', '4H'] as const,
  /** Equivalent 15-point fat scores for the columns (2 = 5, 3 = 8, 4L ≈ 10.5, 4H ≈ 12). */
  fatColScores: [5, 8, 10.5, 12],
  confRows: ['U-', 'R', 'O+', 'O-', 'P'] as const,
  confRowScores: [10, 8, 6, 4, 2],
  saleableYieldPct: [
    [76.5, 73.8, 71.7, 70.4],
    [74.8, 72.1, 70.0, 68.7],
    [73.1, 70.4, 68.3, 67.0],
    [71.7, 69.0, 66.9, 65.6],
    [70.8, 68.1, 66.1, 64.7],
  ],
  trimmedPrimalPct: [
    [58.8, 56.9, 55.4, 54.4],
    [57.4, 55.4, 54.0, 53.0],
    [56.0, 54.0, 52.5, 51.6],
    [54.8, 52.8, 51.4, 50.4],
    [54.1, 52.1, 50.6, 49.7],
  ],
  fatTrimPct: [
    [4.9, 8.4, 11.1, 12.8],
    [5.2, 8.8, 11.4, 13.2],
    [5.5, 9.1, 11.7, 13.5],
    [5.8, 9.4, 12.0, 13.8],
    [6.0, 9.5, 12.2, 14.0],
  ],
  overall: { saleable: 70.4, fatTrim: 9.6, boneAndWaste: 20.0, trimmedPrimals: 54.0, leanTrim: 16.4 },
  sourceIds: ['ahdb-europ-yield'],
};

/**
 * Teagasc dissection regression (Conroy et al. 2010), g/kg carcass, 15-point scales,
 * intercept at conformation = fat = 8. Full dissection (all visible fat removed, bones scraped).
 */
export const TEAGASC_COMPOSITION = {
  pivot: 8,
  meat: { intercept: { steer: 698, bull: 704, heifer: 713 }, conf: 11.8, fat: -9.6, r2: 0.73 },
  fat: { intercept: { steer: 113, bull: 96, heifer: 100 }, conf: -4.4, fat: 12.0, r2: 0.67 },
  bone: { intercept: { steer: 190, bull: 200, heifer: 187 }, conf: -7.4, fat: -2.4, r2: 0.71 },
  /** HF (O−3+) 65.0 % vs late-maturing suckler (U−3+) 71.2 % meat — breed effect at equal-ish grade. */
  breedContrast: { holsteinFriesianMeatPct: 65.0, lateMaturingMeatPct: 71.2 },
  steerMeans: { slaughterKg: 625, carcassKg: 333, meatGkg: 679, fatGkg: 123, boneGkg: 197 },
  sourceIds: ['teagasc-dissection'],
};

/** AHDB Beef Yield Guide reference carcass breakdown (303 kg R4H, 2 weeks' maturation), % of carcass. */
export const AHDB_REFERENCE_CARCASS = {
  carcassKg: 303,
  grade: { conformation: 'R' as Conformation, fat: '4' as FatClass },
  trim85VLPct: 11.41,
  fatPct: 5.78,
  bonePct: 16.17,
  dripLossPct: 2.61,
  sourceIds: ['ahdb-yield-guide'],
};

/** SDSU cumulative cooler shrink (% of hot carcass weight). Day 0 = slaughter. */
export const AGEING_SHRINK = {
  days: [1, 2, 3, 4, 5, 6, 7, 14, 21],
  lossPct: [1.3, 1.7, 2.1, 2.3, 2.4, 2.6, 2.7, 3.8, 4.9],
  /** EU cold weight already deducts 2 % from warm weight (2017/1182 Art. 14(3)). */
  coldWeightDeductionPct: 2,
  /** Approximate daily loss after day ~3 (SDSU: "approximately 0.1 % of initial weight each day"). */
  dailyAfterDay3Pct: 0.1,
  sourceIds: ['sdsu-ageing', 'eu-2017-1182'],
};

/** Irish home-kill calibration point (Teagasc, 2023). */
export const HOME_KILL_CALIBRATION = {
  liveKg: 497,
  carcassKg: 245,
  meatKg: 143.2,
  estimatedGrade: { conformation: 'O-' as Conformation, fat: '4-' as FatClass },
  breed: 'hereford-x-dairy',
  sex: 'heifer',
  ageMonths: 20,
  cuts: [
    { name: 'Beef Mince', kg: 20 },
    { name: 'Burgers (≈9/kg)', kg: 23 },
    { name: 'Round Roast', kg: 18 },
    { name: 'Round Steak', kg: 11.2 },
    { name: 'Rib Steak', kg: 14.2 },
    { name: 'Sirloin', kg: 8 },
    { name: 'T-Bone', kg: 13 },
    { name: 'Pot Roast', kg: 4 },
    { name: 'Rib Roast', kg: 11 },
    { name: "Housekeeper's Cut", kg: 6.8 },
    { name: 'Stew Beef', kg: 12 },
    { name: 'Fillet', kg: 2 },
  ],
  sourceIds: ['teagasc-heifer'],
};

/** 2017/1184 Annex corrective factors (% of carcass weight) — also used to size fifth-quarter items removed at dressing. */
export const PRESENTATION_FACTORS_PCT = {
  kidneys: 0.4,
  kidneyFat: { fat1to2: 1.75, fat3: 2.5, fat4to5: 3.5 },
  pelvicFat: 0.5,
  liver: 2.5,
  thinSkirt: 0.4,
  thickSkirt: 0.4,
  tail: 0.4,
  spinalCord: 0.05,
  mammaryFat: 1.0,
  testicles: 0.3,
  codFat: 0.5,
  insideTopsideFat: 0.3,
  jugularFat: 0.3,
  sourceIds: ['eu-2017-1184', 'eu-2017-1182'],
};

/**
 * AHDB Beef Yield Guide muscle/cut weights, kg PER SIDE of the 303 kg (151.5 kg side) R4H reference carcass.
 * Used to check that muscle-based shares in regions.ts are kg ÷ kg (not mixed with % of carcass).
 */
export const AHDB_PER_SIDE_KG = {
  sideKg: 151.5,
  chuckRegion: 4.75 * 1.515 + 1.5 + 1.09 + 0.43, // chuck roll 7.19 + blade + underblade + underblade fillet
  denver: 2.36,
  chuckEyeCentre: 2.76,
  rumpRegion: 5.99 + 1.42, // D rump + rump tail
  rumpCap: 1.44,
  primeRump: 2.54,
  rumpBistro: 1.18,
  rumpTail: 1.42,
  loinRegion: 6.8 + 2.91,
  striploin: 6.8,
  fillet: 2.91,
  middleFillet: 1.25,
  filletTail: 0.29,
  silverside: 9.66,
  salmonCut: 2.8,
  thinFlank: 10.09,
  bavette: 1.44,
  gooseSkirt: 0.77,
  insideSkirt: 0.72,
  sourceIds: ['ahdb-yield-guide'],
};

/**
 * Cull cow kill-out by body condition. USDA cull grades (UNL CAP 2021) give dressing on hot carcass incl.
 * kidney/pelvic/heart fat and shrunk live weight: Breaker 52–54, Boner 50–52, Lean 45–49, Light 40–46 %.
 * Irish basis removes kidney & pelvic fat before weighing (2017/1182 Art. 6(3); Alberta: US dressing runs
 * 2.5–3.0 points higher for that reason) and uses cold weight = warm − 2 % (≈ 1 point at ~50 %).
 * Irish-basis value = USDA midpoint − 2.75 − 1.0. Validation: Newford beef cull cows (O=4−) 48 %;
 * Minchin 2009 Irish cull cows (n = 2163, mixed dairy/beef) 324 kg / 699 kg = 46.4 %.
 */
export const COW_KILLOUT_BY_FAT = {
  usdaGrades: [
    { grade: 'Light', fatClasses: ['1-', '1', '1+'] as FatClass[], usdaRangePct: [40, 46], irishPct: 39.3 },
    { grade: 'Lean', fatClasses: ['2-', '2', '2+'] as FatClass[], usdaRangePct: [45, 49], irishPct: 43.3 },
    { grade: 'Boner', fatClasses: ['3-', '3', '3+'] as FatClass[], usdaRangePct: [50, 52], irishPct: 47.3 },
    { grade: 'Breaker', fatClasses: ['4-', '4', '4+', '5-', '5', '5+'] as FatClass[], usdaRangePct: [52, 54], irishPct: 49.3 },
  ],
  usToIrishPts: -3.75,
  validation: [
    { label: 'Newford suckler cull cows, O=4−', killOutPct: 48, sourceIds: ['teagasc-newford'] },
    { label: 'Irish cull cows (Minchin 2009), 324 / 699 kg', killOutPct: 46.4, sourceIds: ['moreira-2021', 'minchin-2009'] },
  ],
  sourceIds: ['unl-cull-grades', 'alberta-dressing', 'eu-2017-1182', 'teagasc-newford', 'moreira-2021'],
};

/** Sourced kill-out adjustments used to derive values with no direct Irish measurement. */
export const KILLOUT_ADJUSTMENTS = {
  heiferVsSteerPts: { value: -1.75, range: [-2.0, -1.5], sourceIds: ['alberta-dressing'], note: 'Heifers dress 1.5–2.0 points lower than steers at similar fat' },
  dairyVsBeefPts: { value: -3, sourceIds: ['alberta-dressing', 'umaine-1072'], note: 'Dairy cattle dress about 3 points lower than beef cattle' },
  jerseyCrossVsHfPts: { value: -1.0, sourceIds: ['teagasc-5923'], note: 'Jersey × HF males 485 vs HF 495 g/kg' },
  jerseyVsHolsteinRelative: { value: -0.051, sourceIds: ['jersey-bull-calves'], note: 'German Holstein bull calves dressed 5.1 % (relative) higher than Jersey' },
  hotToColdPct: { value: -2, sourceIds: ['eu-2017-1182'] },
};
