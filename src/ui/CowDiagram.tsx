// 2D side view of a beef carcass on the animal, facing left. Each region is a focusable button.
import { REGION_BY_ID } from '../data/regions';
import { REGION_SHAPES, type Pt } from './cowShapes';

/** Where to put each label (defaults to the polygon centroid). */
const LABEL_AT: Partial<Record<string, Pt>> = {
  plate: [375, 255],
  clod: [268, 250],
  'thin-flank': [495, 245],
  silverside: [688, 205],
  topside: [641, 245],
  'thick-flank': [598, 245],
  'hind-shin': [648, 352],
  'fore-shin': [254, 366],
  rump: [605, 142],
};

/** Narrow upright regions get vertical labels. */
const VERTICAL = new Set(['thick-flank', 'topside', 'silverside']);

const SHORT: Record<string, string> = {
  neck: 'Neck',
  chuck: 'Chuck',
  feather: 'Feather',
  clod: 'Clod',
  brisket: 'Brisket',
  'fore-shin': 'Shin',
  'fore-rib': 'Fore rib',
  plate: 'Short rib',
  loin: 'Sirloin & fillet',
  'thin-flank': 'Thin flank',
  rump: 'Rump',
  'thick-flank': 'Thick flank',
  topside: 'Topside',
  silverside: 'Silverside',
  'hind-shin': 'Shin',
};

const centroid = (pts: Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const d = (pts: Pt[]) => `M${pts.map((p) => p.join(',')).join('L')}Z`;

import type { RegionCategory } from './categories';

interface Props {
  selected?: string;
  onSelect: (regionId: string) => void;
  category: Record<string, RegionCategory>;
}

export function CowDiagram({ selected, onSelect, category }: Props) {
  return (
    <svg className="cow" viewBox="60 60 700 370" role="group" aria-label="Beef cuts diagram. Choose a region to see its cut options.">
      {/* Non-meat silhouette: head, tail, hooves */}
      <g className="cow-body" aria-hidden="true">
        <path d="M150,140 L120,128 L96,118 L84,124 L74,150 L66,182 L74,204 L100,212 L126,214 L150,232 Z" />
        <path d="M104,122 L96,98 L108,104 Z M84,124 L62,112 L66,128 Z" />
        <path d="M726,142 Q744,190 738,262 L746,282 L732,284 L730,262 Q734,196 722,150 Z" />
        <path d="M246,402 L276,402 L278,418 L244,418 Z M638,402 L670,402 L672,418 L636,418 Z" />
        <circle cx="96" cy="150" r="4" className="cow-eye" />
      </g>
      {Object.entries(REGION_SHAPES).map(([id, pts]) => {
        const region = REGION_BY_ID[id];
        const [cx, cy] = LABEL_AT[id] ?? centroid(pts);
        const isSel = selected === id;
        return (
          <g
            key={id}
            id={`region-${id}`}
            className={`region cat-${category[id] ?? 'mince'}${isSel ? ' selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`${region.name}${region.aka.length ? ` (${region.aka.slice(0, 3).join(', ')})` : ''}`}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(id);
              }
            }}
          >
            <title>{`${region.name} — ${region.aka.join(', ')}`}</title>
            <path d={d(pts)} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className={id === 'feather' ? 'small' : undefined} transform={VERTICAL.has(id) ? `rotate(-90 ${cx} ${cy})` : undefined}>
              {SHORT[id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
