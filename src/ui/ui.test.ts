import { describe, expect, it } from 'vitest';
import { PRESETS } from '../data/presets';
import { REGIONS } from '../data/regions';
import { compute } from '../engine/compute';
import { buildCutSheet, cutSheetText } from '../engine/cutsheet';
import { resolveSelections } from '../engine/selections';
import { DEFAULT_STATE } from '../engine/state';
import { REGION_SHAPES } from './cowShapes';
import { decodeState, encodeState, sanitize } from './persist';

describe('cow diagram', () => {
  it('every region diagram id has a shape, and every shape is a region', () => {
    const ids = REGIONS.flatMap((r) => r.diagramIds);
    expect(ids.filter((id) => !REGION_SHAPES[id])).toEqual([]);
    expect(Object.keys(REGION_SHAPES).filter((id) => !ids.includes(id))).toEqual([]);
  });
});

describe('presets', () => {
  it('every preset path and option id exists, with no exclusion fallbacks', () => {
    for (const p of PRESETS) {
      const r = resolveSelections(p.selections);
      for (const [path, id] of Object.entries(p.selections)) expect(r.selections[path], `${p.id} ${path}`).toBe(id);
      expect(r.notices, p.id).toEqual([]);
    }
  });
});

describe('persistence', () => {
  it('share links round-trip', () => {
    const s = { ...DEFAULT_STATE, animal: { ...DEFAULT_STATE.animal, breed: 'jersey' as const, weightKg: 432 }, selections: { rump: 'roast' } };
    expect(decodeState(`#s=${encodeState(s)}`)).toEqual(s);
  });
  it('garbage falls back to defaults', () => {
    expect(decodeState('#s=!!!')).toBeUndefined();
    expect(sanitize({ animal: { breed: 'unicorn', weightKg: -5 } })!.animal.breed).toBe(DEFAULT_STATE.animal.breed);
  });
});

describe('cut sheet', () => {
  it('has a section per region plus animal, trim, extras and packing', () => {
    const r = compute(DEFAULT_STATE);
    const cs = buildCutSheet(DEFAULT_STATE, r);
    expect(cs.lines.length).toBe(REGIONS.length + 4);
    const text = cutSheetText(cs, r);
    expect(text).toContain('Rib steak');
    expect(text).toContain('Liver');
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });
});
