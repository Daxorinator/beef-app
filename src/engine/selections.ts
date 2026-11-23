// Resolving the user's cut selections: defaults, nested parts and cross-region exclusions. Pure functions.
import { REGIONS } from '../data/regions';
import type { CutOption, Region, RegionPart, Selections } from '../model/types';

/** A chosen leaf option with the share of its region's meat it receives. */
export interface ResolvedLeaf {
  region: Region;
  /** Selection key: "loin" or "loin/striploin". */
  path: string;
  part?: RegionPart;
  option: CutOption;
  /** Share of the region's meat flowing to this leaf. */
  share: number;
}

export interface Exclusion {
  /** Path whose options are restricted. */
  path: string;
  optionIds: string[];
  reason: string;
  /** Path + option that caused it. */
  byPath: string;
  byOptionId: string;
}

export interface SelectionNotice {
  path: string;
  wanted: string;
  used: string;
  reason: string;
}

export interface ResolvedSelections {
  selections: Selections;
  leaves: ResolvedLeaf[];
  exclusions: Exclusion[];
  notices: SelectionNotice[];
}

function chosen(options: CutOption[], defaultId: string, wanted: string | undefined): CutOption {
  return options.find((o) => o.id === wanted) ?? options.find((o) => o.id === defaultId) ?? options[0];
}

/** Walk a selection set, returning every chosen option keyed by path (no exclusion handling). */
function walk(sel: Selections): { path: string; option: CutOption; region: Region; part?: RegionPart; share: number }[] {
  const out: { path: string; option: CutOption; region: Region; part?: RegionPart; share: number }[] = [];
  for (const region of REGIONS) {
    const option = chosen(region.options, region.defaultOption, sel[region.id]);
    out.push({ path: region.id, option, region, share: 1 });
    for (const part of option.parts ?? []) {
      const path = `${region.id}/${part.id}`;
      out.push({ path, option: chosen(part.options, part.defaultOption, sel[path]), region, part, share: part.share });
    }
  }
  return out;
}

export function optionsAt(path: string): CutOption[] {
  const [regionId, partId] = path.split('/');
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return [];
  if (!partId) return region.options;
  return region.options.flatMap((o) => o.parts ?? []).find((p) => p.id === partId)?.options ?? [];
}

/**
 * Apply defaults and exclusions. If an exclusion rules out the current choice at a path, the default (or the first
 * allowed option) is used instead and a notice is returned.
 */
export function resolveSelections(input: Selections): ResolvedSelections {
  let sel: Selections = { ...input };
  const notices: SelectionNotice[] = [];
  let exclusions: Exclusion[] = [];

  // Iterate to a fixed point: a fallback could itself introduce exclusions (bounded by the number of paths).
  for (let iter = 0; iter < 10; iter++) {
    const picks = walk(sel);
    exclusions = picks.flatMap((p) =>
      (p.option.excludes ?? []).map((x) => ({ ...x, byPath: p.path, byOptionId: p.option.id })),
    );
    let changed = false;
    for (const x of exclusions) {
      const pick = picks.find((p) => p.path === x.path);
      if (!pick || !x.optionIds.includes(pick.option.id)) continue;
      const opts = optionsAt(x.path);
      const region = REGIONS.find((r) => r.id === x.path.split('/')[0])!;
      const def = x.path.includes('/') ? undefined : region.defaultOption;
      const fallback = opts.find((o) => o.id === def && !x.optionIds.includes(o.id)) ?? opts.find((o) => !x.optionIds.includes(o.id));
      if (!fallback) continue;
      notices.push({ path: x.path, wanted: pick.option.id, used: fallback.id, reason: x.reason });
      sel = { ...sel, [x.path]: fallback.id };
      changed = true;
    }
    if (!changed) break;
  }

  const picks = walk(sel);
  const leaves: ResolvedLeaf[] = [];
  const normalised: Selections = {};
  for (const p of picks) {
    normalised[p.path] = p.option.id;
    if (!p.option.parts) leaves.push({ region: p.region, path: p.path, part: p.part, option: p.option, share: p.share });
  }
  return { selections: normalised, leaves, exclusions, notices };
}

/** Is optionId at path ruled out by another current choice? Returns the reason, if so. */
export function exclusionReason(resolved: ResolvedSelections, path: string, optionId: string): string | undefined {
  return resolved.exclusions.find((x) => x.path === path && x.optionIds.includes(optionId))?.reason;
}
