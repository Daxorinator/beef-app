// The calculation engine: state → mass balance, product list, parts, advisories. Pure; no React.
import { ADVISORIES } from '../data/advisories';
import { BREED_BY_ID } from '../data/breeds';
import { COOKING_BY_ID } from '../data/cooking';
import { PART_BY_ID } from '../data/parts';
import { FREEZER_LITRES_PER_KG, DICED_LEAN_PCT, TRIM_POOL_LEAN_PCT } from '../data/model-constants';
import { QPS_SPEC } from '../data/grading';
import { LOIN_PRODUCTS } from '../data/loin';
import { inchLabel, STANDARD_STEAK_CM } from '../data/thickness';
import { REGION_BY_ID, REGIONS, TRIM_POOL_PCT_OF_CARCASS } from '../data/regions';
import type { Advisory, Allocation, AllocationUse, JointPlan, ButcherPrefs, MassBalance, ProductLine, ProductSpec } from '../model/types';
import { carcassAndLive, composition, effectiveGrade, type Composition, type Grade } from './carcass';
import { matches } from './conditions';
import { allPartInfo, partKg, type PartInfo } from './parts';
import { planLoin, type LoinPlan } from './loin';
import { optionsAt, resolveSelections, type ExtraExclusion, type ResolvedSelections } from './selections';
import type { AppState } from './state';

export interface Line extends ProductLine {
  /** Selection path this line came from ("" for trim-pool products). */
  path: string;
  regionName: string;
  optionLabel: string;
  /** Bone carried in the weight (kg). */
  boneKg: number;
  /** Sold by weight only: no sourced piece size. */
  weightOnly?: boolean;
  /** How the piece / steak size was derived (shown on hover). */
  sizeNote?: string;
  /** How the butcher should cut it when it isn't a thickness (e.g. 'one rib bone each', '2-rib joints'). */
  cutNote?: string;
  /** Roasts: people each joint feeds at the chosen grams per person. */
  feeds?: number;
  /** Roasts: too little meat for even one joint of the household size. */
  undersized?: boolean;
  spec?: ProductSpec;
}

export interface PartLine {
  info: PartInfo;
  /** Raw weight as removed (kg) for this customer. */
  kg: number;
  /** After trimming, where USDA refuse is known. */
  edibleKg?: number;
  wanted: boolean;
  note?: string;
}

export interface JointPlanInfo {
  path: string;
  plan: JointPlan;
  /** Most full joints the muscle can make at the household's joint size. */
  maxRoasts: number;
  jointKg: number;
  restIdx: number;
  /** Weight if the whole muscle went to the chosen rest use (kg). */
  allRestKg: number;
  roastShare: number;
}


export interface EngineResult {
  loinPlans: { path: string; plan: LoinPlan }[];
  jointPlans: JointPlanInfo[];
  allocations: AllocationInfo[];
  resolved: ResolvedSelections;
  grade: Grade;
  killOutPct: number;
  liveIsEstimated: boolean;
  /** Whole animal carcass (kg), before the share is applied. */
  wholeCarcassKg: number;
  /** 1 for a whole animal, 0.5 for a half share. */
  shareMult: number;
  comp: Composition;
  balance: MassBalance & {
    marrowKg: number;
    soupBoneKg: number;
    boneInCutsKg: number;
    fatPoolKg: number;
    /** Extra trim & waste from craft-butcher trimming (commercial − realistic meat). */
    butcherTrimKg: number;
    trimPoolKg: number;
  };
  lines: Line[];
  parts: PartLine[];
  advisories: Advisory[];
  totals: { steaksKg: number; roastsKg: number; slowCookKg: number; minceBurgersKg: number; offalKg: number };
  freezerLitres: number;
  /** Extra space if returned bones are frozen too. */
  freezerBoneLitres: number;
}

export type UseCategory = 'steaks' | 'roasts' | 'slow' | 'mince';

