# beef-app — Figure audit (2026-11-23)

The user reported that a 350 kg cow gave a 140 kg carcass and 83 kg take-home. That prompted a full review of every figure the app uses, stage by stage through the calculation. Each row gives the value, its source, the check done, and the outcome.

Outcome key: ✅ OK as is · 🔧 fixed in this audit · ⚠️ known limitation, still open.

Default test animal: Aberdeen Angus steer, 24 months, 600 kg live, R3 (typical), 21 days' hanging.

---

## 1. Live weight → carcass (kill-out)

| Figure | Value | Source | Check | Outcome |
|---|---|---|---|---|
| Cow kill-out: meaning of the stored value | — | `breeds.ts`, `COW_KILLOUT_BY_FAT` | Jersey and HF cow values are **typical-condition averages** (Minchin 2009; Berry 2018 shows Irish dairy cows typically grade fat 2+). The engine treated them as fat-3 values, then deducted another 4 points for the default fat 2+. A 350 kg Jersey cow came out at 39.8 % (139 kg). | 🔧 Stored values now mean "at the breed's default fat class". The cull-grade table is used only for the *step* from that default. Jersey cow 43.8 % → 153 kg carcass. HF cow 42.4 % → 46.4 %. Test: kill-out equals the stored value at the default grade for every breed × sex. |
| Angus cow | 47.3 % → **48 %** | Teagasc Newford, measured at O=4− | The old value was "fat 3" but the default is 4−. The measured figure is at exactly the default grade. | 🔧 |
| Angus × dairy, Hereford × dairy, continental cows | 47.3 % | Cull-grade table, Boner = default fat 3 | The default is fat 3, so the old and new meanings agree. Cross-check: Irish cull cows 46.4 %. | ✅ |
| Steers, heifers, bulls (all breeds) | 49.0–58.1 % | Teagasc systems / Newford / NZ MPI / Finnish trial (see `breeds.ts` notes) | Implied live weight at the Irish typical carcass is plausible. Angus steer: 600 kg × 53.4 % = 320 kg vs Irish EUROP study 327 kg. HF steer: 620 × 51.6 % = 320 vs national 307 kg. Jersey steer: 277 kg / 49 % = 565 kg live. Continental bull: 408 / 58.1 % = 702 kg live. | ✅ |
| Jersey cow | 43.8 % | Derived: Minchin 46.4 − 2.6 (Jersey vs Friesian, NZ trial) | No measured Jersey cow kill-out exists (RESEARCH §10.8). Implied live weight at Berry 2018's 204 kg Jersey cow carcass is 466 kg, plausible for a mature Jersey. | ⚠️ derived, not measured |
| Light-animal tip | carcass < 80 % of the Irish typical | UI heuristic, not a yield figure | A 350 kg live Jersey cow gives 153 kg, against a typical 204 kg. The tip asks whether 350 kg was actually the kill-sheet (carcass) weight. | 🔧 added |

## 2. Carcass composition and hanging

| Figure | Value | Source | Check | Outcome |
|---|---|---|---|---|
| Commercial meat % | AHDB 2010 grid, saleable %, bilinear on 15-point scores | `ahdb-europ-yield` | Grid points reproduced exactly; out-of-grid grades clamped with an advisory. | ✅ |
| Fat trim % | Grid fat-trim table | same | At R4H: 13.2 %. Now kept separate from the craft-butcher trim (see §3). | 🔧 (earlier in this session) |
| Bone pool | 100 − S − T − cutting loss | same | Mass balance closes to 1e-6 for every breed × sex × share × hanging time × option × mince lean % (tests). | ✅ |
| Hanging loss | SDSU shrink beyond the EU 2 % cold-weight deduction | `sdsu-ageing`, EU 2017/1182 | 14 days gives 1.84 %; with cutting loss that is 2.61 %, AHDB's drip figure. Monotonic in days. | ✅ |
| Cutting loss | 0.77 % (derived) | AHDB 2.61 − SDSU at 14 days | — | ✅ |

## 3. Realistic (craft-butcher) level

| Figure | Value | Source | Check | Outcome |
|---|---|---|---|---|
| Home-butcher factor | × 0.873 on commercial meat | Teagasc home-kill heifer: 7–10 points below the grid | Calibrated on **one** animal: 144.8 kg modelled vs 143.2 kg actual. Take-home is 57–65 % of carcass across breeds, within the Irish seller rule of thumb (55–65 % of hanging weight). | ⚠️ single-animal calibration; more real Irish cut lists needed |
| Extra trim & waste | commercial − realistic meat | — | Its own mass-balance term, **not** returnable fat (an earlier version offered about 55 kg of fat trim for a steer). | 🔧 |

