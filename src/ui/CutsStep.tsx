import { useMemo } from 'react';
import { PRESETS, type Preset } from '../data/presets';
import { REGION_BY_ID, REGIONS } from '../data/regions';
import type { LoinPlan } from '../engine/loin';
import { compute, type AllocationInfo, type EngineResult, type JointPlanInfo, type Line } from '../engine/compute';
import { exclusionReason, optionsAt } from '../engine/selections';
import type { AppState } from '../engine/state';
import type { CutOption, Selections } from '../model/types';
import { CookBadges, Evidence, ThicknessPicker } from './bits';
import { regionCategories } from './categories';
import { CowDiagram } from './CowDiagram';
import { kg, weight } from './format';

interface Props {
  state: AppState;
  result: EngineResult;
  region: string;
  onRegion: (id: string) => void;
  onSelections: (s: Selections) => void;
  onThickness: (productId: string, cm: number) => void;
  onAllocation: (path: string, plan: Record<string, number>) => void;
  onPreset: (p: Preset) => void;
}

function summarise(lines: Line[]): string {
  if (!lines.length) return 'All to mince / trim';
  return lines
    .map((l) => (l.count && !l.weightOnly ? `${l.count} × ${l.name.toLowerCase()} (~${weight(l.eachKg!)})` : `${kg(l.weightKg)} ${l.name.toLowerCase()}`))
    .join(' · ');
}

