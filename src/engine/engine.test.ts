import { describe, expect, it } from 'vitest';
import { BREEDS } from '../data/breeds';
import { DEFAULT_ANIMAL, DEFAULT_PARTS, DEFAULT_PREFS } from '../data/defaults';
import { HOME_KILL_CALIBRATION } from '../data/grading';
import { CUTTING_LOSS_PCT, hangingLossPctOfCold } from '../data/model-constants';
import { REGION_BY_ID, REGIONS } from '../data/regions';
import type { Animal, Sex } from '../model/types';
import { composition, gridValue, YG_MEAT_PCT } from './carcass';
import { compute } from './compute';
import { resolveSelections } from './selections';
import type { AppState } from './state';

const base = (animal: Partial<Animal> = {}, rest: Partial<AppState> = {}): AppState => ({
  animal: { ...DEFAULT_ANIMAL, ...animal },
  selections: {},
  prefs: DEFAULT_PREFS,
  partRequests: DEFAULT_PARTS,
  ...rest,
});

/** AHDB Beef Yield Guide reference: 303 kg R4H (4H = 4+ on the 15-point scale), 14 days' maturation. */
const reference = (selections = {}) =>
  base({ weightBasis: 'carcass', weightKg: 303, conformation: 'R', fatClass: '4+', hangingDays: 14, share: 'whole' }, { selections });

describe('hanging loss', () => {
  it('14 days of hanging + cutting loss reproduces AHDB drip/cutting loss 2.61 %', () => {
    expect(hangingLossPctOfCold(14) + CUTTING_LOSS_PCT.value).toBeCloseTo(2.61, 2);
  });
  it('no loss beyond the EU 2 % cold-weight deduction in the first days, then monotonic', () => {
    expect(hangingLossPctOfCold(2)).toBe(0);
    let prev = 0;
    for (let d = 0; d <= 42; d++) {
      const h = hangingLossPctOfCold(d);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });
});

describe('grade scaling', () => {
  it('grid interpolation hits grid points exactly', () => {
    expect(gridValue([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]], 8, 12).value).toBe(8);
  });
  it('reference grade (R4H) at 14 days: meat = grid saleable 68.7 − hanging loss', () => {
    const c = composition({ conformation: 'R', fatClass: '4+', fromUser: true }, 14);
    expect(c.commercialMeatPct).toBeCloseTo(68.7 - hangingLossPctOfCold(14), 9);
    expect(c.meatPct).toBeLessThan(c.commercialMeatPct);
    expect(c.fatPct).toBeCloseTo(13.2, 9);
    expect(c.boneFactor).toBeCloseTo(1, 9);
    expect(c.meatPct + c.fatPct + c.bonePct + c.hangingLossPct + c.cuttingLossPct + c.homeTrimPct).toBeCloseTo(100, 9);
    expect(c.gridClamped).toBe(false);
  });
  it('better conformation and less fat give more meat', () => {
    const lean = composition({ conformation: 'U-', fatClass: '2', fromUser: true }, 14);
    const fat = composition({ conformation: 'P', fatClass: '4+', fromUser: true }, 14);
    expect(lean.meatPct).toBeGreaterThan(fat.meatPct);
    expect(lean.fatPct).toBeLessThan(fat.fatPct);
  });
  it('flags grades outside the grid', () => {
    expect(composition({ conformation: 'E', fatClass: '3', fromUser: true }, 14).gridClamped).toBe(true);
    expect(composition({ conformation: 'R', fatClass: '5', fromUser: true }, 14).gridClamped).toBe(true);
  });
});

describe('reference distribution (AHDB Yield Guide shares)', () => {
  it('each region keeps its Yield Guide share of total meat', () => {
    const r = compute(reference({ topside: 'roasts' }));
    const topside = r.lines.find((l) => l.productId === 'topside-roast')!;
    const regionPlusTrimKg = (303 * YG_MEAT_PCT) / 100 * r.comp.meatFactor;
    expect(topside.weightKg / 0.95 / regionPlusTrimKg).toBeCloseTo(6.53 / YG_MEAT_PCT, 9);
    expect(regionPlusTrimKg).toBeCloseTo((303 * r.comp.meatPct) / 100, 9);
  });
  it('kill-out is bypassed when carcass weight is entered', () => {
    expect(compute(reference()).balance.carcassKg).toBe(303);
  });
});

