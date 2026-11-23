// Fifth-quarter parts: presence, Irish status, availability and amounts. Pure functions.
import { PARTS } from '../data/parts';
import type { Animal, AnimalPart, Availability, PartRequest, PartStatus } from '../model/types';
import { matches } from './conditions';

export interface PartInfo {
  part: AnimalPart;
  present: boolean;
  status: PartStatus;
  statusNote?: string;
  availability: Availability;
  availabilityNote?: string;
  /** Can the user ask for it at all? (not SRM, not Cat 2, not 'never'). */
  requestable: boolean;
  /** Pool-derived parts (carcass bones, fat trim) are sized by the mass balance, not here. */
  pooled: boolean;
}

export const POOLED_PART_IDS = ['marrow-bones', 'soup-bones', 'fat-trim'] as const;

export function partInfo(part: AnimalPart, a: Animal, carcassKg: number): PartInfo {
  const present = !part.presentWhen || matches(part.presentWhen, a, carcassKg);
  const sr = part.statusRules?.find((r) => matches(r.when, a, carcassKg));
  const ar = part.availabilityRules?.find((r) => matches(r.when, a, carcassKg));
  const status = sr?.status ?? part.status;
  const availability = ar?.availability ?? part.availability;
  const requestable = present && status !== 'srm' && status !== 'abp-cat2' && availability !== 'never';
  return {
    part,
    present,
    status,
    statusNote: sr?.note,
    availability,
    availabilityNote: ar?.note,
    requestable,
    pooled: (POOLED_PART_IDS as readonly string[]).includes(part.id),
  };
}

export function allPartInfo(a: Animal, carcassKg: number): PartInfo[] {
  return PARTS.map((p) => partInfo(p, a, carcassKg));
}

/**
 * Share of a single animal's part that this customer receives.
 * Half share: divisible parts are halved; single items go whole to one sharer (takeWhole) or not at all.
 */
export function shareFactor(part: AnimalPart, a: Animal, req: PartRequest | undefined): number {
  if (a.share === 'whole') return 1;
  if (part.halfShare === 'whole-or-none') return req?.takeWhole ? 1 : 0;
  return 0.5;
}

/** Raw (as removed) weight of a non-pooled part for this customer. */
export function partKg(part: AnimalPart, a: Animal, liveKg: number, carcassKg: number, req: PartRequest | undefined): number {
  const basisKg = part.reference.basis === 'live' ? liveKg : carcassKg;
  return (basisKg * part.reference.pct.value) / 100 * shareFactor(part, a, req);
}
