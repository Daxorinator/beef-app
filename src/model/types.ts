// Domain schema for beef-app. Types only — no business logic.
// See docs/RESEARCH.md for the evidence behind each field.

// ───────────────────────── Evidence ─────────────────────────

/** How well-founded a figure is (mirrors the legend in docs/RESEARCH.md). */
export type EvidenceLevel = 'verified' | 'secondary' | 'estimate' | 'unconfirmed';

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  year?: number;
  jurisdiction: 'IE' | 'EU' | 'UK' | 'US' | 'other';
}

/** A number with provenance. */
export interface Sourced<T = number> {
  value: T;
  evidence: EvidenceLevel;
  sourceIds: string[];
  note?: string;
}

// ───────────────────────── Animal ─────────────────────────

export type Sex = 'heifer' | 'steer' | 'bull' | 'cow';

export type BreedId =
  | 'aberdeen-angus'
  | 'angus-x-dairy'
  | 'jersey'
  | 'holstein-friesian'
  | 'hereford-x-dairy'
  | 'continental';

/** EUROP conformation on the 15-point scale (E+ = 15 … P− = 1). */
export type Conformation =
  | 'E+' | 'E' | 'E-'
  | 'U+' | 'U' | 'U-'
  | 'R+' | 'R' | 'R-'
  | 'O+' | 'O' | 'O-'
  | 'P+' | 'P' | 'P-';

/** EUROP fat class on the 15-point scale (1− = 1 … 5+ = 15). */
export type FatClass =
  | '1-' | '1' | '1+'
  | '2-' | '2' | '2+'
  | '3-' | '3' | '3+'
  | '4-' | '4' | '4+'
  | '5-' | '5' | '5+';

export type WeightBasis = 'live' | 'carcass';
export type Share = 'whole' | 'half';
export type SlaughterRoute = 'approved-abattoir' | 'on-farm-private';

export interface Animal {
  sex: Sex;
  breed: BreedId;
  ageMonths: number;
  weightKg: number;
  weightBasis: WeightBasis;
  /** Optional: if unknown, breed/sex defaults are used. */
  conformation?: Conformation;
  fatClass?: FatClass;
  /** Days the carcass hangs before cutting. */
  hangingDays: number;
  organic: OrganicStatus;
  share: Share;
  route: SlaughterRoute;
  /** Polled breeds (e.g. Aberdeen Angus) and disbudded dairy stock have no horns. */
  horned: boolean;
}

export interface OrganicStatus {
  certified: boolean;
  controlBody?: 'IOA' | 'Organic Trust';
  /** Will any meat be sold or described as organic? Drives certification warnings. */
  sellingAsOrganic: boolean;
  /** Is the abattoir / butcher certified, or listed on the farmer's certificate (IOA 1.04.40)? */
  abattoirCovered?: boolean;
  butcherCovered?: boolean;
}

/** Reference data per breed. Values per sex where they differ. */
export interface BreedProfile {
  id: BreedId;
  name: string;
  type: 'beef-early-maturing' | 'beef-late-maturing' | 'dairy' | 'dairy-x-beef';
  killOutPct: Record<Sex, Sourced>;
  defaultConformation: Record<Sex, Conformation>;
  defaultFatClass: Record<Sex, FatClass>;
  /** Saleable-yield adjustment vs a late-maturing beef animal of equal grade (percentage points). */
  yieldAdjustmentPts: Sourced;
  /** Longissimus area per kg carcass (cm²/kg) — scales steak sizes. */
  eyeMuscleCm2PerKg: Sourced;
  typicalCarcassKg: Partial<Record<Sex, Sourced>>;
  notes: string[];
}

// ───────────────────────── Carcass meat: regions & cut options ─────────────────────────

export type Quarter = 'fore' | 'hind';
export type ProductKind = 'steak' | 'roast' | 'piece' | 'ribs' | 'diced' | 'mince' | 'burger' | 'cured';

export type Heat = 'dry' | 'wet';
export type Temp = 'high' | 'low';
export type Speed = 'fast' | 'slow';
export type CookMethod =
  | 'grill' | 'pan-fry' | 'barbecue' | 'stir-fry' | 'roast' | 'slow-roast'
  | 'pot-roast' | 'braise' | 'stew' | 'boil' | 'smoke' | 'sous-vide' | 'raw';