describe('mass closure', () => {
  const sexes: Sex[] = ['steer', 'heifer', 'bull', 'cow'];
  const cases = BREEDS.flatMap((b) => sexes.flatMap((sex) => (['whole', 'half'] as const).flatMap((share) => [7, 14, 21, 35].map((hangingDays) => ({ breed: b.id, sex, share, hangingDays })))));
  it.each(cases)('$breed $sex $share $hangingDays d', (c) => {
    const r = compute(base({ ...c, weightBasis: 'live', weightKg: 560 }));
    const b = r.balance;
    const sum = b.meatKg + b.fatPoolKg + b.marrowKg + b.soupBoneKg + b.hangingLossKg + b.cuttingLossKg + b.butcherTrimKg;
    expect(sum).toBeCloseTo(b.carcassKg, 6);
    expect(b.carcassKg).toBeCloseTo(r.wholeCarcassKg * (c.share === 'half' ? 0.5 : 1), 6);
    expect(b.fatPoolKg).toBeGreaterThan(0);
    expect(b.soupBoneKg).toBeGreaterThanOrEqual(0);
  });

  it('holds for every option of every region, mince leanness and trim split', () => {
    for (const region of REGIONS)
      for (const o of region.options)
        for (const leanPct of [80, 85, 90, 95] as const) {
          const s = { ...DEFAULT_PREFS, mince: { ...DEFAULT_PREFS.mince, leanPct }, trimSplit: { mince: 40, burgers: 40, diced: 20 } };
          const r = compute(base({}, { selections: { [region.id]: o.id }, prefs: s }));
          const b = r.balance;
          expect(b.meatKg + b.fatPoolKg + b.marrowKg + b.soupBoneKg + b.hangingLossKg + b.cuttingLossKg + b.butcherTrimKg, `${region.id}/${o.id}/${leanPct}`).toBeCloseTo(b.carcassKg, 6);
        }
  });

  it('take-home meat is 55–75 % of carcass for typical animals', () => {
    for (const b of BREEDS) {
      const r = compute(base({ breed: b.id }));
      const pct = (r.balance.meatKg / r.balance.carcassKg) * 100;
      expect(pct, b.id).toBeGreaterThan(55);
      expect(pct, b.id).toBeLessThan(75);
    }
  });
});

describe('selections', () => {
  it('defaults resolve to one leaf per region (plus parts)', () => {
    const r = resolveSelections({});
    for (const region of REGIONS) expect(r.selections[region.id]).toBe(region.defaultOption);
  });
  it('tomahawk rules out short ribs on the plate and falls back with a notice', () => {
    const r = resolveSelections({ 'fore-rib': 'tomahawk', plate: 'short-ribs' });
    expect(r.selections.plate).toBe('mince');
    expect(r.notices).toHaveLength(1);
  });
  it('T-bone has no separate sirloin/fillet leaves', () => {
    const r = resolveSelections({ loin: 't-bone' });
    expect(r.leaves.filter((l) => l.region.id === 'loin').map((l) => l.option.id)).toEqual(['t-bone']);
  });
  it('split parts receive their shares', () => {
    const r = resolveSelections({ loin: 'separate' });
    expect(r.leaves.filter((l) => l.region.id === 'loin').reduce((s, l) => s + l.share, 0)).toBeCloseTo(1, 9);
  });
});

