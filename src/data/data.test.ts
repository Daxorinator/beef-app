// Integrity checks on the researched constants (no business logic under test).
import { describe, expect, it } from 'vitest';
import type { CutOption, ProductSpec, Sourced } from '../model/types';
import { ADVISORIES } from './advisories';
import { BREEDS } from './breeds';
import { COOKING_BY_ID } from './cooking';
import { AHDB_REFERENCE_CARCASS } from './grading';
import { PARTS } from './parts';
import { REFERENCE_BONE_PCT, REFERENCE_FAT_PCT, REGIONS, TRIM_POOL_PCT_OF_CARCASS } from './regions';
import { SOURCE_BY_ID } from './sources';

function walkOptions(options: CutOption[], visit: (o: CutOption, path: string) => void, path = ''): void {
  for (const o of options) {
    visit(o, `${path}/${o.id}`);
    for (const part of o.parts ?? []) walkOptions(part.options, visit, `${path}/${o.id}/${part.id}`);
  }
}

const allProducts: ProductSpec[] = [];
for (const r of REGIONS) walkOptions(r.options, (o) => allProducts.push(...(o.products ?? [])));

const sourced: Sourced[] = [
  ...REGIONS.flatMap((r) => [r.meatPctOfCarcass, ...(r.bonePctOfCarcass ? [r.bonePctOfCarcass] : [])]),
  ...PARTS.map((p) => p.reference.pct),
  ...BREEDS.flatMap((b) => [...Object.values(b.killOutPct), b.yieldAdjustmentPts, b.eyeMuscleCm2PerKg, ...Object.values(b.typicalCarcassKg)]),
  TRIM_POOL_PCT_OF_CARCASS,
  REFERENCE_BONE_PCT,
  REFERENCE_FAT_PCT,
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
      if (p.kind === 'steak') expect(p.gramsPerCm, p.id).toBeGreaterThan(0);
      if (p.kind === 'piece' || p.kind === 'ribs') expect(p.pieceGrams, p.id).toBeGreaterThan(0);
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
    const liveSum = PARTS.filter((p) => p.reference.basis === 'live' && p.reference.pct.evidence === 'verified').reduce((a, p) => a + p.reference.pct.value, 0);
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

describe('breeds', () => {
  it('kill-out values are plausible (40–62 %)', () => {
    for (const b of BREEDS) for (const k of Object.values(b.killOutPct)) expect(k.value).toBeGreaterThan(40), expect(k.value).toBeLessThan(62);
  });
});
