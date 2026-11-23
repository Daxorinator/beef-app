// Breed profiles. Every value is either measured (verified/secondary) or derived from measured values by a
// stated rule (evidence 'estimate', note starts "Derived:"). See docs/RESEARCH.md §2.
import type { BreedProfile, Sourced } from '../model/types';

const v = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'verified', sourceIds, note });
const s = (value: number, sourceIds: string[], note?: string): Sourced => ({ value, evidence: 'secondary', sourceIds, note });
const d = (value: number, sourceIds: string[], note: string): Sourced => ({ value, evidence: 'estimate', sourceIds, note: `Derived: ${note}` });

// Shared derivation inputs (all sourced):
//  HF steer 51.6 (Teagasc systems, 620 → 310–330 kg); HF bull 52.2 (mean of 51.9, 52.5); bull − steer = +0.6.
//  Heifer = steer − 1.75 (Alberta: 1.5–2.0 lower). Cow values are at the breed's DEFAULT cow fat class; the engine
//  adjusts only for the difference from that class using COW_KILLOUT_BY_FAT (relative steps, not absolute levels).
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
      steer: d(53.4, ['teagasc-newford', 'nz-mpi-dressing'], 'mean of Newford suckler steer kill-outs 2015–2021 (52, 52, 54, 55, 54, 54, 53 %). Cross-check: Irish HF 51.6 % + Angus-vs-Friesian offset +1.5 (NZ trial) to +2.3 (Manawatu, 13,853 Angus steers) = 53.1–53.9 %'),
      heifer: d(52.3, ['teagasc-newford'], 'mean of Newford suckler heifer kill-outs (52, 52, 53, 52, 53, 52 %)'),
      bull: d(55.7, ['finnish-beef-breeds', 'eu-2017-1182'], 'Finnish purebred Angus bulls 56.8 % (warm) less 2 % for cold weight'),
      cow: v(48, ['teagasc-newford'], 'Newford suckler cull cows measured 48 % at O=4− (the default cow grade)'),
    },
    defaultConformation: { bull: 'R', steer: 'R', heifer: 'R', cow: 'O' },
    defaultFatClass: { bull: '3-', steer: '3', heifer: '3', cow: '4-' },
    eyeMuscleCm2PerKg: s(0.22, ['keane-2008'], 'Proxy: Aberdeen Angus × Holstein-Friesian 0.220 cm²/kg (Keane & Drennan 2008); no purebred figure found'),
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
      steer: d(52.5, ['teagasc-systems', 'keane-2008'], '23 mo early-maturing dairy-calf steer, 610 kg → 310–330 kg (midpoint). Cross-check: Grange trial AA × HF 514 vs HF 501 g/kg (+1.3) → 52.9 % on Irish HF 51.6 %'),
      heifer: d(52.2, ['teagasc-systems'], '19 mo early-maturing dairy-calf heifer, 460 kg → 230–250 kg (midpoint)'),
      bull: d(52.5 + BULL_VS_STEER, ['teagasc-systems'], 'steer value + 0.6 (HF bull − HF steer, Teagasc systems)'),
      cow: d(47.3, ['unl-cull-grades', 'moreira-2021'], 'cull-cow condition table, Boner (fat 3) = the default cow fat class; Irish cull cows measured 46.4 % (Minchin 2009)'),
    },
    defaultConformation: { bull: 'O', steer: 'O', heifer: 'O', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3-', heifer: '3-', cow: '3' },
    eyeMuscleCm2PerKg: v(0.22, ['keane-2008'], 'Aberdeen Angus × Holstein-Friesian steers, M. longissimus area 0.220 cm²/kg carcass (Keane & Drennan 2008, Grange)'),
    typicalCarcassKg: {
      steer: v(329, ['teagasc-national-2025'], 'National 2025 dairy-beef steers, 27.0 months'),
      heifer: v(282, ['teagasc-national-2025'], 'National 2025 dairy-beef heifers'),
      bull: v(338, ['teagasc-national-2025'], 'National 2025 dairy-beef young bulls, 20.3 months'),
    },
    notes: ['Default grades (15-point): Angus × HF steer conformation 5.37 (O), fat 7.00 (3−) at 327.4 kg (Berry et al. 2018); ICBF Angus-sired progeny average O+ 3+.', 'Usually polled.'],
  },
  {
    id: 'jersey',
    name: 'Jersey',
    type: 'dairy',
    killOutPct: {
      steer: d(49.0, ['nz-mpi-dressing', 'teagasc-systems'], 'Irish HF steer 51.6 % less 2.6 points: purebred Jersey 48.6 % vs Friesian 51.2 % steers in the same NZ trial (Barton & Pleasants 1997). Cross-checks: Teagasc 5923 linear 47.5 %, German bull calves 47.0 %'),
      heifer: d(49.0 + HEIFER_VS_STEER, ['teagasc-5923', 'alberta-dressing'], 'steer value − 1.75 (heifers 1.5–2.0 lower)'),
      bull: d(49.0 + BULL_VS_STEER, ['nz-mpi-dressing', 'teagasc-systems'], 'steer value + 0.6 (bull − steer, HF)'),
      cow: d(43.8, ['moreira-2021', 'minchin-2009', 'nz-mpi-dressing', 'nzga-cull-cows', 'jas-cull-jersey-2018'], 'typical-condition value at the default fat class 2+ (Berry 2018 Jersey cows 6.16 ≈ 2+). No measured Jersey cow kill-out exists in any source found. Irish cull cows 46.4 % (Minchin 2009, mostly Friesian) less 2.6 points (purebred Jersey vs Friesian steers in the same NZ trial). Cross-checks: NZ cull dairy cows measured 41–44 % (Muir et al.; MPI 42.6 %); US Jersey cull cows have lower body condition than Holstein (7.6 % vs 21.4 % at BCS ≥ 3) and 193.7 vs 285.2 kg hot carcass'),
    },
    defaultConformation: { bull: 'P+', steer: 'P+', heifer: 'P+', cow: 'P' },
    defaultFatClass: { bull: '2+', steer: '3-', heifer: '3-', cow: '2+' },
    eyeMuscleCm2PerKg: s(0.201, ['keane-2008', 'jds-jersey-proportion'], 'Proxy: Holstein-Friesian 0.201 cm²/kg as an upper bound; Jersey steers have poorer conformation (2.97 vs 3.76, Berry 2018). No Jersey figure found'),
    typicalCarcassKg: {
      steer: v(277.0, ['jds-jersey-proportion'], 'Purebred Jersey steer at 28 months, Irish national data (Berry et al. 2018, Table 2)'),
      cow: v(204.3, ['jds-jersey-proportion'], 'Purebred Jersey third-parity cow, Irish national data (Berry et al. 2018, Table 4)'),
    },
    notes: [
      'Default grades (15-point scale, Berry et al. 2018 Irish national data): purebred Jersey steer conformation 2.97 (P+), fat 6.57 (≈3−); Jersey cow conformation 1.92 (P), fat 6.16 (2+). Bull and heifer grades taken as the steer values.',
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
      steer: d(51.6, ['teagasc-systems', 'teagasc-kilkenny-hf', 'keane-2008'], '24 mo Friesian steer 620 kg → 310–330 kg; measured: Kilkenny HF steers 50.5 % and 51.7 %, Grange HF steers 50.1 %'),
      heifer: d(51.6 + HEIFER_VS_STEER, ['teagasc-systems', 'alberta-dressing'], 'steer value − 1.75'),
      bull: d(52.2, ['teagasc-systems'], 'mean of U-16 mo (51.9 %) and 18–20 mo (52.5 %) HF bull targets'),
      cow: s(46.4, ['moreira-2021', 'minchin-2009'], 'Irish cull cows 324 kg / 699 kg (Minchin 2009, n = 2163, mostly Friesian) — a typical-condition average; Irish HF cows typically grade fat 2+ (Berry 2018), the default'),
    },
    defaultConformation: { bull: 'O', steer: 'O-', heifer: 'O-', cow: 'P' },
    defaultFatClass: { bull: '2+', steer: '2+', heifer: '3', cow: '2+' },
    eyeMuscleCm2PerKg: v(0.201, ['keane-2008'], 'Holstein-Friesian steers, M. longissimus area 0.201 cm²/kg carcass (Keane & Drennan 2008, Grange)'),
    typicalCarcassKg: {
      steer: v(307, ['teagasc-national-2025'], 'National 2025 dairy steers, 27.6 months'),
      bull: v(306, ['teagasc-national-2025'], 'National 2025 dairy young bulls, 20.8 months'),
      cow: v(280.1, ['jds-jersey-proportion'], 'Holstein-Friesian third-parity cow, Irish national data (Berry et al. 2018, Table 4); national 2025 cow mean 298.6 kg'),
    },
    notes: [
      'Default grades (15-point): HF steer conformation 3.76 (≈O−), fat 6.14 (2+); HF cow conformation 2.44 (P), fat 5.94 (2+) (Berry et al. 2018). Kilkenny HF steers P+/O−, fat just under 3+.',
      'Usually disbudded (no horns).',
    ],
  },
  {
    id: 'hereford-x-dairy',
    name: 'Hereford × dairy',
    type: 'dairy-x-beef',
    killOutPct: {
      steer: d(52.5, ['teagasc-systems', 'nz-mpi-dressing'], 'early-maturing dairy-calf steer target. Cross-check: HF 51.6 % + half the Hereford-vs-Friesian offset (+2.0 Manawatu to +2.9 NZ trial) = 52.6–53.1 %'),
      heifer: v(49.3, ['teagasc-heifer'], '497 kg → 245 kg, O−4− (Teagasc home-kill heifer, single animal)'),
      bull: d(52.5 + BULL_VS_STEER, ['teagasc-systems'], 'steer value + 0.6'),
      cow: d(47.3, ['unl-cull-grades', 'moreira-2021'], 'cull-cow condition table, Boner (fat 3) = the default cow fat class; Irish cull cows measured 46.4 % (Minchin 2009)'),
    },
    defaultConformation: { bull: 'O+', steer: 'O+', heifer: 'O-', cow: 'O-' },
    defaultFatClass: { bull: '3-', steer: '3+', heifer: '4-', cow: '3' },
    eyeMuscleCm2PerKg: s(0.22, ['keane-2008'], 'Proxy: Aberdeen Angus × Holstein-Friesian (early-maturing × dairy) 0.220 cm²/kg (Keane & Drennan 2008)'),
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
      cow: d(47.3, ['unl-cull-grades', 'minchin-2009'], 'cull-cow condition table, Boner (fat 3) = the default cow fat class; late-maturing-sired cull cows met the Irish target spec most often (53 %)'),
    },
    defaultConformation: { bull: 'U', steer: 'R+', heifer: 'R+', cow: 'O+' },
    defaultFatClass: { bull: '2+', steer: '3', heifer: '3+', cow: '3' },
    eyeMuscleCm2PerKg: v(0.26, ['keane-2008'], 'Belgian Blue × Holstein-Friesian steers, 0.260 cm²/kg carcass (Keane & Drennan 2008, Grange); purebred continentals likely higher'),
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
