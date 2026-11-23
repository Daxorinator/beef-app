// Global, declarative advisories (no evaluation logic here). Option-specific advisories live on the option.
import type { Advisory } from '../model/types';

export const ADVISORIES: Advisory[] = [
  // Regulatory
  {
    id: 'ie-negligible-bse',
    when: { minAgeMonths: 30 },
    severity: 'info',
    message:
      'Ireland has negligible BSE risk status, so the backbone is not specified risk material at any age. T-bone, wing rib and bone-in rib are all allowed from cattle over 30 months.',
    sourceIds: ['eu-999-2001', 'eu-2007-453', 'woah-bse'],
  },
  {
    id: 'srm-over-12',
    when: { minAgeMonths: 12 },
    severity: 'info',
    message: 'Skull (with brain and eyes) and spinal cord are specified risk material and are never returned for cattle over 12 months.',
    sourceIds: ['eu-999-2001'],
  },
  {
    id: 'mince-freshness',
    when: {},
    severity: 'tip',
    message:
      'Approved meat plants must mince within 6 days of slaughter (15 days if boned and vacuum-packed). If you hang for 3+ weeks, ask your butcher when the mince trim is taken off.',
    sourceIds: ['bordbia-mpqas'],
  },
  {
    id: 'chill-before-cutting',
    when: {},
    severity: 'info',
    message: 'The carcass must reach 7 °C or below in the deep muscle before it is cut.',
    sourceIds: ['bordbia-mpqas'],
  },

  // Organic
  {
    id: 'organic-chain',
    when: { organic: true },
    severity: 'warning',
    message:
      'To keep organic status, the abattoir and butcher must be certified, or listed on your own certificate by prior arrangement with your control body (IOA / Organic Trust). Otherwise the meat cannot be labelled or sold as organic.',
    sourceIds: ['ioa-standards'],
  },
  {
    id: 'organic-handling',
    when: { organic: true },
    severity: 'tip',
    message: 'Organic animals: keep the journey short, no electric prods or tranquillisers, and ask for a separate rail in the chill.',
    sourceIds: ['ioa-standards'],
  },

  // Age / sex / breed quality
  {
    id: 'older-cow-hang',
    when: { sex: ['cow'], minAgeMonths: 42 },
    severity: 'tip',
    message: 'Mature cow beef is less tender than young prime beef (cull-cow steaks averaged 5.7–7.6 kgf shear force vs a 4.6 kgf tenderness benchmark). Hang longer and favour roasts, slow-cook cuts and mince over thin grilling steaks.',
    sourceIds: ['moreira-2021'],
  },
  {
    id: 'bull-hang',
    when: { sex: ['bull'], minAgeMonths: 16 },
    severity: 'tip',
    message: 'Bull beef is lean and benefits from at least 14 days\' hanging. Leaner mince may need fat added for burgers.',
    sourceIds: ['ahdb-yield-guide'],
  },
  {
    id: 'jersey-fat',
    when: { breed: ['jersey'] },
    severity: 'info',
    message: 'Jersey fat is naturally yellow (beta-carotene). This is cosmetic: it does not mean the beef is old or poor.',
    sourceIds: ['teagasc-5923'],
  },
  {
    id: 'jersey-steaks',
    when: { breed: ['jersey'] },
    severity: 'tip',
    message: 'Jersey eye muscles are small, so steaks are small in area. Cut them thicker (3 cm or more) or keep more as roasts.',
  },
  {
    id: 'half-share-whole-items',
    when: { share: 'half' },
    severity: 'info',
    message: 'On a half share, single items (hide, tongue, oxtail) go to one sharer. Agree in advance who takes them.',
  },
  {
    id: 'on-farm-route',
    when: { route: 'on-farm-private' },
    severity: 'info',
    message:
      'On-farm slaughter is legal only for your own household. Stunning rules apply, SRM must be removed, by-products go to a rendering plant or knackery, and the death must be reported to your District Veterinary Office. An approved abattoir is strongly recommended.',
    sourceIds: ['fsai-private-slaughter'],
  },
];
