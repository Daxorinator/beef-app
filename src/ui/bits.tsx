import { COOKING_BY_ID } from '../data/cooking';
import { SOURCE_BY_ID } from '../data/sources';
import type { Advisory, EvidenceLevel, Sourced } from '../model/types';

export function CookBadges({ cookingId, detail = false }: { cookingId: string; detail?: boolean }) {
  const c = COOKING_BY_ID[cookingId];
  if (!c) return null;
  return (
    <span className="cook" title={c.tip}>
      <span className={`badge heat-${c.heat}`}>{c.heat}</span>
      <span className={`badge temp-${c.temp}`}>{c.temp} temp</span>
      <span className={`badge speed-${c.speed}`}>{c.speed}</span>
      {detail && <span className="cook-methods">{c.methods.join(', ').replace(/-/g, ' ')}</span>}
    </span>
  );
}

export function SourceLinks({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <span className="sources">
      {ids.map((id, i) => {
        const s = SOURCE_BY_ID[id];
        if (!s) return null;
        return (
          <span key={id}>
            {i > 0 && ', '}
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                {s.publisher}
                {s.year ? ` ${s.year}` : ''}
              </a>
            ) : (
              <span title={s.title}>{s.publisher}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const EVIDENCE_LABEL: Record<EvidenceLevel, string> = { verified: 'measured', secondary: 'secondary source', estimate: 'derived', unconfirmed: 'not quantified' };

export function Evidence({ s }: { s: Sourced }) {
  return (
    <span className={`evidence ev-${s.evidence}`} title={s.note}>
      {EVIDENCE_LABEL[s.evidence]}
    </span>
  );
}

const SEV_LABEL = { blocked: 'Not possible', warning: 'Warning', tip: 'Tip', info: 'Note' } as const;

export function Advisories({ items }: { items: Advisory[] }) {
  if (!items.length) return null;
  return (
    <ul className="advisories">
      {items.map((a) => (
        <li key={a.id} className={`adv adv-${a.severity}`}>
          <strong>{SEV_LABEL[a.severity]}</strong> {a.message} {a.sourceIds && <SourceLinks ids={a.sourceIds} />}
        </li>
      ))}
    </ul>
  );
}
