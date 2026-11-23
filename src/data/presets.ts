// Starting points for the cut selection step. Constants only (selection paths → option ids).
import type { Selections } from '../model/types';

export interface Preset {
  id: string;
  label: string;
  description: string;
  selections: Selections;
}

export const PRESETS: Preset[] = [
  { id: 'balanced', label: 'Balanced', description: 'Steaks from the loin and rib, roasts from the round, slow-cook cuts and mince from the forequarter.', selections: {} },
  {
    id: 'steaks',
    label: 'Mostly steaks',
    description: 'As many grilling steaks as the animal will give.',
    selections: {
      'fore-rib': 'ribeye', loin: 'separate', 'loin/striploin': 'sirloin-steaks', 'loin/fillet': 'steaks', rump: 'steaks',
      topside: 'round-steak', silverside: 'round-steak', 'thick-flank': 'round-steak', chuck: 'denver', feather: 'flat-iron', 'thin-flank': 'bavette',
    },
  },
  {
    id: 'roasts',
    label: 'Mostly roasts',
    description: 'Sunday joints sized for your household, with pot roasts from the round and shoulder.',
    selections: {
      'fore-rib': 'on-bone', loin: 'separate', 'loin/striploin': 'sirloin-roast', 'loin/fillet': 'whole', rump: 'roast',
      topside: 'roasts', silverside: 'pot-roast', 'thick-flank': 'pot-roast', chuck: 'housekeepers', clod: 'pot-roast', brisket: 'rolled', feather: 'braise',
    },
  },
  {
    id: 'traditional',
    label: 'Traditional Irish',
    description: 'T-bones, rib on the bone, round roast and round steak, housekeeper’s cut and spiced beef, like a typical home-kill.',
    selections: { loin: 't-bone', 'fore-rib': 'on-bone', topside: 'split', silverside: 'cured', 'thick-flank': 'pot-roast', chuck: 'housekeepers', rump: 'steaks', brisket: 'salt' },
  },
  {
    id: 'freezer',
    label: 'Mince & stewing',
    description: 'Prime steaks only; everything else to mince, burgers and diced beef.',
    selections: {
      'fore-rib': 'ribeye', loin: 'separate', rump: 'steaks', topside: 'diced', silverside: 'diced', 'thick-flank': 'diced', chuck: 'diced', clod: 'diced',
      brisket: 'mince', feather: 'mince', 'thin-flank': 'mince', 'fore-shin': 'diced', 'hind-shin': 'diced', neck: 'mince', plate: 'mince',
    },
  },
];