/** How a line is used in the kitchen: drives the summary totals, the results table groups and the diagram colours. */
export function categoryOf(l: Pick<Line, 'kind' | 'cookingId'>): UseCategory {
  const cook = COOKING_BY_ID[l.cookingId];
  if (l.kind === 'mince' || l.kind === 'burger') return 'mince';
  if (l.kind === 'diced' || l.kind === 'ribs' || (cook?.speed === 'slow' && l.kind !== 'roast' && l.kind !== 'cured')) return 'slow';
  if (l.kind === 'steak') return 'steaks';
  return 'roasts';
}

const KIND_ORDER: ProductLine['kind'][] = ['steak', 'roast', 'piece', 'ribs', 'cured', 'diced', 'burger', 'mince'];

export function thicknessFor(p: ProductSpec, prefs: ButcherPrefs): number | undefined {
  if (p.defaultThicknessCm === undefined) return undefined;
  const o = prefs.thicknessOverrides[p.id];
  if (o !== undefined && (!p.allowedThicknessCm || p.allowedThicknessCm.includes(o))) return o;
  // The global steak thickness applies to standard steaks (default 1") where that thickness is allowed.
  if (p.kind === 'steak' && p.defaultThicknessCm === STANDARD_STEAK_CM && (!p.allowedThicknessCm || p.allowedThicknessCm.includes(prefs.steakThicknessCm)))
    return prefs.steakThicknessCm;
  return p.defaultThicknessCm;
}

/** Cross-section scaling of a steak measured on a reference carcass (RESEARCH §10.4). */
export const steakScale = (carcassKg: number, refKg: number) => Math.pow(carcassKg / refKg, 2 / 3);
/** Mass scaling of a whole muscle / piece measured on a reference carcass. */
export const pieceScale = (carcassKg: number, refKg: number) => carcassKg / refKg;

/** Items tied to anatomical units: one per unit (côte per rib), or joints made of whole units (2-rib roasts). */
function sizeByUnits(line: Line, p: ProductSpec, units: number, sizing: 'one-per-unit' | 'joints-of-units', unit: [string, string], prefs: ButcherPrefs, wholeCarcassKg: number): void {
  const w = line.weightKg;
  line.thicknessCm = undefined;
  if (sizing === 'one-per-unit') {
    line.count = units;
    line.eachKg = w / units;
    line.perPack = 1;
    line.packs = units;
    // Implied thickness: the steak's weight over its weight per cm at this carcass size.
    const perCm = p.gramsPerCm && p.sizeRef ? (p.gramsPerCm * steakScale(wholeCarcassKg, p.sizeRef.carcassKg)) / 1000 : undefined;
    line.cutNote = `one ${unit[0]} bone each${perCm ? `, about ${inchLabel(Math.round(((w / units) / perCm) / (2.54 / 4)) * (2.54 / 4))} thick` : ''}`;
    line.sizeNote = `One per ${unit[0]}: the thickness is the ${unit[0]} spacing`;
    return;
  }
  const target = (prefs.familySize * prefs.roastGramsPerPerson * (p.boneFactor ?? 1)) / 1000;
  const unitKg = w / units;
  const perJoint = Math.min(units, Math.max(1, Math.round(target / unitKg)));
  const joints = Math.max(1, Math.round(units / perJoint));
  line.count = joints;
  line.eachKg = w / joints;
  line.perPack = 1;
  line.packs = joints;
  line.feeds = Math.max(1, Math.round((line.eachKg * 1000) / (p.boneFactor ?? 1) / prefs.roastGramsPerPerson));
  line.undersized = w < target * 0.75;
  const per = units / joints;
  line.cutNote = `${Number.isInteger(per) ? per : `about ${per.toFixed(1)}`}-${unit[0]} joint${joints > 1 ? 's' : ''}`;
  line.sizeNote = `${units} ${units === 1 ? unit[0] : unit[1]} on the bone, as ${joints} joint${joints > 1 ? 's' : ''} for ${prefs.familySize} people`;
}

