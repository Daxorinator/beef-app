// Loin (sirloin & fillet) anatomy and products for the loin planner. Constants only.
// Per side, front to back: wing rib (ribs 11–13: sirloin only) → short loin (6 lumbar vertebrae: sirloin above,
// fillet tail then centre below) → fillet head (under the rump, never in a T-bone). RESEARCH §4, §6.1.
import type { ProductSpec, Sourced } from '../model/types';
import { FILLET_CM, inch, STEAK_CM } from './thickness';

const d = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived: ${note}` });

/** AHDB Beef Yield Guide, kg per side of the 303 kg reference carcass. They sum to the loin region (6.41 % of carcass). */
export const LOIN_PER_SIDE_KG = {
  striploin: 6.8,
  filletTail: 0.29,
  filletMiddle: 1.25,
  filletHead: 1.04,
  /** Chain (side strap) removed when the fillet is trimmed: 2.91 − 2.58 kg. Goes to trim. */
  filletChain: 0.33,
  total: 9.71,
  sourceIds: ['ahdb-yield-guide'],
};

/** Share of the 3-rib striploin in the wing-rib section (ribs 11–13), by length: 3 of 9 vertebrae. */
export const WING_SHARE_OF_STRIPLOIN: Sourced = d(3 / 9, ['ahdb-yield-guide'], 'AHDB "3-rib" boneless sirloin spans ribs 11–13 plus 6 lumbar vertebrae; share by vertebra count (3 of 9)');

/**
 * Share of the short loin (by length) over the thin fillet tail. T-bones cut from this front section leave the centre
 * fillet intact. No measured figure exists: the tail is taken to run under the front 2 of the 6 lumbar vertebrae.
 */
export const TAIL_SECTION_OF_SHORT_LOIN: Sourced = d(1 / 3, ['ahdb-yield-guide'], 'estimate from anatomy: fillet tail under roughly the front 2 of 6 lumbar vertebrae (AHDB splits the fillet into tail, middle and head by weight only)');

/**
 * Conservative limits for T-bones on a side whose centre fillet is kept whole (Wellington / chateaubriand). How far back
 * T-bones can go before cutting into the centre fillet is not measured anywhere, so the planner deliberately allows
 * only the first lumbar vertebra's worth, and never more than 2 per side. The user is told to confirm with the butcher.
 */
export const CENTRE_SIDE_TBONE_SECTION: Sourced = d(1 / 6, ['ahdb-yield-guide'], 'deliberately conservative estimate: only the front 1 of 6 lumbar vertebrae (half of TAIL_SECTION_OF_SHORT_LOIN) when the centre fillet must stay whole');
export const CENTRE_SIDE_TBONE_MAX: Sourced = d(2, ['ahdb-yield-guide'], 'deliberately conservative hard cap per side, pending the butcher\'s own judgement');

export const LOIN_YIELDS = {
  /** Strip-loin → steaks 83.9–85.3 % (Texas A&M); applied to T-bones, porterhouses and sirloin steaks. */
  steak: 0.85,
  /** Trimmed fillet → steaks 94 % (Steele 2020). */
  filletSteak: 0.94,
  /** Retail roasts 94.9 % (Texas A&M). */
  roast: 0.95,
  sourceIds: ['tamu-rib-loin', 'steele-2020'],
};

/** Bone factors: 1 / (1 − USDA refuse): T-bone 25 %, porterhouse 23 %, bone-in top loin (wing rib) 10 %. */
export const LOIN_BONE = { tBone: 1 / 0.75, porterhouse: 1 / 0.77, wingRib: 1 / 0.9 };

const usda = (g: number, cut: string) => ({
  gramsPerCm: Math.round((g / 2.54) * 10) / 10,
  sizeRef: { carcassKg: 356, sourceIds: ['usda-sr28', 'west-ndi-chuck'], note: `USDA SR28 "${cut}" ${g} g per 1" steak` },
});
const ref = (note: string, sourceIds = ['ahdb-yield-guide', 'tamu-rib-loin']) => ({ sourceIds, note });

