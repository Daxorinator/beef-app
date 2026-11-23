import { PACK_OPTIONS } from '../data/defaults';
import type { EngineResult } from '../engine/compute';
import type { ButcherPrefs, FamilySize } from '../model/types';
import { ThicknessPicker } from './bits';
import { kg } from './format';

interface Props {
  prefs: ButcherPrefs;
  result: EngineResult;
  onChange: (p: ButcherPrefs) => void;
}

const FAMILY: FamilySize[] = [2, 4, 6, 8];
const STEAK_CM = [1.5, 2, 2.5, 3, 4, 5];

export function PackingStep({ prefs: p, result, onChange }: Props) {
  const set = <K extends keyof ButcherPrefs>(k: K, v: ButcherPrefs[K]) => onChange({ ...p, [k]: v });
  const trimKg = result.balance.trimPoolKg;
  const steaks = result.lines.filter((l) => l.spec?.allowedThicknessCm && l.thicknessCm !== undefined);
  const splitTotal = p.trimSplit.mince + p.trimSplit.burgers + p.trimSplit.diced || 1;

  const setSplit = (k: keyof ButcherPrefs['trimSplit'], v: number) => {
    // Keep the three shares summing to 100 by taking the difference from the others proportionally.
    const others = (Object.keys(p.trimSplit) as (keyof ButcherPrefs['trimSplit'])[]).filter((x) => x !== k);
    const rest = 100 - v;
    const oSum = others.reduce((s, x) => s + p.trimSplit[x], 0);
    const next = { ...p.trimSplit, [k]: v };
    others.forEach((x, i) => {
      next[x] = i === others.length - 1 ? rest - others.slice(0, -1).reduce((s, y) => s + next[y], 0) : oSum ? Math.round((p.trimSplit[x] / oSum) * rest) : Math.round(rest / others.length);
    });
    set('trimSplit', next);
  };

  return (
    <div className="step-grid">
      <section className="card">
        <h2>Household</h2>
        <fieldset className="field">
          <legend>People per meal</legend>
          <div className="seg">
            {FAMILY.map((f) => (
              <button key={f} aria-pressed={p.familySize === f} className={p.familySize === f ? 'on' : ''} onClick={() => set('familySize', f)}>{f}</button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Roast per person (raw, boneless)</span>
          <select value={p.roastGramsPerPerson} onChange={(e) => set('roastGramsPerPerson', Number(e.target.value))}>
            {[200, 225, 250, 300, 350].map((x) => <option key={x} value={x}>{x} g</option>)}
          </select>
        </label>
        <p className="hint">Roasting joints will be about {kg((p.familySize * p.roastGramsPerPerson) / 1000)} boneless (more on the bone). Guidance is 225–250 g per person.</p>

        <h2>Steaks</h2>
        <div className="row2">
          <label className="field">
            <span>Standard thickness</span>
            <select value={p.steakThicknessCm} onChange={(e) => onChange({ ...p, steakThicknessCm: Number(e.target.value), thicknessOverrides: Object.fromEntries(Object.entries(p.thicknessOverrides).filter(([id]) => !result.lines.some((l) => l.productId === id && l.spec?.defaultThicknessCm === 2.5))) })}>
              {STEAK_CM.map((x) => <option key={x} value={x}>{x} cm</option>)}
            </select>
          </label>
          <label className="field">
            <span>Steaks per pack</span>
            <select value={p.steaksPerPack} onChange={(e) => set('steaksPerPack', Number(e.target.value))}>
              {PACK_OPTIONS.steaksPerPack.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <p className="hint">Thicker steaks mean fewer, bigger steaks from the same meat. Thick cuts (côte de boeuf, fillet, osso buco) and thin cuts (minute steak) keep their own range.</p>
        {steaks.length > 0 && (
          <div className="part">
            <h3>Thickness by cut</h3>
            {steaks.map((l) => <ThicknessPicker key={l.productId} line={l} spec={l.spec!} onThickness={(id, cm) => set('thicknessOverrides', { ...p.thicknessOverrides, [id]: cm })} />)}
          </div>
        )}
        {Object.keys(p.thicknessOverrides).length > 0 && (
          <button className="link" onClick={() => set('thicknessOverrides', {})}>Reset {Object.keys(p.thicknessOverrides).length} per-cut thickness change(s)</button>
        )}
      </section>

      <section className="card">
        <h2>Trim: mince, burgers &amp; diced</h2>
        <p className="hint">About {kg(trimKg)} of trim (offcuts, and any region you sent to mince) is split three ways.</p>
        {(['mince', 'burgers', 'diced'] as const).map((k) => (
          <label key={k} className="slider">
            <span>{k === 'mince' ? 'Mince' : k === 'burgers' ? 'Burgers' : 'Diced stewing beef'}</span>
            <input type="range" min={0} max={100} step={5} value={p.trimSplit[k]} onChange={(e) => setSplit(k, Number(e.target.value))} />
            <span className="val">{Math.round((p.trimSplit[k] / splitTotal) * 100)} %</span>
          </label>
        ))}
        <div className="row2">
          <label className="field">
            <span>Mince lean</span>
            <select value={p.mince.leanPct} onChange={(e) => set('mince', { ...p.mince, leanPct: Number(e.target.value) as 80 | 85 | 90 | 95 })}>
              {[80, 85, 90, 95].map((x) => <option key={x} value={x}>{x} % lean</option>)}
            </select>
          </label>
          <label className="field">
            <span>Mince pack</span>
            <select value={p.mince.packG} onChange={(e) => set('mince', { ...p.mince, packG: Number(e.target.value) })}>
              {PACK_OPTIONS.mincePackG.map((x) => <option key={x} value={x}>{x === 454 ? '454 g (1 lb)' : `${x} g`}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Burger size</span>
            <select value={p.burgers.grams} onChange={(e) => set('burgers', { ...p.burgers, grams: Number(e.target.value) })}>
              {PACK_OPTIONS.burgerG.map((x) => <option key={x} value={x}>{x} g{x === 113 ? ' (¼ lb)' : x === 170 ? ' (6 oz)' : x === 227 ? ' (½ lb)' : ''}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Burgers per pack</span>
            <select value={p.burgers.perPack} onChange={(e) => set('burgers', { ...p.burgers, perPack: Number(e.target.value) })}>
              {PACK_OPTIONS.burgersPerPack.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Diced pack</span>
            <select value={p.diced.packG} onChange={(e) => set('diced', { packG: Number(e.target.value) })}>
              {PACK_OPTIONS.dicedPackG.map((x) => <option key={x} value={x}>{x} g</option>)}
            </select>
          </label>
        </div>
        <p className="hint">Leaner mince loses fat to the fat trim; 80 % mince takes fat back from it.</p>
      </section>

      <section className="card">
        <h2>Packaging &amp; labels</h2>
        <div className="seg" role="radiogroup" aria-label="Packaging">
          {(['vacuum', 'bag', 'tray'] as const).map((x) => (
            <button key={x} role="radio" aria-checked={p.packaging === x} className={p.packaging === x ? 'on' : ''} onClick={() => set('packaging', x)}>
              {{ vacuum: 'Vacuum packed', bag: 'Freezer bags', tray: 'Trays' }[x]}
            </button>
          ))}
        </div>
        <p className="hint">Vacuum packing keeps frozen beef longest and stops freezer burn.</p>
        {(Object.keys(p.labelling) as (keyof ButcherPrefs['labelling'])[]).map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={p.labelling[k]} onChange={(e) => set('labelling', { ...p.labelling, [k]: e.target.checked })} />
            Label with {{ cutName: 'cut name', weight: 'weight', date: 'date', animalTag: 'animal tag number' }[k]}
          </label>
        ))}
      </section>
    </div>
  );
}
