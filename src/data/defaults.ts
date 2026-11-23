// Default user settings. Constants only.
import { STANDARD_STEAK_CM } from './thickness';
import type { Animal, ButcherPrefs, PartRequest } from '../model/types';

export const DEFAULT_ANIMAL: Animal = {
  sex: 'steer',
  breed: 'aberdeen-angus',
  ageMonths: 24,
  weightKg: 600,
  weightBasis: 'live',
  hangingDays: 21,
  organic: { certified: false, sellingAsOrganic: false },
  share: 'whole',
  route: 'approved-abattoir',
  horned: false,
};

/** Portion guidance: ~225–250 g boneless per person (retailer/butcher guidance). */
export const ROAST_GRAMS_PER_PERSON = { boneless: 250, boneIn: 400, sourceIds: ['portion-guides'] };

export const DEFAULT_PREFS: ButcherPrefs = {
  familySize: 4,
  roastGramsPerPerson: ROAST_GRAMS_PER_PERSON.boneless,
  steakThicknessCm: STANDARD_STEAK_CM,
  steaksPerPack: 2,
  thicknessOverrides: {},
  mince: { packG: 500, leanPct: 85 },
  /** Teagasc home-kill example: 9 burgers per kg (≈ 110 g). */
  burgers: { grams: 113, perPack: 4 },
  diced: { packG: 500 },
  trimSplit: { mince: 60, burgers: 25, diced: 15 },
  packaging: 'vacuum',
  labelling: { cutName: true, weight: true, date: true, animalTag: true },
};

export const PACK_OPTIONS = {
  steaksPerPack: [1, 2, 4, 6],
  mincePackG: [454, 500, 1000],
  burgerG: [113, 170, 227],
  burgersPerPack: [2, 4, 6],
  dicedPackG: [400, 500, 1000],
  hangingDays: [7, 10, 14, 21, 28, 35],
};

/** Parts requested by default: what Irish abattoirs usually return (user's experience) plus carcass bones. */
export const DEFAULT_PARTS: PartRequest[] = [
  { partId: 'liver', want: true },
  { partId: 'heart', want: true },
  { partId: 'kidneys', want: true },
  { partId: 'tongue', want: true },
  { partId: 'oxtail', want: true },
  { partId: 'cheeks', want: true },
  { partId: 'thick-skirt', want: true },
  { partId: 'marrow-bones', want: true, fraction: 1 },
  { partId: 'soup-bones', want: true, fraction: 1 },
  { partId: 'fat-trim', want: false, fraction: 1, form: 'raw' },
];
