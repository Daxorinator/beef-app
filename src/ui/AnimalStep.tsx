import { BREED_BY_ID, BREEDS } from '../data/breeds';
import { PACK_OPTIONS } from '../data/defaults';
import { CONFORMATION_SCORE, FAT_SCORE } from '../data/grading';
import type { EngineResult } from '../engine/compute';
import type { Animal, BreedId, Conformation, FatClass, Sex } from '../model/types';
import { Evidence, SourceLinks } from './bits';
import { kg, kgRange, pct } from './format';

const SEXES: { id: Sex; label: string; hint: string }[] = [
  { id: 'steer', label: 'Steer', hint: 'Castrated male' },
  { id: 'heifer', label: 'Heifer', hint: 'Female, not calved' },
  { id: 'bull', label: 'Bull', hint: 'Entire male' },
  { id: 'cow', label: 'Cow', hint: 'Female that has calved (cull cow)' },
];

const CONFS = Object.keys(CONFORMATION_SCORE) as Conformation[];
const FATS = Object.keys(FAT_SCORE) as FatClass[];

interface Props {
  animal: Animal;
  result: EngineResult;
  onChange: (a: Animal) => void;
}

export function AnimalStep({ animal: a, result: r, onChange }: Props) {
  const set = <K extends keyof Animal>(k: K, v: Animal[K]) => onChange({ ...a, [k]: v });
  const breed = BREED_BY_ID[a.breed];
  const ko = breed.killOutPct[a.sex];
  const typical = breed.typicalCarcassKg[a.sex];

  return (
    <div className="step-grid">
      <section className="card">
        <h2>Your share</h2>
        <div className="seg" role="radiogroup" aria-label="Share">
          {(['whole', 'half'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={a.share === s} className={a.share === s ? 'on' : ''} onClick={() => set('share', s)}>
              {s === 'whole' ? 'Whole animal' : 'Half (one side)'}
            </button>
          ))}
        </div>

        <h2>The animal</h2>
        <label className="field">
          <span>Breed</span>
          <select value={a.breed} onChange={(e) => {
            const b = BREED_BY_ID[e.target.value as BreedId];
            onChange({ ...a, breed: b.id, horned: b.id === 'aberdeen-angus' || b.type === 'dairy' || b.id === 'angus-x-dairy' ? false : a.horned });
          }}>
            {BREEDS.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>

        <fieldset className="field">
          <legend>Sex</legend>
          <div className="seg">
            {SEXES.map((s) => (
              <button key={s.id} title={s.hint} aria-pressed={a.sex === s.id} className={a.sex === s.id ? 'on' : ''} onClick={() => set('sex', s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="row2">
          <label className="field">
            <span>Age (months)</span>
            <input type="number" min={6} max={180} value={a.ageMonths} onChange={(e) => set('ageMonths', Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <label className="field">
            <span>Weight (kg)</span>
            <input type="number" min={50} max={1500} value={a.weightKg} onChange={(e) => set('weightKg', Math.max(0, Number(e.target.value) || 0))} />
          </label>
        </div>
        <div className="seg small" role="radiogroup" aria-label="Weight basis">
          {(['live', 'carcass'] as const).map((w) => (
            <button key={w} role="radio" aria-checked={a.weightBasis === w} className={a.weightBasis === w ? 'on' : ''} onClick={() => set('weightBasis', w)}>
              {w === 'live' ? 'Live weight' : 'Carcass (cold, from kill sheet)'}
            </button>
          ))}
        </div>
        {typical && (
          <p className="hint">
            Typical Irish {breed.name} {a.sex} carcass: {kg(typical.value, 0)} <Evidence s={typical} /> <SourceLinks ids={typical.sourceIds} />
          </p>
        )}

        <label className="check">
          <input type="checkbox" checked={a.horned} onChange={(e) => set('horned', e.target.checked)} /> Has horns (not polled or disbudded)
        </label>
      </section>

      <section className="card">
        <h2>Grade <span className="opt">optional</span></h2>
        <p className="hint">EUROP conformation and fat class from the kill sheet. Leave as "typical" if you don't know yet.</p>
        <div className="row2">
          <label className="field">
            <span>Conformation</span>
            <select value={a.conformation ?? ''} onChange={(e) => set('conformation', (e.target.value || undefined) as Conformation | undefined)}>
              <option value="">Typical ({breed.defaultConformation[a.sex]})</option>
              {CONFS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Fat class</span>
            <select value={a.fatClass ?? ''} onChange={(e) => set('fatClass', (e.target.value || undefined) as FatClass | undefined)}>
              <option value="">Typical ({breed.defaultFatClass[a.sex]})</option>
              {FATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>

        <h2>Hanging</h2>
        <label className="field">
          <span>Days hung before cutting</span>
          <select value={a.hangingDays} onChange={(e) => set('hangingDays', Number(e.target.value))}>
            {PACK_OPTIONS.hangingDays.map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
        <p className="hint">Longer hanging improves tenderness but loses weight: {pct(r.comp.hangingLossPct)} of carcass at {a.hangingDays} days.</p>

        <h2>Slaughter</h2>
        <div className="seg small" role="radiogroup" aria-label="Slaughter route">
          {(['approved-abattoir', 'on-farm-private'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={a.route === s} className={a.route === s ? 'on' : ''} onClick={() => set('route', s)}>
              {s === 'approved-abattoir' ? 'Approved abattoir' : 'On-farm (own use only)'}
            </button>
          ))}
        </div>

        <h2>Organic</h2>
        <label className="check">
          <input type="checkbox" checked={a.organic.certified} onChange={(e) => set('organic', { ...a.organic, certified: e.target.checked })} /> Certified organic animal
        </label>
        {a.organic.certified && (
          <div className="indent">
            <label className="field">
              <span>Control body</span>
              <select value={a.organic.controlBody ?? ''} onChange={(e) => set('organic', { ...a.organic, controlBody: (e.target.value || undefined) as 'IOA' | 'Organic Trust' | undefined })}>
                <option value="">—</option>
                <option value="IOA">Irish Organic Association (IOA)</option>
                <option value="Organic Trust">Organic Trust</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={a.organic.sellingAsOrganic} onChange={(e) => set('organic', { ...a.organic, sellingAsOrganic: e.target.checked })} /> Will sell or label meat as organic
            </label>
            <label className="check">
              <input type="checkbox" checked={!!a.organic.abattoirCovered} onChange={(e) => set('organic', { ...a.organic, abattoirCovered: e.target.checked })} /> Abattoir is certified / on my certificate
            </label>
            <label className="check">
              <input type="checkbox" checked={!!a.organic.butcherCovered} onChange={(e) => set('organic', { ...a.organic, butcherCovered: e.target.checked })} /> Butcher is certified / on my certificate
            </label>
          </div>
        )}
      </section>

      <section className="card estimate">
        <h2>Estimate</h2>
        <dl>
          <dt>Kill-out</dt>
          <dd>
            {pct(r.killOutPct)} <Evidence s={ko} />
            {a.sex === 'cow' && <span className="hint"> adjusted for fat class</span>}
          </dd>
          <dt>{a.weightBasis === 'live' ? 'Carcass (cold)' : 'Live (estimated)'}</dt>
          <dd>{a.weightBasis === 'live' ? kg(r.wholeCarcassKg) : kg(r.wholeCarcassKg / (r.killOutPct / 100))}</dd>
          <dt>Grade used</dt>
          <dd>{r.grade.conformation}{r.grade.fatClass}{r.grade.fromUser ? '' : ' (typical)'}</dd>
          <dt>Take-home meat{a.share === 'half' ? ' (your half)' : ''}</dt>
          <dd><strong>{kgRange(r.balance.meatRangeKg[0], r.balance.meatRangeKg[1])}</strong></dd>
        </dl>
        <p className="hint" title={ko.note}>Kill-out source: <SourceLinks ids={ko.sourceIds} /></p>
        <ul className="notes">
          {breed.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>
    </div>
  );
}