## 4. Region shares

| Figure | Value | Source | Check | Outcome |
|---|---|---|---|---|
| Region meat % (15 regions) + lean-trim pool | AHDB Beef Yield Guide, per side | `ahdb-yield-guide` | Sums to 100 % with bone, fat and drip (data test). Primal share excluding flank and plate is 75.8 %, vs 76.4–77.3 % in every grid cell (test, ±2 points). | ✅ |
| Loin bone in cuts | 1.82 % → **1.28 %** | Derived from T-bone 25 % and wing-rib 10 % bone on the new lean shares | Follows the T-bone fix below. | 🔧 |

## 5. Product fractions (share of a region that becomes each product)

The rule now enforced is that a US retail-cutting yield is applied only to the AHDB muscle with that steak's cross-section. The rest of the region goes to trim.

| Product | Before | After | Basis | Outcome |
|---|---|---|---|---|
| Rib steak (ribeye) | 0.845 of the whole rolled fore rib | **0.378** | AHDB rib eye roll 2.82 of 7.17 kg × 96.2 % boneless-roll steak yield (Texas A&M). Assumes AHDB's rib eye roll ≈ eye + cap of a USDA lip-on steak. | 🔧 Count 36 → 14 per animal at 2.5 cm (7 per side). |
| Côte de boeuf / tomahawk | 0.888 | **0.384** | Rib eye roll share × 1.10 (USDA bone-in steak lean 397 g vs lip-on 361 g) × 88.8 % bone-in steak yield. | 🔧 Now planned rib by rib: exactly one per rib, 4 ribs per side (tested for every breed and sex). |
| Rolled rib + rib steaks | 0.411 + 0.463 | **0.475 + 0.189** | Half the fore rib as a rolled roast (95 %), the other half's rib eye as steaks. | 🔧 |
| T-bone | 0.85 of the whole loin | **0.532** T-bone + **0.198** wing-rib steaks + **0.101** fillet-head steaks | T-bones come from the short loin only: the lumbar 6/9 of the AHDB 3-rib striploin + middle fillet + tail. The wing-rib end (ribs 11–13) has no fillet. The fillet head (1.04 kg) sits under the rump. | 🔧 T-bones 51 → about 28 per animal (14 per side) at 2.5 cm. |
| Rump steaks (whole rump) | 0.811 incl. the tail | **0.656** steaks + **0.182** tri-tip whole | Tri-tip is a separate muscle (AHDB 1.42 of 7.41 kg). | 🔧 |
| Rump steak, cap off | 608 g per 2.54 cm | **462 g** | USDA top sirloin × (1 − AHDB cap 1.44 / D-rump 5.99). | 🔧 |
| LMC pot roast / shoulder braising steak | 0.494 of the whole clod | **0.593 / 0.308** | McKenna's clod-heart yield applies only to the LMC (triceps): 4.02 of 6.44 kg per side. | 🔧 |
| Diced clod | 0.666 | **0.95** | AHDB 2010 explicitly dices clod at 95 % VL. | 🔧 |
| Chuck, all braising | 0.494 (clod proxy) | **0.768** | AHDB chuck muscle weights. | 🔧 |
| Sirloin steaks | 0.85 | — | Texas A&M boneless strip → steaks. About 18 per side at 2.5 cm against a 3-rib + lumbar striploin about 45–50 cm long. | ✅ |
| Fillet steaks / chateaubriand / tail | 0.734 / 0.43 / 0.10 | — | AHDB fillet parts × Steele 2020 steak yield. About 11 steaks per side at 4 cm. | ✅ |
| Topside, thick flank, silverside, feather, Denver, housekeeper's cut, brisket, plate, shins, flank | — | — | Already muscle-specific (AHDB part weights or McKenna single-muscle tests). | ✅ |

## 6. Steak and piece sizes

| Figure | Source | Check | Outcome |
|---|---|---|---|
| Steak g/cm | USDA SR28, 2.54 cm steaks from 318–408 kg hot carcasses | Fillet steak 166 g at 4 cm vs Steele 2020's 170 g. Côte de boeuf about 900 g at 5 cm. | ✅ |
| Carcass scaling | (carcass ÷ reference)^⅔ for cross-sections; linear for whole pieces | Whole-muscle pieces give exactly 1 per side for every breed × sex (test). | ✅ |
| Breed eye-muscle size | Not applied | The USDA reference carcasses' eye-muscle area per kg isn't known, so a breed ratio would be invented. Jersey steaks are still smaller through the lighter carcass. | ⚠️ |
| Tomahawk long bone | Not included | No measured figure. | ⚠️ |

