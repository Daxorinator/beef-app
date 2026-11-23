// Carcass cut regions, options and products. Constants only.
// Region meat %: AHDB Beef Yield Guide (303 kg R4H reference carcass, trimmed primals, 2 weeks' maturation).
// Every product fraction cites its basis (fractionRef); every size cites the carcass it was measured on (sizeRef).
// AHDB primals are trimmed to ≤ 10 mm fat; US retail cutting tests start from IMPS subprimals at a similar packer
// trim, so their measured retail-cut shares (excluding lean trim, which goes to the mince pool here) are applied.
import type { CutOption, ProductSpec, Region, Sourced } from '../model/types';
import { inch, STANDARD_STEAK_CM, STEAK_CM, THICK_CM, THIN_CM } from './thickness';

const ahdb = (value: number, note?: string): Sourced => ({ value, evidence: 'verified', sourceIds: ['ahdb-yield-guide'], note });
const derived = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived: ${note}` });


// ───────── Size references ─────────
/** USDA SR28 single-steak weights; Nutrient Database Improvement studies cut steaks 2.54 cm thick from carcasses 318–408 kg hot (≈ 356 kg cold). */
const usdaSteak = (gramsAt254: number, cut: string): Pick<ProductSpec, 'gramsPerCm' | 'sizeRef'> => ({
  gramsPerCm: Math.round((gramsAt254 / 2.54) * 10) / 10,
  sizeRef: { carcassKg: 356, sourceIds: ['usda-sr28', 'west-ndi-chuck'], note: `USDA SR28 "${cut}" ${gramsAt254} g per 2.54 cm steak` },
});
/** AHDB per-side muscle weight used as a whole-piece size. */
/** AHDB per-side muscle weight used as a whole-piece size; a whole muscle is one per side. */
const ahdbPiece = (grams: number, what: string, perSide = 1): Pick<ProductSpec, 'pieceGrams' | 'sizeRef' | 'perSide'> => ({
  pieceGrams: grams,
  perSide,
  sizeRef: { carcassKg: 303, sourceIds: ['ahdb-yield-guide'], note: `AHDB ${what}, per side` },
});

// ───────── Fraction references ─────────
const F = {
  roastStyle: { sourceIds: ['tamu-rib-loin'], note: 'Retail roasts: 94.9 % saleable (Texas A&M Table 2, ribeye roasts; lean 0.6 %, fat 4.2 %, purge 0.2 %)' },
  dice95: { sourceIds: ['ahdb-europ-yield'], note: 'AHDB 2010: clod, neck, brisket trimmed to ≥ 95 % visual lean; remaining 5 % removed when dicing' },
  stripSteaks: { sourceIds: ['tamu-rib-loin'], note: 'Boneless strip loin → steaks 83.9–85.3 % (centre + vein; Texas A&M Table 9)' },
  rumpSteaks: { sourceIds: ['tamu-rib-loin'], note: 'Top sirloin butt (UK/IE rump) → steaks 79.4–82.7 % (Texas A&M Table 10)' },
  capSteaks: { sourceIds: ['tamu-rib-loin'], note: 'Top sirloin cap (picanha) → steaks 73.2–75.1 % (Texas A&M Table 11)' },
  flatIron: { sourceIds: ['mckenna-chuck-round'], note: 'Top blade (infraspinatus) → flat iron steaks 43.9–48.9 %, lean trim 37.8–40.5 % (McKenna 2003 Table 2)' },
  knuckleSteaks: { sourceIds: ['mckenna-chuck-round'], note: 'Peeled knuckle → steaks (vastus lateralis 20.5–25.5 % + rectus femoris 19.5–20.6 %) (McKenna 2003 Table 4)' },
  knuckleDiced: { sourceIds: ['mckenna-chuck-round'], note: 'Peeled knuckle → steaks 43.0 % + beef cubes 25.0 % (McKenna 2003 Table 4)' },
  /** AHDB rib eye roll 2.82 of 7.17 kg rolled fore rib × Texas A&M boneless (0×0) ribeye roll → steaks 96.2 % (95.2–97.2). */
  ribeyeFromRoll: { sourceIds: ['ahdb-yield-guide', 'tamu-rib-loin'], note: 'Only the rib eye roll (AHDB 2.82 of 7.17 kg per side) makes rib steaks; × 96.2 % boneless-roll steak yield (Texas A&M). Assumes AHDB rib eye roll ≈ the eye + cap in a USDA lip-on steak; the rest of the fore rib (lifter, side muscles) goes to trim' },
  /**
   * Bone-in rib steaks carry the eye plus some side muscle. USDA bone-in ribeye 462 g at 14 % bone = 397 g lean vs
   * lip-on boneless 361 g → ×1.10 on the rib eye roll share; × Texas A&M bone-in ribeye → steaks 88.8 %.
   */
  ribBoneInSteaks: { sourceIds: ['ahdb-yield-guide', 'usda-sr28', 'tamu-rib-loin'], note: 'AHDB rib eye roll share 2.82/7.17 × 1.10 (USDA bone-in steak lean 397 g vs lip-on 361 g) × 88.8 % bone-in steak yield (Texas A&M). Check: ≈ 4 steaks per side at 5 cm, one per rib (ribs 7–10)' },
  outsideRound: { sourceIds: ['mckenna-chuck-round'], note: 'Outside round flat → steaks/roasts 47.0 % + ischiatic head 13.6 % + cubed steak 9.5 % (McKenna 2003 Table 5)' },
};

/** All-to-mince option: no products, everything goes to the trim pool. */
const toMince = (label = 'Mince / burgers / stewing'): CutOption => ({
  id: 'mince',
  label,
  description: 'Send this whole cut to the trim pool for mince, burgers or diced beef.',
  products: [],
});

const steak = (p: Omit<ProductSpec, 'kind' | 'allowedThicknessCm'> & { allowedThicknessCm?: number[] }): ProductSpec => ({
  kind: 'steak',
  allowedThicknessCm: STEAK_CM,
  defaultThicknessCm: STANDARD_STEAK_CM,
  ...p,
});

// Bone factors: 1 / (1 − USDA SR28 refuse) unless stated.
const BONE = {
  foreRib: 8.23 / 7.17, // AHDB fore rib bone-in vs rolled (1.148)
  tBone: 1 / (1 - 0.25), // T-bone refuse 25 % bone & connective tissue
  stripBoneIn: 1 / (1 - 0.1), // top loin steak bone-in, 10 %
  shortRibs: 1 / (1 - 0.27), // rib short ribs, 27 % bone
  shank: 1 / (1 - 0.34), // shank crosscuts, 34 % bone
};

/** Rib steaks come from the AHDB rib eye roll only (2.82 of 7.17 kg rolled fore rib), at 96.2 % boneless-roll steak yield. */
const RIBEYE_STEAK_FRACTION = Math.round((2.82 / 7.17) * 0.962 * 1000) / 1000;
/** Bone-in rib steaks: rib eye roll share × 1.10 (USDA bone-in steak lean vs lip-on) × 88.8 % bone-in steak yield. */
const RIB_BONE_IN_STEAK_FRACTION = Math.round((2.82 / 7.17) * ((462 * 0.86) / 361) * 0.888 * 1000) / 1000;
/** Loin (AHDB striploin 6.80 + fillet 2.91 = 9.71 kg per side) cut on the bone. */
const T_BONE = {
  tBone: Math.round((((6.8 * 6) / 9 + 1.25 + 0.29) * 0.85 / 9.71) * 1000) / 1000,
  wingRib: Math.round((((6.8 * 3) / 9) * 0.85 / 9.71) * 1000) / 1000,
  filletHead: Math.round(((1.04 * 0.94) / 9.71) * 1000) / 1000,
};
/** LMC + baby LMC (AHDB 3.31 + 0.71 kg) share of the 6.44 kg-per-side clod region. */
const LMC_SHARE = (3.31 + 0.71) / (4.25 * 1.515);

export const REGIONS: Region[] = [
  // ───────────────────────── Forequarter ─────────────────────────
  {
    id: 'neck',
    name: 'Neck (sticking)',
    aka: ['Sticking', 'Neck of beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(2.59),
    description: 'Hard-working, flavoursome muscle in front of the shoulder. Traditionally stewing beef or mince.',
    defaultOption: 'mince',
    diagramIds: ['neck'],
    options: [
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'neck-diced', name: 'Diced neck (stewing beef)', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'chuck',
    name: 'Chuck & blade',
    aka: ["Housekeeper's cut", 'Top rib', 'Chuck', 'Shoulder'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(6.74, 'Chuck roll 4.75 + blade 0.99 + underblade 0.72 + underblade fillet 0.28 (10.21 kg per side)'),
    description:
      "The top of the shoulder in front of the fore rib. In Ireland the chuck-eye side is sold as housekeeper's cut (top rib), a classic pot roast. The chuck roll also gives Denver steaks.",
    defaultOption: 'housekeepers',
    diagramIds: ['chuck'],
    options: [
      {
        id: 'housekeepers',
        label: "Housekeeper's cut roasts + braising steak",
        description: 'The Denver muscle goes to mince with this option.',
        products: [
          { id: 'housekeepers-cut', name: "Housekeeper's cut (top rib) roast", kind: 'roast', fraction: 0.307, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB chuck-eye centre cut 2.76 + rib-eye fillet 0.38 of 10.21 kg' }, cookingId: 'pot-roast' },
          steak({ id: 'chuck-braising-steak', name: 'Braising steak (chuck)', fraction: 0.461, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB remaining chuck roll 1.69 + blade 1.50 + underblade 1.09 + underblade fillet 0.43 of 10.21 kg' }, ...usdaSteak(369, 'shoulder pot roast or steak, boneless'), cookingId: 'braise' }),
        ],
      },
      {
        id: 'denver',
        label: "Denver steaks + housekeeper's cut + braising steak",
        products: [
          steak({ id: 'denver-steak', name: 'Denver steak', fraction: 0.231, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB Denver muscle 2.36 of 10.21 kg' }, ...usdaSteak(473, 'under blade center steak, Denver Cut'), cookingId: 'flash-steak' }),
          { id: 'housekeepers-cut-d', name: "Housekeeper's cut (top rib) roast", kind: 'roast', fraction: 0.307, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB chuck-eye centre cut + rib-eye fillet' }, cookingId: 'pot-roast' },
          steak({ id: 'chuck-braising-steak-d', name: 'Braising steak (chuck)', fraction: 0.461, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB remaining chuck muscles' }, ...usdaSteak(369, 'shoulder pot roast or steak, boneless'), cookingId: 'braise' }),
        ],
      },
      { id: 'braising', label: 'All braising / chuck steak', products: [steak({ id: 'chuck-steak', name: 'Chuck / braising steak', fraction: 0.768, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: "AHDB chuck muscles: housekeeper's cut 3.14 + remaining chuck roll, blade and underblade 4.71 of 10.21 kg" }, ...usdaSteak(369, 'shoulder pot roast or steak, boneless'), cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced chuck (stewing)', products: [{ id: 'chuck-diced', name: 'Diced chuck steak', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'feather',
    name: 'Feather blade',
    aka: ['Oyster blade', 'Flat iron', 'Butler’s steak', 'Top blade'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(1.62, 'Feather (infraspinatus), 2.46 kg per side'),
    description:
      'A single muscle on the shoulder blade with a thick seam of gristle through the middle. Slow-cooked whole it melts (feather blade); with the gristle removed it becomes flat iron steaks.',
    defaultOption: 'braise',
    diagramIds: ['feather'],
    options: [
      { id: 'braise', label: 'Feather blade braising joints', products: [{ id: 'feather-blade-joint', name: 'Feather blade joint', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'braise' }] },
      { id: 'flat-iron', label: 'Flat iron steaks', description: 'Central sinew removed.', products: [steak({ id: 'flat-iron-steak', name: 'Flat iron steak', fraction: 0.464, fractionRef: F.flatIron, ...usdaSteak(250, 'chuck, shoulder clod, top blade, steak'), defaultThicknessCm: inch(0.75), cookingId: 'flash-steak' })] },
      toMince(),
    ],
  },
  {
    id: 'clod',
    name: 'Clod & shoulder (LMC)',
    aka: ['Clod', 'LMC', 'Thick rib', 'Braising beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(4.25, 'LMC 2.18 + baby LMC 0.47 + clod flat 0.30 + shoulder brisket 0.48 + clod shin 0.40 + needle 0.42'),
    description: 'The lower shoulder above the fore shin. Lean, coarse-grained meat for braising, pot roasting and dicing.',
    defaultOption: 'diced',
    diagramIds: ['clod'],
    options: [
      { id: 'pot-roast', label: 'LMC pot roast joints', products: [{ id: 'lmc-pot-roast', name: 'Shoulder (LMC) pot roast', kind: 'roast', fraction: Math.round(LMC_SHARE * 0.95 * 1000) / 1000, fractionRef: { sourceIds: ['ahdb-yield-guide', 'tamu-rib-loin'], note: 'AHDB LMC 3.31 + baby LMC 0.71 of 6.44 kg clod region × roast yield 95 %; the rest of the clod goes to trim' }, cookingId: 'pot-roast' }] },
      { id: 'braising', label: 'Braising steak', products: [steak({ id: 'clod-braising-steak', name: 'Braising steak (shoulder)', fraction: Math.round(LMC_SHARE * 0.494 * 1000) / 1000, fractionRef: { sourceIds: ['ahdb-yield-guide', 'mckenna-chuck-round'], note: 'AHDB LMC + baby LMC 4.02 of 6.44 kg × clod heart (triceps) → steaks 49.4 % (McKenna 2003)' }, ...usdaSteak(241, 'shoulder clod, shoulder top and center steaks'), cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'clod-diced', name: 'Diced shoulder (stewing beef)', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'fore-rib',
    name: 'Fore rib',
    aka: ['Rib of beef', 'Rib roast', 'Standing rib', 'Rib steak', 'Ribeye', 'Côte de boeuf', 'Tomahawk'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(4.73, 'Rolled (carvery) fore rib 7.17 kg of 8.23 kg bone-in per side; ribs 7–10'),
    bonePctOfCarcass: ahdb(0.7, 'Fore rib bone-in 5.43 % less rolled 4.73 %'),
    description:
      'Ribs 7–10. The finest roasting joint on the bone, or cut into rib steaks (ribeye). Bone-in rib from cattle of any age is legal in Ireland (negligible BSE risk).',
    defaultOption: 'mix',
    diagramIds: ['fore-rib'],
    options: [
      {
        id: 'mix',
        label: 'Rib by rib',
        description: 'Ribs 7–10 are cut one rib at a time, so each rib can go a different way: on-the-bone roast, rolled roast, côte de boeuf, tomahawk or rib steaks.',
        products: [],
        allocation: {
          unit: ['rib', 'ribs'],
          unitsPerSide: 4,
          remainder: 'steaks',
          defaultsPerSide: { 'roast-on-bone': 2, cote: 1 },
          uses: [
            { id: 'roast-on-bone', short: 'Roast on the bone', label: 'Rib roast on the bone', sizing: 'joints-of-units', product: { id: 'rib-roast-bone-in', name: 'Rib roast (on the bone)', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, boneFactor: BONE.foreRib, cookingId: 'prime-roast' } },
            { id: 'rolled', short: 'Rolled roast', label: 'Rolled rib roast', sizing: 'standard', product: { id: 'rolled-rib', name: 'Rolled rib roast', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'prime-roast' } },
            { id: 'cote', short: 'Côte de boeuf', label: 'Côte de boeuf (one per rib)', sizing: 'one-per-unit', product: steak({ id: 'cote-de-boeuf', name: 'Côte de boeuf', fraction: RIB_BONE_IN_STEAK_FRACTION, fractionRef: F.ribBoneInSteaks, boneFactor: BONE.foreRib, ...usdaSteak(462, 'rib eye steak, bone-in, lip-on'), defaultThicknessCm: undefined, allowedThicknessCm: undefined, cookingId: 'thick-bone-in-steak' }) },
            {
              id: 'tomahawk', short: 'Tomahawk', label: 'Tomahawk (one per rib)', sizing: 'one-per-unit',
              product: steak({ id: 'tomahawk', name: 'Tomahawk steak', fraction: RIB_BONE_IN_STEAK_FRACTION, fractionRef: F.ribBoneInSteaks, boneFactor: BONE.foreRib, ...usdaSteak(462, 'rib eye steak, bone-in, lip-on (excl. long bone)'), defaultThicknessCm: undefined, allowedThicknessCm: undefined, cookingId: 'thick-bone-in-steak' }),
              excludes: [{ path: 'plate', optionIds: ['short-ribs', 'jacobs-ladder'], reason: 'Tomahawk bones run down into the short-rib plate, so it can no longer be cut as bone-in short ribs.' }],
            },
            { id: 'steaks', short: 'Rib steaks', label: 'Rib steaks (boneless)', sizing: 'standard', product: steak({ id: 'ribeye-steak', name: 'Rib steak (ribeye)', aka: ['Scotch fillet', 'Entrecôte'], fraction: RIBEYE_STEAK_FRACTION, fractionRef: F.ribeyeFromRoll, ...usdaSteak(361, 'rib eye steak, boneless, lip-on'), cookingId: 'prime-steak' }) },
          ],
        },
      },
    ],
  },
  {
    id: 'brisket',
    name: 'Brisket',
    aka: ['Rolled brisket', 'Boiling beef', 'Salt beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(3.52, 'Flat brisket (boneless, fat ≤ 10 mm), 5.34 kg per side'),
    description: 'The breast, between the fore legs. Rich, fatty and best cooked low and slow, rolled for pot roasting, salted, or smoked.',
    defaultOption: 'rolled',
    diagramIds: ['brisket'],
    options: [
      { id: 'rolled', label: 'Rolled brisket joints', products: [{ id: 'rolled-brisket', name: 'Rolled brisket', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'brisket' }] },
      { id: 'flat', label: 'Whole flat brisket (for smoking)', products: [{ id: 'flat-brisket', name: 'Flat brisket (whole)', kind: 'piece', fraction: 0.99, fractionRef: { sourceIds: ['usda-sr28'], note: 'Brisket flat, refuse 1 % connective tissue' }, ...ahdbPiece(5340, 'flat brisket'), cookingId: 'brisket' }] },
      { id: 'salt', label: 'Salt / spiced brisket', description: 'Brined by the butcher (corned or spiced beef).', products: [{ id: 'salt-brisket', name: 'Salt / spiced brisket', kind: 'cured', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'cured' }] },
      toMince(),
    ],
  },
  {
    id: 'plate',
    name: 'Short ribs (plate)',
    aka: ["Jacob's ladder", 'Short rib', 'Flat ribs', 'Plate'],
    quarter: 'fore',
    meatPctOfCarcass: derived(0.788, ['ncba-subprimal', 'usda-sr28'], '3-rib short rib 8.7 lb of a 806 lb carcass (1.08 %, NCBA) less 27 % bone (USDA SR28). AHDB boned this into trim, so it is taken out of the trim pool'),
    bonePctOfCarcass: derived(0.292, ['ncba-subprimal', 'usda-sr28'], '1.08 % × 27 % bone'),
    description: "The rib ends below the fore rib. Kept on the bone as short ribs or a whole Jacob's ladder, or boned out for mince.",
    defaultOption: 'mince',
    diagramIds: ['plate'],
    options: [
      { id: 'short-ribs', label: 'Short ribs (cut between the bones)', products: [{ id: 'short-ribs', name: 'Short rib (single bone)', kind: 'ribs', fraction: 1, fractionRef: { sourceIds: ['ncba-subprimal'], note: 'Region is defined as the NCBA 3-rib short rib' }, boneFactor: BONE.shortRibs, perSide: 3, pieceGrams: 658, sizeRef: { carcassKg: 358, sourceIds: ['ncba-subprimal'], note: '8.7 lb per carcass ÷ 6 bones (3 per side), bone-in' }, cookingId: 'ribs' }] },
      { id: 'jacobs-ladder', label: "Jacob's ladder (3-bone rack)", products: [{ id: 'jacobs-ladder', name: "Jacob's ladder (3-bone rack)", kind: 'ribs', fraction: 1, fractionRef: { sourceIds: ['ncba-subprimal'], note: 'Whole 3-rib short rib per side' }, boneFactor: BONE.shortRibs, perSide: 1, pieceGrams: 1974, sizeRef: { carcassKg: 358, sourceIds: ['ncba-subprimal'], note: '8.7 lb per carcass ÷ 2 sides, bone-in' }, cookingId: 'ribs' }] },
      { id: 'boneless', label: 'Boneless short rib', products: [{ id: 'boneless-short-rib', name: 'Boneless short rib', kind: 'piece', fraction: 0.93, fractionRef: { sourceIds: ['usda-sr28'], note: 'Boneless short ribs, refuse 7 % connective tissue' }, pieceGrams: 432, sizeRef: { carcassKg: 356, sourceIds: ['usda-sr28'], note: 'USDA SR28 "chuck, short ribs, boneless" 432 g per piece' }, cookingId: 'braise' }] },
      toMince(),
    ],
  },
  {
    id: 'fore-shin',
    name: 'Fore shin',
    aka: ['Shin', 'Shank', 'Osso buco'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(1.35, 'Fore shin, trimmed'),
    bonePctOfCarcass: derived(0.7, ['usda-sr28', 'ahdb-yield-guide'], 'shank crosscuts are 34 % bone (USDA SR28): 1.35 × 0.34 / 0.66'),
    description: 'The front leg below the shoulder. Gelatinous, deeply flavoured slow-cooking meat; cross-cut through the bone it is osso buco.',
    defaultOption: 'diced',
    diagramIds: ['fore-shin'],
    options: [
      { id: 'osso-buco', label: 'Osso buco (cross-cut, bone in)', description: 'Sold by weight: no measured slice weight exists.', products: [{ id: 'fore-osso-buco', name: 'Osso buco (fore shin)', kind: 'piece', fraction: 1, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB fore shin is already trimmed' }, boneFactor: BONE.shank, weightOnly: true, defaultThicknessCm: inch(1.5), allowedThicknessCm: THICK_CM, cookingId: 'shin' }] },
      { id: 'diced', label: 'Boneless shin (diced or whole)', products: [{ id: 'fore-shin-boneless', name: 'Boneless shin', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'shin' }] },
      toMince(),
    ],
  },

  // ───────────────────────── Hindquarter ─────────────────────────
  {
    id: 'loin',
    name: 'Sirloin & fillet (loin)',
    aka: ['Sirloin', 'Striploin', 'Fillet', 'T-bone', 'Porterhouse', 'Wing rib'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.41, 'Striploin 4.49 + fillet 1.92'),
    bonePctOfCarcass: derived(Math.round((T_BONE.tBone * (BONE.tBone - 1) + T_BONE.wingRib * (BONE.stripBoneIn - 1)) * 6.41 * 1000) / 1000, ['usda-sr28', 'tamu-rib-loin', 'ahdb-yield-guide'], 'bone carried by T-bones (25 % refuse) and wing-rib steaks (10 %) on their AHDB lean shares of the 6.41 % loin'),
    description:
      'The most valuable cuts. Cut through the bone as T-bone and porterhouse (sirloin and fillet together), or take the fillet out and keep the sirloin and fillet separate, or mix the two: a few T-bones from the front of the short loin, then the fillet out. A Wellington needs the centre fillet intact. T-bones are legal from cattle of any age in Ireland.',
    defaultOption: 'plan',
    diagramIds: ['loin'],
    options: [
      {
        id: 'plan',
        label: 'Plan the loin',
        description: 'Choose T-bones and porterhouses, whole or centre fillets (Wellington, chateaubriand) and sirloin joints; the rest becomes fillet and sirloin steaks.',
        products: [],
        loinPlanner: true,
      },
    ],
  },
  {
    id: 'rump',
    name: 'Rump',
    aka: ['Rump steak', 'Picanha', 'Rump cap', 'Tri-tip', 'Rump tail'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(4.89, '"D" rump 3.95 + rump tail 0.94 (7.41 kg per side)'),
    description: 'Behind the sirloin. Full-flavoured steaks or a roasting joint. The fat-capped top (picanha) and the rump tail (tri-tip) can be taken off first.',
    defaultOption: 'steaks',
    diagramIds: ['rump'],
    options: [
      {
        id: 'steaks',
        label: 'Rump steaks (tri-tip off whole)',
        description: 'The rump tail (tri-tip) is a separate muscle, so it comes off as a whole piece.',
        products: [
          steak({ id: 'rump-steak', name: 'Rump steak (full slice)', fraction: Math.round(0.811 * (5.99 / 7.41) * 1000) / 1000, fractionRef: { sourceIds: ['ahdb-yield-guide', 'tamu-rib-loin'], note: 'AHDB D-rump 5.99 of 7.41 kg (tail excluded) × top sirloin butt → steaks 81.1 % (Texas A&M)' }, ...usdaSteak(608, 'top sirloin, steak'), defaultThicknessCm: inch(0.75), cookingId: 'prime-steak', notes: 'A full-width rump slice; ask your butcher to portion it' }),
          { id: 'rump-tail-whole', name: 'Tri-tip (rump tail)', kind: 'piece', fraction: Math.round(0.95 * (1.42 / 7.41) * 1000) / 1000, fractionRef: { sourceIds: ['ahdb-yield-guide', 'tamu-rib-loin'], note: 'AHDB rump tail 1.42 of 7.41 kg × roast yield 95 %' }, ...ahdbPiece(1420, 'rump tail'), cookingId: 'prime-roast' },
        ],
      },
      { id: 'roast', label: 'Rump roasts', products: [{ id: 'rump-roast', name: 'Rump roast', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'prime-roast' }] },
      {
        id: 'split',
        label: 'Picanha & tri-tip off, rest as steaks',
        parts: [
          {
            id: 'picanha',
            name: 'Rump cap (picanha)',
            share: 0.19,
            defaultOption: 'whole',
            options: [
              { id: 'whole', label: 'Whole picanha', products: [{ id: 'picanha-whole', name: 'Picanha (whole rump cap)', kind: 'piece', fraction: 0.95, fractionRef: F.roastStyle, ...ahdbPiece(1440, 'rump cap'), cookingId: 'prime-roast' }] },
              { id: 'steaks', label: 'Picanha steaks', products: [steak({ id: 'picanha-steak', name: 'Picanha steak', fraction: 0.741, fractionRef: F.capSteaks, ...usdaSteak(223, 'loin, top sirloin cap steak, boneless'), cookingId: 'prime-steak' })] },
            ],
          },
          {
            id: 'prime-rump',
            name: 'Prime rump (incl. bistro)',
            share: 0.62,
            defaultOption: 'steaks',
            options: [
              { id: 'steaks', label: 'Rump steaks', products: [steak({ id: 'prime-rump-steak', name: 'Rump steak (full slice, cap off)', fraction: 0.811, fractionRef: F.rumpSteaks, gramsPerCm: Math.round(((608 * (1 - 1.44 / 5.99)) / 2.54) * 10) / 10, sizeRef: { carcassKg: 356, sourceIds: ['usda-sr28', 'ahdb-yield-guide'], note: 'USDA top sirloin steak 608 g × (1 − AHDB cap 1.44 / D-rump 5.99 kg): cap off' }, defaultThicknessCm: inch(0.75), cookingId: 'prime-steak' })] },
              { id: 'roast', label: 'Rump roast', products: [{ id: 'prime-rump-roast', name: 'Rump roast', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'prime-roast' }] },
            ],
          },
          {
            id: 'tri-tip',
            name: 'Rump tail (tri-tip)',
            share: 0.19,
            defaultOption: 'whole',
            options: [
              { id: 'whole', label: 'Whole tri-tip', products: [{ id: 'tri-tip', name: 'Tri-tip (rump tail)', kind: 'piece', fraction: 0.95, fractionRef: F.roastStyle, ...ahdbPiece(1420, 'rump tail'), cookingId: 'prime-roast' }] },
              toMince('Leave in mince'),
            ],
          },
        ],
      },
      toMince(),
    ],
  },
  {
    id: 'topside',
    name: 'Topside',
    aka: ['Round roast', 'Round steak', 'Minute steak', 'Casserole beef'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.53, '9.89 kg per side'),
    description: 'The inside of the hind leg, "the most tender part of the round". Lean roasting joints (Irish round roast), round steak, minute steak or stir-fry.',
    defaultOption: 'split',
    diagramIds: ['topside'],
    options: [
      { id: 'roasts', label: 'Round roasts', products: [{ id: 'topside-roast', name: 'Round roast (topside)', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'lean-roast' }] },
      { id: 'round-steak', label: 'Round steaks', description: 'The gracilis (inner flap) goes to dice/mince.', products: [steak({ id: 'topside-round-steak', name: 'Round steak (topside)', fraction: 0.729, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB topside without gracilis 72.9 % of primal' }, ...usdaSteak(344, 'round, top round steak, boneless'), defaultThicknessCm: inch(0.5), cookingId: 'flash-steak' })] },
      { id: 'minute', label: 'Minute steaks / stir-fry', products: [steak({ id: 'minute-steak', name: 'Minute steak', fraction: 0.729, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB topside without gracilis' }, ...usdaSteak(344, 'round, top round steak, boneless'), defaultThicknessCm: inch(0.25), allowedThicknessCm: THIN_CM, cookingId: 'minute-steak' })] },
      {
        id: 'split',
        label: 'Round roasts + round steaks (you choose the mix)',
        balance: { roastId: 'topside-roast-half', steakId: 'topside-round-steak-half' },
        products: [
          { id: 'topside-roast-half', name: 'Round roast (topside)', kind: 'roast', fraction: 0.475, fractionRef: { sourceIds: ['tamu-rib-loin'], note: 'Half at roast yield 95 %' }, cookingId: 'lean-roast' },
          steak({ id: 'topside-round-steak-half', name: 'Round steak (topside)', fraction: 0.365, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'Half at 72.9 % (topside without gracilis)' }, ...usdaSteak(344, 'round, top round steak, boneless'), defaultThicknessCm: inch(0.5), cookingId: 'flash-steak' }),
        ],
      },
      { id: 'diced', label: 'Diced (casserole beef)', products: [{ id: 'topside-diced', name: 'Casserole beef (diced topside)', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'silverside',
    name: 'Silverside',
    aka: ['Eye of round', 'Salmon cut', 'Spiced beef', 'Corned beef', 'Pot roast'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.38, 'Silverside with salmon cut (eye of round), 9.66 kg per side'),
    description: 'The outside of the hind leg. Lean pot roasts, and the traditional cut for Irish spiced and corned beef. The eye of round (salmon cut) can be taken out as a neat joint.',
    defaultOption: 'pot-roast',
    diagramIds: ['silverside'],
    options: [
      { id: 'pot-roast', label: 'Silverside pot roasts', products: [{ id: 'silverside-roast', name: 'Silverside (pot roast)', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'pot-roast' }] },
      {
        id: 'split',
        label: 'Eye of round out, rest pot roast',
        parts: [
          {
            id: 'eye-of-round',
            name: 'Eye of round (salmon cut)',
            share: 0.29,
            defaultOption: 'roast',
            options: [
              { id: 'roast', label: 'Eye of round roast', products: [{ id: 'eye-of-round', name: 'Eye of round roast', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'pot-roast' }] },
              { id: 'steaks', label: 'Eye of round steaks', products: [steak({ id: 'eye-of-round-steak', name: 'Eye of round steak', fraction: 0.95, fractionRef: F.roastStyle, ...usdaSteak(140, 'round, eye of round steak, boneless'), defaultThicknessCm: inch(0.75), cookingId: 'braise' })] },
              { id: 'cured', label: 'Spiced / corned', products: [{ id: 'eye-of-round-cured', name: 'Spiced eye of round', kind: 'cured', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'cured' }] },
            ],
          },
          {
            id: 'outside',
            name: 'Silverside (remainder)',
            share: 0.71,
            defaultOption: 'pot-roast',
            options: [
              { id: 'pot-roast', label: 'Pot roasts', products: [{ id: 'silverside-roast-b', name: 'Silverside (pot roast)', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'pot-roast' }] },
              { id: 'cured', label: 'Spiced / corned beef', products: [{ id: 'silverside-cured-b', name: 'Spiced / corned silverside', kind: 'cured', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'cured' }] },
              { id: 'diced', label: 'Diced', products: [{ id: 'silverside-diced-b', name: 'Diced silverside', kind: 'diced', fraction: 0.70, fractionRef: F.outsideRound, cookingId: 'stew' }] },
              toMince(),
            ],
          },
        ],
      },
      { id: 'cured', label: 'Spiced / corned beef', description: 'Ask for it brined; traditional Irish spiced beef.', products: [{ id: 'silverside-cured', name: 'Spiced / corned silverside', kind: 'cured', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'cured' }] },
      { id: 'round-steak', label: 'Round steaks', products: [steak({ id: 'silverside-round-steak', name: 'Round steak (silverside)', fraction: 0.70, fractionRef: F.outsideRound, ...usdaSteak(305, 'round, outside round, bottom round, steak'), defaultThicknessCm: inch(0.5), cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'silverside-diced', name: 'Diced silverside', kind: 'diced', fraction: 0.70, fractionRef: F.outsideRound, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'thick-flank',
    name: 'Thick flank (knuckle)',
    aka: ['Ball of round', 'Knuckle', 'Round steak'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(4.22, '6.40 kg per side'),
    description: 'The front of the hind leg above the knee. Lean; Irish butchers sell it as ball of round for pot roasting, or as round steak.',
    defaultOption: 'pot-roast',
    diagramIds: ['thick-flank'],
    options: [
      { id: 'pot-roast', label: 'Ball of round pot roasts', products: [{ id: 'ball-of-round', name: 'Ball of round (pot roast)', kind: 'roast', fraction: 0.95, fractionRef: F.roastStyle, cookingId: 'pot-roast' }] },
      { id: 'round-steak', label: 'Round steaks', description: 'Steaks from the main knuckle muscles; the rest goes to dice/mince.', products: [steak({ id: 'thick-flank-steak', name: 'Round steak (thick flank)', fraction: 0.43, fractionRef: F.knuckleSteaks, ...usdaSteak(197, 'round, knuckle, tip center, steak'), defaultThicknessCm: inch(0.5), cookingId: 'flash-steak' })] },
      { id: 'minute', label: 'Minute steaks / stir-fry', products: [steak({ id: 'thick-flank-minute', name: 'Minute steak', fraction: 0.43, fractionRef: F.knuckleSteaks, ...usdaSteak(197, 'round, knuckle, tip center, steak'), defaultThicknessCm: inch(0.25), allowedThicknessCm: THIN_CM, cookingId: 'minute-steak' })] },
      { id: 'diced', label: 'Diced', products: [{ id: 'thick-flank-diced', name: 'Diced thick flank', kind: 'diced', fraction: 0.68, fractionRef: F.knuckleDiced, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'thin-flank',
    name: 'Thin flank',
    aka: ['Flank', 'Bavette', 'Skirt', 'Goose skirt', 'Inside skirt'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.66, 'Thin flank (boneless, 3-bone), 10.09 kg per side'),
    description: 'The belly wall. Mostly mince, but it holds the bavette (flank steak) and two skirts, prized grilling cuts that are marinated, cooked hot and sliced across the grain.',
    defaultOption: 'bavette',
    diagramIds: ['thin-flank'],
    options: [
      {
        id: 'bavette',
        label: 'Bavette & skirts out, rest to mince',
        products: [
          { id: 'bavette', name: 'Bavette (flank steak), whole', kind: 'piece', fraction: 0.143, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB flank skirt (bavette) fully trimmed 1.44 of 10.09 kg' }, ...ahdbPiece(1440, 'bavette'), cookingId: 'flash-steak' },
          { id: 'flank-skirts', name: 'Skirt steak (goose & inside skirt)', kind: 'piece', fraction: 0.148, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB goose skirt 0.77 + inside skirt 0.72 of 10.09 kg' }, ...ahdbPiece(745, 'goose / inside skirt (mean)', 2), cookingId: 'flash-steak' },
        ],
      },
      { id: 'rolled', label: 'Rolled flank pot roast', products: [{ id: 'rolled-flank', name: 'Rolled flank', kind: 'roast', fraction: 0.9, fractionRef: { sourceIds: ['ahdb-europ-yield'], note: 'AHDB 2010: pistola flank trimmed to 90 % visual lean' }, cookingId: 'pot-roast' }] },
      toMince('All to mince'),
    ],
  },
  {
    id: 'hind-shin',
    name: 'Hind shin & leg',
    aka: ['Leg of beef', 'Shin', 'Heel', 'Osso buco'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(3.44, 'Hind shin 1.70 + heel muscle 1.74'),
    bonePctOfCarcass: derived(0.88, ['usda-sr28', 'ahdb-yield-guide'], 'hind shin 1.70 % with shank crosscuts 34 % bone: 1.70 × 0.34 / 0.66'),
    description: 'The hind leg below the round and the heel muscle. Slow-cooking meat; cross-cut as osso buco or diced as shin / leg beef.',
    defaultOption: 'diced',
    diagramIds: ['hind-shin'],
    options: [
      {
        id: 'osso-buco',
        label: 'Osso buco + heel braising',
        description: 'Osso buco is sold by weight: no measured slice weight exists. Uses the tibia, so fewer marrow bones are left.',
        products: [
          { id: 'hind-osso-buco', name: 'Osso buco (hind shin)', kind: 'piece', fraction: 0.494, fractionRef: { sourceIds: ['ahdb-yield-guide'], note: 'AHDB hind shin 1.70 of 3.44 %' }, boneFactor: BONE.shank, weightOnly: true, defaultThicknessCm: inch(1.5), allowedThicknessCm: THICK_CM, cookingId: 'shin' },
          { id: 'heel-braise', name: 'Heel (leg) braising beef', kind: 'diced', fraction: 0.481, fractionRef: { sourceIds: ['ahdb-yield-guide', 'ahdb-europ-yield'], note: 'AHDB heel 1.74 of 3.44 % × 95 % dicing yield' }, cookingId: 'shin' },
        ],
      },
      { id: 'diced', label: 'Boneless shin & leg', products: [{ id: 'hind-shin-boneless', name: 'Shin / leg beef', kind: 'diced', fraction: 0.95, fractionRef: F.dice95, cookingId: 'shin' }] },
      toMince(),
    ],
  },
];

/** Lean trim (85 % VL) not attributable to a region — always goes to the trim pool (mince, burgers, diced). */
export const TRIM_POOL_PCT_OF_CARCASS: Sourced = derived(10.622, ['ahdb-yield-guide', 'ncba-subprimal', 'usda-sr28'], 'AHDB trim 11.41 % less the 0.788 % short-rib plate meat');

/** Total bone and fat in the AHDB reference carcass (% of carcass) — the pools bone-in cuts draw from. */
export const REFERENCE_BONE_PCT: Sourced = {
  value: 16.17,
  evidence: 'verified',
  sourceIds: ['ahdb-yield-guide', 'mla-bone', 'teagasc-dissection'],
  note: 'AHDB R4H (fore rib bone held separately). Cross-checks: MLA boning-room bone 19–20 % (steer/cow/bull), Teagasc dissection 19.7 %',
};
export const REFERENCE_FAT_PCT: Sourced = { value: 5.78, evidence: 'verified', sourceIds: ['ahdb-yield-guide'] };

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
