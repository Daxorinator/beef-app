import { useState } from 'react';
import { COOKING_BY_ID } from '../data/cooking';
import { CUTTING_LOSS_PCT, FREEZER_LITRES_PER_KG, HOME_BUTCHER_FACTOR } from '../data/model-constants';
import { SOURCES } from '../data/sources';
import { categoryOf, type EngineResult, type UseCategory } from '../engine/compute';
import { buildCutSheet, cutSheetText } from '../engine/cutsheet';
import type { AppState } from '../engine/state';
import { Advisories, CookBadges, Evidence } from './bits';
import { kg, weight } from './format';

const CAT_HEAD: Record<UseCategory, string> = { steaks: 'Steaks (grill & fry)', roasts: 'Roasts, joints & whole pieces', slow: 'Slow cook: braising, diced & ribs', mince: 'Mince & burgers' };

function MassBar({ r }: { r: EngineResult }) {
  const b = r.balance;
  const segs = [
    { k: 'meat', label: 'Take-home meat', v: b.meatKg },
    { k: 'bone', label: 'Bone (not in cuts)', v: b.marrowKg + b.soupBoneKg },
    { k: 'fat', label: 'Fat & trimmings', v: Math.max(0, b.fatPoolKg) },
    { k: 'loss', label: 'Hanging & cutting loss', v: b.hangingLossKg + b.cuttingLossKg },
  ];
  return (
    <figure className="massbar">
      <div className="bar" role="img" aria-label={segs.map((s) => `${s.label} ${kg(s.v)}`).join(', ')}>
        {segs.map((s) => (
          <span key={s.k} className={`seg-${s.k}`} style={{ width: `${b.carcassKg > 0 ? (s.v / b.carcassKg) * 100 : 0}%` }} />
        ))}
      </div>
      <figcaption>
        {segs.map((s) => (
          <span key={s.k}><i className={`sw seg-${s.k}`} />{s.label} <b>{kg(s.v)}</b> ({b.carcassKg > 0 ? ((s.v / b.carcassKg) * 100).toFixed(0) : 0} %)</span>
        ))}
      </figcaption>
    </figure>
  );
}

