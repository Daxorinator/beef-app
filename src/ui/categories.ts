import { REGIONS } from '../data/regions';
import { categoryOf, type EngineResult } from '../engine/compute';

export type RegionCategory = 'steak' | 'roast' | 'slow' | 'mince' | 'mixed';

const MAP = { steaks: 'steak', roasts: 'roast', slow: 'slow' } as const;

/** Dominant use of each region by weight, for colouring the diagram (same classification as the totals). */
export function regionCategories(r: EngineResult): Record<string, RegionCategory> {
  const out: Record<string, RegionCategory> = {};
  for (const region of REGIONS) {
    const by = { steak: 0, roast: 0, slow: 0 };
    for (const l of r.lines.filter((x) => x.regionId === region.id)) {
      const c = categoryOf(l);
      if (c !== 'mince') by[MAP[c]] += l.weightKg;
    }
    const total = by.steak + by.roast + by.slow;
    if (total === 0) out[region.id] = 'mince';
    else {
      const top = (['steak', 'roast', 'slow'] as const).reduce((a, b) => (by[a] >= by[b] ? a : b));
      out[region.id] = by[top] / total > 0.7 ? top : 'mixed';
    }
  }
  return out;
}
