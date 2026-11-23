// Loin planner: T-bones / porterhouses, whole or centre fillets, sirloin joints, and the rest as steaks — placed on
// each side so the anatomy allows it. Pure functions.
import { CENTRE_SIDE_TBONE_MAX, CENTRE_SIDE_TBONE_SECTION, LOIN_BONE, LOIN_PER_SIDE_KG as K, LOIN_PRODUCTS as P, LOIN_YIELDS as Y, TAIL_SECTION_OF_SHORT_LOIN, WING_SHARE_OF_STRIPLOIN } from '../data/loin';
import type { ProductSpec } from '../model/types';

export interface LoinRequest {
  tbones?: number;
  wholeFillets?: number;
  centreFillets?: number;
  sirloinRoasts?: number;
  /** 1 = sirloin roasts on the bone (wing rib). */
  wingOnBone?: number;
}

export type Reservation = 'whole' | 'centre' | 'none';

export interface LoinSide {
  reservation: Reservation;
  tBones: number;
  porterhouses: number;
}

export interface LoinOutput {
  spec: ProductSpec;
  leanKg: number;
  boneKg: number;
  /** Fixed count (pieces, chosen roasts, on-bone steaks); undefined = size like any other product. */
  count?: number;
}

export interface LoinPlan {
  sides: LoinSide[];
  /** What was actually used after clamping. */
  used: Required<LoinRequest>;
  max: { onBone: number; wholeFillets: number; centreFillets: number; sirloinRoasts: number };
  /** Requests that didn't fit (e.g. thicker steaks leave room for fewer T-bones). */
  clamped: string[];
  outputs: LoinOutput[];
  /** Lean not in any product (steak/roast trimming, chain): goes to the trim pool. */
  trimKg: number;
  jointKg: number;
}

interface SideCaps {
  front: number;
  rear: number;
  /** T-bones allowed on a side keeping its centre fillet whole: deliberately conservative (an estimate). */
  centre: number;
}

/**
 * @param loinKg     this customer's loin meat (all sides)
 * @param sides      1 (half share) or 2
 * @param tBoneKg    one T-bone at the chosen thickness and carcass size (bone-in)
 * @param porterKg   one porterhouse, likewise
 * @param jointKg    target boneless joint weight for the household
 */