export function ResultsStep({ state, result: r, shareUrl }: { state: AppState; result: EngineResult; shareUrl: string }) {
  const [copied, setCopied] = useState<string>();
  const sheet = buildCutSheet(state, r);
  const b = r.balance;
  const groups = (Object.keys(CAT_HEAD) as UseCategory[]).map((k) => ({ k, lines: r.lines.filter((l) => categoryOf(l) === k) })).filter((x) => x.lines.length);
  const countIn = (c: UseCategory) => r.lines.filter((l) => categoryOf(l) === c && !l.weightOnly).reduce((s, l) => s + (l.count ?? 0), 0);
  const share = (v: number) => (b.carcassKg > 0 ? (v / b.carcassKg) * 100 : 0);
  const wanted = r.parts.filter((p) => p.wanted && p.kg > 0);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(undefined), 2000);
    } catch {
      setCopied('failed');
    }
  };

  return (
    <div className="results">
      <section className="tiles">
        <div className="tile big">
          <span className="tile-label">Take-home meat</span>
          <span className="tile-val">≈ {kg(b.meatKg, 0)}</span>
          <span className="tile-sub">{share(b.meatKg).toFixed(0)} % of a {kg(b.carcassKg, 0)} {state.animal.share === 'half' ? 'side' : 'carcass'} · up to {kg(b.meatRangeKg[1], 0)} with commercial trimming</span>
        </div>
        <div className="tile"><span className="tile-label">Steaks</span><span className="tile-val">{kg(r.totals.steaksKg, 0)}</span><span className="tile-sub">{countIn('steaks')} steaks</span></div>
        <div className="tile"><span className="tile-label">Roasts &amp; pieces</span><span className="tile-val">{kg(r.totals.roastsKg, 0)}</span><span className="tile-sub">{countIn('roasts')} joints &amp; pieces</span></div>
        <div className="tile"><span className="tile-label">Slow cook</span><span className="tile-val">{kg(r.totals.slowCookKg, 0)}</span><span className="tile-sub">diced, braising, ribs</span></div>
        <div className="tile"><span className="tile-label">Mince &amp; burgers</span><span className="tile-val">{kg(r.totals.minceBurgersKg, 0)}</span><span className="tile-sub">{r.lines.find((l) => l.kind === 'burger')?.count ?? 0} burgers</span></div>
        <div className="tile"><span className="tile-label">Offal &amp; extras</span><span className="tile-val">{kg(r.totals.offalKg, 0)}</span><span className="tile-sub">+ {kg(b.boneReturnedKg, 0)} bones, {kg(b.fatReturnedKg, 0)} fat</span></div>
        <div className="tile"><span className="tile-label">Freezer space</span><span className="tile-val">≈ {Math.round(r.freezerLitres / 10) * 10} L</span><span className="tile-sub">{(r.freezerLitres / 28.3).toFixed(0)} cu ft{r.freezerBoneLitres > 0 ? `, + ${Math.round(r.freezerBoneLitres / 10) * 10} L for bones` : ''}</span></div>
      </section>

      <MassBar r={r} />
      <Advisories items={r.advisories} />

      <section className="card">
        <h2>Your cuts</h2>
        <div className="table-wrap">
          <table className="products">
            <thead>
              <tr><th>Cut</th><th>From</th><th className="num">Weight</th><th className="num">Count</th><th className="num">Each</th><th className="num">Thick</th><th className="num">Packs</th><th>Cooking</th></tr>
            </thead>
            {groups.map((grp) => (
              <tbody key={grp.k}>
                <tr className="group"><th colSpan={8}>{CAT_HEAD[grp.k]} <span className="opt">{kg(grp.lines.reduce((s, l) => s + l.weightKg, 0))}</span></th></tr>
                {grp.lines.map((l) => (
                  <tr key={l.productId}>
                    <td title={l.sizeNote}>{l.name}{l.boneKg > 0 && <span className="opt"> on the bone</span>}</td>
                    <td className="from">{l.regionName}</td>
                    <td className="num">{kg(l.weightKg)}</td>
                    <td className="num">{l.weightOnly ? <span className="opt" title="No sourced piece size: sold by weight">by wt</span> : l.count ?? '—'}</td>
                    <td className="num">{l.eachKg && !l.weightOnly ? weight(l.eachKg) : '—'}</td>
                    <td className="num">{l.thicknessCm ? `${l.thicknessCm} cm` : '—'}</td>
                    <td className="num">{l.packs ?? '—'}{l.perPack && l.perPack > 1 ? <span className="opt"> ×{l.perPack}</span> : null}</td>
                    <td><CookBadges cookingId={l.cookingId} /><span className="cook-tip">{COOKING_BY_ID[l.cookingId]?.methods.slice(0, 2).join(', ').replace(/-/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        {wanted.length > 0 && (
          <>
            <h3>Offal, bones &amp; extras requested</h3>
            <ul className="extras-summary">
              {wanted.map((p) => (
                <li key={p.info.part.id}>{p.info.part.name}: <b>{weight(p.kg)}</b>{p.info.part.cookingId && <> <CookBadges cookingId={p.info.part.cookingId} /></>}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card cutsheet" id="cutsheet">
        <div className="cutsheet-head">
          <h2>Cut sheet for your butcher</h2>
          <div className="actions no-print">
            <button onClick={() => window.print()}>Print</button>
            <button onClick={() => copy('text', cutSheetText(sheet, r))}>{copied === 'text' ? 'Copied' : 'Copy as text'}</button>
            <button onClick={() => copy('link', shareUrl)}>{copied === 'link' ? 'Link copied' : 'Copy share link'}</button>
            {copied === 'failed' && <span className="hint">Copy failed. Select the text instead.</span>}
          </div>
        </div>
        {sheet.lines.map((s) => (
          <div key={s.heading} className="cs-block">
            <h3>{s.heading}</h3>
            <ul>{s.instructions.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
        {sheet.regulatoryNotes.length > 0 && (
          <div className="cs-block">
            <h3>Regulatory notes (Ireland)</h3>
            <ul>{sheet.regulatoryNotes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
        <p className="hint">Estimated take-home: about {kg(b.meatKg)} (up to {kg(b.meatRangeKg[1])} with commercial-style trimming). Counts are estimates. Your butcher will portion to the actual animal.</p>
      </section>

      <details className="card method no-print">
        <summary>How these numbers are worked out</summary>
        <ol>
          <li>Live weight × kill-out ({r.killOutPct.toFixed(1)} % for this breed, sex{state.animal.sex === 'cow' ? ' and body condition' : ''}) gives the cold carcass weight (EU 2017/1182 presentation).</li>
          <li>Meat, fat trim and bone come from the AHDB EUROP yield grid at grade {r.grade.conformation}{r.grade.fatClass}: {r.comp.commercialMeatPct.toFixed(1)} % meat with commercial boning, {r.comp.fatPct.toFixed(1)} % fat, {r.comp.bonePct.toFixed(1)} % bone after {state.animal.hangingDays} days' hanging ({r.comp.hangingLossPct.toFixed(1)} % lost, SDSU) and {CUTTING_LOSS_PCT.value.toFixed(2)} % cutting loss <Evidence s={CUTTING_LOSS_PCT} />.</li>
          <li>Meat is shared between the 15 regions and the lean-trim pool in AHDB Beef Yield Guide proportions. Each cut takes its measured retail yield (Texas A&amp;M, McKenna 2003); the rest goes to trim.</li>
          <li>Bone-in cuts add bone from USDA refuse data; this bone comes out of the stock and marrow bones.</li>
          <li>Steak sizes are USDA-measured steaks, scaled by (carcass ÷ reference)^⅔ and your thickness. Joints are sized for your household.</li>
          <li>Craft butchers trim harder than commercial boning plants, so the estimate is {Math.round((1 - HOME_BUTCHER_FACTOR.value) * 100)} % below the commercial grid figure <Evidence s={HOME_BUTCHER_FACTOR} />. A Teagasc home-killed heifer came in that far below. Every cut weight and count above uses this realistic level.</li>
          <li>Freezer space ≈ {FREEZER_LITRES_PER_KG.value} L per kg (Teagasc: 143 kg of meat filled a 400 L freezer) <Evidence s={FREEZER_LITRES_PER_KG} />.</li>
        </ol>
        <h3>Sources</h3>
        <ul className="source-list">
          {SOURCES.map((s) => (
            <li key={s.id}>
              <span className={`jur jur-${s.jurisdiction}`}>{s.jurisdiction}</span>{' '}
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title} — {s.publisher}{s.year ? `, ${s.year}` : ''}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