describe('sizes and counts', () => {
  it('steak size never changes with share; counts halve', () => {
    const whole = compute(base({ share: 'whole' }, { selections: { 'fore-rib': 'ribeye' } })).lines.find((l) => l.productId === 'ribeye-steak')!;
    const half = compute(base({ share: 'half' }, { selections: { 'fore-rib': 'ribeye' } })).lines.find((l) => l.productId === 'ribeye-steak')!;
    expect(half.eachKg! / whole.eachKg!).toBeCloseTo(1, 1);
    expect(half.count! / whole.count!).toBeCloseTo(0.5, 1);
  });
  it('ribeye at 356 kg and 2.54 cm is the USDA 361 g', () => {
    const r = compute(base({ weightBasis: 'carcass', weightKg: 356 }, { selections: { 'fore-rib': 'ribeye' }, prefs: { ...DEFAULT_PREFS, steakThicknessCm: 2.5 } }));
    const l = r.lines.find((x) => x.productId === 'ribeye-steak')!;
    // count rounding moves eachKg a little off the nominal size
    expect(l.eachKg! * 1000).toBeGreaterThan(361 * (2.5 / 2.54) * 0.93);
    expect(l.eachKg! * 1000).toBeLessThan(361 * (2.5 / 2.54) * 1.07);
  });
  it('whole AHDB pieces count two per carcass (one per side), one on a half share', () => {
    const sel = { loin: 'separate', 'loin/fillet': 'whole' };
    expect(compute(reference(sel)).lines.find((l) => l.productId === 'whole-fillet')!.count).toBe(2);
    const half = { ...reference(sel), animal: { ...reference(sel).animal, share: 'half' as const } };
    expect(compute(half).lines.find((l) => l.productId === 'whole-fillet')!.count).toBe(1);
  });
  it('weight-only products have no count', () => {
    const l = compute(base({}, { selections: { 'fore-shin': 'osso-buco' } })).lines.find((x) => x.productId === 'fore-osso-buco')!;
    expect(l.count).toBeUndefined();
    expect(l.weightOnly).toBe(true);
  });
  it('roast joints are sized for the family', () => {
    const small = compute(base({}, { prefs: { ...DEFAULT_PREFS, familySize: 2 }, selections: { topside: 'roasts' } })).lines.find((l) => l.productId === 'topside-roast')!;
    const big = compute(base({}, { prefs: { ...DEFAULT_PREFS, familySize: 8 }, selections: { topside: 'roasts' } })).lines.find((l) => l.productId === 'topside-roast')!;
    expect(small.eachKg!).toBeCloseTo(0.5, 0);
    expect(big.eachKg!).toBeCloseTo(2, 0);
  });
});

describe('bone and fat pools', () => {
  it('bone-in cuts reduce soup bones', () => {
    const boned = compute(base({}, { selections: { loin: 'separate', 'fore-rib': 'ribeye' } })).balance;
    const boneIn = compute(base({}, { selections: { loin: 't-bone', 'fore-rib': 'on-bone' } })).balance;
    expect(boneIn.soupBoneKg).toBeLessThan(boned.soupBoneKg);
    expect(boneIn.boneInCutsKg).toBeGreaterThan(boned.boneInCutsKg);
  });
  it('hind-shin osso buco uses the tibia, reducing marrow bones', () => {
    const a = compute(base({}, { selections: { 'hind-shin': 'diced' } })).balance;
    const b = compute(base({}, { selections: { 'hind-shin': 'osso-buco' } })).balance;
    expect(b.marrowKg).toBeLessThan(a.marrowKg);
  });
  it('leaner mince sheds fat into the fat pool', () => {
    const p = (leanPct: 80 | 95) => compute(base({}, { prefs: { ...DEFAULT_PREFS, mince: { ...DEFAULT_PREFS.mince, leanPct } } })).balance.fatPoolKg;
    expect(p(95)).toBeGreaterThan(p(80));
  });
});

describe('parts', () => {
  it('SRM is never requestable for cattle over 12 months', () => {
    const r = compute(base({ ageMonths: 24 }, { partRequests: [{ partId: 'skull-brain-eyes', want: true }] }));
    const p = r.parts.find((x) => x.info.part.id === 'skull-brain-eyes')!;
    expect(p.info.status).toBe('srm');
    expect(p.wanted).toBe(false);
  });
  it('pizzle only for males; horns only when horned', () => {
    const heifer = compute(base({ sex: 'heifer', horned: false }));
    expect(heifer.parts.some((p) => p.info.part.id === 'pizzle-testicles')).toBe(false);
    expect(heifer.parts.some((p) => p.info.part.id === 'horns')).toBe(false);
  });
  it('half share: single items only when taken whole', () => {
    const none = compute(base({ share: 'half' }, { partRequests: [{ partId: 'tongue', want: true }] })).parts.find((p) => p.info.part.id === 'tongue')!;
    const whole = compute(base({ share: 'half' }, { partRequests: [{ partId: 'tongue', want: true, takeWhole: true }] })).parts.find((p) => p.info.part.id === 'tongue')!;
    expect(none.kg).toBe(0);
    expect(whole.kg).toBeGreaterThan(0);
  });
  it('liver is 1.31 % of live weight', () => {
    const r = compute(base({ weightKg: 600, weightBasis: 'live' }));
    expect(r.parts.find((p) => p.info.part.id === 'liver')!.kg).toBeCloseTo(7.86, 2);
  });
});

