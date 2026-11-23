// Breed profiles. Every value is either measured (verified/secondary) or derived from measured values by a
// stated rule (evidence 'estimate', note starts "Derived:"). See docs/RESEARCH.md §2.
import type { BreedProfile, Sourced } from '../model/types';

const v = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'verified', sourceIds, note });
const s = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'secondary', sourceIds, note });
const d = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived: ${note}` });

// Shared derivation inputs (all sourced):
//  HF steer 51.6 (Teagasc systems, 620 → 310–330 kg); HF bull 52.2 (mean of 51.9, 52.5); bull − steer = +0.6.
//  Heifer = steer − 1.75 (Alberta: 1.5–2.0 lower). Cows: COW_KILLOUT_BY_FAT at fat 3 (47.3 % Irish basis).
//  Irish cull cows (Minchin 2009, mostly dairy): 46.4 %. Jersey vs Holstein: −5.1 % relative (German bull calves);
//  Jersey × HF vs HF: −1.0 point (Teagasc 5923), so purebred ≈ −2.0 points vs HF within that study (HF 49.5).
const BULL_VS_STEER = 0.6;
const HEIFER_VS_STEER = -1.75;

export const BREEDS: BreedProfile[] = [
  {
    id: 'aberdeen-angus',
    name: 'Aberdeen Angus (suckler-bred)',
    type: 'beef-early-maturing',
    killOutPct: {
      steer: d(53.4, ['teagasc-newford'], 'mean of Newford suckler steer kill-outs 2015–2021 (52, 52, 54, 55, 54, 54, 53 %); no purebred-Angus Irish figure found. Alberta: Angus dress higher than Hereford/Simmental'),
      heifer: d(52.3, ['teagasc-newford'], 'mean of Newford suckler heifer kill-outs (52, 52, 53, 52, 53, 52 %)'),
      bull: d(55.7, ['finnish-beef-breeds', 'eu-2017-1182'], 'Finnish purebred Angus bulls 56.8 % (warm) less 2 % for cold weight'),
      cow: d(47.3, ['unl-cull-grades', 'teagasc-newford'], 'cull-cow condition table at fat 3; Newford suckler cull cows measured 48 % at O=4−'),
    },
    defaultConformation: { bull: 'R', steer: 'R', heifer: 'R', cow: 'O' },
    defaultFatClass: { bull: '3-', steer: '3', heifer: '3', cow: '4-' },
    eyeMuscleCm2PerKg: s(0.22, ['eye-muscle-study'], 'Proxy: Aberdeen Angus × Holstein 0.220–0.221 cm²/kg (no purebred figure found)'),
    typicalCarcassKg: {
      steer: s(327.1, ['europ-factors-study'], 'Irish EUROP study mean, Angus steers'),
      heifer: s(286, ['teagasc-angus-heifer'], 'Teagasc Angus heifer trial (O+, 4−); search excerpt only'),
      cow: v(319, ['teagasc-newford'], 'Newford suckler cull cows 2022 (75 months)'),
    },
    notes: [
      'Default grades: Newford suckler steers/heifers R=3 and R−3=, cull cows O=4− (Teagasc); Angus heifer trial O+ 4−.',
      'Naturally polled (no horns).',
      'Early maturing: lays down fat at lighter weights — watch for fat class 4+ trim losses.',
    ],
  },
  {
    id: 'angus-x-dairy',
    name: 'Angus × dairy (dairy-calf-to-beef)',
    type: 'dairy-x-beef',
    killOutPct: {
      steer: d(52.5, ['teagasc-systems'], '23 mo early-maturing dairy-calf steer, 610 kg → 310–330 kg (midpoint)'),
      heifer: d(52.2, ['teagasc-systems'], '19 mo early-maturing dairy-calf heifer, 460 kg → 230–250 kg (midpoint)'),
      bull: d(52.5 + BULL_VS_STEER, ['teagasc-systems'], 'steer value + 0.6 (HF bull − HF steer, Teagasc systems)'),
      cow: d(47.3, ['unl-cull-grades'], 'cull-cow condition table at fat 3'),
    },
    defaultConformation: { bull: 'O+', steer: 'O+', heifer: 'O+', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '3+', cow: '3' },
    eyeMuscleCm2PerKg: s(0.22, ['eye-muscle-study'], 'Aberdeen Angus × Holstein 0.220–0.221 cm²/kg'),
    typicalCarcassKg: {
      steer: v(329, ['teagasc-national-2025'], 'National 2025 dairy-beef steers, 27.0 months'),
      heifer: v(282, ['teagasc-national-2025'], 'National 2025 dairy-beef heifers'),
      bull: v(338, ['teagasc-national-2025'], 'National 2025 dairy-beef young bulls, 20.3 months'),
    },
    notes: ['Default grades: ICBF Angus-sired progeny average O+ 3+ (60 % from dairy dams).', 'Usually polled.'],
  },
  {
    id: 'jersey',
    name: 'Jersey',
    type: 'dairy',
    killOutPct: {
      steer: d(47.5, ['teagasc-5923', 'jersey-bull-calves'], 'Teagasc 5923 HF 49.5 % less 2 × 1.0 point (Jersey × HF was 1.0 point below HF); German Jersey vs Holstein −5.1 % relative gives 47.0 %'),
      heifer: d(47.5 + HEIFER_VS_STEER, ['teagasc-5923', 'alberta-dressing'], 'steer value − 1.75 (heifers 1.5–2.0 lower)'),
      bull: d(47.5 + BULL_VS_STEER, ['teagasc-5923', 'teagasc-systems'], 'steer value + 0.6 (bull − steer, HF)'),
      cow: d(44.0, ['moreira-2021', 'minchin-2009', 'jersey-bull-calves'], 'Irish cull cows 46.4 % (Minchin 2009, mostly dairy) less 5.1 % relative for Jersey'),
    },
    defaultConformation: { bull: 'O-', steer: 'O-', heifer: 'O-', cow: 'P' },
    defaultFatClass: { bull: '2+', steer: '3-', heifer: '3-', cow: '2+' },
    eyeMuscleCm2PerKg: s(0.208, ['eye-muscle-study'], 'Proxy: Holstein 0.208 cm²/kg as an upper bound (Jersey-sired cattle had poorer conformation; no Jersey figure found)'),
    typicalCarcassKg: {
      steer: v(277, ['teagasc-5923'], 'Jersey × HF males at ~2 years (bulls and steers)'),
      cow: d(222.8, ['agriland-2025', 'jds-jersey-proportion'], 'national 2025 cow mean 298.6 kg less the ~76 kg purebred Jersey vs HF cow difference'),
    },
    notes: [
      'Default grades: Jersey-sired males conformation 4.0 (O−), fat 7.7 (3−) on the 15-point scale (Teagasc 5923); HF cows have better conformation than Jersey cows (J Dairy Sci 2018).',
      'Yellow fat (beta-carotene) is cosmetic and normal for Jersey — flavour is unaffected.',
      'Small eye muscle: steaks are smaller in area, so consider thicker steaks or more roasts.',
      'Dairy stock is usually disbudded (no horns).',
    ],
  },
  {
    id: 'holstein-friesian',
    name: 'Holstein-Friesian',
    type: 'dairy',
    killOutPct: {
      steer: d(51.6, ['teagasc-systems', 'teagasc-kilkenny-hf'], '24 mo Friesian steer 620 kg → 310–330 kg; Kilkenny HF steers measured 50.5 % and 51.7 %'),
      heifer: d(51.6 + HEIFER_VS_STEER, ['teagasc-systems', 'alberta-dressing'], 'steer value − 1.75'),
      bull: d(52.2, ['teagasc-systems'], 'mean of U-16 mo (51.9 %) and 18–20 mo (52.5 %) HF bull targets'),
      cow: s(46.4, ['moreira-2021', 'minchin-2009'], 'Irish cull cows 324 kg / 699 kg (Minchin 2009, n = 2163, mostly Friesian)'),
    },
    defaultConformation: { bull: 'O', steer: 'O-', heifer: 'O-', cow: 'P+' },
    defaultFatClass: { bull: '2+', steer: '3', heifer: '3', cow: '3-' },
    eyeMuscleCm2PerKg: s(0.21, ['eye-muscle-study'], 'Friesian 0.212, Holstein 0.208 cm²/kg'),
    typicalCarcassKg: {
      steer: v(307, ['teagasc-national-2025'], 'National 2025 dairy steers, 27.6 months'),
      bull: v(306, ['teagasc-national-2025'], 'National 2025 dairy young bulls, 20.8 months'),
      cow: s(298.6, ['agriland-2025'], 'National 2025 cow mean (mostly dairy)'),
    },
    notes: [
      'Default grades: Kilkenny HF steers P+/O− fat just under 3+ (Teagasc); Teagasc 5923 HF conformation 4.7, fat 8.5 (15-point).',
      'Usually disbudded (no horns).',
    ],
  },
  {
    id: 'hereford-x-dairy',
    name: 'Hereford × dairy',
    type: 'dairy-x-beef',
    killOutPct: {
      steer: d(52.5, ['teagasc-systems'], 'early-maturing dairy-calf steer (as Angus × dairy). Alberta: Hereford dresses lower than Angus (heavier hide, head, feet) — not quantified'),
      heifer: v(49.3, ['teagasc-heifer'], '497 kg → 245 kg, O−4− (Teagasc home-kill heifer, single animal)'),
      bull: d(52.5 + BULL_VS_STEER, ['teagasc-systems'], 'steer value + 0.6'),
      cow: d(47.3, ['unl-cull-grades'], 'cull-cow condition table at fat 3'),
    },
    defaultConformation: { bull: 'O+', steer: 'O+', heifer: 'O-', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '4-', cow: '3' },
    eyeMuscleCm2PerKg: s(0.22, ['eye-muscle-study'], 'Proxy: Aberdeen Angus × Holstein (early-maturing × dairy) 0.220 cm²/kg'),
    typicalCarcassKg: {
      steer: v(329, ['teagasc-national-2025'], 'National 2025 dairy-beef steers'),
      heifer: v(282, ['teagasc-national-2025'], 'National 2025 dairy-beef heifers'),
      bull: v(338, ['teagasc-national-2025'], 'National 2025 dairy-beef young bulls'),
    },
    notes: ['Default grades: ICBF Hereford-sired progeny average O+ 3+; Teagasc home-kill heifer O−4−.', 'Often horned unless polled-line or disbudded.'],
  },
  {
    id: 'continental',
    name: 'Continental suckler (Limousin / Charolais / Belgian Blue / Simmental)',
    type: 'beef-late-maturing',
    killOutPct: {
      steer: d(54.2, ['teagasc-systems'], '20 mo suckler steer 590 kg → 310–330 kg (midpoint)'),
      heifer: d(54.0, ['teagasc-systems'], '20 mo suckler heifer 565 kg → 290–320 kg (midpoint)'),
      bull: d(58.1, ['teagasc-systems'], 'mean of suckler bull systems 57.1, 59.2, 57.9 %'),
      cow: d(47.3, ['unl-cull-grades', 'minchin-2009'], 'cull-cow condition table at fat 3; late-maturing-sired cull cows met the Irish target spec most often (53 %)'),
    },
    defaultConformation: { bull: 'U', steer: 'R+', heifer: 'R+', cow: 'O+' },
    defaultFatClass: { bull: '2+', steer: '3', heifer: '3+', cow: '3' },
    eyeMuscleCm2PerKg: s(0.255, ['eye-muscle-study'], 'Belgian Blue × Holstein 0.255–0.260 cm²/kg'),
    typicalCarcassKg: {
      steer: v(391, ['teagasc-national-2025'], 'National 2025 suckler steers, 28.5 months'),
      heifer: v(341, ['teagasc-national-2025'], 'National 2025 suckler heifers'),
      bull: v(408, ['teagasc-national-2025'], 'National 2025 suckler young bulls, 18.6 months'),
      cow: v(319, ['teagasc-newford'], 'Newford suckler cull cows 2022'),
    },
    notes: ['Default grades: Teagasc suckler heifers "typically R and U grade".', 'Lean, heavily muscled; high meat yield.'],
  },
];

export const BREED_BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b])) as Record<BreedProfile['id'], BreedProfile>;
