// Starting points for the cut selection step. Constants only (selection paths → option ids).
import type { Selections } from '../model/types';

export interface Preset {
  id: string;
  label: string;
  description: string;
  selections: Selections;
  /** Rib-by-rib plans etc. A large number means 'all of them' (clamped to what the share has). */
  allocations?: Record<string, Record<string, number>>;
}

export const PRESETS: Preset[] = [
  { id: 'balanced', label: 'Balanced', description: 'Steaks from the loin and rib, roasts from the round, slow-cook cuts and mince from the forequarter.', selections: {} },
  {
    id: 'steaks',
    allocations: { 'fore-rib': {} },
    label: 'Mostly steaks',
    description: 'As many grilling steaks as the animal will give.',
    selections: {
      rump: 'steaks',
      topside: 'round-steak', silverside: 'round-steak', 'thick-flank': 'round-steak', chuck: 'denver', feather: 'flat-iron', 'thin-flank': 'bavette',
    },
  },
  {
    id: 'roasts',
    allocations: { 'fore-rib': { 'roast-on-bone': 99 }, loin: { wholeFillets: 99, sirloinRoasts: 99 } },
    label: 'Mostly roasts',
    description: 'Sunday joints sized for your household, with pot roasts from the round and shoulder.',
    selections: {
      rump: 'roast',
      topside: 'roasts', silverside: 'pot-roast', 'thick-flank': 'pot-roast', chuck: 'housekeepers', clod: 'pot-roast', brisket: 'rolled', feather: 'braise',
    },
  },
  {
    id: 'traditional',
    allocations: { 'fore-rib': { 'roast-on-bone': 99 }, loin: { tbones: 99 } },
    label: 'Traditional Irish',
    description: 'T-bones, rib on the bone, round roast and round steak, housekeeper’s cut and spiced beef, like a typical home-kill.',
    selections: { topside: 'split', silverside: 'cured', 'thick-flank': 'pot-roast', chuck: 'housekeepers', rump: 'steaks', brisket: 'salt' },
  },
  {
    id: 'freezer',
    allocations: { 'fore-rib': {} },
    label: 'Mince & stewing',
    description: 'Prime steaks only; everything else to mince, burgers and diced beef.',
    selections: {
      rump: 'steaks', topside: 'diced', silverside: 'diced', 'thick-flank': 'diced', chuck: 'diced', clod: 'diced',
      brisket: 'mince', feather: 'mince', 'thin-flank': 'mince', 'fore-shin': 'diced', 'hind-shin': 'diced', neck: 'mince', plate: 'mince',
    },
  },
];
