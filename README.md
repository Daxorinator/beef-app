# Beef Cut Planner

Plan how a beef animal is butchered in Ireland: pick cuts on an interactive diagram, see the estimated yield, steak and joint counts, offal and bones, cooking methods, and print a cut sheet for your butcher.

Client-only React + TypeScript (Vite). No backend; state is saved in the browser and can be shared as a link.

## Develop

Requires Node 22 (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # data integrity + engine invariants
npm run lint
npm run build    # → dist/ (static; deploy to Cloudflare Pages with build command `npm run build`, output `dist`)
```

## Layout

- `src/data/`: researched constants only, every figure with its source (`sources.ts`). See `docs/RESEARCH.md`.
- `src/engine/`: pure calculation: kill-out → carcass → grade-based meat/fat/bone (AHDB EUROP grid) → regions (AHDB Beef Yield Guide shares) → products, trim, bone and fat pools, parts, advisories, cut sheet.
- `src/ui/`: the five steps (Animal, Cuts, Offal & extras, Packing, Results) and the SVG cow diagram.

Tests check that the mass balance closes for every breed, sex, share, hanging time and cut option. They also check the AHDB reference grade, the exclusions and SRM rules, and the Teagasc home-kill comparison.
