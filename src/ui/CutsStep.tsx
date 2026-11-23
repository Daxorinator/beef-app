import { useMemo } from 'react';
import { PRESETS } from '../data/presets';
import { REGION_BY_ID, REGIONS } from '../data/regions';
import { compute, type EngineResult, type Line } from '../engine/compute';
import { exclusionReason, optionsAt } from '../engine/selections';
import type { AppState } from '../engine/state';
import type { CutOption, ProductSpec, Selections } from '../model/types';
import { CookBadges, Evidence } from './bits';
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

function ThicknessPicker({ line, spec, onThickness }: { line: Line; spec: ProductSpec; onThickness: (id: string, cm: number) => void }) {
  if (!spec.allowedThicknessCm || line.thicknessCm === undefined) return null;
  return (
    <label className="thick">
      <span>{line.name}</span>
      <select value={line.thicknessCm} onChange={(e) => onThickness(spec.id, Number(e.target.value))}>
        {spec.allowedThicknessCm.map((t) => <option key={t} value={t}>{t} cm</option>)}
      </select>
      {!line.weightOnly && line.count ? <span className="hint">≈ {line.count} at {weight(line.eachKg!)}</span> : <span className="hint">sold by weight</span>}
    </label>
  );
}

export function CutsStep({ state, result, region: regionId, onRegion, onSelections, onThickness }: Props) {
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
          <button key={p.id} className="chip" title={p.description} onClick={() => onSelections(p.selections)}>{p.label}</button>
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

          <h3>What would you like?</h3>
          <OptionList state={state} path={region.id} options={region.options} current={top} result={result} onPick={(id) => pick(region.id, id)} />

          {topOpt.parts?.map((part) => (
            <div key={part.id} className="part">
              <h3>{part.name} <span className="opt">{Math.round(part.share * 100)} % of the {region.name.toLowerCase()}</span></h3>
              <OptionList state={state} path={`${region.id}/${part.id}`} options={part.options} current={sel[`${region.id}/${part.id}`]} result={result} onPick={(id) => pick(`${region.id}/${part.id}`, id)} />
            </div>
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