/** A chosen number of items (on-bone steaks, fillet pieces, chosen joints): size each from the weight. */
function sizeFixedCount(line: Line, p: ProductSpec, count: number, prefs: ButcherPrefs): void {
  line.count = count;
  line.eachKg = line.weightKg / count;
  const steak = p.kind === 'steak';
  line.perPack = steak ? prefs.steaksPerPack : 1;
  line.packs = steak ? Math.ceil(count / prefs.steaksPerPack) : count;
  if (p.kind === 'roast') line.feeds = Math.max(1, Math.round((line.eachKg * 1000) / (p.boneFactor ?? 1) / prefs.roastGramsPerPerson));
  if (p.kind === 'piece' && p.cookingId === 'fillet' && line.eachKg > 0.6) line.feeds = Math.max(1, Math.round((line.eachKg * 1000) / prefs.roastGramsPerPerson));
}

function sizeProduct(line: Line, p: ProductSpec, wholeCarcassKg: number, prefs: ButcherPrefs, sides = 2): void {
  const w = line.weightKg;
  if (w <= 0) return;
  if (p.weightOnly) {
    line.weightOnly = true;
    return;
  }
  if (p.kind === 'steak' && p.gramsPerCm && p.sizeRef && line.thicknessCm) {
    const each = (p.gramsPerCm * line.thicknessCm * steakScale(wholeCarcassKg, p.sizeRef.carcassKg)) / 1000;
    const count = Math.max(1, Math.round(w / each));
    line.count = count;
    line.eachKg = w / count;
    line.perPack = prefs.steaksPerPack;
    line.packs = Math.ceil(count / prefs.steaksPerPack);
    line.sizeNote = `${p.sizeRef.note ?? ''}; scaled by (carcass ÷ ${p.sizeRef.carcassKg} kg)^⅔ to ${(each * 1000).toFixed(0)} g at ${inchLabel(line.thicknessCm)}`;
    return;
  }
  if (p.kind === 'roast' || p.kind === 'cured') {
    const target = (prefs.familySize * prefs.roastGramsPerPerson * (p.boneFactor ?? 1)) / 1000;
    const count = Math.max(1, Math.round(w / target));
    line.count = count;
    line.eachKg = w / count;
    line.perPack = 1;
    line.packs = count;
    line.feeds = Math.max(1, Math.round((line.eachKg * 1000) / (p.boneFactor ?? 1) / prefs.roastGramsPerPerson));
    line.undersized = w < target * 0.75;
    line.sizeNote = `Joints sized for ${prefs.familySize} people at ${prefs.roastGramsPerPerson} g boneless each${p.boneFactor ? ' (plus bone)' : ''}`;
    return;
  }
  if (p.pieceGrams && p.sizeRef) {
    const each = (p.pieceGrams * pieceScale(wholeCarcassKg, p.sizeRef.carcassKg)) / 1000;
    // Whole muscles are counted by anatomy (per side), not by weight.
    const count = p.perSide ? p.perSide * sides : Math.max(1, Math.round(w / each));
    line.count = count;
    line.eachKg = w / count;
    line.perPack = 1;
    line.packs = count;
    line.sizeNote = `${p.sizeRef.note ?? ''}; scaled by carcass ÷ ${p.sizeRef.carcassKg} kg`;
    return;
  }
  if (p.kind === 'diced') {
    line.perPack = undefined;
    line.packs = Math.ceil((w * 1000) / prefs.diced.packG);
  }
}

export interface AllocationInfo {
  path: string;
  allocation: Allocation;
  /** Units available to this customer (all sides). */
  totalUnits: number;
  /** Units per use after clamping, including the remainder use. */
  plan: Record<string, number>;
}

/** Units per use for this customer: the user's plan (or the defaults), clamped in order so they never exceed the total. */
export function allocationPlan(al: Allocation, wanted: Record<string, number> | undefined, sides: number): { total: number; plan: Record<string, number> } {
  const total = al.unitsPerSide * sides;
  const plan: Record<string, number> = {};
  let left = total;
  for (const u of al.uses) {
    if (u.id === al.remainder) continue;
    const want = wanted ? (wanted[u.id] ?? 0) : (al.defaultsPerSide[u.id] ?? 0) * sides;
    const n = Math.max(0, Math.min(left, Math.round(want)));
    plan[u.id] = n;
    left -= n;
  }
  plan[al.remainder] = left;
  return { total, plan };
}