export interface CookingProfile {
  id: string;
  heat: Heat;
  temp: Temp;
  speed: Speed;
  methods: CookMethod[];
  doneness?: string;
  tip?: string;
}

/** One product produced by a leaf cut option. */
export interface ProductSpec {
  id: string;
  /** Irish retail name. */
  name: string;
  aka?: string[];
  kind: ProductKind;
  /** Share of the parent's boneless meat ending up in this product (rest → trim pool). */
  fraction: number;
  /** Weight multiplier for bone left in (1 = boneless). */
  boneFactor?: number;
  /** Steaks/slices: grams per cm thickness at the 303 kg reference carcass. */
  gramsPerCm?: number;
  /** Pieces / ribs / whole muscles: typical piece weight (g) at the reference carcass. */
  pieceGrams?: number;
  defaultThicknessCm?: number;
  allowedThicknessCm?: number[];
  cookingId: string;
  notes?: string;
}

export interface CutOption {
  id: string;
  label: string;
  description?: string;
  /** Leaf option: final products. */
  products?: ProductSpec[];
  /** Or: split into parts, each with its own choice (e.g. loin → striploin + fillet). */
  parts?: RegionPart[];
  /** Declarative advisories evaluated against the animal (no logic here). */
  advisories?: Advisory[];
  /**
   * Cross-region mutual exclusions: choosing this option rules out these options elsewhere.
   * `path` uses the Selections key format ("plate", "loin/striploin").
   */
  excludes?: { path: string; optionIds: string[]; reason: string }[];
}

export interface RegionPart {
  id: string;
  name: string;
  /** Share of the parent's meat; parts of one option sum to 1. */
  share: number;
  options: CutOption[];
  defaultOption: string;
}

export interface Region {
  id: string;
  /** Irish / UK-Irish trade name. */
  name: string;
  aka: string[];
  quarter: Quarter;
  /** AHDB reference: boneless meat as % of carcass. */
  meatPctOfCarcass: Sourced;
  /** Bone in this region as % of carcass, for bone-in options and the bone pool. */
  bonePctOfCarcass?: Sourced;
  description: string;
  options: CutOption[];
  defaultOption: string;
  /** SVG path id(s) in the diagram. */
  diagramIds: string[];
}

/** Selection paths, e.g. { "loin": "separate", "loin/striploin": "sirloin-steaks" }. */
export type Selections = Record<string, string>;

// ───────────────────────── Whole animal: fifth quarter ─────────────────────────

/** Regulatory/ABP status in Ireland. */
export type PartStatus =
  | 'edible'              // food; may be returned
  | 'edible-processing'   // food only after cleaning/processing (tripe, feet, blood)
  | 'abp-cat3'            // not food, but may be returned by arrangement (hide, horns, pet chews)
  | 'abp-cat2'            // never returned (gut contents)
  | 'srm';                // never returned (skull/brain/eyes, spinal cord > 12 months in IE)

export type Availability =
  | 'usually'       // standard ask at most abattoirs
  | 'on-request'    // ask in advance
  | 'rarely'        // few small abattoirs can do it
  | 'never';

/** How a part is handled on a half share. */
export type HalfShareRule =
  | 'split'          // naturally divisible by side (bones, fat trim, suet)
  | 'whole-or-none'  // single item: hide, tongue, heart, liver, oxtail
  | 'by-agreement';  // divisible in principle but usually agreed between sharers

