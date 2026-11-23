// Integrity checks on the researched constants (no business logic under test).
import { describe, expect, it } from 'vitest';
import type { CutOption, ProductSpec, Sourced } from '../model/types';
import { ADVISORIES } from './advisories';
import { BREEDS } from './breeds';
import { COOKING_BY_ID } from './cooking';
import { AHDB_PER_SIDE_KG as K, AHDB_REFERENCE_CARCASS } from './grading';
import { CUTTING_LOSS_PCT, DICED_LEAN_PCT, FREEZER_LITRES_PER_KG, HOME_BUTCHER_FACTOR, TRIM_POOL_LEAN_PCT } from './model-constants';
import { LOIN_PER_SIDE_KG as L, LOIN_PRODUCTS, TAIL_SECTION_OF_SHORT_LOIN, WING_SHARE_OF_STRIPLOIN } from './loin';
import { PART_BY_ID, PARTS } from './parts';
import { REFERENCE_BONE_PCT, REFERENCE_FAT_PCT, REGION_BY_ID, REGIONS, TRIM_POOL_PCT_OF_CARCASS } from './regions';
import { SOURCE_BY_ID } from './sources';

function walkOptions(options: CutOption[], visit: (o: CutOption, path: string) => void, path = ''): void {
  for (const o of options) {
    visit(o, `${path}/${o.id}`);
    for (const part of o.parts ?? []) walkOptions(part.options, visit, `${path}/${o.id}/${part.id}`);
  }
}

const allProducts: ProductSpec[] = [];
allProducts.push(...Object.values(LOIN_PRODUCTS));
for (const r of REGIONS) walkOptions(r.options, (o) => allProducts.push(...(o.products ?? []), ...(o.allocation?.uses.map((u) => u.product) ?? [])));

const sourced: Sourced[] = [
  ...REGIONS.flatMap((r) => [r.meatPctOfCarcass, ...(r.bonePctOfCarcass ? [r.bonePctOfCarcass] : [])]),
  ...PARTS.map((p) => p.reference.pct),
  ...BREEDS.flatMap((b) => [...Object.values(b.killOutPct), b.eyeMuscleCm2PerKg, ...Object.values(b.typicalCarcassKg)]),
  TRIM_POOL_PCT_OF_CARCASS,
  REFERENCE_BONE_PCT,
  REFERENCE_FAT_PCT,
  CUTTING_LOSS_PCT,
  FREEZER_LITRES_PER_KG,
  HOME_BUTCHER_FACTOR,
  TRIM_POOL_LEAN_PCT,
  DICED_LEAN_PCT,
  TAIL_SECTION_OF_SHORT_LOIN,
  WING_SHARE_OF_STRIPLOIN,
];

describe('sources', () => {
  it('every cited source id exists', () => {
    const cited = [
      ...sourced.flatMap((s) => s.sourceIds),
      ...ADVISORIES.flatMap((a) => a.sourceIds ?? []),
      ...AHDB_REFERENCE_CARCASS.sourceIds,
    ];
    const missing = [...new Set(cited)].filter((id) => !SOURCE_BY_ID[id]);
    expect(missing).toEqual([]);
  });
});

