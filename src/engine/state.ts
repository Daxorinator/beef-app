import { DEFAULT_ANIMAL, DEFAULT_PARTS, DEFAULT_PREFS } from '../data/defaults';
import type { Animal, ButcherPrefs, PartRequest, Selections } from '../model/types';

/** Everything the user has chosen. Serialisable (saved to localStorage and share links). */
export interface AppState {
  animal: Animal;
  selections: Selections;
  prefs: ButcherPrefs;
  partRequests: PartRequest[];
  /** Roast/steak balance options: number of roasts wanted, keyed by selection path. Absent = half and half. */
  roastCounts: Record<string, number>;
  /** Unit-by-unit planners (e.g. ribs): units given to each use, keyed by selection path. Absent = data defaults. */
  allocations: Record<string, Record<string, number>>;
}

export const DEFAULT_STATE: AppState = { animal: DEFAULT_ANIMAL, selections: {}, prefs: DEFAULT_PREFS, partRequests: DEFAULT_PARTS, roastCounts: {}, allocations: {} };