/** Products the planner can make. `fraction` is not used by the planner (it works from the per-side kg above). */
export const LOIN_PRODUCTS: Record<string, ProductSpec> = {
  tBone: { id: 't-bone', name: 'T-bone steak', kind: 'steak', fraction: 0, fractionRef: ref('Front of the short loin: sirloin + fillet tail, × strip-steak yield 85 %'), boneFactor: LOIN_BONE.tBone, ...usda(460, 'short loin, t-bone steak'), defaultThicknessCm: inch(1), allowedThicknessCm: STEAK_CM, cookingId: 'prime-steak' },
  porterhouse: { id: 'porterhouse', name: 'Porterhouse steak', kind: 'steak', fraction: 0, fractionRef: ref('Rear of the short loin: sirloin + centre fillet, × strip-steak yield 85 %'), boneFactor: LOIN_BONE.porterhouse, ...usda(534, 'short loin, porterhouse steak'), defaultThicknessCm: inch(1), allowedThicknessCm: STEAK_CM, cookingId: 'prime-steak' },
  wholeFillet: { id: 'whole-fillet', name: 'Whole fillet', kind: 'piece', fraction: 0, fractionRef: ref('AHDB fillet without chain 2.58 of 2.91 kg', ['ahdb-yield-guide']), perSide: 1, pieceGrams: 2580, sizeRef: { carcassKg: 303, sourceIds: ['ahdb-yield-guide'], note: 'AHDB fillet, chain off, per side' }, cookingId: 'fillet' },
  centreFillet: { id: 'chateaubriand', name: 'Centre fillet (Wellington / chateaubriand)', kind: 'piece', fraction: 0, fractionRef: ref('AHDB middle fillet 1.25 kg per side, kept whole', ['ahdb-yield-guide']), perSide: 1, pieceGrams: 1250, sizeRef: { carcassKg: 303, sourceIds: ['ahdb-yield-guide'], note: 'AHDB middle fillet, per side' }, cookingId: 'fillet' },
  filletSteak: { id: 'fillet-steak', name: 'Fillet steak', aka: ['Tournedos', 'Medallion'], kind: 'steak', fraction: 0, fractionRef: ref('AHDB fillet head and any centre not kept whole, × 94 % steak yield', ['ahdb-yield-guide', 'steele-2020']), gramsPerCm: 45.3, sizeRef: { carcassKg: 356, sourceIds: ['steele-2020'], note: '170.1 g steaks at 35.5–39.6 mm across ribeye-area categories' }, defaultThicknessCm: inch(1.5), allowedThicknessCm: FILLET_CM, cookingId: 'fillet' },
  filletTail: { id: 'fillet-tail', name: 'Fillet tail (stir-fry / stroganoff)', kind: 'piece', fraction: 0, fractionRef: ref('AHDB fillet tail 0.29 kg per side', ['ahdb-yield-guide']), perSide: 1, pieceGrams: 290, sizeRef: { carcassKg: 303, sourceIds: ['ahdb-yield-guide'], note: 'AHDB fillet tail, per side' }, cookingId: 'fillet' },
  sirloinSteak: { id: 'sirloin-steak', name: 'Sirloin (striploin) steak', aka: ['Striploin steak', 'Entrecôte'], kind: 'steak', fraction: 0, fractionRef: ref('Boned sirloin × strip-steak yield 85 % (Texas A&M)'), ...usda(302, 'loin, top loin steak, boneless, lip-on'), defaultThicknessCm: inch(1), allowedThicknessCm: STEAK_CM, cookingId: 'prime-steak' },
  sirloinRoast: { id: 'sirloin-roast', name: 'Sirloin roast', kind: 'roast', fraction: 0, fractionRef: ref('Boned sirloin × roast yield 95 %', ['tamu-rib-loin']), cookingId: 'prime-roast' },
  wingRib: { id: 'wing-rib', name: 'Wing rib roast (sirloin on the bone)', kind: 'roast', fraction: 0, fractionRef: ref('Wing-rib section (ribs 11–13) × roast yield 95 %, bone 10 % (USDA)', ['tamu-rib-loin', 'usda-sr28']), boneFactor: LOIN_BONE.wingRib, cookingId: 'prime-roast' },
};