export function planLoin(req: LoinRequest, loinKg: number, sides: number, tBoneKg: number, porterKg: number, jointKg: number): LoinPlan {
  const perSide = loinKg / sides / K.total;
  const strip = K.striploin * perSide;
  const wing = strip * WING_SHARE_OF_STRIPLOIN.value;
  const lumbar = strip - wing;
  const f = TAIL_SECTION_OF_SHORT_LOIN.value;
  const tail = K.filletTail * perSide;
  const middle = K.filletMiddle * perSide;
  const head = K.filletHead * perSide;
  const chain = K.filletChain * perSide;

  // Raw lean per side in the front (sirloin + fillet tail) and rear (sirloin + centre fillet) sections of the short loin.
  const frontRaw = lumbar * f + tail;
  const rearRaw = lumbar * (1 - f) + middle;
  // Raw lean one on-bone steak uses: its lean (weight ÷ bone factor) ÷ steak yield.
  const tRaw = tBoneKg / LOIN_BONE.tBone / Y.steak;
  const pRaw = porterKg / LOIN_BONE.porterhouse / Y.steak;
  const front = Math.floor(frontRaw / tRaw);
  const centreSide = Math.min(front, CENTRE_SIDE_TBONE_MAX.value, Math.floor((lumbar * CENTRE_SIDE_TBONE_SECTION.value + tail) / tRaw));
  const caps: SideCaps = { front, rear: Math.floor(rearRaw / pRaw), centre: centreSide };
  const capOf = (r: Reservation) => (r === 'whole' ? 0 : r === 'centre' ? caps.centre : caps.front + caps.rear);
  const capacity = (w: number, c: number) => (sides - w - c) * capOf('none') + c * capOf('centre');

  const clamped: string[] = [];
  const clamp = (name: string, want: number | undefined, max: number) => {
    const n = Math.max(0, Math.round(want ?? 0));
    if (n > max) clamped.push(`${name}: ${n} asked for, ${max} fit`);
    return Math.min(n, max);
  };

  // Fillet reservations first (they limit T-bones), then T-bones within what's left.
  const wholeFillets = clamp('Whole fillets', req.wholeFillets, sides);
  const centreFillets = clamp('Centre fillets', req.centreFillets, sides - wholeFillets);
  const onBoneMax = capacity(wholeFillets, centreFillets);
  const onBone = clamp('T-bones & porterhouses', req.tbones, onBoneMax);

  // Steppers show what each choice can still go to without forcing another change.
  let maxWhole = 0;
  for (let w = 0; w <= sides - centreFillets; w++) if (capacity(w, centreFillets) >= onBone) maxWhole = w;
  let maxCentre = 0;
  for (let c = 0; c <= sides - wholeFillets; c++) if (capacity(wholeFillets, c) >= onBone) maxCentre = c;

  // Sides: whole-fillet sides, then centre-fillet sides, then unreserved.
  const sideList: LoinSide[] = Array.from({ length: sides }, (_, i) => ({
    reservation: i < wholeFillets ? 'whole' : i < wholeFillets + centreFillets ? 'centre' : 'none',
    tBones: 0,
    porterhouses: 0,
  }));
  // Place on-bone steaks: unreserved sides first (front, then rear), round-robin; then centre-fillet sides' fronts.
  let left = onBone;
  const unreserved = sideList.filter((s) => s.reservation === 'none');
  const centre = sideList.filter((s) => s.reservation === 'centre');
  const fill = (list: LoinSide[], key: 'tBones' | 'porterhouses', cap: number) => {
    let progress = true;
    while (left > 0 && progress) {
      progress = false;
      for (const s of list) if (left > 0 && s[key] < cap) { s[key]++; left--; progress = true; }
    }
  };
  fill(unreserved, 'tBones', caps.front);
  fill(unreserved, 'porterhouses', caps.rear);
  fill(centre, 'tBones', caps.centre);

  // ── Per side → pools ──
  let tBoneLean = 0, porterLean = 0, sirloinRaw = 0, wingRaw = 0, filletSteakRaw = 0, tailRaw = 0, tailPieces = 0, trim = 0;
  let wholeLean = 0, centreLean = 0;
  for (const s of sideList) {
    const cf = caps.front ? s.tBones / (frontRaw / tRaw) : 0;
    const cr = caps.rear ? s.porterhouses / (rearRaw / pRaw) : 0;
    tBoneLean += s.tBones * tRaw * Y.steak;
    porterLean += s.porterhouses * pRaw * Y.steak;
    trim += (s.tBones * tRaw + s.porterhouses * pRaw) * (1 - Y.steak);
    sirloinRaw += lumbar * f * (1 - cf) + lumbar * (1 - f) * (1 - cr);
    wingRaw += wing;
    trim += chain;
    const tailLeft = tail * (1 - cf);
    const middleLeft = middle * (1 - cr);
    if (s.reservation === 'whole') wholeLean += tail + middle + head;
    else {
      if (s.reservation === 'centre') {
        centreLean += middle;
        filletSteakRaw += head;
      } else filletSteakRaw += middleLeft + head;
      if (tailLeft > 0.0001) {
        tailRaw += tailLeft;
        tailPieces++;
      }
    }
  }
  const filletSteakLean = filletSteakRaw * Y.filletSteak;
  trim += filletSteakRaw - filletSteakLean;

  // ── Sirloin: joints (boneless from the whole sirloin, or on the bone from the wing section), rest as steaks ──
  const onBoneRoast = (req.wingOnBone ?? 0) > 0;
  const roastBone = onBoneRoast ? LOIN_BONE.wingRib : 1;
  const roastPool = onBoneRoast ? wingRaw : sirloinRaw + wingRaw;
  const maxRoasts = Math.max(0, Math.round((roastPool * Y.roast * roastBone) / (jointKg * roastBone)));
  const sirloinRoasts = clamp('Sirloin joints', req.sirloinRoasts, maxRoasts);
  const roastRaw = sirloinRoasts === 0 ? 0 : sirloinRoasts === maxRoasts ? roastPool : Math.min(roastPool, (sirloinRoasts * jointKg) / Y.roast);
  const roastLean = roastRaw * Y.roast;
  trim += roastRaw - roastLean;
  const sirloinSteakRaw = sirloinRaw + wingRaw - roastRaw;
  const sirloinSteakLean = sirloinSteakRaw * Y.steak;
  trim += sirloinSteakRaw - sirloinSteakLean;

  const out: LoinOutput[] = [];
  const push = (spec: ProductSpec, lean: number, bf: number, count?: number) => {
    if (lean > 1e-9) out.push({ spec, leanKg: lean, boneKg: lean * (bf - 1), count });
  };
  const sum = (k: 'tBones' | 'porterhouses') => sideList.reduce((a, s) => a + s[k], 0);
  push(P.tBone, tBoneLean, LOIN_BONE.tBone, sum('tBones'));
  push(P.porterhouse, porterLean, LOIN_BONE.porterhouse, sum('porterhouses'));
  push(P.wholeFillet, wholeLean, 1, wholeFillets);
  push(P.centreFillet, centreLean, 1, centreFillets);
  push(P.filletSteak, filletSteakLean, 1);
  push(P.filletTail, tailRaw, 1, tailPieces);
  push(onBoneRoast ? P.wingRib : P.sirloinRoast, roastLean, roastBone, sirloinRoasts);
  push(P.sirloinSteak, sirloinSteakLean, 1);

  return {
    sides: sideList,
    used: { tbones: onBone, wholeFillets, centreFillets, sirloinRoasts, wingOnBone: onBoneRoast ? 1 : 0 },
    max: { onBone: onBoneMax, wholeFillets: maxWhole, centreFillets: maxCentre, sirloinRoasts: maxRoasts },
    clamped,
    outputs: out,
    trimKg: trim,
    jointKg,
  };
}