export interface AnimalPart {
  id: string;
  name: string;
  aka?: string[];
  group: 'offal' | 'fat' | 'bone' | 'hide-skin' | 'head' | 'blood' | 'digestive' | 'other';
  /**
   * Reference amount. 'live' = % of live weight (AHDB 600 kg R4L steer, fifth quarter);
   * 'carcass' = % of carcass weight (bones, fat trim, dripping derived from the carcass).
   */
  reference: { basis: 'live' | 'carcass'; pct: Sourced };
  /**
   * Residual parts take whatever is left of a pool after other choices (e.g. soup bones = carcass bone
   * minus marrow bones minus bone left in cuts). `reference.pct` is then the maximum (nothing else taken).
   */
  residualOf?: 'bone' | 'fat';
  /** Default status; overridden by the first matching statusRule. */
  status: PartStatus;
  /** Conditional status, e.g. skull/brain/eyes → 'srm' when minAgeMonths 12 (IE negligible risk). */
  statusRules?: { when: Condition; status: PartStatus; note?: string }[];
  availability: Availability;
  /** Conditional availability, e.g. head meat > 12 months only where abattoir harvests under control. */
  availabilityRules?: { when: Condition; availability: Availability; note?: string }[];
  /** Part exists only when this matches (e.g. pizzle: bull/steer; horns: not polled breeds). */
  presentWhen?: Condition;
  halfShare: HalfShareRule;
  /** Age-dependent notes (e.g. sweetbreads mainly young animals). */
  ageNote?: string;
  /** What to tell the butcher / abattoir to secure it. */
  requestNote?: string;
  uses: string[];
  cookingId?: string;
}

/** User's choice per part. */
export interface PartRequest {
  partId: string;
  want: boolean;
  /** Half share + 'whole-or-none' part: this sharer takes the whole item. */
  takeWhole?: boolean;
  /** For bones/fat: fraction requested (0..1). */
  fraction?: number;
  /** For fat: raw or rendered. */
  form?: 'raw' | 'rendered';
}

// ───────────────────────── Butcher preferences ─────────────────────────

export type FamilySize = 2 | 4 | 6 | 8;

export interface ButcherPrefs {
  familySize: FamilySize;
  /** Per-person raw roast weight (g), boneless; bone-in derived from the bone factor. */
  roastGramsPerPerson: number;
  steakThicknessCm: number;
  steaksPerPack: number;
  thicknessOverrides: Record<string, number>;
  mince: {
    packG: number;
    /** Visual lean %. */
    leanPct: 80 | 85 | 90 | 95;
  };
  burgers: { grams: number; perPack: number };
  diced: { packG: number };
  /** Split of the trim pool (percentages summing to 100). */
  trimSplit: { mince: number; burgers: number; diced: number };
  packaging: 'vacuum' | 'bag' | 'tray';
  labelling: { cutName: boolean; weight: boolean; date: boolean; animalTag: boolean };
}

// ───────────────────────── Rules & advisories (declarative) ─────────────────────────

export interface Condition {
  sex?: Sex[];
  breed?: BreedId[];
  /** Horned vs polled/disbudded (affects horn availability). */
  horned?: boolean;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  minCarcassKg?: number;
  maxCarcassKg?: number;
  organic?: boolean;
  share?: Share;
  route?: SlaughterRoute;
}

export interface Advisory {
  id: string;
  when: Condition;
  severity: 'info' | 'tip' | 'warning' | 'blocked';
  message: string;
  sourceIds?: string[];
}

// ───────────────────────── Outputs ─────────────────────────

export interface ProductLine {
  productId: string;
  name: string;
  regionId: string;
  kind: ProductKind;
  weightKg: number;
  count?: number;
  thicknessCm?: number;
  eachKg?: number;
  packs?: number;
  perPack?: number;
  cookingId: string;
}

export interface MassBalance {
  liveKg?: number;
  carcassKg: number;
  hangingLossKg: number;
  boneKg: number;
  boneReturnedKg: number;
  fatTrimKg: number;
  fatReturnedKg: number;
  cuttingLossKg: number;
  meatKg: number;
  /** Low/high estimate band for meatKg. */
  meatRangeKg: [number, number];
}

export interface Results {
  balance: MassBalance;
  products: ProductLine[];
  parts: { part: AnimalPart; kg: number }[];
  advisories: Advisory[];
  totals: { steaksKg: number; roastsKg: number; slowCookKg: number; minceBurgersKg: number; offalKg: number };
  freezerLitres: number;
}

export interface CutSheet {
  animal: Animal;
  selections: Selections;
  prefs: ButcherPrefs;
  partRequests: PartRequest[];
  /** Human-readable instructions for the butcher/abattoir, grouped by region. */
  lines: { heading: string; instructions: string[] }[];
  regulatoryNotes: string[];
}
