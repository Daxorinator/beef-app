// Carcass cut regions, options and products. Constants only.
// Meat % of carcass: AHDB Beef Yield Guide (303 kg R4H reference carcass, 2 weeks' maturation).
// gramsPerCm / pieceGrams are at that reference carcass; scale by cross-section for other carcasses.
import type { CutOption, ProductSpec, Region, Sourced } from '../model/types';

const ahdb = (value: number, note?: string): Sourced => ({ value, evidence: 'verified', sourceIds: ['ahdb-yield-guide'], note });
const est = (value: number, note: string): Sourced => ({ value, evidence: 'estimate', sourceIds: ['ahdb-yield-guide', 'ahdb-europ-yield'], note });

const STEAK_CM = [1.5, 2, 2.5, 3, 4, 5];
const THICK_CM = [3, 4, 5, 6];

/** All-to-mince option: no products, everything goes to the trim pool. */
const toMince = (label = 'Mince / burgers / stewing'): CutOption => ({
  id: 'mince',
  label,
  description: 'Send this whole cut to the trim pool for mince, burgers or diced beef.',
  products: [],
});

const steak = (p: Omit<ProductSpec, 'kind' | 'allowedThicknessCm'> & { allowedThicknessCm?: number[] }): ProductSpec => ({
  kind: 'steak',
  allowedThicknessCm: STEAK_CM,
  defaultThicknessCm: 2.5,
  ...p,
});

