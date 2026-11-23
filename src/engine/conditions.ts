import type { Animal, Condition } from '../model/types';

/** Does a declarative condition hold for this animal? Every specified field must match. */
export function matches(c: Condition, a: Animal, carcassKg: number): boolean {
  if (c.sex && !c.sex.includes(a.sex)) return false;
  if (c.breed && !c.breed.includes(a.breed)) return false;
  if (c.horned !== undefined && c.horned !== a.horned) return false;
  if (c.minAgeMonths !== undefined && !(a.ageMonths >= c.minAgeMonths)) return false;
  if (c.maxAgeMonths !== undefined && !(a.ageMonths <= c.maxAgeMonths)) return false;
  if (c.minCarcassKg !== undefined && !(carcassKg >= c.minCarcassKg)) return false;
  if (c.maxCarcassKg !== undefined && !(carcassKg <= c.maxCarcassKg)) return false;
  if (c.organic !== undefined && c.organic !== a.organic.certified) return false;
  if (c.share !== undefined && c.share !== a.share) return false;
  if (c.route !== undefined && c.route !== a.route) return false;
  return true;
}
