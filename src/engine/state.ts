import { DEFAULT_ANIMAL, DEFAULT_PARTS, DEFAULT_PREFS } from '../data/defaults';
import type { Animal, ButcherPrefs, PartRequest, Selections } from '../model/types';

/** Everything the user has chosen. Serialisable (saved to localStorage and share links). */
export interface AppState {
  animal: Animal;
  selections: Selections;
  prefs: ButcherPrefs;
  partRequests: PartRequest[];
  /**
   * Planner choices keyed by selection path: rib plans (units per use), the loin plan, and joint plans
   * ({ roasts, rest }). Absent = data defaults.
   */
  allocations: Record<string, Record<string, number>>;
}

export const DEFAULT_STATE: AppState = { animal: DEFAULT_ANIMAL, selections: {}, prefs: DEFAULT_PREFS, partRequests: DEFAULT_PARTS, allocations: {} };
