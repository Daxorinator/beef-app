import { describe, expect, it } from 'vitest';
import { BREEDS } from '../data/breeds';
import { DEFAULT_ANIMAL, DEFAULT_PARTS, DEFAULT_PREFS } from '../data/defaults';
import { HOME_KILL_CALIBRATION } from '../data/grading';
import { inch, inchLabel } from '../data/thickness';
import { CUTTING_LOSS_PCT, hangingLossPctOfCold } from '../data/model-constants';
import { REGION_BY_ID, REGIONS } from '../data/regions';
import type { Animal, Sex } from '../model/types';
import { composition, gridValue, YG_MEAT_PCT } from './carcass';
import { compute } from './compute';
import { resolveSelections } from './selections';
import type { AppState } from './state';

/** Every fore rib as boneless rib steaks. */
const ALL_STEAKS = { allocations: { 'fore-rib': {} } };

const base = (animal: Partial<Animal> = {}, rest: Partial<AppState> = {}): AppState => ({
  animal: { ...DEFAULT_ANIMAL, ...animal },
  selections: {},
  prefs: DEFAULT_PREFS,
  partRequests: DEFAULT_PARTS,
  allocations: {},
  ...rest,
});

/** AHDB Beef Yield Guide reference: 303 kg R4H (4H = 4+ on the 15-point scale), 14 days' maturation. */
const reference = (selections = {}, allocations: AppState['allocations'] = {}) =>
  base({ weightBasis: 'carcass', weightKg: 303, conformation: 'R', fatClass: '4+', hangingDays: 14, share: 'whole' }, { selections, allocations });

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
    const r = compute(reference({}, { topside: { roasts: 99 } }));
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
    const r = compute(base({}, { selections: { plate: 'short-ribs' }, allocations: { 'fore-rib': { tomahawk: 1 } } })).resolved;
    expect(r.selections.plate).toBe('mince');
    expect(r.notices).toHaveLength(1);
  });
  it('the loin is a single planner leaf', () => {
    const r = resolveSelections({});
    expect(r.leaves.filter((l) => l.region.id === 'loin').map((l) => l.option.id)).toEqual(['plan']);
  });
  it('split parts receive their shares', () => {
    const r = resolveSelections({ rump: 'split' });
    expect(r.leaves.filter((l) => l.region.id === 'rump').reduce((s, l) => s + l.share, 0)).toBeCloseTo(1, 9);
  });
});

describe('sizes and counts', () => {
  it('steak size never changes with share; counts halve', () => {
    const whole = compute(base({ share: 'whole' }, ALL_STEAKS)).lines.find((l) => l.productId === 'ribeye-steak')!;
    const half = compute(base({ share: 'half' }, ALL_STEAKS)).lines.find((l) => l.productId === 'ribeye-steak')!;
    expect(half.eachKg! / whole.eachKg!).toBeCloseTo(1, 1);
    expect(half.count! / whole.count!).toBeCloseTo(0.5, 1);
  });
  it('ribeye at 356 kg and 1" is the USDA 361 g', () => {
    const r = compute(base({ weightBasis: 'carcass', weightKg: 356 }, { ...ALL_STEAKS, prefs: { ...DEFAULT_PREFS, steakThicknessCm: inch(1) } }));
    const l = r.lines.find((x) => x.productId === 'ribeye-steak')!;
    // count rounding moves eachKg a little off the nominal size
    expect(l.eachKg! * 1000).toBeGreaterThan(361 * 0.93);
    expect(l.eachKg! * 1000).toBeLessThan(361 * 1.07);
  });
  it('whole AHDB pieces count two per carcass (one per side), one on a half share', () => {
    const whole = { ...reference({ rump: 'split' }), allocations: { loin: { wholeFillets: 99 } } };
    expect(compute(whole).lines.find((l) => l.productId === 'whole-fillet')!.count).toBe(2);
    expect(compute(whole).lines.find((l) => l.productId === 'tri-tip')!.count).toBe(2);
    const half = { ...whole, animal: { ...whole.animal, share: 'half' as const } };
    expect(compute(half).lines.find((l) => l.productId === 'whole-fillet')!.count).toBe(1);
  });
  it('weight-only products have no count', () => {
    const l = compute(base({}, { selections: { 'fore-shin': 'osso-buco' } })).lines.find((x) => x.productId === 'fore-osso-buco')!;
    expect(l.count).toBeUndefined();
    expect(l.weightOnly).toBe(true);
  });
  it('roast joints are sized for the family', () => {
    const small = compute(base({}, { prefs: { ...DEFAULT_PREFS, familySize: 2 }, allocations: { topside: { roasts: 99 } } })).lines.find((l) => l.productId === 'topside-roast')!;
    const big = compute(base({}, { prefs: { ...DEFAULT_PREFS, familySize: 8 }, allocations: { topside: { roasts: 99 } } })).lines.find((l) => l.productId === 'topside-roast')!;
    expect(small.eachKg!).toBeCloseTo(0.5, 0);
    expect(big.eachKg!).toBeCloseTo(2, 0);
  });
});

