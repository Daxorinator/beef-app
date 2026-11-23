import { useEffect, useMemo, useState } from 'react';
import { BREED_BY_ID } from './data/breeds';
import { compute } from './engine/compute';
import { SEX_LABEL } from './engine/cutsheet';
import { DEFAULT_STATE, type AppState } from './engine/state';
import { AnimalStep } from './ui/AnimalStep';
import { CutsStep } from './ui/CutsStep';
import { ExtrasStep } from './ui/ExtrasStep';
import { kg } from './ui/format';
import { PackingStep } from './ui/PackingStep';
import { ResultsStep } from './ui/ResultsStep';
import { decodeState, encodeState, loadSaved, saveState } from './ui/persist';

const STEPS = [
  { id: 'animal', label: 'Animal' },
  { id: 'cuts', label: 'Cuts' },
  { id: 'extras', label: 'Offal & extras' },
  { id: 'packing', label: 'Packing' },
  { id: 'results', label: 'Results & cut sheet' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

function initialState(): AppState {
  const fromHash = decodeState(window.location.hash);
  if (fromHash) return fromHash;
  return loadSaved() ?? DEFAULT_STATE;
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [step, setStep] = useState<StepId>(() => (decodeState(window.location.hash) ? 'results' : 'animal'));
  const [region, setRegion] = useState('fore-rib');
  const result = useMemo(() => compute(state), [state]);

  useEffect(() => {
    saveState(state);
  }, [state]);
  useEffect(() => {
    // A share link is applied once, then removed so later edits aren't overwritten on reload.
    if (window.location.hash.startsWith('#s=')) history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  useEffect(() => {
    // Block body: scrollTo returns a Promise in recent browsers, which must not be returned to React.
    window.scrollTo({ top: 0 });
  }, [step]);

  const shareUrl = `${window.location.origin}${window.location.pathname}#s=${encodeState(state)}`;
  const idx = STEPS.findIndex((s) => s.id === step);
  const a = state.animal;
  const b = result.balance;
  const warnings = result.advisories.filter((x) => x.severity === 'warning' || x.severity === 'blocked').length;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" /><path d="M7 12c3-4 13-5 18-1 2 2 2 6 0 8-4 4-14 4-18 0-2-2-2-5 0-7z" /></svg>
          <div>
            <h1>Beef Cut Planner</h1>
            <p>Plan your cut sheet for Irish beef: cuts, yields and cooking</p>
          </div>
        </div>
        <button className="link no-print" onClick={() => { if (confirm('Start again with default settings?')) { setState(DEFAULT_STATE); setStep('animal'); } }}>Start again</button>
      </header>

      <nav className="stepper no-print" aria-label="Steps">
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button className={`${s.id === step ? 'on' : ''}${i < idx ? ' done' : ''}`} aria-current={s.id === step ? 'step' : undefined} onClick={() => setStep(s.id)}>
                <span className="num">{i + 1}</span>
                <span className="lbl">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="summary no-print" aria-live="polite">
        <span><b>{SEX_LABEL[a.sex]}</b> · {BREED_BY_ID[a.breed].name.replace(/ \(.*\)/, '')} · {a.ageMonths} mo{a.share === 'half' ? ' · half' : ''}</span>
        <span>Carcass <b>{kg(b.carcassKg, 0)}</b></span>
        <span>Take-home <b>≈ {kg(b.meatKg, 0)}</b></span>
        <span>Steaks <b>{kg(result.totals.steaksKg, 0)}</b> · Roasts <b>{kg(result.totals.roastsKg, 0)}</b> · Slow <b>{kg(result.totals.slowCookKg, 0)}</b> · Mince <b>{kg(result.totals.minceBurgersKg, 0)}</b></span>
        {warnings > 0 && <button className="warn-pill" onClick={() => setStep('results')}>{warnings} warning{warnings > 1 ? 's' : ''}</button>}
      </div>

      <main>
        {step === 'animal' && <AnimalStep animal={a} result={result} onChange={(animal) => setState((s) => ({ ...s, animal }))} />}
        {step === 'cuts' && (
          <CutsStep
            state={state}
            result={result}
            region={region}
            onRegion={setRegion}
            onSelections={(selections) => setState((s) => ({ ...s, selections }))}
            onAllocation={(path, plan) => setState((s) => ({ ...s, allocations: { ...s.allocations, [path]: plan } }))}
            onRoastCount={(path, n) => setState((s) => ({ ...s, roastCounts: { ...s.roastCounts, [path]: n } }))}
            onThickness={(id, cm) => setState((s) => ({ ...s, prefs: { ...s.prefs, thicknessOverrides: { ...s.prefs.thicknessOverrides, [id]: cm } } }))}
          />
        )}
        {step === 'extras' && <ExtrasStep animal={a} result={result} requests={state.partRequests} onChange={(partRequests) => setState((s) => ({ ...s, partRequests }))} />}
        {step === 'packing' && <PackingStep prefs={state.prefs} result={result} onChange={(prefs) => setState((s) => ({ ...s, prefs }))} />}
        {step === 'results' && <ResultsStep state={state} result={result} shareUrl={shareUrl} />}
      </main>

      <footer className="nav-foot no-print">
        <button disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].id)}>← {idx > 0 ? STEPS[idx - 1].label : 'Back'}</button>
        {idx < STEPS.length - 1 && <button className="primary" onClick={() => setStep(STEPS[idx + 1].id)}>{STEPS[idx + 1].label} →</button>}
      </footer>
      <p className="disclaimer">
        Estimates only. Yields vary with the animal and the butcher. Based on Irish and EU rules (SRM, animal by-products, organic standards) as of November 2026. Check with your abattoir and control body.
      </p>
    </div>
  );
}