describe('regions', () => {
  it('ids are unique', () => {
    const ids = REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('product ids are unique', () => {
    const ids = allProducts.map((p) => p.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('every product fraction cites a source', () => {
    for (const p of allProducts) {
      expect(p.fractionRef?.sourceIds.length, p.id).toBeGreaterThan(0);
      for (const id of p.fractionRef!.sourceIds) expect(SOURCE_BY_ID[id], `${p.id}:${id}`).toBeDefined();
    }
  });

  it('every product references a known cooking profile', () => {
    expect(allProducts.filter((p) => !COOKING_BY_ID[p.cookingId]).map((p) => p.id)).toEqual([]);
  });

  it('product fractions within an option are 0..1 and sum to ≤ 1', () => {
    for (const r of REGIONS)
      walkOptions(r.options, (o, path) => {
        const sum = (o.products ?? []).reduce((a, p) => a + p.fraction, 0);
        expect(sum, `${r.id}${path}`).toBeLessThanOrEqual(1);
        for (const p of o.products ?? []) expect(p.fraction).toBeGreaterThanOrEqual(0);
      });
  });

  it('parts of an option sum to 1 and have valid defaults', () => {
    for (const r of REGIONS)
      walkOptions(r.options, (o, path) => {
        if (!o.parts) return;
        const sum = o.parts.reduce((a, p) => a + p.share, 0);
        expect(sum, `${r.id}${path}`).toBeCloseTo(1, 6);
        for (const part of o.parts) expect(part.options.map((x) => x.id)).toContain(part.defaultOption);
      });
  });

  it('option is either a leaf (products) or split (parts), not both', () => {
    for (const r of REGIONS)
      walkOptions(r.options, (o, path) => {
        expect(Boolean(o.products) !== Boolean(o.parts), `${r.id}${path}`).toBe(true);
      });
  });

  it('default options exist', () => {
    for (const r of REGIONS) expect(r.options.map((o) => o.id)).toContain(r.defaultOption);
  });

  it('steaks and pieces carry size data', () => {
    for (const p of allProducts) {
      if (p.weightOnly) continue;
      if (p.kind === 'steak') expect(p.gramsPerCm, p.id).toBeGreaterThan(0);
      if (p.kind === 'piece' || p.kind === 'ribs') expect(p.pieceGrams, p.id).toBeGreaterThan(0);
      if (p.gramsPerCm || p.pieceGrams) {
        expect(p.sizeRef?.carcassKg, p.id).toBeGreaterThan(0);
        for (const id of p.sizeRef?.sourceIds ?? []) expect(SOURCE_BY_ID[id], `${p.id}:${id}`).toBeDefined();
      }
      if (p.boneFactor !== undefined) expect(p.boneFactor, p.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('meat + trim + bone + fat + drip reproduce the AHDB reference carcass (100 %)', () => {
    const meat = REGIONS.reduce((a, r) => a + r.meatPctOfCarcass.value + (r.bonePctOfCarcass && r.id === 'fore-rib' ? r.bonePctOfCarcass.value : 0), 0);
    // Fore rib bone is inside AHDB's bone-in fore rib primal; other region bone figures are drawn from the 16.17 % bone pool.
    const total = meat + TRIM_POOL_PCT_OF_CARCASS.value + REFERENCE_BONE_PCT.value + REFERENCE_FAT_PCT.value + AHDB_REFERENCE_CARCASS.dripLossPct;
    expect(total).toBeCloseTo(100, 1);
  });
});

describe('parts', () => {
  it('ids are unique', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('live-weight parts plus carcass (53 %) roughly account for the whole 600 kg reference steer', () => {
    const liveSum = PARTS.filter((p) => p.reference.basis === 'live').reduce((a, p) => a + p.reference.pct.value, 0);
    // AHDB: non-carcass = 47 % of live weight. Lung fat, gut fat etc. all included; horns (estimate) excluded.
    expect(liveSum).toBeCloseTo(47, 0);
  });

  it('SRM parts are never available', () => {
    for (const p of PARTS) if (p.statusRules?.some((r) => r.status === 'srm')) expect(p.availability).toBe('never');
  });

  it('cooking references resolve', () => {
    expect(PARTS.filter((p) => p.cookingId && !COOKING_BY_ID[p.cookingId]).map((p) => p.id)).toEqual([]);
  });
});

describe('evidence', () => {
  it('no value is an unsourced guess: estimates must say how they were derived', () => {
    for (const x of sourced) {
      if (x.evidence === 'estimate') expect(x.note ?? '', JSON.stringify(x)).toMatch(/^Derived/);
      if (x.evidence !== 'unconfirmed') expect(x.sourceIds.length, JSON.stringify(x)).toBeGreaterThan(0);
    }
  });
});

describe('breeds', () => {
  it('kill-out values are plausible (40–62 %)', () => {
    for (const b of BREEDS) for (const k of Object.values(b.killOutPct)) {
      expect(k.value).toBeGreaterThan(40);
      expect(k.value).toBeLessThan(62);
    }
  });
});

// ───────── Helpers to look up options by path ─────────
/** Path segments alternate: region / option / part / option / part / ... */
function option(path: string): CutOption {
  const [regionId, ...rest] = path.split('/');
  let options = REGION_BY_ID[regionId].options;
  let current: CutOption | undefined;
  rest.forEach((seg, i) => {
    if (i % 2 === 0) {
      current = options.find((o) => o.id === seg);
      if (!current) throw new Error(`bad option ${seg} in ${path}`);
    } else {
      const part = current?.parts?.find((p) => p.id === seg);
      if (!part) throw new Error(`bad part ${seg} in ${path}`);
      options = part.options;
    }
  });
  if (!current) throw new Error(`bad path ${path}`);
  return current;
}
const partShare = (path: string, partId: string) => option(path).parts!.find((p) => p.id === partId)!.share;
const fraction = (path: string, productId: string) => option(path).products!.find((p) => p.id === productId)!.fraction;

describe('muscle-based shares match AHDB per-side kg (kg ÷ kg)', () => {
  const tol = 0.02;
  it('region meat % matches AHDB per-side kg', () => {
    expect(REGION_BY_ID.rump.meatPctOfCarcass.value * 1.515).toBeCloseTo(K.rumpRegion, 1);
    expect(REGION_BY_ID.loin.meatPctOfCarcass.value * 1.515).toBeCloseTo(K.loinRegion, 1);
  });
  it.each([
    ['picanha share', () => partShare('rump/split', 'picanha'), K.rumpCap / K.rumpRegion],
    ['tri-tip share', () => partShare('rump/split', 'tri-tip'), K.rumpTail / K.rumpRegion],
    ['prime rump + bistro share', () => partShare('rump/split', 'prime-rump'), (K.primeRump + K.rumpBistro + (K.rumpRegion - K.rumpCap - K.rumpTail - K.primeRump - K.rumpBistro)) / K.rumpRegion],
    ['loin planner: striploin share', () => L.striploin / L.total, K.striploin / K.loinRegion],
    ['loin planner: fillet share', () => (L.filletTail + L.filletMiddle + L.filletHead + L.filletChain) / L.total, K.fillet / K.loinRegion],
    ['eye of round share', () => partShare('silverside/split', 'eye-of-round'), K.salmonCut / K.silverside],
    ['denver fraction', () => fraction('chuck/denver', 'denver-steak'), K.denver / K.chuckRegion],
    ['bavette fraction', () => fraction('thin-flank/bavette', 'bavette'), K.bavette / K.thinFlank],
    ['skirts fraction', () => fraction('thin-flank/bavette', 'flank-skirts'), (K.gooseSkirt + K.insideSkirt) / K.thinFlank],
    ['loin planner: fillet tail', () => L.filletTail / (L.total - L.striploin), K.filletTail / K.fillet],
    ['loin planner: centre fillet', () => L.filletMiddle / (L.total - L.striploin), K.middleFillet / K.fillet],
  ])('%s', (_name, actual, expected) => {
    expect(Math.abs(actual() - expected)).toBeLessThanOrEqual(tol);
  });
});

describe('bone budget', () => {
  /** Bone (as % of carcass) that a leaf option keeps in its products. */
  const boneIn = (o: CutOption, meatPct: number) =>
    (o.products ?? []).reduce((a, p) => a + ((p.boneFactor ?? 1) - 1) * p.fraction * meatPct, 0);

  it('bone kept in each option fits its region (plus bone of options it excludes)', () => {
    for (const r of REGIONS) {
      const visit = (opts: CutOption[], meatPct: number, path: string) => {
        for (const o of opts) {
          const borrowed = (o.excludes ?? []).reduce((a, x) => a + (REGION_BY_ID[x.path.split('/')[0]].bonePctOfCarcass?.value ?? 0), 0);
          const allowance = (r.bonePctOfCarcass?.value ?? 0) + borrowed;
          expect(boneIn(o, meatPct), `${path}/${o.id}`).toBeLessThanOrEqual(allowance + 1e-9);
          for (const part of o.parts ?? []) visit(part.options, meatPct * part.share, `${path}/${o.id}/${part.id}`);
        }
      };
      visit(r.options, r.meatPctOfCarcass.value, r.id);
    }
  });

  it('fixed bone parts plus all in-cut bone fit the carcass bone pool', () => {
    const inCut = REGIONS.filter((r) => r.id !== 'fore-rib').reduce((a, r) => a + (r.bonePctOfCarcass?.value ?? 0), 0);
    const fixedBoneParts = PARTS.filter((p) => p.group === 'bone' && p.reference.basis === 'carcass' && !p.residualOf).reduce((a, p) => a + p.reference.pct.value, 0);
    expect(inCut + fixedBoneParts).toBeLessThanOrEqual(REFERENCE_BONE_PCT.value);
  });

  it('residual soup bones = pool minus marrow bones (nothing else taken)', () => {
    expect(PART_BY_ID['soup-bones'].reference.pct.value).toBeCloseTo(REFERENCE_BONE_PCT.value - PART_BY_ID['marrow-bones'].reference.pct.value, 1);
  });
});

describe('cross-region exclusions', () => {
  it('every excludes path and option id resolves, and does not point at its own region', () => {
    for (const r of REGIONS)
      walkOptions(r.options, (o) => {
        for (const x of o.excludes ?? []) {
          const [regionId, ...partPath] = x.path.split('/');
          expect(REGION_BY_ID[regionId], x.path).toBeDefined();
          expect(regionId).not.toBe(r.id);
          const opts = partPath.length
            ? REGION_BY_ID[regionId].options.flatMap((oo) => oo.parts ?? []).find((p) => p.id === partPath.at(-1))!.options
            : REGION_BY_ID[regionId].options;
          for (const id of x.optionIds) expect(opts.map((oo) => oo.id), `${x.path}:${id}`).toContain(id);
        }
      });
  });
});