function OptionList({ state, path, options, current, result, onPick }: {
  state: AppState; path: string; options: CutOption[]; current: string; result: EngineResult; onPick: (id: string) => void;
}) {
  // Preview each alternative by computing with it selected.
  const previews = useMemo(
    () => Object.fromEntries(options.map((o) => {
      const r = compute({ ...state, selections: { ...state.selections, [path]: o.id } });
      const ls = r.lines.filter((l) => l.path === path || l.path.startsWith(`${path}/`));
      return [o.id, o.parts ? `Split into ${o.parts.map((p) => p.name.toLowerCase()).join(', ')}` : summarise(ls)];
    })),
    [state, path, options],
  );
  return (
    <div className="options" role="radiogroup" aria-label="Cut options">
      {options.map((o) => {
        const excluded = exclusionReason(result.resolved, path, o.id);
        const on = current === o.id;
        return (
          <label key={o.id} className={`option${on ? ' on' : ''}${excluded ? ' excluded' : ''}`}>
            <input type="radio" name={path} checked={on} disabled={!!excluded} onChange={() => onPick(o.id)} />
            <span className="option-body">
              <span className="option-label">{o.label}</span>
              {o.description && <span className="option-desc">{o.description}</span>}
              <span className="option-preview">{excluded ? `Not available: ${excluded}` : previews[o.id]}</span>
              {o.excludes?.map((x) => (
                <span key={x.path} className="option-warn">Rules out {x.optionIds.map((id) => optionsAt(x.path).find((oo) => oo.id === id)?.label ?? id).join(' and ').toLowerCase()} on the {REGION_BY_ID[x.path.split('/')[0]].name.toLowerCase()}.</span>
              ))}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const USE_COLOURS = ['var(--cat-roast)', 'var(--cat-mixed)', 'var(--cat-slow)', '#6b3b2a', 'var(--cat-steak)'];

function AllocationPicker({ info, lines, sides, onChange }: { info: AllocationInfo; lines: Line[]; sides: number; onChange: (plan: Record<string, number>) => void }) {
  const { allocation: al, plan, totalUnits } = info;
  const [one, many] = al.unit;
  const units = (n: number) => `${n} ${n === 1 ? one : many}`;
  const set = (useId: string, n: number) => {
    const next: Record<string, number> = {};
    for (const u of al.uses) if (u.id !== al.remainder) next[u.id] = u.id === useId ? n : plan[u.id];
    onChange(next);
  };
  const setAll = (useId: string) => {
    const next: Record<string, number> = {};
    for (const u of al.uses) if (u.id !== al.remainder) next[u.id] = u.id === useId ? totalUnits : 0;
    onChange(next);
  };
  const lineOf = (productId: string) => lines.find((l) => l.productId === productId);
  const describe = (productId: string) => {
    const l = lineOf(productId);
    if (!l) return '';
    const each = l.eachKg ? ` × ${weight(l.eachKg)}` : '';
    return `${l.count ?? ''}${each}${l.cutNote ? ` (${l.cutNote})` : ''}${l.feeds ? `, feeds ${l.feeds}` : ''}`;
  };
  // Strip of ribs, side by side, coloured by use.
  const strip: { useId: string; idx: number }[] = [];
  al.uses.forEach((u, idx) => { for (let i = 0; i < plan[u.id]; i++) strip.push({ useId: u.id, idx }); });
  return (
    <div className="part allocation">
      <h3>Plan your {many} <span className="opt">{units(totalUnits)}{sides === 2 ? ` (${al.unitsPerSide} per side)` : ''}</span></h3>
      <div className="quick-fill" role="group" aria-label={`Give all ${many} to`}>
        <span className="opt">All {many}:</span>
        {al.uses.map((u) => (
          <button key={u.id} className={`chip${plan[u.id] === totalUnits ? ' on' : ''}`} onClick={() => setAll(u.id)}>{u.short}</button>
        ))}
      </div>
      <div className="rib-strip" aria-hidden="true">
        {strip.map((s, i) => (
          <span key={i} style={{ background: USE_COLOURS[s.idx % USE_COLOURS.length] }} />
        ))}
      </div>
      <ul className="alloc-list">
        {al.uses.map((u, idx) => {
          const n = plan[u.id];
          const isRest = u.id === al.remainder;
          const free = plan[al.remainder];
          return (
            <li key={u.id}>
              <i className="sw" style={{ background: USE_COLOURS[idx % USE_COLOURS.length] }} />
              <span className="alloc-label">
                {u.label}
                {n > 0 && <span className="hint"> {describe(u.product.id)}</span>}
              </span>
              {isRest ? (
                <span className="alloc-rest">{units(n)} <span className="opt">(the rest)</span></span>
              ) : (
                <span className="stepper-ctl" role="group" aria-label={`${u.label}: ${many}`}>
                  <button aria-label={`Fewer ${many} for ${u.label}`} disabled={n <= 0} onClick={() => set(u.id, n - 1)}>−</button>
                  <output>{n}</output>
                  <button aria-label={`More ${many} for ${u.label}`} disabled={free <= 0} onClick={() => set(u.id, n + 1)}>+</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint">Every {one} not given to something else becomes {al.uses.find((u) => u.id === al.remainder)!.label.toLowerCase()}, cut at your chosen thickness.</p>
    </div>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <span className="stepper-ctl" role="group" aria-label={label}>
      <button aria-label={`Fewer: ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>−</button>
      <output>{value}</output>
      <button aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

function LoinPicker({ plan, lines, onChange }: { plan: LoinPlan; lines: Line[]; onChange: (req: Record<string, number>) => void }) {
  const u = plan.used;
  const set = (patch: Partial<typeof u>) => onChange({ ...u, ...patch });
  const line = (id: string) => lines.find((l) => l.productId === id);
  const desc = (id: string) => {
    const l = line(id);
    return l ? `${l.count ?? ''}${l.eachKg ? ` × ${weight(l.eachKg)}` : ''}${l.feeds ? `, feeds ${l.feeds}` : ''}` : '';
  };
  const two = plan.sides.length > 1;
  const rows: { key: keyof typeof u; label: string; hint: string; max: number; ids: string[] }[] = [
    { key: 'tbones', label: 'T-bones & porterhouses', hint: 'On the bone, cut from the front of the short loin (T-bones first, then porterhouses).', max: plan.max.onBone, ids: ['t-bone', 'porterhouse'] },
    { key: 'wholeFillets', label: 'Whole fillets', hint: 'For roasting or a large Wellington. Needs a side with no T-bones.', max: plan.max.wholeFillets, ids: ['whole-fillet'] },
    { key: 'centreFillets', label: 'Centre fillets (Wellington / chateaubriand)', hint: 'The thick centre kept whole. That side gives at most 2 T-bones from the very front (an estimate; check with your butcher).', max: plan.max.centreFillets, ids: ['chateaubriand'] },
    { key: 'sirloinRoasts', label: 'Sirloin joints', hint: '', max: plan.max.sirloinRoasts, ids: ['sirloin-roast', 'wing-rib'] },
  ];
  return (
    <div className="part allocation">
      <h3>Plan the loin <span className="opt">{two ? '2 sides' : '1 side'}</span></h3>
      <div className="quick-fill" role="group" aria-label="Quick plans">
        <button className="chip" onClick={() => onChange({})}>Fillet &amp; sirloin steaks</button>
        <button className="chip" onClick={() => onChange({ tbones: 99 })}>All T-bones</button>
        <button className="chip" onClick={() => onChange({ wholeFillets: 99, sirloinRoasts: 99 })}>Whole fillets + sirloin roasts</button>
      </div>
      <div className="loin-sides">
        {plan.sides.map((s, i) => (
          <div key={i} className="loin-side">
            {two && <b>Side {i + 1}</b>}
            <span>
              {[
                s.tBones ? `${s.tBones} T-bone${s.tBones > 1 ? 's' : ''}` : '',
                s.porterhouses ? `${s.porterhouses} porterhouse${s.porterhouses > 1 ? 's' : ''}` : '',
                s.reservation === 'whole' ? 'whole fillet' : s.reservation === 'centre' ? 'centre fillet kept whole' : 'rest of fillet as steaks',
              ].filter(Boolean).join(' · ')}
            </span>
            {s.reservation === 'centre' && s.tBones > 0 && (
              <span className="flag" title="How far back T-bones can go before cutting into the centre fillet is not measured; the planner is deliberately conservative. Confirm with your butcher.">
                ⚠ T-bones here are an estimate: ask your butcher
              </span>
            )}
          </div>
        ))}
      </div>
      <ul className="alloc-list">
        {rows.map((r) => (
          <li key={r.key}>
            <span />
            <span className="alloc-label">
              {r.label}
              <span className="hint">{r.ids.map(desc).filter(Boolean).join(' · ') || r.hint}</span>
            </span>
            <Stepper label={r.label} value={u[r.key]} max={r.max} onChange={(n) => set({ [r.key]: n })} />
          </li>
        ))}
      </ul>
      <label className="check small">
        <input type="checkbox" checked={u.wingOnBone > 0} onChange={(e) => set({ wingOnBone: e.target.checked ? 1 : 0 })} /> Sirloin joints on the bone (wing rib)
      </label>
      <p className="hint">The rest: {[desc('fillet-steak') && `fillet steaks ${desc('fillet-steak')}`, desc('fillet-tail') && `fillet tail ${desc('fillet-tail')}`, desc('sirloin-steak') && `sirloin steaks ${desc('sirloin-steak')}`].filter(Boolean).join(' · ') || 'nothing left'}.</p>
    </div>
  );
}

function JointPlanPicker({ info, lines, familySize, onChange }: { info: JointPlanInfo; lines: Line[]; familySize: number; onChange: (req: Record<string, number>) => void }) {
  const jp = info.plan;
  const roastLine = lines.find((l) => l.productId === jp.roast.id && l.path === info.path);
  const rest = jp.rests[info.restIdx];
  const restLine = rest.product ? lines.find((l) => l.productId === rest.product!.id && l.path === info.path) : undefined;
  const roasts = roastLine?.count ?? 0;
  const set = (patch: { roasts?: number; rest?: number }) => onChange({ roasts, rest: info.restIdx, ...patch });
  const steakEach = restLine?.eachKg ?? 0;
  return (
    <div className="part allocation">
      <div className="balance-row">
        <span className="alloc-label">
          {jp.roast.name} joints
          <span className="hint">{roasts ? `${roasts} × ${weight(roastLine!.eachKg!)}${roastLine!.feeds ? `, feeds ${roastLine!.feeds}` : ''}` : `about ${weight(info.jointKg)} each for ${familySize}`} · up to {info.maxRoasts}</span>
        </span>
        <span className="stepper-ctl" role="group" aria-label={`${jp.roast.name} joints`}>
          <button aria-label={`Fewer: ${jp.roast.name}`} disabled={roasts <= 0} onClick={() => set({ roasts: roasts - 1 })}>−</button>
          <output>{roasts}</output>
          <button aria-label={`More: ${jp.roast.name}`} disabled={roasts >= info.maxRoasts} onClick={() => set({ roasts: roasts + 1 })}>+</button>
        </span>
      </div>
      <div className="quick-fill" role="radiogroup" aria-label="The rest as">
        <span className="opt">{info.roastShare >= 1 ? 'If fewer joints, the rest as:' : 'The rest as:'}</span>
        {jp.rests.map((r, i) => (
          <button key={r.id} role="radio" aria-checked={i === info.restIdx} className={`chip${i === info.restIdx ? ' on' : ''}`} onClick={() => set({ rest: i })}>{r.short}</button>
        ))}
      </div>
      {info.roastShare < 1 && (
        <p className="hint">
          The rest: {restLine ? `${restLine.count ? `${restLine.count} × ${weight(restLine.eachKg!)}` : weight(restLine.weightKg)} ${restLine.name.toLowerCase()}` : 'to mince'}.
          {steakEach > 0 && info.maxRoasts > 0 && restLine?.kind === 'steak' && ` Each joint costs about ${(info.allRestKg / steakEach / info.maxRoasts).toFixed(1)} steaks (a joint uses the whole muscle; steaks are trimmed harder).`}
        </p>
      )}
    </div>
  );
}

export function CutsStep({ state, result, region: regionId, onRegion, onSelections, onThickness, onAllocation, onPreset }: Props) {
  const region = REGION_BY_ID[regionId];
  const sel = result.resolved.selections;
  const top = sel[region.id];
  const topOpt = region.options.find((o) => o.id === top)!;
  const regionLines = result.lines.filter((l) => l.regionId === region.id);
  const cats = regionCategories(result);
  const regionKg = (result.balance.carcassKg * region.meatPctOfCarcass.value * result.comp.meatFactor) / 100;

  const pick = (path: string, id: string) => onSelections({ ...state.selections, [path]: id });

  return (
    <div className="cuts">
      <div className="presets">
        <span className="presets-label">Start from:</span>
        {PRESETS.map((p) => (
          <button key={p.id} className="chip" title={p.description} onClick={() => onPreset(p)}>{p.label}</button>
        ))}
      </div>

      <div className="cuts-grid">
        <div className="diagram-wrap">
          <CowDiagram selected={region.id} onSelect={onRegion} category={cats} />
          <ul className="legend" aria-label="Legend">
            <li><i className="sw cat-steak" />Steaks</li>
            <li><i className="sw cat-roast" />Roasts &amp; whole pieces</li>
            <li><i className="sw cat-slow" />Slow cook / diced</li>
            <li><i className="sw cat-mixed" />Mixed</li>
            <li><i className="sw cat-mince" />Mince</li>
          </ul>
          <nav className="region-chips" aria-label="Regions">
            <span className="quarter">Forequarter</span>
            {REGIONS.filter((r) => r.quarter === 'fore').map((r) => (
              <button key={r.id} className={`chip${r.id === region.id ? ' on' : ''}`} onClick={() => onRegion(r.id)}>{r.name}</button>
            ))}
            <span className="quarter">Hindquarter</span>
            {REGIONS.filter((r) => r.quarter === 'hind').map((r) => (
              <button key={r.id} className={`chip${r.id === region.id ? ' on' : ''}`} onClick={() => onRegion(r.id)}>{r.name}</button>
            ))}
          </nav>
        </div>

        <section className="card region-panel" aria-live="polite">
          <header>
            <h2>{region.name}</h2>
            <p className="aka">{region.aka.join(' · ')}</p>
            <p>{region.description}</p>
            <p className="hint">
              About {kg(regionKg)} of meat {state.animal.share === 'half' ? 'on your side' : 'from this animal'} ({region.meatPctOfCarcass.value} % of carcass) <Evidence s={region.meatPctOfCarcass} />
            </p>
          </header>

          {region.options.length > 1 && (
            <>
              <h3>What would you like?</h3>
              <OptionList state={state} path={region.id} options={region.options} current={top} result={result} onPick={(id) => pick(region.id, id)} />
            </>
          )}

          {topOpt.parts?.map((part) => {
            const path = `${region.id}/${part.id}`;
            return (
              <div key={part.id} className="part">
                <h3>{part.name} <span className="opt">{Math.round(part.share * 100)} % of the {region.name.toLowerCase()}</span></h3>
                {part.options.length > 1 && <OptionList state={state} path={path} options={part.options} current={sel[path]} result={result} onPick={(id) => pick(path, id)} />}
                {result.jointPlans.filter((j) => j.path === path).map((j) => (
                  <JointPlanPicker key={j.path} info={j} lines={regionLines} familySize={state.prefs.familySize} onChange={(req) => onAllocation(j.path, req)} />
                ))}
              </div>
            );
          })}

          {result.loinPlans.filter((x) => x.path === region.id).map((x) => (
            <LoinPicker key={x.path} plan={x.plan} lines={regionLines} onChange={(req) => onAllocation(x.path, req)} />
          ))}

          {result.allocations.filter((x) => x.path === region.id).map((x) => (
            <AllocationPicker key={x.path} info={x} lines={regionLines} sides={state.animal.share === 'half' ? 1 : 2} onChange={(plan) => onAllocation(x.path, plan)} />
          ))}

          {result.jointPlans.filter((j) => j.path === region.id).map((j) => (
            <JointPlanPicker key={j.path} info={j} lines={regionLines} familySize={state.prefs.familySize} onChange={(req) => onAllocation(j.path, req)} />
          ))}

          {regionLines.some((l) => l.spec?.allowedThicknessCm) && (
            <div className="part">
              <h3>Thickness</h3>
              {regionLines.map((l) => l.spec && <ThicknessPicker key={l.productId} line={l} spec={l.spec} onThickness={onThickness} />)}
            </div>
          )}

          {regionLines.length > 0 && (
            <div className="part">
              <h3>How to cook</h3>
              <ul className="cook-list">
                {regionLines.map((l) => (
                  <li key={l.productId}><span>{l.name}</span> <CookBadges cookingId={l.cookingId} detail /></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
