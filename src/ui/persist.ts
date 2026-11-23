// Saving state locally and in share links. Unknown or malformed input falls back to defaults.
import { BREED_BY_ID } from '../data/breeds';
import { DEFAULT_ANIMAL, DEFAULT_PARTS, DEFAULT_PREFS } from '../data/defaults';
import type { AppState } from '../engine/state';

const KEY = 'beef-app:state:v1';

/** Merge a parsed object over the defaults, keeping only sane shapes. */
export function sanitize(x: unknown): AppState | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Partial<AppState>;
  const animal = { ...DEFAULT_ANIMAL, ...(o.animal ?? {}), organic: { ...DEFAULT_ANIMAL.organic, ...(o.animal?.organic ?? {}) } };
  if (!BREED_BY_ID[animal.breed]) animal.breed = DEFAULT_ANIMAL.breed;
  if (!['heifer', 'steer', 'bull', 'cow'].includes(animal.sex)) animal.sex = DEFAULT_ANIMAL.sex;
  if (!(animal.weightKg > 0)) animal.weightKg = DEFAULT_ANIMAL.weightKg;
  const p = o.prefs ?? DEFAULT_PREFS;
  const prefs = {
    ...DEFAULT_PREFS,
    ...p,
    mince: { ...DEFAULT_PREFS.mince, ...(p.mince ?? {}) },
    burgers: { ...DEFAULT_PREFS.burgers, ...(p.burgers ?? {}) },
    diced: { ...DEFAULT_PREFS.diced, ...(p.diced ?? {}) },
    trimSplit: { ...DEFAULT_PREFS.trimSplit, ...(p.trimSplit ?? {}) },
    labelling: { ...DEFAULT_PREFS.labelling, ...(p.labelling ?? {}) },
    thicknessOverrides: { ...(p.thicknessOverrides ?? {}) },
  };
  const selections = o.selections && typeof o.selections === 'object' ? o.selections : {};
  const partRequests = Array.isArray(o.partRequests) ? o.partRequests.filter((r) => r && typeof r.partId === 'string') : DEFAULT_PARTS;
  return { animal, prefs, selections, partRequests };
}

export function encodeState(s: AppState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(hash: string): AppState | undefined {
  const m = /^#s=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return undefined;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return sanitize(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return undefined;
  }
}

export function loadSaved(): AppState | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode / storage disabled: the app still works, it just won't remember.
  }
}