## 7. Counts, joints and packs

| Figure | Rule | Check | Outcome |
|---|---|---|---|
| Steak count | weight ÷ steak weight at the chosen thickness | Thicker → fewer and heavier, same total (test). Per-cut overrides (test). | ✅ |
| Roast joints | household × g per person (× bone factor); "feeds N" per joint | A cut too small for one full joint triggers a tip (half-share Jersey cow, family of 8: test). Servings round to the nearest person. | 🔧 |
| Anatomical bounds | bone-in rib steaks ≤ 4 per side; short ribs ≤ 3 per side; one whole fillet, picanha, tri-tip and bavette per side | Tested for all 24 breed × sex combinations. | 🔧 added |
| Mince / burger / diced packs | ceil(weight ÷ pack size); burgers floor(weight ÷ burger size) | The burger rounding remainder goes to mince (mass test). | ✅ |

## 8. Fifth-quarter parts

| Figure | Source | Check | Outcome |
|---|---|---|---|
| Live-weight % per part | AHDB 600 kg R4L steer | Sums to about 47 % of live weight (data test). Liver 1.31 % → 7.9 kg at 600 kg. | ✅ for steers |
| Applied to cows, bulls and dairy breeds | Same steer percentages | Organ and hide proportions differ by sex, age and breed. No Irish per-part data exists for cows. | ⚠️ treat cow offal weights as approximate |
| Edible yield | USDA SR28 refuse | — | ✅ |
| SRM / ABP status | 999/2001 Annex V, 1069/2009 | Skull, brain, eyes and spinal cord can't be requested over 12 months (test). | ✅ |

## 9. Bone and fat pools

| Figure | Value | Source | Check | Outcome |
|---|---|---|---|---|
| Marrow bones | 1.97 % of carcass | MLA: tibia + femur ≈ 6 kg / 305 kg | Hind osso buco uses the tibia, which reduces marrow bones (test). | ✅ |
| Soup bones | residual of the bone pool | — | Never negative (test). Bone-in cuts reduce it (test). | ✅ |
| Returnable fat | grid fat trim ± mince/dice lean adjustment | — | About 25 kg for the default steer. | ✅ |

## 10. Freezer

| Figure | Value | Source | Outcome |
|---|---|---|---|
| Freezer space | 2.79 L per kg (bones shown separately) | Teagasc: 143.2 kg filled a 400 L freezer | ✅ (user's choice) |

## 11. Planners (added after the audit, 2026-11-23)

| Planner | How it maps to butchery | Estimates used | Tests |
|---|---|---|---|
| Fore rib, rib by rib | Ribs 7–10, 4 per side. Each rib goes to an on-the-bone roast (joints of whole ribs), rolled roast, côte / tomahawk (one per rib, thickness = rib spacing) or rib steaks. | — | Plan ≤ ribs available; one côte per rib; a tomahawk excludes bone-in short ribs; mass closes. |
| Loin | Per side: T-bones from the front of the short loin, porterhouses behind; fillet out for the rest. A centre fillet (Wellington / chateaubriand) limits that side to front-section T-bones; a whole fillet allows none. Sirloin joints boneless or wing rib on the bone. | Wing rib = 3/9 of the striploin by vertebra count; **fillet tail under the front third of the short loin** (anatomy estimate, no measured figure). | Matched the old fixed loin options before they were removed; checked against AHDB kg; infeasible requests clamped with a notice; soup bones ≥ 0; mass closes. |
| Topside / thick flank / chuck eye | Cut along the muscle: N joints, the rest as round / minute / braising steak, diced or mince. | — | Chosen count honoured; 0 joints = full-muscle steak yield; mass closes. |
| Chuck | Three muscles, each with its own choice: Denver, chuck eye (housekeeper's cut), blade & underblade. | — | Shares from AHDB muscle kg (sum = 1). |
| Whole-muscle counts | Tri-tip, picanha, bavette, whole fillet: 1 per side; skirts 2; short ribs 3 (NCBA). Counted by anatomy, not weight. | — | Fixed a bug where a whole animal showed 1 tri-tip. |

---

## Still open

1. **The realistic factor (0.873) rests on one Irish home-kill.** One or two more real cut lists with carcass weights, ideally an Angus steer and a dairy cow, would test it.
2. **No measured Jersey cow kill-out exists.**
3. **Cow offal is scaled from steer percentages.**
4. **Rib-eye assumption:** AHDB's "rib eye roll" is assumed to roughly match the eye + cap of a USDA lip-on steak. If it excludes the cap, rib steak counts are slightly low.
