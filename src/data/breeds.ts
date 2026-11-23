import type { BreedProfile, Sourced } from '../model/types';

const v = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'verified', sourceIds, note });
const s = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'secondary', sourceIds, note });
const d = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived from verified source figures: ${note}` });
const e = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note });

/**
 * Kill-out % is cold carcass (EU reference presentation) / live weight after normal fasting.
 * yieldAdjustmentPts: Teagasc shows the HF vs late-maturing suckler meat gap (65.0 vs 71.2 %) is explained by
 * conformation (6 units × 1.18 %/unit), so breed effects are carried mainly by the grade; small residual
 * adjustments only where evidence suggests one.
 */
export const BREEDS: BreedProfile[] = [
  {
    id: 'aberdeen-angus',
    name: 'Aberdeen Angus (suckler / purebred)',
    type: 'beef-early-maturing',
    killOutPct: {
      bull: e(56, ['teagasc-systems'], 'Between suckler bull (57–59 %) and early-maturing dairy-cross values'),
      steer: e(54, ['teagasc-systems'], 'Teagasc 20–24 mo suckler steer 54.2–54.3 %'),
      heifer: e(53, ['teagasc-systems'], 'Teagasc 24 mo suckler heifer 52.8 %, 20 mo 54.0 %'),
      cow: e(49, ['minchin-2009'], 'No Irish breed-level cow kill-out found; early-maturing cull cows meet spec more often than Friesian'),
    },
    defaultConformation: { bull: 'R+', steer: 'R', heifer: 'R', cow: 'O' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '4-', cow: '3' },
    yieldAdjustmentPts: e(0, ['teagasc-dissection']),
    eyeMuscleCm2PerKg: e(0.225, ['eye-muscle-study'], 'AA × Holstein 0.220–0.221; purebred assumed slightly higher'),
    typicalCarcassKg: {
      steer: s(327.1, ['europ-factors-study'], 'Irish EUROP study mean for Angus steers'),
      heifer: s(286, ['teagasc-angus-heifer'], 'Teagasc Angus heifer trial (O+, 4−); search excerpt only'),
    },
    notes: [
      'Naturally polled (no horns).',
      'Early maturing: lays down fat at lighter weights — watch for fat class 4+ trim losses.',
      'Good marbling; well suited to steaks and roasts.',
    ],
  },
  {
    id: 'angus-x-dairy',
    name: 'Angus × dairy (dairy-calf-to-beef)',
    type: 'dairy-x-beef',
    killOutPct: {
      bull: e(54, ['teagasc-systems']),
      steer: d(52.5, ['teagasc-systems'], '23 mo early-maturing steer: 610 kg → 310–330 kg'),
      heifer: d(52.2, ['teagasc-systems'], '19 mo early-maturing heifer: 460 kg → 230–250 kg'),
      cow: e(48, ['minchin-2009']),
    },
    defaultConformation: { bull: 'O+', steer: 'O+', heifer: 'O+', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '3+', cow: '3-' },
    yieldAdjustmentPts: e(0, ['teagasc-dissection']),
    eyeMuscleCm2PerKg: s(0.22, ['eye-muscle-study'], 'AA × Holstein 0.220–0.221 cm²/kg'),
    typicalCarcassKg: {
      steer: e(306.7, ['icbf-breeds'], 'ICBF mean of all Angus-sired progeny, steers and heifers combined (60 % from dairy dams), O+ 3+; applied to steers'),
      heifer: d(240, ['teagasc-systems'], '19 mo heifer target 230–250 kg (midpoint)'),
    },
    notes: ['Usually polled (Angus is dominant polled).', 'ICBF Angus progeny average O+ conformation, fat 3+.'],
  },
  {
    id: 'jersey',
    name: 'Jersey',
    type: 'dairy',
    killOutPct: {
      bull: e(50, ['teagasc-5923'], 'Bulls kill out higher than steers'),
      steer: v(48.5, ['teagasc-5923'], 'Jersey × HF males 485 g/kg vs 495 g/kg HF'),
      heifer: e(48, ['teagasc-5923']),
      cow: e(44, ['teagasc-5923', 'minchin-2009'], 'Estimate — no Irish Jersey cull-cow kill-out found'),
    },
    defaultConformation: { bull: 'O-', steer: 'P+', heifer: 'P+', cow: 'P' },
    defaultFatClass: { bull: '2+', steer: '3-', heifer: '3-', cow: '2+' },
    yieldAdjustmentPts: e(-1, ['teagasc-5923'], 'Light, fine-boned frame: smaller muscles relative to bone at low carcass weights'),
    eyeMuscleCm2PerKg: e(0.2, ['eye-muscle-study'], 'Below Holstein (0.208); Jersey-sired cattle had poorer conformation'),
    typicalCarcassKg: {
      steer: v(277, ['teagasc-5923'], 'Jersey × HF male, ~2 years'),
      cow: e(223, ['agriland-2025', 'teagasc-moorepark-jersey'], 'Derived: national cow mean 298.6 kg less the 75.8 kg purebred Jersey vs HF cow difference'),
    },
    notes: [
      'Yellow fat (beta-carotene) is cosmetic and normal for Jersey — flavour is unaffected.',
      'Small eye muscle: steaks are smaller in area, so consider thicker steaks or more roasts.',
      'Lower kill-out and lighter carcass than beef breeds.',
      'Dairy stock is usually disbudded (no horns).',
    ],
  },
  {
    id: 'holstein-friesian',
    name: 'Holstein-Friesian',
    type: 'dairy',
    killOutPct: {
      bull: d(52, ['teagasc-systems'], 'U-16 mo HF bull 51.9 %, 18–20 mo 52.5 %'),
      steer: d(51.6, ['teagasc-systems'], '24 mo Friesian steer 620 kg → 310–330 kg'),
      heifer: e(50.5, ['teagasc-systems']),
      cow: e(46, ['minchin-2009'], 'Only 22 % of Friesian cull cows met the target spec'),
    },
    defaultConformation: { bull: 'O', steer: 'O-', heifer: 'O-', cow: 'P+' },
    defaultFatClass: { bull: '2+', steer: '3+', heifer: '3', cow: '3-' },
    yieldAdjustmentPts: e(0, ['teagasc-dissection'], 'HF vs suckler meat gap is explained by grade'),
    eyeMuscleCm2PerKg: s(0.21, ['eye-muscle-study'], 'Friesian 0.212, Holstein 0.208 cm²/kg'),
    typicalCarcassKg: {
      steer: s(322.4, ['europ-factors-study'], 'Irish EUROP study mean for HF steers'),
      bull: v(314, ['teagasc-5923'], 'HF males (bulls and steers) ~2 years'),
      cow: s(298.6, ['agriland-2025'], 'National 2025 cow mean (mostly dairy)'),
    },
    notes: ['Usually disbudded (no horns).', 'Lean conformation (O/P); more bone relative to meat.'],
  },
  {
    id: 'hereford-x-dairy',
    name: 'Hereford × dairy',
    type: 'dairy-x-beef',
    killOutPct: {
      bull: e(54, ['teagasc-systems']),
      steer: e(52.5, ['teagasc-systems'], 'As early-maturing dairy-calf steer'),
      heifer: v(49.3, ['teagasc-heifer'], '497 kg → 245 kg, O−4− (Teagasc home-kill example)'),
      cow: e(48, ['minchin-2009']),
    },
    defaultConformation: { bull: 'O+', steer: 'O+', heifer: 'O-', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '4-', cow: '3' },
    yieldAdjustmentPts: e(0, ['teagasc-dissection']),
    eyeMuscleCm2PerKg: e(0.215, ['eye-muscle-study']),
    typicalCarcassKg: {
      steer: e(310.5, ['icbf-breeds'], 'ICBF mean of all Hereford-sired progeny, steers and heifers combined (62 % from dairy dams), O+ 3+; applied to steers'),
      heifer: v(245, ['teagasc-heifer']),
    },
    notes: ['Hereford is often horned unless polled-line or disbudded.', 'Good marbling and tenderness (Teagasc example).'],
  },
  {
    id: 'continental',
    name: 'Continental (Limousin / Charolais / Belgian Blue / Simmental)',
    type: 'beef-late-maturing',
    killOutPct: {
      bull: d(58, ['teagasc-systems'], 'Suckler bulls 57.1–59.2 %'),
      steer: d(54.2, ['teagasc-systems'], '20 mo suckler steer 590 kg → 310–330 kg'),
      heifer: d(54, ['teagasc-systems'], '20 mo suckler heifer 565 kg → 290–320 kg'),
      cow: e(51, ['minchin-2009'], 'Late-maturing-sired cull cows met the target spec most often (53 %)'),
    },
    defaultConformation: { bull: 'U', steer: 'R+', heifer: 'R+', cow: 'O+' },
    defaultFatClass: { bull: '2+', steer: '3', heifer: '3+', cow: '3' },
    yieldAdjustmentPts: e(0, ['teagasc-dissection']),
    eyeMuscleCm2PerKg: s(0.255, ['eye-muscle-study'], 'Belgian Blue × Holstein 0.255–0.260 cm²/kg'),
    typicalCarcassKg: {
      steer: s(363.2, ['europ-factors-study'], 'Belgian Blue steers, Irish EUROP study'),
      heifer: s(305.2, ['agriland-2025'], 'National 2025 heifer mean'),
      bull: s(370.3, ['agriland-2025'], 'National 2025 young bull mean'),
    },
    notes: ['Lean, heavily muscled; high meat yield.', 'Horned or polled depending on line.'],
  },
];

export const BREED_BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b])) as Record<BreedProfile['id'], BreedProfile>;