export function compute(state: AppState): EngineResult {
  const { animal: a, prefs } = state;
  const grade = effectiveGrade(a);
  const { carcassKg: wholeCarcassKg, liveKg: wholeLiveKg, killOut, liveIsEstimated } = carcassAndLive(a);
  const shareMult = a.share === 'half' ? 0.5 : 1;
  const carcassKg = wholeCarcassKg * shareMult;
  const comp = composition(grade, a.hangingDays);
  const sides = a.share === 'half' ? 1 : 2;
  // Exclusions from planner uses (e.g. any tomahawk rib) apply only when that planner option is chosen.
  const extraExclusions: ExtraExclusion[] = [];
  for (const region of REGIONS)
    for (const o of region.options) {
      if (!o.allocation) continue;
      const { plan } = allocationPlan(o.allocation, state.allocations?.[region.id], sides);
      for (const u of o.allocation.uses)
        if ((plan[u.id] ?? 0) > 0) for (const x of u.excludes ?? []) extraExclusions.push({ ...x, byPath: region.id, byOptionId: o.id });
    }
  const resolved = resolveSelections(state.selections, extraExclusions);

  // ───── Region products ─────
  const lines: Line[] = [];
  let leftoverKg = 0;
  let boneInCutsKg = 0;
  let tibiaUsedKg = 0;
  const jointPlans: JointPlanInfo[] = [];
  const allocations: AllocationInfo[] = [];
  const loinPlans: { path: string; plan: LoinPlan }[] = [];
  for (const leaf of resolved.leaves) {
    const regionMeat = (carcassKg * leaf.region.meatPctOfCarcass.value * comp.meatFactor) / 100;
    const leafMeat = regionMeat * leaf.share;
    let products = leaf.option.products ?? [];
    if (leaf.option.loinPlanner) {
      const tb = LOIN_PRODUCTS.tBone, ph = LOIN_PRODUCTS.porterhouse;
      const each = (p: ProductSpec) => (p.gramsPerCm! * thicknessFor(p, prefs)! * steakScale(wholeCarcassKg, p.sizeRef!.carcassKg)) / 1000;
      const jointKg = (prefs.familySize * prefs.roastGramsPerPerson) / 1000;
      const plan = planLoin(state.allocations?.[leaf.path] ?? {}, leafMeat, sides, each(tb), each(ph), jointKg);
      loinPlans.push({ path: leaf.path, plan });
      leftoverKg += plan.trimKg;
      for (const o of plan.outputs) {
        boneInCutsKg += o.boneKg;
        const line: Line = {
          productId: o.spec.id, name: o.spec.name, regionId: leaf.region.id, kind: o.spec.kind, weightKg: o.leanKg + o.boneKg,
          thicknessCm: thicknessFor(o.spec, prefs), cookingId: o.spec.cookingId, path: leaf.path, regionName: leaf.region.name,
          optionLabel: leaf.option.label, boneKg: o.boneKg, spec: o.spec,
        };
        if (o.count === undefined) sizeProduct(line, o.spec, wholeCarcassKg, prefs, sides);
        else sizeFixedCount(line, o.spec, o.count, prefs);
        lines.push(line);
      }
      continue;
    }
    const al = leaf.option.allocation;
    const sizingOf: Record<string, AllocationUse['sizing']> = {};
    const unitsOf: Record<string, number> = {};
    if (al) {
      const { total, plan } = allocationPlan(al, state.allocations?.[leaf.path], sides);
      allocations.push({ path: leaf.path, allocation: al, totalUnits: total, plan });
      products = al.uses.filter((u) => plan[u.id] > 0).map((u) => {
        sizingOf[u.product.id] = u.sizing;
        unitsOf[u.product.id] = plan[u.id];
        return { ...u.product, fraction: (u.product.fraction * plan[u.id]) / total };
      });
    }
    const jp = leaf.option.jointPlan;
    if (jp) {
      const req = state.allocations?.[leaf.path];
      const roast = jp.roast;
      const jointKg = (prefs.familySize * prefs.roastGramsPerPerson * (roast.boneFactor ?? 1)) / 1000;
      const allRoastKg = leafMeat * roast.fraction * (roast.boneFactor ?? 1);
      const maxRoasts = Math.max(0, Math.round(allRoastKg / jointKg));
      const roasts = req?.roasts === undefined ? undefined : Math.min(Math.max(0, Math.round(req.roasts)), maxRoasts);
      // At the maximum the whole muscle goes to joints (resized slightly to fit).
      const roastShare = roasts === undefined ? jp.defaultRoastShare : roasts === 0 ? 0 : roasts === maxRoasts ? 1 : Math.min(1, (roasts * jointKg) / allRoastKg);
      const restIdx = req?.rest !== undefined && jp.rests[req.rest] ? req.rest : jp.rests.findIndex((r) => r.id === jp.defaultRest);
      const rest = jp.rests[restIdx];
      products = [{ ...roast, fraction: roast.fraction * roastShare }, ...(rest.product ? [{ ...rest.product, fraction: rest.product.fraction * (1 - roastShare) }] : [])];
      const allRestKg = rest.product ? leafMeat * rest.product.fraction * (rest.product.boneFactor ?? 1) : 0;
      jointPlans.push({ path: leaf.path, plan: jp, maxRoasts, jointKg, restIdx, allRestKg, roastShare });
    }
    const used = products.reduce((s, p) => s + p.fraction, 0);
    leftoverKg += leafMeat * (1 - used);
    for (const p of products) {
      if (p.fraction <= 0) continue;
      const lean = leafMeat * p.fraction;
      const bone = lean * ((p.boneFactor ?? 1) - 1);
      boneInCutsKg += bone;
      if (p.id === 'hind-osso-buco') tibiaUsedKg += bone;
      const line: Line = {
        productId: p.id,
        name: p.name,
        regionId: leaf.region.id,
        kind: p.kind,
        weightKg: lean + bone,
        thicknessCm: thicknessFor(p, prefs),
        cookingId: p.cookingId,
        path: leaf.path,
        regionName: leaf.part ? `${leaf.region.name} — ${leaf.part.name}` : leaf.region.name,
        optionLabel: leaf.option.label,
        boneKg: bone,
        spec: p,
      };
      const sizing = sizingOf[p.id] ?? 'standard';
      if (sizing === 'standard') sizeProduct(line, p, wholeCarcassKg, prefs, sides);
      else sizeByUnits(line, p, unitsOf[p.id], sizing, al!.unit, prefs, wholeCarcassKg);
      lines.push(line);
    }
  }

  // ───── Trim pool → mince / burgers / diced ─────
  const trimBaseKg = (carcassKg * TRIM_POOL_PCT_OF_CARCASS.value * comp.meatFactor) / 100;
  const trimPoolKg = trimBaseKg + leftoverKg;
  const split = prefs.trimSplit;
  const splitTotal = split.mince + split.burgers + split.diced || 1;
  const poolLean = TRIM_POOL_LEAN_PCT.value;

  const burgerRawKg = (trimPoolKg * split.burgers) / splitTotal;
  const burgerCount = Math.floor((burgerRawKg * 1000) / prefs.burgers.grams);
  const burgerKg = (burgerCount * prefs.burgers.grams) / 1000;
  const dicedRawKg = (trimPoolKg * split.diced) / splitTotal;
  const dicedKg = (dicedRawKg * poolLean) / DICED_LEAN_PCT.value;
  // Burger rounding remainder goes to mince.
  const minceRawKg = trimPoolKg - burgerKg - dicedRawKg;
  const minceKg = (minceRawKg * poolLean) / prefs.mince.leanPct;
  // Lean is conserved: leaner products shed fat to the fat pool; fattier mince draws from it.
  const fatDeltaKg = dicedRawKg - dicedKg + (minceRawKg - minceKg);

  const trimLine = (id: string, name: string, kind: ProductLine['kind'], kg: number, cookingId: string, extra: Partial<Line>): Line => ({
    productId: id, name, regionId: 'trim', kind, weightKg: kg, cookingId, path: '', regionName: 'Trim (all regions)', optionLabel: 'Trim pool', boneKg: 0, ...extra,
  });
  if (minceKg > 0)
    lines.push(trimLine('mince', `Beef mince (${prefs.mince.leanPct} % lean)`, 'mince', minceKg, 'mince', { packs: Math.ceil((minceKg * 1000) / prefs.mince.packG), sizeNote: `${prefs.mince.packG} g packs` }));
  if (burgerCount > 0)
    lines.push(trimLine('burgers', `Burgers (${prefs.burgers.grams} g)`, 'burger', burgerKg, 'burger', { count: burgerCount, eachKg: prefs.burgers.grams / 1000, perPack: prefs.burgers.perPack, packs: Math.ceil(burgerCount / prefs.burgers.perPack) }));
  if (dicedKg > 0)
    lines.push(trimLine('trim-diced', 'Diced stewing beef (from trim)', 'diced', dicedKg, 'stew', { packs: Math.ceil((dicedKg * 1000) / prefs.diced.packG), sizeNote: `${prefs.diced.packG} g packs, trimmed to ${DICED_LEAN_PCT.value} % lean` }));
  for (const l of lines) if (l.kind === 'diced' && l.packs === undefined) l.packs = Math.ceil((l.weightKg * 1000) / prefs.diced.packG);

  lines.sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind));

  // ───── Bone and fat pools ─────
  const req = (id: string) => state.partRequests.find((r) => r.partId === id);
  const bonePoolKg = (carcassKg * comp.bonePct) / 100;
  const boneFreeKg = Math.max(0, bonePoolKg - boneInCutsKg);
  const marrowRefKg = (carcassKg * PART_BY_ID['marrow-bones'].reference.pct.value * comp.boneFactor) / 100;
  const marrowKg = Math.min(boneFreeKg, Math.max(0, marrowRefKg - tibiaUsedKg));
  const soupBoneKg = boneFreeKg - marrowKg;
  const fatPoolKg = (carcassKg * comp.fatPct) / 100 + fatDeltaKg;
  const frac = (id: string) => {
    const r = req(id);
    return r?.want ? (r.fraction ?? 1) : 0;
  };
  const boneReturnedKg = marrowKg * frac('marrow-bones') + soupBoneKg * frac('soup-bones');
  const fatReturnedKg = Math.max(0, fatPoolKg) * frac('fat-trim');

  const meatKg = lines.reduce((s, l) => s + l.weightKg, 0);
  const hangingLossKg = (carcassKg * comp.hangingLossPct) / 100;
  const cuttingLossKg = (carcassKg * comp.cuttingLossPct) / 100;
  const butcherTrimKg = (carcassKg * comp.homeTrimPct) / 100;

  // ───── Parts ─────
  const parts: PartLine[] = [];
  for (const info of allPartInfo(a, wholeCarcassKg)) {
    if (!info.present) continue;
    const r = req(info.part.id);
    const wanted = !!r?.want && info.requestable;
    let kg: number;
    if (info.part.id === 'marrow-bones') kg = marrowKg;
    else if (info.part.id === 'soup-bones') kg = soupBoneKg;
    else if (info.part.id === 'fat-trim') kg = Math.max(0, fatPoolKg);
    else kg = partKg(info.part, a, wholeLiveKg, wholeCarcassKg, a.share === 'half' ? (r ?? { partId: info.part.id, want: false }) : r);
    if (info.pooled && r?.fraction !== undefined) kg *= r.fraction;
    const edibleKg = info.part.edibleYield ? kg * info.part.edibleYield.value : undefined;
    let note: string | undefined;
    if (a.share === 'half' && info.part.halfShare === 'whole-or-none') note = r?.takeWhole ? 'Single item — you take it whole' : 'Single item — goes to the other sharer unless you take it whole';
    else if (a.share === 'half' && info.part.halfShare === 'by-agreement') note = 'Half share: split by agreement between sharers';
    parts.push({ info, kg, edibleKg, wanted, note });
  }

  // ───── Advisories ─────
  const advisories: Advisory[] = [];
  const add = (x: Advisory) => {
    if (!advisories.some((y) => y.id === x.id)) advisories.push(x);
  };
  for (const x of ADVISORIES) if (matches(x.when, a, wholeCarcassKg)) add(x);
  for (const leaf of resolved.leaves) for (const x of leaf.option.advisories ?? []) if (matches(x.when, a, wholeCarcassKg)) add(x);
  for (const n of resolved.notices)
  {
    const region = REGION_BY_ID[n.path.split('/')[0]];
    const label = (id: string) => optionsAt(n.path).find((o) => o.id === id)?.label ?? id;
    add({ id: `excl-${n.path}`, when: {}, severity: 'warning', message: `${region.name}: "${label(n.wanted)}" isn't possible with another cut you picked. ${n.reason} It has been changed to "${label(n.used)}".` });
  }
  if (comp.gridClamped)
    add({ id: 'grid-clamped', when: {}, severity: 'info', message: 'This grade is outside the AHDB yield grid (conformation U− to P, fat 2 to 4H). The nearest grade in the grid was used, so treat the yield as approximate.', sourceIds: ['ahdb-europ-yield'] });
  if (!grade.fromUser)
    add({ id: 'grade-default', when: {}, severity: 'tip', message: `No grade entered, so the typical ${BREED_BY_ID[a.breed].name} ${a.sex} grade was used (${grade.conformation}${grade.fatClass}). Enter the grade from your kill sheet for a better estimate.` });
  {
    // UI heuristic (not a yield figure): flag a carcass well under the typical Irish carcass for this breed and sex.
    const typical = BREED_BY_ID[a.breed].typicalCarcassKg[a.sex];
    if (typical && a.weightBasis === 'live' && wholeCarcassKg < typical.value * 0.8)
      add({ id: 'light-animal', when: {}, severity: 'tip', message: `A ${a.weightKg} kg live weight gives an estimated ${Math.round(wholeCarcassKg)} kg carcass, well below the typical Irish ${BREED_BY_ID[a.breed].name} ${a.sex} carcass of about ${Math.round(typical.value)} kg. If ${a.weightKg} kg is the weight on the kill sheet, switch the weight to "Carcass".`, sourceIds: typical.sourceIds });
  }
  if (liveIsEstimated)
    add({ id: 'live-estimated', when: {}, severity: 'info', message: `Live weight was estimated from carcass weight at a ${killOut.toFixed(1)} % kill-out. Offal weights are scaled from live weight.` });
  if ((a.sex === 'steer' || a.sex === 'heifer') && a.ageMonths > QPS_SPEC.steer.maxAgeMonths)
    add({ id: 'qps-age', when: {}, severity: 'info', message: `Over ${QPS_SPEC.steer.maxAgeMonths} months is outside the Irish prime-beef target spec. That doesn't matter for your own freezer.`, sourceIds: QPS_SPEC.sourceIds });
  if (a.organic.certified && a.organic.sellingAsOrganic && !(a.organic.abattoirCovered && a.organic.butcherCovered))
    add({ id: 'organic-uncovered', when: {}, severity: 'blocked', message: 'You plan to sell this beef as organic, but the abattoir or butcher is not marked as certified or on your certificate. The meat cannot be sold or labelled as organic until that is arranged with your control body.', sourceIds: ['ioa-standards'] });
  for (const p of parts) {
    if (!p.wanted) continue;
    if (p.info.availabilityNote) add({ id: `avail-${p.info.part.id}`, when: {}, severity: 'info', message: `${p.info.part.name}: ${p.info.availabilityNote}` });
    if (p.info.part.ageNote) add({ id: `age-${p.info.part.id}`, when: {}, severity: 'tip', message: `${p.info.part.name}: ${p.info.part.ageNote}` });
    if (p.info.availability === 'on-request') add({ id: `ask-${p.info.part.id}`, when: {}, severity: 'tip', message: `${p.info.part.name} depends on the abattoir. Ask before the kill.` });
  }
  if (prefs.mince.leanPct < poolLean && fatPoolKg < 0)
    add({ id: 'mince-fat-short', when: {}, severity: 'warning', message: 'There is not enough fat trim for mince this fatty. Pick a leaner mince.' });
  for (const { plan } of loinPlans) {
    if (plan.clamped.length)
      add({ id: 'loin-clamped', when: {}, severity: 'warning', message: `Loin plan adjusted to fit: ${plan.clamped.join('; ')}. Thicker steaks or a fillet kept whole leave room for fewer T-bones.` });
    if (plan.sides.some((s) => s.reservation === 'centre' && s.tBones > 0))
      add({ id: 'tbone-centre-estimate', when: {}, severity: 'warning', message: 'T-bones next to a Wellington are an estimate. Nobody measures how far back T-bones can be cut before reaching the thick centre fillet, so the planner allows at most 2 per side from the very front. Ask your butcher: they may get fewer (or none) without spoiling the Wellington.' });
    if (plan.used.tbones > 0 && a.breed === 'jersey')
      add({ id: 't-bone-small', when: {}, severity: 'tip', message: 'Jersey loins are small: T-bones will be modest in size. Consider 1¼" or thicker.', sourceIds: ['teagasc-5923'] });
  }
  const small = lines.filter((l) => l.undersized);
  if (small.length)
    add({ id: 'roast-undersized', when: {}, severity: 'tip', message: `Not enough meat for a full ${prefs.familySize}-person joint: ${small.map((l) => `${l.name} (feeds ${l.feeds})`).join(', ')}. Consider steaks or diced beef for ${small.length > 1 ? 'these cuts' : 'this cut'}, or a smaller household size.` });
  const order = { blocked: 0, warning: 1, tip: 2, info: 3 } as const;
  advisories.sort((x, y) => order[x.severity] - order[y.severity]);

  // ───── Totals ─────
  const totals = { steaksKg: 0, roastsKg: 0, slowCookKg: 0, minceBurgersKg: 0, offalKg: 0 };
  for (const l of lines) {
    const c = categoryOf(l);
    if (c === 'mince') totals.minceBurgersKg += l.weightKg;
    else if (c === 'slow') totals.slowCookKg += l.weightKg;
    else if (c === 'steaks') totals.steaksKg += l.weightKg;
    else totals.roastsKg += l.weightKg;
  }
  const extrasKg = parts.filter((p) => p.wanted && !p.info.pooled && (p.info.status === 'edible' || p.info.status === 'edible-processing')).reduce((s, p) => s + p.kg, 0);
  totals.offalKg = extrasKg;
  const freezerLitres = (meatKg + extrasKg + fatReturnedKg) * FREEZER_LITRES_PER_KG.value;
  const freezerBoneLitres = boneReturnedKg * FREEZER_LITRES_PER_KG.value;

  return {
    loinPlans,
    jointPlans,
    allocations,
    resolved,
    grade,
    killOutPct: killOut,
    liveIsEstimated,
    wholeCarcassKg,
    shareMult,
    comp,
    balance: {
      liveKg: wholeLiveKg * shareMult,
      carcassKg,
      hangingLossKg,
      boneKg: bonePoolKg,
      boneReturnedKg,
      fatTrimKg: Math.max(0, fatPoolKg),
      fatReturnedKg,
      cuttingLossKg,
      meatKg,
      meatRangeKg: [meatKg, meatKg * (comp.commercialMeatPct / comp.meatPct)],
      marrowKg,
      soupBoneKg,
      boneInCutsKg,
      fatPoolKg,
      trimPoolKg,
      butcherTrimKg,
    },
    lines,
    parts,
    advisories,
    totals,
    freezerLitres,
    freezerBoneLitres,
  };
}
