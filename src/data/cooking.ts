import type { CookingProfile } from '../model/types';

/** Cooking guidance per cut family (Irish Butchers Guild, grassfed.ie, James Whelan). */
export const COOKING: CookingProfile[] = [
  { id: 'prime-steak', heat: 'dry', temp: 'high', speed: 'fast', methods: ['grill', 'pan-fry', 'barbecue'], doneness: 'Rare to medium', tip: 'Bring to room temperature, sear hard, rest for half the cooking time.' },
  { id: 'fillet', heat: 'dry', temp: 'high', speed: 'fast', methods: ['pan-fry', 'roast', 'grill'], doneness: 'Rare to medium-rare', tip: 'Very lean — overcooking ruins it. Whole fillet for Wellington or chateaubriand.' },
  { id: 'thick-bone-in-steak', heat: 'dry', temp: 'high', speed: 'fast', methods: ['barbecue', 'grill', 'roast'], doneness: 'Medium-rare (52–54 °C core)', tip: 'Reverse-sear: oven at 100–120 °C to ~50 °C core, then sear hot and rest 15 min.' },
  { id: 'flash-steak', heat: 'dry', temp: 'high', speed: 'fast', methods: ['grill', 'barbecue', 'pan-fry'], doneness: 'Medium-rare', tip: 'Marinate if you like, cook hot and fast, and slice thinly across the grain.' },
  { id: 'minute-steak', heat: 'dry', temp: 'high', speed: 'fast', methods: ['pan-fry', 'stir-fry'], doneness: 'Quick sear', tip: 'Thin-cut from the round; under a minute a side, or strips for stir-fry.' },
  { id: 'prime-roast', heat: 'dry', temp: 'high', speed: 'fast', methods: ['roast'], doneness: 'Medium-rare (52–55 °C core)', tip: 'Sear or start hot, then roast at about 160 °C; rest before carving.' },
  { id: 'lean-roast', heat: 'dry', temp: 'low', speed: 'slow', methods: ['slow-roast', 'pot-roast'], doneness: 'Medium-rare, sliced thin', tip: 'Lean round joints: roast low (about 160 °C to 55 °C core) or pot roast; carve thinly.' },
  { id: 'pot-roast', heat: 'wet', temp: 'low', speed: 'slow', methods: ['pot-roast', 'braise', 'slow-roast'], doneness: 'Tender', tip: "Covered with a little liquid at about 150 °C for 3 h or more (housekeeper's cut, brisket, ball of round)." },
  { id: 'braise', heat: 'wet', temp: 'low', speed: 'slow', methods: ['braise', 'stew', 'sous-vide'], doneness: 'Fork-tender', tip: 'Connective tissue turns to gelatine — feather blade, cheek and short rib need 3–4 h.' },
  { id: 'stew', heat: 'wet', temp: 'low', speed: 'slow', methods: ['stew', 'braise'], doneness: 'Fork-tender', tip: 'Ask for named cuts (shin, chuck, neck) rather than anonymous "stewing beef".' },
  { id: 'shin', heat: 'wet', temp: 'low', speed: 'slow', methods: ['braise', 'stew'], doneness: 'Falling apart', tip: 'The best slow-cook on the animal: 5–6 h at about 140 °C. Osso buco keeps the marrow.' },
  { id: 'ribs', heat: 'wet', temp: 'low', speed: 'slow', methods: ['braise', 'smoke', 'barbecue'], doneness: 'Tender', tip: 'Braise or smoke low and slow; a whole Jacob\'s ladder rack is a sharing joint.' },
  { id: 'brisket', heat: 'wet', temp: 'low', speed: 'slow', methods: ['slow-roast', 'braise', 'smoke', 'boil'], doneness: 'Tender', tip: 'Low and slow; rolled for pot roasting, or salted and boiled.' },
  { id: 'cured', heat: 'wet', temp: 'low', speed: 'slow', methods: ['boil'], doneness: 'Tender', tip: 'Spiced or corned beef (traditionally silverside or brisket), brined then simmered.' },
  { id: 'mince', heat: 'dry', temp: 'high', speed: 'fast', methods: ['pan-fry', 'stew'], tip: 'Brown hard first; 15–18 % fat suits bolognese and cottage pie.' },
  { id: 'burger', heat: 'dry', temp: 'high', speed: 'fast', methods: ['grill', 'barbecue', 'pan-fry'], doneness: 'Cooked through (minced meat)', tip: 'Around 20 % fat is the floor for a juicy burger.' },
  { id: 'liver', heat: 'dry', temp: 'high', speed: 'fast', methods: ['pan-fry'], doneness: 'Pink', tip: 'Thin slices, very quick in a hot pan; soak in milk to mellow older-animal liver.' },
  { id: 'kidney-heart', heat: 'wet', temp: 'low', speed: 'slow', methods: ['stew', 'braise', 'grill'], tip: 'Kidney: steak & kidney pie. Heart: slice thin and sear hot, or braise whole.' },
  { id: 'tongue', heat: 'wet', temp: 'low', speed: 'slow', methods: ['boil', 'braise'], tip: 'Simmer 3–4 h (often brined first), peel while warm, then slice.' },
  { id: 'oxtail', heat: 'wet', temp: 'low', speed: 'slow', methods: ['braise', 'stew'], tip: '4–6 h braise or soup; very rich and gelatinous.' },
  { id: 'tripe', heat: 'wet', temp: 'low', speed: 'slow', methods: ['boil', 'stew'], tip: 'Must be cleaned and scalded (dressed) first; then simmered slowly.' },
  { id: 'sweetbreads', heat: 'dry', temp: 'high', speed: 'fast', methods: ['pan-fry'], tip: 'Soak, blanch, peel, press, then pan-fry.' },
  { id: 'bones', heat: 'wet', temp: 'low', speed: 'slow', methods: ['roast', 'boil'], tip: 'Roast marrow bones at a high heat; roast stock bones then simmer 8–24 h.' },
  { id: 'fat-render', heat: 'dry', temp: 'low', speed: 'slow', methods: ['slow-roast'], tip: 'Render suet or fat trim slowly into dripping or tallow; strain and store chilled.' },
];

export const COOKING_BY_ID: Record<string, CookingProfile> = Object.fromEntries(COOKING.map((c) => [c.id, c]));