describe('bone and fat pools', () => {
  it('bone-in cuts reduce soup bones', () => {
    const boned = compute(base({}, { allocations: { 'fore-rib': {} } })).balance;
    const boneIn = compute(base({}, { allocations: { 'fore-rib': { 'roast-on-bone': 99 }, loin: { tbones: 99 } } })).balance;
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
        { allocations: { 'fore-rib': { 'roast-on-bone': 99 }, loin: { tbones: 99 } } },
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
    const at = (cm: number) => compute(base({}, { ...ALL_STEAKS, prefs: { ...DEFAULT_PREFS, steakThicknessCm: cm } })).lines.find((l) => l.productId === 'ribeye-steak')!;
    const thin = at(inch(0.75));
    const thick = at(inch(1.5));
    expect(thick.count!).toBeLessThan(thin.count!);
    expect(thick.eachKg!).toBeGreaterThan(thin.eachKg!);
    expect(thick.weightKg).toBeCloseTo(thin.weightKg, 9);
  });
  it('a per-cut override beats the standard thickness', () => {
    const r = compute(base({}, { ...ALL_STEAKS, prefs: { ...DEFAULT_PREFS, thicknessOverrides: { 'ribeye-steak': inch(1.5) } } }));
    expect(r.lines.find((l) => l.productId === 'ribeye-steak')!.thicknessCm).toBe(inch(1.5));
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
    const l = compute(base({}, { allocations: { topside: { roasts: 99 } } })).lines.find((x) => x.productId === 'topside-roast')!;
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
  const count = (sel: Record<string, string>, id: string, a: Partial<Animal>, ribs?: Record<string, number>) =>
    compute(base({ ...a, share: 'half' }, { selections: sel, allocations: ribs ? { 'fore-rib': ribs } : {} })).lines.find((l) => l.productId === id)?.count ?? 0;
  it.each(animals)('$breed $sex: exactly one côte or tomahawk per rib, 4 ribs per side', (a) => {
    expect(count({}, 'cote-de-boeuf', a, { cote: 99 })).toBe(4);
    expect(count({}, 'tomahawk', a, { tomahawk: 99 })).toBe(4);
  });
  it.each(animals)('$breed $sex: one of each whole muscle; ≤ 3 short ribs', (a) => {
    expect(compute(base({ ...a, share: 'half' }, { allocations: { loin: { wholeFillets: 9 } } })).lines.find((l) => l.productId === 'whole-fillet')!.count).toBe(1);
    expect(count({ rump: 'split' }, 'picanha-whole', a)).toBe(1);
    expect(count({ rump: 'split' }, 'tri-tip', a)).toBe(1);
    expect(count({ 'thin-flank': 'bavette' }, 'bavette', a)).toBe(1);
    expect(count({ plate: 'short-ribs' }, 'short-ribs', a)).toBeLessThanOrEqual(3);
  });
});

describe('thickness in inches', () => {
  it('labels inch steps', () => {
    expect([0.125, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5].map((x) => inchLabel(inch(x)))).toEqual(['⅛"', '¼"', '½"', '¾"', '1"', '1¼"', '1½"', '2"', '2½"']);
  });
  it('every cut default is one of its allowed inch steps', () => {
    for (const region of REGIONS)
      for (const o of region.options)
        for (const p of [...(o.products ?? []), ...(o.parts ?? []).flatMap((pt) => pt.options.flatMap((oo) => oo.products ?? []))])
          if (p.defaultThicknessCm !== undefined && p.allowedThicknessCm) expect(p.allowedThicknessCm, p.id).toContain(p.defaultThicknessCm);
  });
});

describe('joints + the rest (topside, thick flank, chuck eye)', () => {
  const run = (req: Record<string, number> | undefined, share: 'whole' | 'half' = 'whole') =>
    compute(base({ share }, { allocations: req === undefined ? {} : { topside: req } }));
  const line = (r: ReturnType<typeof run>, id: string) => r.lines.find((l) => l.productId === id);
  const topsideKg = (r: ReturnType<typeof run>) => (r.balance.carcassKg * REGION_BY_ID.topside.meatPctOfCarcass.value * r.comp.meatFactor) / 100;
  it('the chosen number of joints is what you get, and the rest becomes round steaks', () => {
    expect(line(run({ roasts: 2, rest: 0 }), 'topside-roast')!.count).toBe(2);
    expect(line(run({ roasts: 3, rest: 0 }), 'topside-roast')!.count).toBe(3);
    expect(line(run({ roasts: 2, rest: 0 }), 'topside-round-steak')!.count!).toBeGreaterThan(line(run({ roasts: 3, rest: 0 }), 'topside-round-steak')!.count!);
  });
  it('0 joints gives all round steaks at the full-muscle yield; max gives no steaks', () => {
    const none = run({ roasts: 0, rest: 0 });
    expect(line(none, 'topside-roast')).toBeUndefined();
    expect(line(none, 'topside-round-steak')!.weightKg).toBeCloseTo(topsideKg(none) * 0.729, 9);
    const max = run({ roasts: 99, rest: 0 });
    expect(line(max, 'topside-round-steak')).toBeUndefined();
    expect(line(max, 'topside-roast')!.count).toBe(max.jointPlans.find((j) => j.path === 'topside')!.maxRoasts);
  });
  it('the rest can be minute steaks, diced or mince', () => {
    expect(line(run({ roasts: 1, rest: 1 }), 'minute-steak')).toBeDefined();
    expect(line(run({ roasts: 1, rest: 2 }), 'topside-diced')).toBeDefined();
    const mince = run({ roasts: 1, rest: 3 });
    expect(mince.lines.filter((l) => l.regionId === 'topside').map((l) => l.productId)).toEqual(['topside-roast']);
  });
  it('defaults: topside half joints / half round steak; thick flank all joints; chuck eye all joints', () => {
    const r = run(undefined);
    expect(r.jointPlans.find((j) => j.path === 'topside')!.roastShare).toBe(0.5);
    expect(r.jointPlans.find((j) => j.path === 'thick-flank')!.roastShare).toBe(1);
    expect(r.jointPlans.find((j) => j.path === 'chuck/eye')!.roastShare).toBe(1);
  });
  it('mass closes for any choice, whole and half', () => {
    for (const share of ['whole', 'half'] as const)
      for (const req of [undefined, { roasts: 0, rest: 0 }, { roasts: 1, rest: 1 }, { roasts: 2, rest: 2 }, { roasts: 99, rest: 3 }]) {
        const b = run(req, share).balance;
        expect(b.meatKg + b.fatPoolKg + b.marrowKg + b.soupBoneKg + b.hangingLossKg + b.cuttingLossKg + b.butcherTrimKg).toBeCloseTo(b.carcassKg, 6);
      }
  });
  it('chuck: each muscle has its own choice', () => {
    const r = compute(base({}, { selections: { 'chuck/denver': 'mince', 'chuck/rest': 'diced' }, allocations: { 'chuck/eye': { roasts: 1, rest: 0 } } }));
    const chuck = r.lines.filter((l) => l.regionId === 'chuck').map((l) => l.productId).sort();
    expect(chuck).toEqual(['chuck-diced', 'chuck-eye-braising', 'housekeepers-cut']);
  });
});

describe('fore rib, rib by rib', () => {
  const run = (plan: Record<string, number> | undefined, share: 'whole' | 'half' = 'whole', extra: Record<string, string> = {}) =>
    compute(base({ share }, { selections: { 'fore-rib': 'mix', ...extra }, allocations: plan ? { 'fore-rib': plan } : {} }));
  const line = (r: ReturnType<typeof run>, id: string) => r.lines.find((l) => l.productId === id);
  it('defaults: per side 2 ribs roasted on the bone, 1 côte, 1 rib of steaks', () => {
    const r = run(undefined);
    expect(r.allocations[0].plan).toEqual({ 'roast-on-bone': 4, rolled: 0, cote: 2, tomahawk: 0, steaks: 2 });
    expect(line(r, 'cote-de-boeuf')!.count).toBe(2);
    expect(line(r, 'cote-de-boeuf')!.thicknessCm).toBeUndefined();
  });
  it('the plan never exceeds the ribs available (8 whole, 4 half)', () => {
    const r = run({ 'roast-on-bone': 3, cote: 3, tomahawk: 3 }, 'half');
    expect(r.allocations[0].totalUnits).toBe(4);
    expect(Object.values(r.allocations[0].plan).reduce((s, n) => s + n, 0)).toBe(4);
    expect(r.allocations[0].plan).toMatchObject({ 'roast-on-bone': 3, cote: 1, tomahawk: 0, steaks: 0 });
  });
  it('all ribs to one use gives only that product, at its full-cut yield', () => {
    const ribs = (r: ReturnType<typeof run>) => r.lines.filter((l) => l.regionId === 'fore-rib').map((l) => l.productId);
    expect(ribs(run({}))).toEqual(['ribeye-steak']);
    expect(ribs(run({ 'roast-on-bone': 99 }))).toEqual(['rib-roast-bone-in']);
    const r = run({ rolled: 99 });
    const regionKg = (r.balance.carcassKg * REGION_BY_ID['fore-rib'].meatPctOfCarcass.value * r.comp.meatFactor) / 100;
    expect(line(r, 'rolled-rib')!.weightKg).toBeCloseTo(regionKg * 0.95, 9);
  });
  it('a tomahawk rib rules out bone-in short ribs; none leaves them allowed', () => {
    expect(run({ tomahawk: 1 }, 'whole', { plate: 'short-ribs' }).resolved.selections.plate).toBe('mince');
    expect(run({ cote: 2 }, 'whole', { plate: 'short-ribs' }).resolved.selections.plate).toBe('short-ribs');
  });
  it('joints are made of whole ribs and mass closes', () => {
    const r = run({ 'roast-on-bone': 4, rolled: 2, cote: 1, tomahawk: 1 });
    const roast = line(r, 'rib-roast-bone-in')!;
    expect(roast.cutNote).toMatch(/-rib joint/);
    const b = r.balance;
    expect(b.meatKg + b.fatPoolKg + b.marrowKg + b.soupBoneKg + b.hangingLossKg + b.cuttingLossKg + b.butcherTrimKg).toBeCloseTo(b.carcassKg, 6);
  });
});

describe('loin planner', () => {
  const plan = (req: Record<string, number>, share: 'whole' | 'half' = 'whole', prefs = DEFAULT_PREFS) =>
    compute(base({ share }, { selections: { loin: 'plan' }, allocations: { loin: req }, prefs }));
  const kgOf = (r: ReturnType<typeof plan>, ...ids: string[]) => r.lines.filter((l) => ids.includes(l.productId)).reduce((s, l) => s + l.weightKg, 0);
  const closes = (r: ReturnType<typeof plan>) => {
    const b = r.balance;
    expect(b.meatKg + b.fatPoolKg + b.marrowKg + b.soupBoneKg + b.hangingLossKg + b.cuttingLossKg + b.butcherTrimKg).toBeCloseTo(b.carcassKg, 6);
    expect(b.soupBoneKg).toBeGreaterThanOrEqual(0);
  };

  // Checks against the AHDB per-side kg directly (the old fixed loin options were checked equal before removal).
  const loinKg = (r: ReturnType<typeof plan>) => (r.balance.carcassKg * REGION_BY_ID.loin.meatPctOfCarcass.value * r.comp.meatFactor) / 100;
  it('empty plan: all sirloin as steaks, fillet (centre + head) as steaks, tail for stir-fry', () => {
    const r = plan({});
    const L = loinKg(r) / 9.71;
    expect(kgOf(r, 'sirloin-steak')).toBeCloseTo(6.8 * L * 0.85, 9);
    expect(kgOf(r, 'fillet-steak')).toBeCloseTo((1.25 + 1.04) * L * 0.94, 9);
    expect(kgOf(r, 'fillet-tail')).toBeCloseTo(0.29 * L, 9);
  });
  it('one whole fillet per side = fillet chain off (AHDB 2.58 of 2.91 kg)', () => {
    const r = plan({ wholeFillets: 2 });
    expect(kgOf(r, 'whole-fillet')).toBeCloseTo((2.58 * loinKg(r)) / 9.71, 9);
  });
  it('all on the bone uses nearly all of the short loin (whole steaks only)', () => {
    const r = plan({ tbones: 99 });
    const L = loinKg(r) / 9.71;
    const fullShortLoin = ((6.8 * 6) / 9 + 0.29 + 1.25) * L * 0.85;
    const lean = r.lines.filter((l) => l.productId === 't-bone' || l.productId === 'porterhouse').reduce((s, l) => s + l.weightKg - l.boneKg, 0);
    expect(lean / fullShortLoin).toBeGreaterThan(0.85);
    expect(lean / fullShortLoin).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('a couple of T-bones, a Wellington and the rest fillet steaks', () => {
    const r = plan({ tbones: 2, centreFillets: 1 });
    expect(r.lines.find((l) => l.productId === 't-bone')!.count).toBe(2);
    expect(r.lines.find((l) => l.productId === 'chateaubriand')!.count).toBe(1);
    expect(r.lines.find((l) => l.productId === 'fillet-steak')!.count!).toBeGreaterThan(0);
    // T-bones go on the side not reserved for the Wellington
    expect(r.loinPlans[0].plan.sides.map((s) => [s.reservation, s.tBones])).toEqual([['centre', 0], ['none', 2]]);
    closes(r);
  });
  it('a centre fillet side only allows front-section T-bones; a whole-fillet side none', () => {
    const half = plan({ centreFillets: 1, tbones: 99 }, 'half').loinPlans[0].plan;
    expect(half.sides[0].porterhouses).toBe(0);
    expect(half.used.tbones).toBe(half.sides[0].tBones);
    const whole = plan({ wholeFillets: 1, tbones: 5 }, 'half').loinPlans[0].plan;
    expect(whole.used.tbones).toBe(0);
    expect(whole.clamped.length).toBe(1);
  });
  it('2 centre fillets on a half share is clamped to 1, with a notice', () => {
    const r = plan({ centreFillets: 2 }, 'half');
    expect(r.loinPlans[0].plan.used.centreFillets).toBe(1);
    expect(r.advisories.some((a) => a.id === 'loin-clamped')).toBe(true);
  });
  it('thicker steaks leave room for fewer T-bones (clamped with a notice)', () => {
    const thin = plan({ tbones: 99 }).loinPlans[0].plan.max.onBone;
    const thick = plan({ tbones: 99 }, 'whole', { ...DEFAULT_PREFS, steakThicknessCm: inch(2) }).loinPlans[0].plan.max.onBone;
    expect(thick).toBeLessThan(thin);
  });
  it('mass closes and soup bones stay ≥ 0 across plans and shares', () => {
    for (const share of ['whole', 'half'] as const)
      for (const req of [{}, { tbones: 99 }, { tbones: 99, sirloinRoasts: 99, wingOnBone: 1 }, { wholeFillets: 2, sirloinRoasts: 2 }, { tbones: 3, centreFillets: 1, sirloinRoasts: 1 }] as Record<string, number>[])
        closes(plan(req, share));
  });
  it('sirloin joints: chosen count, on the bone uses the wing rib only', () => {
    const r = plan({ sirloinRoasts: 2 });
    expect(r.lines.find((l) => l.productId === 'sirloin-roast')!.count).toBe(2);
    const w = plan({ sirloinRoasts: 99, wingOnBone: 1 });
    expect(w.lines.find((l) => l.productId === 'wing-rib')!.count).toBe(w.loinPlans[0].plan.max.sirloinRoasts);
    expect(w.lines.find((l) => l.productId === 'sirloin-steak')).toBeDefined();
  });
});