describe('advisories', () => {
  it('organic sale without certified abattoir is blocked', () => {
    const r = compute(base({ organic: { certified: true, sellingAsOrganic: true, abattoirCovered: true, butcherCovered: false } }));
    expect(r.advisories[0].severity).toBe('blocked');
  });
  it('Jersey gets the yellow-fat note', () => {
    expect(compute(base({ breed: 'jersey', sex: 'cow', ageMonths: 60 })).advisories.some((x) => x.id === 'jersey-fat')).toBe(true);
  });
});

describe('Teagasc home-kill heifer calibration (the realistic factor is derived from this heifer, so this confirms it, not validates it)', () => {
  it('commercial basis is 7–10 points high; the realistic estimate lands near the actual 143.2 kg', () => {
    const c = HOME_KILL_CALIBRATION;
    const r = compute(
      base(
        { breed: 'hereford-x-dairy', sex: 'heifer', ageMonths: c.ageMonths, weightBasis: 'carcass', weightKg: c.carcassKg, conformation: c.estimatedGrade.conformation, fatClass: c.estimatedGrade.fat, hangingDays: 21 },
        { selections: { loin: 't-bone', 'fore-rib': 'on-bone', topside: 'split' } },
      ),
    );
    const [realistic, commercial] = r.balance.meatRangeKg;
    const gap = ((commercial - c.meatKg) / c.carcassKg) * 100;
    console.info(`Teagasc heifer: realistic ${realistic.toFixed(1)} kg, commercial ${commercial.toFixed(1)} kg, actual ${c.meatKg} kg, commercial gap ${gap.toFixed(1)} pts`);
    expect(gap).toBeGreaterThan(3);
    expect(gap).toBeLessThan(14);
    expect(Math.abs(realistic - c.meatKg) / c.meatKg).toBeLessThan(0.05);
    expect(r.balance.meatKg).toBe(realistic);
  });
});

it('region lookup sanity', () => {
  expect(REGION_BY_ID.loin).toBeDefined();
});

describe('primal / trim split agrees with the AHDB 2010 grid', () => {
  // The grid counts flank as lean trim; the Yield Guide lists thin flank and the short-rib plate as regions.
  // Compared like-for-like, the Yield Guide primal share must sit within 2 points of every grid cell.
  it('Yield Guide primals (excl. thin flank & plate) ≈ grid trimmed primals ÷ saleable', async () => {
    const { AHDB_GRID } = await import('../data/grading');
    const { TRIM_POOL_PCT_OF_CARCASS } = await import('../data/regions');
    const flankAndPlate = REGION_BY_ID['thin-flank'].meatPctOfCarcass.value + REGION_BY_ID.plate.meatPctOfCarcass.value;
    const ygPrimalShare = ((YG_MEAT_PCT - TRIM_POOL_PCT_OF_CARCASS.value - flankAndPlate) / YG_MEAT_PCT) * 100;
    for (let i = 0; i < AHDB_GRID.saleableYieldPct.length; i++)
      for (let j = 0; j < AHDB_GRID.fatCols.length; j++) {
        const gridShare = (AHDB_GRID.trimmedPrimalPct[i][j] / AHDB_GRID.saleableYieldPct[i][j]) * 100;
        expect(Math.abs(ygPrimalShare - gridShare), `${AHDB_GRID.confRows[i]} ${AHDB_GRID.fatCols[j]}`).toBeLessThan(2);
      }
  });
});

describe('steak thickness drives the count', () => {
  it('thicker steaks: fewer, heavier, same total weight', () => {
    const at = (cm: number) => compute(base({}, { selections: { 'fore-rib': 'ribeye' }, prefs: { ...DEFAULT_PREFS, steakThicknessCm: cm } })).lines.find((l) => l.productId === 'ribeye-steak')!;
    const thin = at(2);
    const thick = at(4);
    expect(thick.count!).toBeLessThan(thin.count!);
    expect(thick.eachKg!).toBeGreaterThan(thin.eachKg!);
    expect(thick.weightKg).toBeCloseTo(thin.weightKg, 9);
  });
  it('a per-cut override beats the standard thickness', () => {
    const r = compute(base({}, { selections: { 'fore-rib': 'ribeye' }, prefs: { ...DEFAULT_PREFS, thicknessOverrides: { 'ribeye-steak': 4 } } }));
    expect(r.lines.find((l) => l.productId === 'ribeye-steak')!.thicknessCm).toBe(4);
  });
});

