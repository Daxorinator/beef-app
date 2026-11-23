// Every non-meat part of the animal (the "fifth quarter") plus carcass-derived bones and fat. Constants only.
// Live-weight %: AHDB Beef Yield Guide, 600 kg R4L steer (53 % kill-out).
// Irish status: SRM per Reg. 999/2001 Annex V point 2 (negligible risk); ABP categories per Reg. 1069/2009 Arts 8–10.
import type { AnimalPart, Sourced } from '../model/types';

const live = (pct: number, note?: string): AnimalPart['reference'] => ({
  basis: 'live',
  pct: { value: pct, evidence: 'verified', sourceIds: ['ahdb-yield-guide'], note } satisfies Sourced,
});
const liveEst = (pct: number, note: string): AnimalPart['reference'] => ({
  basis: 'live',
  pct: { value: pct, evidence: 'estimate', sourceIds: ['ahdb-yield-guide'], note },
});
const carcassEst = (pct: number, note: string): AnimalPart['reference'] => ({
  basis: 'carcass',
  pct: { value: pct, evidence: 'estimate', sourceIds: ['ahdb-yield-guide', 'teagasc-dissection'], note },
});

const OVER_12 = { minAgeMonths: 12 };

export const PARTS: AnimalPart[] = [
  // ───────── Offal (edible) ─────────
  { id: 'liver', name: 'Liver', group: 'offal', reference: live(1.31), status: 'edible', availability: 'usually', halfShare: 'by-agreement', uses: ['Pan-fried liver', 'Pâté'], cookingId: 'liver', requestNote: 'Ask for it sliced and bagged in meal portions.' },
  { id: 'heart', name: 'Heart', group: 'offal', reference: live(0.37), status: 'edible', availability: 'usually', halfShare: 'by-agreement', uses: ['Braised or sliced and seared', 'Mince blend'], cookingId: 'kidney-heart' },
  { id: 'kidneys', name: 'Kidneys', group: 'offal', reference: live(0.19, 'Removed before carcass weighing (2017/1182 Art. 6(3))'), status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Steak & kidney pie', 'Devilled kidneys'], cookingId: 'kidney-heart' },
  { id: 'tongue', name: 'Tongue', group: 'offal', reference: live(0.37, 'Incl. trimmings'), status: 'edible', availability: 'usually', halfShare: 'whole-or-none', uses: ['Boiled / pressed tongue', 'Braised'], cookingId: 'tongue', requestNote: 'No special SRM cut is required for Irish-origin cattle (999/2001 Annex V point 7 exemption).' },
  {
    id: 'cheeks', name: 'Cheeks & head meat', aka: ['Ox cheek'], group: 'head', reference: live(0.35, 'Head & cheek meat incl. trimmings'),
    status: 'edible', availability: 'usually', halfShare: 'split',
    availabilityRules: [{ when: OVER_12, availability: 'usually', note: 'Over 12 months, head meat must be harvested at the slaughterhouse under a control system (999/2001 Annex V point 8). Irish abattoirs generally return cheeks.' }],
    uses: ['Slow-braised ox cheek'], cookingId: 'braise',
  },
  { id: 'oxtail', name: 'Oxtail', group: 'offal', reference: live(0.19, 'Tail removed before carcass weighing; tail vertebrae are never SRM'), status: 'edible', availability: 'usually', halfShare: 'whole-or-none', uses: ['Oxtail stew', 'Oxtail soup'], cookingId: 'oxtail', requestNote: 'Ask for it jointed into sections.' },
  { id: 'thin-skirt', name: 'Thin skirt (flank side of the diaphragm)', group: 'offal', reference: { basis: 'carcass', pct: { value: 0.4, evidence: 'verified', sourceIds: ['eu-2017-1184'], note: 'Removed before carcass weighing (2017/1182 Art. 6(3)); size from the 2017/1184 corrective factor' } }, status: 'edible', availability: 'on-request', halfShare: 'split', uses: ['Skirt steak (marinate, grill hot)', 'Mince'], cookingId: 'flash-steak', requestNote: 'Removed with the offal at dressing; ask for it or it usually goes to trim.' },
  { id: 'thick-skirt', name: 'Thick skirt (onglet / hanger)', aka: ['Onglet', 'Hanger steak', 'Butcher’s steak'], group: 'offal', reference: live(0.21, 'Removed with the offal before carcass weighing'), status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Grilled hot, sliced across the grain'], cookingId: 'flash-steak', requestNote: 'Removed at the abattoir with the offal — ask for it specifically or it is often lost.' },
  {
    id: 'sweetbreads', name: 'Sweetbreads (thymus)', group: 'offal', reference: live(0.06), status: 'edible', availability: 'on-request', halfShare: 'whole-or-none',
    availabilityRules: [{ when: { minAgeMonths: 24 }, availability: 'rarely', note: 'The thymus shrinks with age; mainly from young animals.' }],
    ageNote: 'Best from animals under about 2 years.', uses: ['Pan-fried sweetbreads'], cookingId: 'sweetbreads',
  },
  { id: 'lungs', name: 'Lungs (lights)', group: 'offal', reference: live(0.6), status: 'edible', availability: 'rarely', halfShare: 'by-agreement', uses: ['Pet food', 'Traditional dishes'], requestNote: 'Listed by AHDB as fit for human consumption; mostly used for pet food.' },
  { id: 'spleen-pancreas', name: 'Spleen & pancreas', group: 'offal', reference: live(0.21), status: 'edible', availability: 'rarely', halfShare: 'by-agreement', uses: ['Pet food'] },
  { id: 'weasand', name: 'Weasand meat & trachea', aka: ['Oesophagus'], group: 'offal', reference: live(0.23, 'Trachea & trim 0.19 + oesophagus 0.04'), status: 'edible', availability: 'rarely', halfShare: 'by-agreement', uses: ['Mince / sausage', 'Dog chews'] },
  { id: 'lips', name: 'Lips', group: 'head', reference: live(0.19), status: 'edible', availability: 'rarely', halfShare: 'split', uses: ['Co-product', 'Pet food'] },
  { id: 'pizzle-testicles', name: 'Pizzle & testicles', group: 'other', reference: live(0.22, 'Steer reference; testicles only in bulls'), status: 'edible', availability: 'rarely', halfShare: 'whole-or-none', presentWhen: { sex: ['bull', 'steer'] }, uses: ['Dog chews (pizzle)', 'Delicacy (testicles)'] },

  // ───────── Needs processing before eating ─────────
  { id: 'tripe', name: 'Tripe (stomachs)', aka: ['Honeycomb tripe', 'Blanket tripe'], group: 'digestive', reference: live(2.61, 'All four stomachs'), status: 'edible-processing', availability: 'rarely', halfShare: 'by-agreement', uses: ['Tripe & onions', 'Dog food (green tripe)'], cookingId: 'tripe', requestNote: 'Must be emptied, cleaned and scalded ("dressed"). Few small abattoirs can supply dressed tripe.' },
  { id: 'feet', name: 'Feet (cow heel)', group: 'other', reference: live(1.86), status: 'edible-processing', availability: 'rarely', halfShare: 'split', uses: ['Cow heel (gelatine, stock)', 'Dog chews'], requestNote: 'Category 3 if not used as food (1069/2009 Art. 10(b)(iii)). Needs scalding and dehairing for food use.' },
  { id: 'blood', name: 'Blood', group: 'blood', reference: live(3.36), status: 'edible-processing', availability: 'rarely', halfShare: 'by-agreement', uses: ['Black pudding'], requestNote: 'Must be hygienically collected at sticking and kept chilled; rarely offered. Category 3 otherwise (Art. 10(d)).' },
  { id: 'intestines', name: 'Intestines (casings)', group: 'digestive', reference: live(2.8, 'Incl. fill'), status: 'edible-processing', availability: 'never', halfShare: 'by-agreement', uses: ['Natural sausage casings'], requestNote: 'Not SRM in Ireland (negligible risk), but no practical small-abattoir route to cleaned casings.' },

  // ───────── Fats ─────────
  { id: 'suet', name: 'Suet (kidney & pelvic fat)', aka: ['KKCF', 'Kidney knob and channel fat'], group: 'fat', reference: live(1.86, 'Removed before carcass weighing'), status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Suet pastry & puddings', 'Rendered tallow / dripping', 'Bird feed'], cookingId: 'fat-render' },
  { id: 'caul-fat', name: 'Caul fat', group: 'fat', reference: live(2.42), status: 'edible', availability: 'on-request', halfShare: 'by-agreement', uses: ['Wrapping faggots & lean roasts', 'Rendering'] },
  { id: 'cod-udder-fat', name: 'Cod fat (steer) / udder fat (heifer, cow)', group: 'fat', reference: live(0.75, 'Cod fat, steer reference'), status: 'edible', availability: 'on-request', halfShare: 'split', uses: ['Rendering'], presentWhen: { sex: ['steer', 'heifer', 'cow'] } },
  { id: 'lung-fat', name: 'Lung fat', group: 'fat', reference: live(0.26), status: 'abp-cat3', availability: 'rarely', halfShare: 'by-agreement', uses: ['Rendering'] },
  { id: 'gut-fat', name: 'Intestinal (mesenteric) fat', group: 'fat', reference: live(2.24), status: 'abp-cat3', availability: 'rarely', halfShare: 'by-agreement', uses: ['Rendering'] },
  {
    id: 'fat-trim', name: 'Carcass fat trim', aka: ['Dripping', 'Tallow'], group: 'fat',
    reference: { basis: 'carcass', pct: { value: 5.78, evidence: 'verified', sourceIds: ['ahdb-yield-guide', 'ahdb-europ-yield'], note: 'R4H reference; 4.9–14 % by grade (AHDB 2010 Table 4)' } },
    status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Rendered beef dripping / tallow', 'Burger fat'], cookingId: 'fat-render',
    requestNote: 'Ask for fat trim to be kept and bagged (raw), or rendered if your butcher offers it.',
  },

  // ───────── Bones (from the carcass) ─────────
  { id: 'marrow-bones', name: 'Marrow bones', group: 'bone', reference: carcassEst(3.0, 'Femur, humerus and shank bones cut for marrow; share of the 16–20 % carcass bone'), status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Roast marrow', 'Rich stock'], cookingId: 'bones', requestNote: 'Ask for them cross-cut (about 5 cm) or split lengthways (canoe cut).' },
  { id: 'soup-bones', name: 'Soup & stock bones', aka: ['Knuckle bones', 'Dog bones'], group: 'bone', residualOf: 'bone', reference: carcassEst(13.17, 'Residual: carcass bone (16.17 % at R4H) minus marrow bones (3 %) minus any bone left in cuts. Vertebral column is fine in Ireland'), status: 'edible', availability: 'usually', halfShare: 'split', uses: ['Bone broth / stock', 'Dog bones (raw)'], cookingId: 'bones', requestNote: 'Ask for them sawn to fit a stockpot. Bovine bones may not be used for mechanically separated meat (Annex V point 5).' },
  { id: 'mandible', name: 'Jaw bone (mandible)', group: 'bone', reference: live(0.26), status: 'abp-cat3', availability: 'rarely', halfShare: 'whole-or-none', uses: ['Dog chew', 'Craft'], requestNote: 'Explicitly not SRM (Annex V point 1(a)(i) excludes the mandible).' },

  // ───────── Hide, horns, ears ─────────
  {
    id: 'hide', name: 'Hide', group: 'hide-skin', reference: live(7.08, 'Raw, fresh'),
    status: 'abp-cat3', availability: 'on-request', halfShare: 'whole-or-none',
    uses: ['Tanned leather', 'Hair-on cowhide rug'],
    requestNote:
      'Varies by abattoir — arrange before the kill. Untreated hide is Category 3 and travels with a commercial document; it must be fleshed and salted promptly. Once fully tanned it is outside ABP controls (142/2011 Annex XIII Ch. V C.2). Expect a specialist tanner and a long turnaround.',
  },
  { id: 'horns', name: 'Horns', group: 'hide-skin', reference: liveEst(0.15, 'Not weighed by AHDB; small, variable'), status: 'abp-cat3', availability: 'on-request', halfShare: 'by-agreement', presentWhen: { horned: true }, uses: ['Craft', 'Decoration'], requestNote: 'Only from horned animals (Angus is polled; dairy stock usually disbudded). Category 3 (Art. 10(b)(iii)).' },
  { id: 'ears', name: 'Ears', group: 'hide-skin', reference: live(0.21), status: 'abp-cat3', availability: 'rarely', halfShare: 'split', uses: ['Dog chews'] },

  // ───────── Never returned ─────────
  {
    id: 'skull-brain-eyes', name: 'Skull, brain & eyes', group: 'head', reference: live(1.15, 'Remainder head incl. skull, tonsils, brain, eyes'),
    status: 'abp-cat3', availability: 'never', halfShare: 'whole-or-none',
    statusRules: [{ when: OVER_12, status: 'srm', note: 'SRM over 12 months (999/2001 Annex V points 1(a)(i), 2)' }],
    uses: [], requestNote: 'Specified risk material in cattle over 12 months — stained and disposed of as Category 1. Never returned.',
  },
  {
    id: 'spinal-cord', name: 'Spinal cord', group: 'other', reference: live(0.03),
    status: 'abp-cat3', availability: 'never', halfShare: 'split',
    statusRules: [{ when: OVER_12, status: 'srm', note: 'SRM over 12 months' }],
    uses: [], requestNote: 'Removed before weighing; SRM over 12 months.',
  },
  { id: 'gall-bladder', name: 'Gall bladder', group: 'offal', reference: live(0.09), status: 'abp-cat3', availability: 'never', halfShare: 'whole-or-none', uses: [] },
  { id: 'remainder', name: 'Other trimmings (remainder)', group: 'other', reference: live(1.21, 'AHDB "remainder" — mixed small trimmings'), status: 'abp-cat3', availability: 'never', halfShare: 'by-agreement', uses: [] },
  { id: 'gut-contents', name: 'Gut contents', group: 'digestive', reference: live(14.33, 'Gut & intestinal contents — varies with fasting'), status: 'abp-cat2', availability: 'never', halfShare: 'by-agreement', uses: [], requestNote: 'Category 2 (Art. 9(a)). Never returned.' },
];

export const PART_BY_ID: Record<string, AnimalPart> = Object.fromEntries(PARTS.map((p) => [p.id, p]));