export const REGIONS: Region[] = [
  // ───────────────────────── Forequarter ─────────────────────────
  {
    id: 'neck',
    name: 'Neck (sticking)',
    aka: ['Sticking', 'Neck of beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(2.59),
    description: 'Hard-working, flavoursome muscle in front of the shoulder. Traditionally stewing beef or mince.',
    defaultOption: 'mince',
    diagramIds: ['neck'],
    options: [
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'neck-diced', name: 'Diced neck (stewing beef)', kind: 'diced', fraction: 0.8, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'chuck',
    name: 'Chuck & blade',
    aka: ["Housekeeper's cut", 'Top rib', 'Chuck', 'Shoulder'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(6.74, 'Chuck roll 4.75 + blade 0.99 + underblade 0.72 + underblade fillet 0.28'),
    description:
      "The top of the shoulder in front of the fore rib. In Ireland the chuck-eye side is sold as housekeeper's cut (top rib), a classic pot roast. The chuck roll also gives Denver steaks.",
    defaultOption: 'housekeepers',
    diagramIds: ['chuck'],
    options: [
      {
        id: 'housekeepers',
        label: "Housekeeper's cut roasts + braising steak",
        products: [
          { id: 'housekeepers-cut', name: "Housekeeper's cut (top rib) roast", kind: 'roast', fraction: 0.45, cookingId: 'pot-roast' },
          steak({ id: 'chuck-braising-steak', name: 'Braising steak (chuck)', fraction: 0.3, gramsPerCm: 100, cookingId: 'braise' }),
        ],
      },
      {
        id: 'denver',
        label: "Denver steaks + housekeeper's cut + braising steak",
        description: 'The Denver muscle (about a third of the chuck roll) is cut into grilling steaks.',
        products: [
          steak({ id: 'denver-steak', name: 'Denver steak', fraction: 0.23, gramsPerCm: 85, defaultThicknessCm: 2, cookingId: 'flash-steak' }),
          { id: 'housekeepers-cut-small', name: "Housekeeper's cut (top rib) roast", kind: 'roast', fraction: 0.3, cookingId: 'pot-roast' },
          steak({ id: 'chuck-braising-steak-b', name: 'Braising steak (chuck)', fraction: 0.25, gramsPerCm: 100, cookingId: 'braise' }),
        ],
      },
      { id: 'braising', label: 'All braising / chuck steak', products: [steak({ id: 'chuck-steak', name: 'Chuck / braising steak', fraction: 0.8, gramsPerCm: 100, cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced chuck (stewing)', products: [{ id: 'chuck-diced', name: 'Diced chuck steak', kind: 'diced', fraction: 0.85, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'feather',
    name: 'Feather blade',
    aka: ['Oyster blade', 'Flat iron', 'Butler’s steak', 'Blade'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(1.62, 'Feather (infraspinatus)'),
    description:
      'A single muscle on the shoulder blade with a thick seam of gristle through the middle. Slow-cooked whole it melts (feather blade); with the gristle removed it becomes two flat iron steaks.',
    defaultOption: 'braise',
    diagramIds: ['feather'],
    options: [
      { id: 'braise', label: 'Feather blade braising joints', products: [{ id: 'feather-blade-joint', name: 'Feather blade joint', kind: 'piece', fraction: 0.92, pieceGrams: 600, cookingId: 'braise' }] },
      {
        id: 'flat-iron',
        label: 'Flat iron steaks',
        description: 'Central sinew removed (more trim loss); tender grilling steaks.',
        products: [steak({ id: 'flat-iron-steak', name: 'Flat iron steak', fraction: 0.72, gramsPerCm: 90, defaultThicknessCm: 2, cookingId: 'flash-steak' })],
      },
      toMince(),
    ],
  },
  {
    id: 'clod',
    name: 'Clod & shoulder (LMC)',
    aka: ['Clod', 'LMC', 'Thick rib', 'Braising beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(4.25, 'LMC 2.18 + baby LMC 0.47 + clod flat 0.30 + shoulder brisket 0.48 + clod shin 0.40 + needle 0.42'),
    description: 'The lower shoulder above the fore shin. Lean, coarse-grained meat for braising, pot roasting and dicing.',
    defaultOption: 'diced',
    diagramIds: ['clod'],
    options: [
      { id: 'pot-roast', label: 'LMC pot roast joints', products: [{ id: 'lmc-pot-roast', name: 'Shoulder (LMC) pot roast', kind: 'roast', fraction: 0.8, cookingId: 'pot-roast' }] },
      { id: 'braising', label: 'Braising steak', products: [steak({ id: 'clod-braising-steak', name: 'Braising steak (shoulder)', fraction: 0.8, gramsPerCm: 100, cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'clod-diced', name: 'Diced shoulder (stewing beef)', kind: 'diced', fraction: 0.85, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'fore-rib',
    name: 'Fore rib',
    aka: ['Rib of beef', 'Rib roast', 'Standing rib', 'Rib steak', 'Ribeye', 'Côte de boeuf', 'Tomahawk'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(4.73, 'Rolled (carvery) fore rib 7.17 kg of 8.23 kg bone-in per side; ribs 7–10'),
    bonePctOfCarcass: ahdb(0.7, 'Fore rib bone-in 5.43 % less rolled 4.73 %'),
    description:
      'Ribs 7–10. The finest roasting joint on the bone, or cut into rib steaks (ribeye). Bone-in rib from cattle of any age is legal in Ireland (negligible BSE risk).',
    defaultOption: 'ribeye',
    diagramIds: ['fore-rib'],
    options: [
      { id: 'on-bone', label: 'Rib roast on the bone', products: [{ id: 'rib-roast-bone-in', name: 'Rib roast (on the bone)', kind: 'roast', fraction: 0.97, boneFactor: 1.15, cookingId: 'prime-roast' }] },
      { id: 'rolled', label: 'Rolled rib roast', products: [{ id: 'rolled-rib', name: 'Rolled rib roast', kind: 'roast', fraction: 0.95, cookingId: 'prime-roast' }] },
      { id: 'ribeye', label: 'Rib steaks (ribeye)', products: [steak({ id: 'ribeye-steak', name: 'Rib steak (ribeye)', aka: ['Scotch fillet', 'Entrecôte'], fraction: 0.85, gramsPerCm: 105, cookingId: 'prime-steak' })] },
      {
        id: 'cote',
        label: 'Côte de boeuf (bone-in rib steaks)',
        products: [steak({ id: 'cote-de-boeuf', name: 'Côte de boeuf', fraction: 0.97, boneFactor: 1.15, gramsPerCm: 180, defaultThicknessCm: 5, allowedThicknessCm: THICK_CM, cookingId: 'thick-bone-in-steak' })],
      },
      {
        id: 'tomahawk',
        label: 'Tomahawk steaks',
        description: 'Bone-in rib steak with the long rib bone left on and cleaned. Ask your butcher in advance; uses rib bone from the plate.',
        products: [steak({ id: 'tomahawk', name: 'Tomahawk steak', fraction: 0.95, boneFactor: 1.3, gramsPerCm: 200, defaultThicknessCm: 5, allowedThicknessCm: THICK_CM, cookingId: 'thick-bone-in-steak' })],
      },
      {
        id: 'split',
        label: 'Half roast, half rib steaks',
        products: [
          { id: 'rib-roast-half', name: 'Rib roast (on the bone)', kind: 'roast', fraction: 0.49, boneFactor: 1.15, cookingId: 'prime-roast' },
          steak({ id: 'ribeye-steak-half', name: 'Rib steak (ribeye)', fraction: 0.43, gramsPerCm: 105, cookingId: 'prime-steak' }),
        ],
      },
    ],
  },
  {
    id: 'brisket',
    name: 'Brisket',
    aka: ['Rolled brisket', 'Boiling beef', 'Salt beef'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(3.52, 'Flat brisket (boneless, fat ≤ 10 mm)'),
    description: 'The breast, between the fore legs. Rich, fatty and best cooked low and slow, rolled for pot roasting, salted, or smoked.',
    defaultOption: 'rolled',
    diagramIds: ['brisket'],
    options: [
      { id: 'rolled', label: 'Rolled brisket joints', products: [{ id: 'rolled-brisket', name: 'Rolled brisket', kind: 'roast', fraction: 0.9, cookingId: 'brisket' }] },
      { id: 'flat', label: 'Whole flat brisket (for smoking)', products: [{ id: 'flat-brisket', name: 'Flat brisket', kind: 'piece', fraction: 0.95, pieceGrams: 2700, cookingId: 'brisket' }] },
      { id: 'salt', label: 'Salt / spiced brisket', description: 'Brined by the butcher (corned or spiced beef).', products: [{ id: 'salt-brisket', name: 'Salt / spiced brisket', kind: 'cured', fraction: 0.9, cookingId: 'cured' }] },
      toMince(),
    ],
  },
  {
    id: 'plate',
    name: 'Short ribs (thin & thick rib)',
    aka: ["Jacob's ladder", 'Short rib', 'Flat ribs', 'Plate'],
    quarter: 'fore',
    meatPctOfCarcass: est(3.0, 'Not weighed separately by AHDB (boned into trim); estimated from the 85 % VL trim pool'),
    bonePctOfCarcass: est(1.5, 'Rib bone in the plate; estimate'),
    description: 'The rib ends below the fore rib and chuck. Kept on the bone as short ribs or a whole Jacob\'s ladder, or boned out for mince.',
    defaultOption: 'mince',
    diagramIds: ['plate'],
    options: [
      { id: 'short-ribs', label: 'Short ribs (cut between the bones)', products: [{ id: 'short-ribs', name: 'Short ribs', kind: 'ribs', fraction: 0.9, boneFactor: 1.5, pieceGrams: 450, cookingId: 'ribs' }] },
      { id: 'jacobs-ladder', label: "Jacob's ladder racks", products: [{ id: 'jacobs-ladder', name: "Jacob's ladder (rack)", kind: 'ribs', fraction: 0.9, boneFactor: 1.5, pieceGrams: 2000, cookingId: 'ribs' }] },
      { id: 'boneless', label: 'Boneless short rib', products: [{ id: 'boneless-short-rib', name: 'Boneless short rib', kind: 'piece', fraction: 0.8, pieceGrams: 300, cookingId: 'braise' }] },
      toMince(),
    ],
  },
  {
    id: 'fore-shin',
    name: 'Fore shin',
    aka: ['Shin', 'Shank', 'Osso buco'],
    quarter: 'fore',
    meatPctOfCarcass: ahdb(1.35, 'Fore shin, trimmed'),
    bonePctOfCarcass: est(1.0, 'Shank bone for cross-cut osso buco; estimate'),
    description: 'The front leg below the shoulder. Gelatinous, deeply flavoured slow-cooking meat; cross-cut through the bone it is osso buco.',
    defaultOption: 'diced',
    diagramIds: ['fore-shin'],
    options: [
      { id: 'osso-buco', label: 'Osso buco (cross-cut, bone in)', products: [steak({ id: 'fore-osso-buco', name: 'Osso buco (fore shin)', fraction: 0.95, boneFactor: 1.6, gramsPerCm: 110, defaultThicknessCm: 4, allowedThicknessCm: THICK_CM, cookingId: 'shin' })] },
      { id: 'diced', label: 'Boneless shin (diced or whole)', products: [{ id: 'fore-shin-boneless', name: 'Boneless shin', kind: 'diced', fraction: 0.9, cookingId: 'shin' }] },
      toMince(),
    ],
  },

  // ───────────────────────── Hindquarter ─────────────────────────
  {
    id: 'loin',
    name: 'Sirloin & fillet (loin)',
    aka: ['Sirloin', 'Striploin', 'Fillet', 'T-bone', 'Porterhouse', 'Wing rib'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.41, 'Striploin 4.49 + fillet 1.92'),
    bonePctOfCarcass: est(1.5, 'Lumbar vertebrae left in T-bone / wing rib; estimate'),
    description:
      'The most valuable cuts. Either cut through the bone as T-bone and porterhouse (sirloin and fillet together), or take the fillet out and keep the sirloin and fillet separate. You cannot have both from the same side. T-bones are legal from cattle of any age in Ireland.',
    defaultOption: 'separate',
    diagramIds: ['loin'],
    options: [
      {
        id: 't-bone',
        label: 'T-bone & porterhouse steaks',
        description: 'Sirloin and fillet on the bone. Choosing T-bones means no separate fillet or sirloin steaks from this side.',
        products: [steak({ id: 't-bone', name: 'T-bone / porterhouse steak', fraction: 0.92, boneFactor: 1.25, gramsPerCm: 160, cookingId: 'prime-steak' })],
        advisories: [
          { id: 't-bone-small', when: { breed: ['jersey'] }, severity: 'tip', message: 'Jersey loins are small: T-bones will be modest in size. Consider 3 cm or thicker.', sourceIds: ['teagasc-5923'] },
        ],
      },
      {
        id: 'separate',
        label: 'Separate sirloin and fillet',
        parts: [
          {
            id: 'striploin',
            name: 'Sirloin (striploin)',
            share: 0.7,
            defaultOption: 'sirloin-steaks',
            options: [
              { id: 'sirloin-steaks', label: 'Sirloin steaks', products: [steak({ id: 'sirloin-steak', name: 'Sirloin (striploin) steak', aka: ['Striploin steak', 'Entrecôte'], fraction: 0.92, gramsPerCm: 90, cookingId: 'prime-steak' })] },
              { id: 'sirloin-roast', label: 'Sirloin roast (boneless)', products: [{ id: 'sirloin-roast', name: 'Sirloin roast', kind: 'roast', fraction: 0.92, cookingId: 'prime-roast' }] },
              { id: 'wing-rib', label: 'Wing rib (sirloin on the bone) roast', products: [{ id: 'wing-rib', name: 'Wing rib roast (on the bone)', kind: 'roast', fraction: 0.92, boneFactor: 1.2, cookingId: 'prime-roast' }] },
              {
                id: 'split',
                label: 'Half roast, half steaks',
                products: [
                  { id: 'sirloin-roast-half', name: 'Sirloin roast', kind: 'roast', fraction: 0.46, cookingId: 'prime-roast' },
                  steak({ id: 'sirloin-steak-half', name: 'Sirloin (striploin) steak', fraction: 0.46, gramsPerCm: 90, cookingId: 'prime-steak' }),
                ],
              },
            ],
          },
          {
            id: 'fillet',
            name: 'Fillet',
            share: 0.3,
            defaultOption: 'steaks',
            options: [
              {
                id: 'steaks',
                label: 'Fillet steaks + tail for stir-fry',
                products: [
                  steak({ id: 'fillet-steak', name: 'Fillet steak', aka: ['Tournedos', 'Medallion'], fraction: 0.75, gramsPerCm: 45, defaultThicknessCm: 4, allowedThicknessCm: [3, 4, 5], cookingId: 'fillet' }),
                  { id: 'fillet-tail', name: 'Fillet tail (stir-fry / stroganoff)', kind: 'piece', fraction: 0.15, pieceGrams: 290, cookingId: 'fillet' },
                ],
              },
              { id: 'whole', label: 'Whole fillet (Wellington / roast)', products: [{ id: 'whole-fillet', name: 'Whole fillet', kind: 'roast', fraction: 0.95, cookingId: 'fillet' }] },
              {
                id: 'chateaubriand',
                label: 'Chateaubriand + fillet steaks',
                description: 'The thick centre cut kept as a roasting piece for two; the rest as steaks.',
                products: [
                  { id: 'chateaubriand', name: 'Chateaubriand (centre fillet, serves 2)', kind: 'piece', fraction: 0.4, pieceGrams: 500, cookingId: 'fillet' },
                  steak({ id: 'fillet-steak-c', name: 'Fillet steak', fraction: 0.35, gramsPerCm: 45, defaultThicknessCm: 4, allowedThicknessCm: [3, 4, 5], cookingId: 'fillet' }),
                  { id: 'fillet-tail-c', name: 'Fillet tail (stir-fry)', kind: 'piece', fraction: 0.15, pieceGrams: 290, cookingId: 'fillet' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rump',
    name: 'Rump',
    aka: ['Rump steak', 'Picanha', 'Rump cap', 'Tri-tip', 'Rump tail'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(4.89, '"D" rump 3.95 + rump tail 0.94'),
    description:
      'Behind the sirloin. Full-flavoured steaks or a roasting joint. The fat-capped top (picanha) and the rump tail (tri-tip) can be taken off first.',
    defaultOption: 'steaks',
    diagramIds: ['rump'],
    options: [
      { id: 'steaks', label: 'Rump steaks', products: [steak({ id: 'rump-steak', name: 'Rump steak', fraction: 0.88, gramsPerCm: 110, defaultThicknessCm: 2, cookingId: 'prime-steak' })] },
      { id: 'roast', label: 'Rump roasts', products: [{ id: 'rump-roast', name: 'Rump roast', kind: 'roast', fraction: 0.9, cookingId: 'prime-roast' }] },
      {
        id: 'split',
        label: 'Picanha & tri-tip off, rest as steaks',
        parts: [
          {
            id: 'picanha',
            name: 'Rump cap (picanha)',
            share: 0.29,
            defaultOption: 'whole',
            options: [
              { id: 'whole', label: 'Whole picanha', products: [{ id: 'picanha-whole', name: 'Picanha (whole rump cap)', kind: 'roast', fraction: 0.95, cookingId: 'prime-roast' }] },
              { id: 'steaks', label: 'Picanha steaks', products: [steak({ id: 'picanha-steak', name: 'Picanha steak', fraction: 0.92, gramsPerCm: 75, cookingId: 'prime-steak' })] },
            ],
          },
          {
            id: 'prime-rump',
            name: 'Prime rump',
            share: 0.52,
            defaultOption: 'steaks',
            options: [
              { id: 'steaks', label: 'Rump steaks', products: [steak({ id: 'prime-rump-steak', name: 'Rump steak', fraction: 0.9, gramsPerCm: 90, defaultThicknessCm: 2, cookingId: 'prime-steak' })] },
              { id: 'roast', label: 'Rump roast', products: [{ id: 'prime-rump-roast', name: 'Rump roast', kind: 'roast', fraction: 0.92, cookingId: 'prime-roast' }] },
            ],
          },
          {
            id: 'tri-tip',
            name: 'Rump tail (tri-tip)',
            share: 0.19,
            defaultOption: 'whole',
            options: [
              { id: 'whole', label: 'Whole tri-tip', products: [{ id: 'tri-tip', name: 'Tri-tip (rump tail)', kind: 'piece', fraction: 0.92, pieceGrams: 1420, cookingId: 'prime-roast' }] },
              toMince('Leave in mince'),
            ],
          },
        ],
      },
      toMince(),
    ],
  },
  {
    id: 'topside',
    name: 'Topside',
    aka: ['Round roast', 'Round steak', 'Minute steak', 'Casserole beef'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.53),
    description: 'The inside of the hind leg, "the most tender part of the round". Lean roasting joints (Irish round roast), round steak, minute steak or stir-fry.',
    defaultOption: 'split',
    diagramIds: ['topside'],
    options: [
      { id: 'roasts', label: 'Round roasts', products: [{ id: 'topside-roast', name: 'Round roast (topside)', kind: 'roast', fraction: 0.9, cookingId: 'lean-roast' }] },
      { id: 'round-steak', label: 'Round steaks', products: [steak({ id: 'topside-round-steak', name: 'Round steak (topside)', fraction: 0.85, gramsPerCm: 130, defaultThicknessCm: 1.5, cookingId: 'flash-steak' })] },
      { id: 'minute', label: 'Minute steaks / stir-fry', products: [steak({ id: 'minute-steak', name: 'Minute steak', fraction: 0.85, gramsPerCm: 200, defaultThicknessCm: 0.6, allowedThicknessCm: [0.5, 0.6, 0.8, 1], cookingId: 'minute-steak' })] },
      {
        id: 'split',
        label: 'Half round roasts, half round steaks',
        products: [
          { id: 'topside-roast-half', name: 'Round roast (topside)', kind: 'roast', fraction: 0.5, cookingId: 'lean-roast' },
          steak({ id: 'topside-round-steak-half', name: 'Round steak (topside)', fraction: 0.4, gramsPerCm: 130, defaultThicknessCm: 1.5, cookingId: 'flash-steak' }),
        ],
      },
      { id: 'diced', label: 'Diced (casserole beef)', products: [{ id: 'topside-diced', name: 'Casserole beef (diced topside)', kind: 'diced', fraction: 0.88, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'silverside',
    name: 'Silverside',
    aka: ['Eye of round', 'Salmon cut', 'Spiced beef', 'Corned beef', 'Pot roast'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.38, 'Silverside with salmon cut (eye of round)'),
    description: 'The outside of the hind leg. Lean pot roasts, and the traditional cut for Irish spiced and corned beef. The eye of round (salmon cut) can be taken out as a neat joint.',
    defaultOption: 'pot-roast',
    diagramIds: ['silverside'],
    options: [
      { id: 'pot-roast', label: 'Silverside pot roasts', products: [{ id: 'silverside-roast', name: 'Silverside (pot roast)', kind: 'roast', fraction: 0.9, cookingId: 'pot-roast' }] },
      {
        id: 'split',
        label: 'Eye of round out, rest pot roast',
        parts: [
          {
            id: 'eye-of-round',
            name: 'Eye of round (salmon cut)',
            share: 0.3,
            defaultOption: 'roast',
            options: [
              { id: 'roast', label: 'Eye of round roast', products: [{ id: 'eye-of-round', name: 'Eye of round roast', kind: 'roast', fraction: 0.95, cookingId: 'pot-roast' }] },
              { id: 'cured', label: 'Spiced / corned', products: [{ id: 'eye-of-round-cured', name: 'Spiced eye of round', kind: 'cured', fraction: 0.95, cookingId: 'cured' }] },
            ],
          },
          {
            id: 'outside',
            name: 'Silverside (remainder)',
            share: 0.7,
            defaultOption: 'pot-roast',
            options: [
              { id: 'pot-roast', label: 'Pot roasts', products: [{ id: 'silverside-roast-b', name: 'Silverside (pot roast)', kind: 'roast', fraction: 0.88, cookingId: 'pot-roast' }] },
              { id: 'cured', label: 'Spiced / corned beef', products: [{ id: 'silverside-cured-b', name: 'Spiced / corned silverside', kind: 'cured', fraction: 0.88, cookingId: 'cured' }] },
              { id: 'diced', label: 'Diced', products: [{ id: 'silverside-diced-b', name: 'Diced silverside', kind: 'diced', fraction: 0.85, cookingId: 'stew' }] },
              toMince(),
            ],
          },
        ],
      },
      { id: 'cured', label: 'Spiced / corned beef', description: 'Ask for it brined; traditional Irish spiced beef.', products: [{ id: 'silverside-cured', name: 'Spiced / corned silverside', kind: 'cured', fraction: 0.9, cookingId: 'cured' }] },
      { id: 'round-steak', label: 'Round steaks', products: [steak({ id: 'silverside-round-steak', name: 'Round steak (silverside)', fraction: 0.82, gramsPerCm: 130, defaultThicknessCm: 1.5, cookingId: 'braise' })] },
      { id: 'diced', label: 'Diced stewing beef', products: [{ id: 'silverside-diced', name: 'Diced silverside', kind: 'diced', fraction: 0.88, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'thick-flank',
    name: 'Thick flank (knuckle)',
    aka: ['Ball of round', 'Knuckle', 'Round steak'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(4.22),
    description: 'The front of the hind leg above the knee. Lean; Irish butchers sell it as ball of round for pot roasting, or as round steak.',
    defaultOption: 'pot-roast',
    diagramIds: ['thick-flank'],
    options: [
      { id: 'pot-roast', label: 'Ball of round pot roasts', products: [{ id: 'ball-of-round', name: 'Ball of round (pot roast)', kind: 'roast', fraction: 0.85, cookingId: 'pot-roast' }] },
      { id: 'round-steak', label: 'Round steaks', products: [steak({ id: 'thick-flank-steak', name: 'Round steak (thick flank)', fraction: 0.8, gramsPerCm: 110, defaultThicknessCm: 1.5, cookingId: 'flash-steak' })] },
      { id: 'minute', label: 'Minute steaks / stir-fry', products: [steak({ id: 'thick-flank-minute', name: 'Minute steak', fraction: 0.8, gramsPerCm: 200, defaultThicknessCm: 0.6, allowedThicknessCm: [0.5, 0.6, 0.8, 1], cookingId: 'minute-steak' })] },
      { id: 'diced', label: 'Diced', products: [{ id: 'thick-flank-diced', name: 'Diced thick flank', kind: 'diced', fraction: 0.85, cookingId: 'stew' }] },
      toMince(),
    ],
  },
  {
    id: 'thin-flank',
    name: 'Thin flank',
    aka: ['Flank', 'Bavette', 'Skirt', 'Goose skirt', 'Inside skirt'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(6.66, 'Thin flank (boneless, 3-bone)'),
    description:
      'The belly wall. Mostly mince, but it holds the bavette (flank steak) and two skirts, prized grilling cuts that are marinated, cooked hot and sliced across the grain.',
    defaultOption: 'bavette',
    diagramIds: ['thin-flank'],
    options: [
      {
        id: 'bavette',
        label: 'Bavette & skirts out, rest to mince',
        products: [
          { id: 'bavette', name: 'Bavette (flank steak)', kind: 'piece', fraction: 0.14, pieceGrams: 360, cookingId: 'flash-steak', notes: 'Whole bavette ≈ 1.4 kg per side, usually portioned' },
          { id: 'flank-skirts', name: 'Skirt steak (goose & inside skirt)', kind: 'piece', fraction: 0.22, pieceGrams: 370, cookingId: 'flash-steak' },
        ],
      },
      { id: 'rolled', label: 'Rolled flank pot roast', products: [{ id: 'rolled-flank', name: 'Rolled flank', kind: 'roast', fraction: 0.7, cookingId: 'pot-roast' }] },
      toMince('All to mince'),
    ],
  },
  {
    id: 'hind-shin',
    name: 'Hind shin & leg',
    aka: ['Leg of beef', 'Shin', 'Heel', 'Osso buco'],
    quarter: 'hind',
    meatPctOfCarcass: ahdb(3.44, 'Hind shin 1.70 + heel muscle 1.74'),
    bonePctOfCarcass: est(1.2, 'Hind shank bone for osso buco; estimate'),
    description: 'The hind leg below the round and the heel muscle. Slow-cooking meat; cross-cut as osso buco or diced as shin / leg beef.',
    defaultOption: 'diced',
    diagramIds: ['hind-shin'],
    options: [
      {
        id: 'osso-buco',
        label: 'Osso buco + heel braising',
        products: [
          steak({ id: 'hind-osso-buco', name: 'Osso buco (hind shin)', fraction: 0.47, boneFactor: 1.6, gramsPerCm: 120, defaultThicknessCm: 4, allowedThicknessCm: THICK_CM, cookingId: 'shin' }),
          { id: 'heel-braise', name: 'Heel (leg) braising beef', kind: 'diced', fraction: 0.45, cookingId: 'shin' },
        ],
      },
      { id: 'diced', label: 'Boneless shin & leg', products: [{ id: 'hind-shin-boneless', name: 'Shin / leg beef', kind: 'diced', fraction: 0.9, cookingId: 'shin' }] },
      toMince(),
    ],
  },
];

/** Lean trim (85 % VL) not attributable to a region — always goes to the trim pool (mince, burgers, diced). */
export const TRIM_POOL_PCT_OF_CARCASS: Sourced = {
  value: 8.41,
  evidence: 'estimate',
  sourceIds: ['ahdb-yield-guide'],
  note: 'AHDB trim 11.41 % less 3.0 % attributed to the short-rib plate region',
};

/** Total bone and fat in the AHDB reference carcass (% of carcass) — the pools bone-in cuts draw from. */
export const REFERENCE_BONE_PCT: Sourced = { value: 16.17, evidence: 'verified', sourceIds: ['ahdb-yield-guide'] };
export const REFERENCE_FAT_PCT: Sourced = { value: 5.78, evidence: 'verified', sourceIds: ['ahdb-yield-guide'] };

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