describe('roasts depend on the size of the animal', () => {
  it('half-share Jersey cow, family of 8: small joints are flagged with a tip', () => {
    const r = compute(base({ breed: 'jersey', sex: 'cow', ageMonths: 72, weightKg: 420, share: 'half' }, { selections: { 'thick-flank': 'pot-roast', feather: 'braise' }, prefs: { ...DEFAULT_PREFS, familySize: 8 } }));
    const feather = r.lines.find((l) => l.productId === 'feather-blade-joint')!;
    expect(feather.undersized).toBe(true);
    expect(feather.feeds!).toBeLessThan(8);
    expect(r.advisories.some((a) => a.id === 'roast-undersized')).toBe(true);
  });
  it('a typical steer, family of 4: joints feed about 4', () => {
    const l = compute(base({}, { selections: { topside: 'roasts' } })).lines.find((x) => x.productId === 'topside-roast')!;
    expect(l.undersized).toBe(false);
    expect(l.feeds).toBeGreaterThanOrEqual(3);
    expect(l.feeds).toBeLessThanOrEqual(5);
  });
  it('craft-butcher trim is not returnable fat', () => {
    const r = compute(base());
    expect(r.balance.butcherTrimKg).toBeGreaterThan(0);
    expect(r.balance.fatPoolKg / r.balance.carcassKg).toBeLessThan(0.12);
  });
});

describe('kill-out', () => {
  it('at the default grade, kill-out equals the stored breed value for every breed and sex', () => {
    for (const b of BREEDS)
      for (const sex of ['steer', 'heifer', 'bull', 'cow'] as Sex[]) {
        const r = compute(base({ breed: b.id, sex, conformation: undefined, fatClass: undefined }));
        expect(r.killOutPct, `${b.id} ${sex}`).toBeCloseTo(b.killOutPct[sex].value, 9);
      }
  });
  it('a fatter cow kills out higher; a leaner one lower', () => {
    const ko = (fatClass: '2' | '3' | '4') => compute(base({ breed: 'jersey', sex: 'cow', fatClass })).killOutPct;
    expect(ko('2')).toBeLessThan(ko('3'));
    expect(ko('3')).toBeLessThan(ko('4'));
  });
});

it('a light live weight suggests it may be the carcass weight', () => {
  expect(compute(base({ breed: 'jersey', sex: 'cow', ageMonths: 72, weightKg: 350 })).advisories.some((x) => x.id === 'light-animal')).toBe(true);
  expect(compute(base({ breed: 'jersey', sex: 'cow', ageMonths: 72, weightKg: 350, weightBasis: 'carcass' })).advisories.some((x) => x.id === 'light-animal')).toBe(false);
});

describe('anatomical count bounds (per side)', () => {
  const animals = BREEDS.flatMap((b) => (['steer', 'heifer', 'bull', 'cow'] as Sex[]).map((sex) => ({ breed: b.id, sex })));
  const count = (sel: Record<string, string>, id: string, a: Partial<Animal>, cm?: number) =>
    compute(base({ ...a, share: 'half' }, { selections: sel, prefs: { ...DEFAULT_PREFS, ...(cm ? { thicknessOverrides: { [id]: cm } } : {}) } })).lines.find((l) => l.productId === id)?.count ?? 0;
  it.each(animals)('$breed $sex: bone-in rib steaks ≤ 4 (ribs 7–10) at 5 cm', (a) => {
    expect(count({ 'fore-rib': 'cote' }, 'cote-de-boeuf', a, 5)).toBeLessThanOrEqual(4);
    expect(count({ 'fore-rib': 'tomahawk' }, 'tomahawk', a, 5)).toBeLessThanOrEqual(4);
  });
  it.each(animals)('$breed $sex: one of each whole muscle; ≤ 3 short ribs', (a) => {
    expect(count({ loin: 'separate', 'loin/fillet': 'whole' }, 'whole-fillet', a)).toBe(1);
    expect(count({ rump: 'split' }, 'picanha-whole', a)).toBe(1);
    expect(count({ rump: 'split' }, 'tri-tip', a)).toBe(1);
    expect(count({ 'thin-flank': 'bavette' }, 'bavette', a)).toBe(1);
    expect(count({ plate: 'short-ribs' }, 'short-ribs', a)).toBeLessThanOrEqual(3);
  });
});
