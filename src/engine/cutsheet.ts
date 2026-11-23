// Human-readable instructions for the butcher / abattoir. Pure function of state + result.
import { BREED_BY_ID } from '../data/breeds';
import { REGIONS } from '../data/regions';
import { inchLabel } from '../data/thickness';
import { loinInstructions } from './loin';
import type { CutSheet } from '../model/types';
import type { EngineResult, Line } from './compute';
import type { AppState } from './state';

const kg = (x: number) => `${x.toFixed(1)} kg`;

const REGULATORY_IDS = new Set(['ie-negligible-bse', 'srm-over-12', 'mince-freshness', 'chill-before-cutting', 'organic-chain', 'organic-handling', 'organic-uncovered', 'on-farm-route']);

export const SEX_LABEL = { heifer: 'Heifer', steer: 'Steer', bull: 'Bull', cow: 'Cow' } as const;

function describeLine(l: Line): string {
  const bits: string[] = [];
  if (l.thicknessCm) bits.push(`${inchLabel(l.thicknessCm)} thick`);
  if (l.cutNote) bits.push(l.cutNote);
  if (l.kind === 'steak' && l.perPack) bits.push(`${l.perPack} per pack`);
  if ((l.kind === 'roast' || l.kind === 'cured') && l.eachKg && !l.cutNote) bits.push(`joints of about ${kg(l.eachKg)}${l.feeds ? `, each feeds ${l.feeds}` : ''}`);
  if (l.kind === 'diced') bits.push('diced, bagged');
  const each = l.eachKg !== undefined ? (l.eachKg < 1 ? `${Math.round(l.eachKg * 1000)} g` : kg(l.eachKg)) : '';
  const est = l.count && !l.weightOnly ? ` (≈ ${l.count} × ${each} = ${kg(l.weightKg)})` : ` (≈ ${kg(l.weightKg)}, by weight)`;
  return `${l.name}${bits.length ? ` — ${bits.join(', ')}` : ''}${est}`;
}

export function buildCutSheet(state: AppState, r: EngineResult): CutSheet {
  const { animal: a, prefs } = state;
  const lines: CutSheet['lines'] = [];

  const breed = BREED_BY_ID[a.breed];
  lines.push({
    heading: 'Animal',
    instructions: [
      `${SEX_LABEL[a.sex]}, ${breed.name}, ${a.ageMonths} months${a.organic.certified ? `, certified organic${a.organic.controlBody ? ` (${a.organic.controlBody})` : ''}` : ''}`,
      `${a.weightBasis === 'live' ? `Live weight ${kg(a.weightKg)}; estimated carcass ${kg(r.wholeCarcassKg)}` : `Carcass weight ${kg(a.weightKg)}`}; grade ${r.grade.conformation}${r.grade.fatClass}${r.grade.fromUser ? '' : ' (typical, not measured)'}`,
      `${a.share === 'half' ? 'HALF share (one side)' : 'Whole animal'}; hang for ${a.hangingDays} days before cutting`,
    ],
  });

  for (const region of REGIONS) {
    const regionLines = r.lines.filter((l) => l.regionId === region.id);
    const leaves = r.resolved.leaves.filter((x) => x.region.id === region.id);
    const instructions: string[] = [];
    for (const lp of r.loinPlans.filter((x) => x.path === region.id)) instructions.push(...loinInstructions(lp.plan));
    for (const leaf of leaves) {
      const ls = regionLines.filter((l) => l.path === leaf.path);
      const prefix = leaf.part ? `${leaf.part.name}: ` : '';
      if (ls.length === 0) instructions.push(`${prefix}all to mince / trim`);
      else instructions.push(...ls.map((l) => `${prefix}${describeLine(l)}`));
    }
    const top = r.resolved.selections[region.id];
    const opt = region.options.find((o) => o.id === top);
    lines.push({ heading: `${region.name}${opt ? ` — ${opt.label}` : ''}`, instructions });
  }

  const trim = r.lines.filter((l) => l.regionId === 'trim');
  lines.push({
    heading: 'Trim',
    instructions: [
      `Split trim: ${prefs.trimSplit.mince} % mince, ${prefs.trimSplit.burgers} % burgers, ${prefs.trimSplit.diced} % diced`,
      ...trim.map((l) => {
        if (l.kind === 'mince') return `Mince ${prefs.mince.leanPct} % lean in ${prefs.mince.packG} g packs (about ${l.packs} packs, ${kg(l.weightKg)})`;
        if (l.kind === 'burger') return `Burgers ${prefs.burgers.grams} g, ${prefs.burgers.perPack} per pack (about ${l.count} burgers)`;
        return `Diced beef in ${prefs.diced.packG} g packs (about ${l.packs} packs)`;
      }),
    ],
  });

  const extras = r.parts.filter((p) => p.wanted && p.kg > 0);
  if (extras.length)
    lines.push({
      heading: 'Offal, bones, fat & extras — please return',
      instructions: extras.map((p) => {
        const req = state.partRequests.find((x) => x.partId === p.info.part.id);
        const form = p.info.part.id === 'fat-trim' ? (req?.form === 'rendered' ? ', rendered' : ', raw') : '';
        const whole = a.share === 'half' && req?.takeWhole ? ', whole item' : '';
        return `${p.info.part.name}${form}${whole} (about ${kg(p.kg)})${p.info.part.requestNote ? ` — ${p.info.part.requestNote}` : ''}`;
      }),
    });

  const lab = Object.entries(prefs.labelling).filter(([, v]) => v).map(([k]) => ({ cutName: 'cut name', weight: 'weight', date: 'date', animalTag: 'animal tag number' })[k as keyof typeof prefs.labelling]);
  lines.push({
    heading: 'Packing',
    instructions: [
      `${{ vacuum: 'Vacuum packed', bag: 'Freezer bags', tray: 'Trays' }[prefs.packaging]}; label with ${lab.join(', ') || 'nothing'}`,
      `Steaks ${prefs.steaksPerPack} per pack; roasts sized for ${prefs.familySize} people`,
    ],
  });

  return {
    animal: a,
    selections: r.resolved.selections,
    prefs,
    partRequests: state.partRequests,
    lines,
    regulatoryNotes: r.advisories.filter((x) => REGULATORY_IDS.has(x.id)).map((x) => x.message),
  };
}

/** Plain-text rendering (copy to clipboard / email to butcher). */
export function cutSheetText(cs: CutSheet, r: EngineResult): string {
  const out: string[] = ['BEEF CUT SHEET', ''];
  for (const s of cs.lines) {
    out.push(s.heading.toUpperCase());
    for (const i of s.instructions) out.push(`  • ${i}`);
    out.push('');
  }
  out.push(`Estimated take-home meat: about ${kg(r.balance.meatKg)} (up to ${kg(r.balance.meatRangeKg[1])} with commercial-style trimming)`);
  if (cs.regulatoryNotes.length) {
    out.push('', 'NOTES');
    for (const n of cs.regulatoryNotes) out.push(`  • ${n}`);
  }
  return out.join('\n');
}
