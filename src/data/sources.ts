import type { Source } from '../model/types';

/** Every source cited by data files. See docs/RESEARCH.md for extracts. */
export const SOURCES: Source[] = [
  // Regulation (EU / IE)
  { id: 'eu-999-2001', title: 'Regulation (EC) No 999/2001 (TSE), consolidated 12.03.2025 — Annex V', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32001R0999', year: 2025, jurisdiction: 'EU' },
  { id: 'eu-2007-453', title: 'Decision 2007/453/EC BSE status, consolidated 04.11.2025 (Ireland: negligible risk)', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32007D0453', year: 2025, jurisdiction: 'EU' },
  { id: 'eu-2025-2208', title: 'Commission Implementing Decision (EU) 2025/2208', publisher: 'Official Journal of the EU', url: 'https://eur-lex.europa.eu/eli/dec_impl/2025/2208/oj', year: 2025, jurisdiction: 'EU' },
  { id: 'eu-1069-2009', title: 'Regulation (EC) No 1069/2009 (animal by-products), consolidated 14.12.2019', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32009R1069', year: 2019, jurisdiction: 'EU' },
  { id: 'eu-142-2011', title: 'Regulation (EU) No 142/2011 (ABP implementing rules), consolidated 29.10.2025', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32011R0142', year: 2025, jurisdiction: 'EU' },
  { id: 'eu-1308-2013', title: 'Regulation (EU) No 1308/2013 Annex IV (carcass classification), consolidated 18.08.2026', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32013R1308', year: 2026, jurisdiction: 'EU' },
  { id: 'eu-2017-1182', title: 'Delegated Regulation (EU) 2017/1182 (carcass presentation & weighing)', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32017R1182', year: 2017, jurisdiction: 'EU' },
  { id: 'eu-2017-1184', title: 'Implementing Regulation (EU) 2017/1184 (corrective factors)', publisher: 'EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32017R1184', year: 2017, jurisdiction: 'EU' },
  { id: 'woah-bse', title: 'WOAH official BSE risk status (Resolution No. 23, May 2026)', publisher: 'WOAH', url: 'https://www.woah.org/en/disease/bovine-spongiform-encephalopathy/', year: 2026, jurisdiction: 'other' },
  { id: 'fsai-private-slaughter', title: 'Slaughter of Animals for Private Domestic Consumption (factsheet, 2013; SRM list superseded)', publisher: 'FSAI', url: 'https://fsai.ie/getmedia/3e9828a1-1179-4383-9e5b-a5ca384f2995/Slaughter-of-Animal-for-Private-Consumption-FINAL.pdf', year: 2013, jurisdiction: 'IE' },
  { id: 'ie-abp-guide', title: 'Animal By-Products Legislation — An Explanatory Guide', publisher: 'Lean Business Ireland', url: 'https://www.leanbusinessireland.ie/wp-content/uploads/2017/05/2015-Animal-By-Products-OCTOBER.pdf', year: 2015, jurisdiction: 'IE' },
  { id: 'bordbia-mpqas', title: 'Meat Processor Quality Assurance Standard — Processor Requirements Rev. 01', publisher: 'Bord Bia', url: 'https://www.bordbia.ie/globalassets/bordbia.ie/farmers--growers/farmers/qas/document-libraries/mpqas-pdfs/mpqas-processor.pdf', year: 2013, jurisdiction: 'IE' },
  { id: 'ie-pgi-grassfed', title: 'Irish Grass Fed Beef PGI', publisher: 'Bord Bia / Irish Food & Drink', url: 'https://www.irishfoodanddrink.com/irish-grass-fed-beef-pgi/', jurisdiction: 'IE' },
  { id: 'ioa-standards', title: 'Organic Food and Farming Standards in Ireland, Ed. 2.03', publisher: 'Irish Organic Association', url: 'https://www.irishorganicassociation.ie/wp-content/uploads/Organic-Food-And-Farming-Standards-Ireland.pdf', year: 2023, jurisdiction: 'IE' },
  { id: 'organic-trust-faq', title: 'Organic Trust FAQs', publisher: 'Organic Trust', url: 'https://organictrust.ie/faqs', jurisdiction: 'IE' },

  // Yield & carcass data
  { id: 'teagasc-systems', title: 'Beef Production System Guidelines', publisher: 'Teagasc / Bord Bia', url: 'https://teagasc.ie/publications/beef-production-system-guidelines-php/', year: 2015, jurisdiction: 'IE' },
  { id: 'teagasc-heifer', title: 'Butchering a Heifer for the Freezer (K. Fahy)', publisher: 'Teagasc', url: 'https://teagasc.ie/publications/butchering-a-heifer-for-the-freezer-php/', year: 2023, jurisdiction: 'IE' },
  { id: 'teagasc-5923', title: 'Beef from HF, Norwegian Red × HF and Jersey × HF male cattle (Project 5923)', publisher: 'Teagasc', url: 'https://teagasc.ie/wp-content/uploads/media/website/publications/2015/Dairy_Beef_5923.pdf', year: 2014, jurisdiction: 'IE' },
  { id: 'teagasc-dissection', title: 'Predicting beef carcass meat, fat & bone proportions from conformation & fat scores (McGee & Drennan; Conroy et al. 2010)', publisher: 'Teagasc', url: 'https://teagasc.ie/wp-content/uploads/media/website/publications/2016/ASA-Charleville-2016-Beef-Carcass-Classification-MMcG.pdf', year: 2016, jurisdiction: 'IE' },
  { id: 'minchin-2009', title: 'Prediction of cull cow carcass characteristics from live weight and BCS (Minchin et al., Ir J Agric Food Res 48:75–86)', publisher: 'UCC / Teagasc', url: 'https://research.ucc.ie/en/publications/prediction-of-cull-cow-carcass-characteristics-from-live-weight-a/', year: 2009, jurisdiction: 'IE' },
  { id: 'icbf-breeds', title: 'ICBF Beef Breeds Booklet', publisher: 'ICBF', url: 'https://www.icbf.com/wp-content/uploads/2013/06/Beef_Expo_ICBF_Beef_Breeds_Booklet_sm.pdf', year: 2013, jurisdiction: 'IE' },
  { id: 'europ-factors-study', title: 'Animal-level factors associated with the achievement of desirable specifications in Irish beef carcasses graded using the EUROP classification system', publisher: 'ResearchGate (abstract)', url: 'https://www.researchgate.net/publication/342064474', jurisdiction: 'IE' },
  { id: 'agriland-2025', title: 'Average beef carcass weights rise after 4 years of decline (DAFM data)', publisher: 'Agriland', url: 'https://www.agriland.ie/farming-news/table-average-beef-carcass-weights-rise-after-4-years-of-decline/', year: 2026, jurisdiction: 'IE' },
  { id: 'ahdb-yield-guide', title: 'Beef Yield Guide (303 kg R4H reference carcase; 600 kg R4L steer by-products)', publisher: 'AHDB', url: 'https://ahdb.org.uk/beef-yield-guide', jurisdiction: 'UK' },
  { id: 'ahdb-europ-yield', title: 'The relationship between meat yield from beef carcases and their classification on the EUROP grid', publisher: 'EBLEX / AHDB', url: 'https://projectblue.blob.core.windows.net/media/Default/Research%20Papers/Beef%20&%20Lamb/beefcarcaseyield_07.06.10-final-report.pdf', year: 2010, jurisdiction: 'UK' },
  { id: 'sdsu-ageing', title: 'How Much Weight Do Beef Carcasses Lose While Aging?', publisher: 'SDSU Extension', url: 'https://extension.sdstate.edu/how-much-weight-do-beef-carcasses-lose-while-aging', year: 2024, jurisdiction: 'US' },
  { id: 'eye-muscle-study', title: 'Production and carcass traits of Holstein, Friesian and Charolais × HF male cattle', publisher: 'ResearchGate abstract', url: 'https://www.researchgate.net/publication/228482750', jurisdiction: 'other' },

  // Irish trade names / practice
  { id: 'ie-butchers-guild', title: 'Beef cuts', publisher: 'Irish Butchers Guild', url: 'https://irishbutchersguild.com/beef/', jurisdiction: 'IE' },
  { id: 'grassfed-ie', title: 'Irish grass-fed beef cuts guide', publisher: 'grassfed.ie', url: 'https://grassfed.ie/cuts-guide.html', jurisdiction: 'IE' },
  { id: 'james-whelan', title: 'Beef cuts', publisher: 'James Whelan Butchers', url: 'https://www.jameswhelanbutchers.com/info/meat-information/beef-cuts/', jurisdiction: 'IE' },
  { id: 'brave-herders', title: 'Buy a Whole Cow — Dexter Beef', publisher: 'Brave Herders (Munster)', url: 'https://braveherders.ie/dexter-beef/buy-a-whole-cow/', jurisdiction: 'IE' },
  { id: 'user-abattoir', title: "User's experience of Irish abattoir policy (offal & cheeks returnable; hide per-abattoir)", publisher: 'Project owner', url: '', year: 2026, jurisdiction: 'IE' },
  { id: 'portion-guides', title: 'Retailer/butcher roast portion guidance (Sobeys, Ottawa Valley Meats, et al.)', publisher: 'Various', url: 'https://ottawavalleymeats.com/blogs/farm-fresh/how-big-of-a-roast-do-i-need', jurisdiction: 'other' },
];

export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
