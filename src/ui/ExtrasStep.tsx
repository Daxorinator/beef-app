import { COOKING_BY_ID } from '../data/cooking';
import type { EngineResult, PartLine } from '../engine/compute';
import type { Animal, AnimalPart, PartRequest } from '../model/types';
import { CookBadges, Evidence } from './bits';
import { weight } from './format';

const GROUPS: { id: AnimalPart['group'][]; label: string }[] = [
  { id: ['offal', 'head'], label: 'Offal & head meat' },
  { id: ['bone'], label: 'Bones' },
  { id: ['fat'], label: 'Fat' },
  { id: ['digestive', 'blood', 'other'], label: 'Other edible parts' },
  { id: ['hide-skin'], label: 'Hide, horns & ears' },
];

const STATUS_LABEL = {
  edible: 'Food',
  'edible-processing': 'Food after processing',
  'abp-cat3': 'By-product (Cat. 3), not food',
  'abp-cat2': 'Category 2: never returned',
  srm: 'Specified risk material: never returned',
} as const;

const AVAIL_LABEL = { usually: 'Usually available', 'on-request': 'Ask your abattoir', rarely: 'Rarely available', never: 'Not returned' } as const;

interface Props {
  animal: Animal;
  result: EngineResult;
  requests: PartRequest[];
  onChange: (r: PartRequest[]) => void;
}

export function ExtrasStep({ animal, result, requests, onChange }: Props) {
  const get = (id: string) => requests.find((r) => r.partId === id);
  const put = (id: string, patch: Partial<PartRequest>) => {
    const cur = get(id) ?? { partId: id, want: false };
    onChange([...requests.filter((r) => r.partId !== id), { ...cur, ...patch }]);
  };

  const row = (p: PartLine) => {
    const part = p.info.part;
    const req = get(part.id);
    const disabled = !p.info.requestable;
    const why = p.info.statusNote ?? (p.info.status === 'srm' || p.info.status === 'abp-cat2' || p.info.availability === 'never' ? part.requestNote : undefined);
    return (
      <li key={part.id} className={`part-row${disabled ? ' disabled' : ''}${p.wanted ? ' on' : ''}`}>
        <label className="check">
          <input type="checkbox" checked={!!req?.want && !disabled} disabled={disabled} onChange={(e) => put(part.id, { want: e.target.checked })} />
          <span className="part-name">{part.name}</span>
        </label>
        <span className="part-kg">
          {part.reference.pct.value === 0 ? 'not quantified' : weight(p.kg)}
          {p.edibleKg !== undefined && p.kg > 0 && <span className="hint"> ({weight(p.edibleKg)} trimmed)</span>}
        </span>
        <span className="part-meta">
          <span className={`tag st-${p.info.status}`}>{STATUS_LABEL[p.info.status]}</span>
          {!disabled && <span className={`tag av-${p.info.availability}`}>{AVAIL_LABEL[p.info.availability]}</span>}
          <Evidence s={part.reference.pct} />
          {part.cookingId && COOKING_BY_ID[part.cookingId] && <CookBadges cookingId={part.cookingId} />}
        </span>
        {(part.uses.length > 0 || why || p.note || part.requestNote) && (
          <span className="part-notes">
            {part.uses.length > 0 && <span>{part.uses.join(' · ')}. </span>}
            {disabled ? why && <span className="why">{why}</span> : part.requestNote && <span>{part.requestNote} </span>}
            {p.note && <em> {p.note}.</em>}
          </span>
        )}
        {!disabled && req?.want && (
          <span className="part-controls">
            {animal.share === 'half' && part.halfShare === 'whole-or-none' && (
              <label className="check small">
                <input type="checkbox" checked={!!req.takeWhole} onChange={(e) => put(part.id, { takeWhole: e.target.checked })} /> I take the whole item
              </label>
            )}
            {p.info.pooled && (
              <label className="small">
                Amount{' '}
                <select value={req.fraction ?? 1} onChange={(e) => put(part.id, { fraction: Number(e.target.value) })}>
                  <option value={1}>All</option>
                  <option value={0.5}>Half</option>
                  <option value={0.25}>A quarter</option>
                </select>
              </label>
            )}
            {part.id === 'fat-trim' && (
              <label className="small">
                Form{' '}
                <select value={req.form ?? 'raw'} onChange={(e) => put(part.id, { form: e.target.value as 'raw' | 'rendered' })}>
                  <option value="raw">Raw</option>
                  <option value="rendered">Rendered (dripping / tallow)</option>
                </select>
              </label>
            )}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="extras">
      <p className="lede">
        The "fifth quarter": everything that isn't carcass meat. Weights are raw, as removed, scaled from AHDB's 600 kg reference steer. Ask your abattoir before the kill for anything marked "Ask".
      </p>
      <div className="extras-grid">
        {GROUPS.map((grp) => {
          const items = result.parts.filter((p) => grp.id.includes(p.info.part.group));
          if (!items.length) return null;
          return (
            <section key={grp.label} className="card">
              <h2>{grp.label}</h2>
              <ul className="part-list">{items.map(row)}</ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