/** Per-side butcher's instructions. */
export function loinInstructions(plan: LoinPlan): string[] {
  const n = plan.sides.length;
  return plan.sides.map((s, i) => {
    const bits: string[] = [];
    const onBone = s.tBones + s.porterhouses;
    if (onBone && s.reservation === 'centre')
      bits.push(`cut at most ${s.tBones} T-bone${s.tBones > 1 ? 's' : ''} from the very front of the short loin, stopping before the centre fillet (fewer if the fillet is already thickening — your call); then take out the rest of the fillet`);
    else if (onBone) {
      const what = [s.tBones ? `${s.tBones} T-bone${s.tBones > 1 ? 's' : ''}` : '', s.porterhouses ? `${s.porterhouses} porterhouse${s.porterhouses > 1 ? 's' : ''}` : ''].filter(Boolean).join(' then ');
      bits.push(`cut ${what} from the front of the short loin`);
      bits.push(onBone && s.reservation !== 'whole' ? 'then take out the rest of the fillet' : '');
    } else bits.push('take out the whole fillet');
    if (s.reservation === 'whole') bits.push('keep the fillet whole (chain off)');
    else if (s.reservation === 'centre') bits.push('keep the centre fillet whole for Wellington / chateaubriand; head as fillet steaks; tail for stir-fry');
    else bits.push('fillet as steaks; tail for stir-fry');
    bits.push('bone the sirloin');
    return `${n > 1 ? `Side ${i + 1}: ` : ''}${bits.filter(Boolean).join('; ')}.`;
  });
}
