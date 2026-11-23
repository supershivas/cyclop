// Comment un homme est tombé (Jérôme, 20 nov., v0.151.0 : « le corps n'est pas indemne : on doit avoir la cause, l'endroit de la balle, l'éclat responsable »).
// `mourir` (bataille.js) garde dans la fiche du mort l'endroit touché et l'arme ; quand le coup ne dit pas l'endroit (un tir de la foule, un éclat), il est tiré d'un hachage de son
// numéro (jamais du générateur de la bataille : la partie ne change pas), selon les parts de chaque cause (de bas en haut : jambes, bras, tronc, tête ; la somme vaut 1).
export const PARTS_ZONES = {
  tir: { jambes: 0.15, bras: 0.1, tronc: 0.5, tete: 0.25 },
  nid: { jambes: 0.2, bras: 0.1, tronc: 0.55, tete: 0.15 },
  char: { jambes: 0.2, bras: 0.1, tronc: 0.55, tete: 0.15 },
  avion: { jambes: 0.15, bras: 0.1, tronc: 0.5, tete: 0.25 },
  obus: { jambes: 0.25, bras: 0.15, tronc: 0.4, tete: 0.2 },
  'mêlée': { jambes: 0.05, bras: 0.05, tronc: 0.8, tete: 0.1 },
  crosse: { jambes: 0, bras: 0.1, tronc: 0.2, tete: 0.7 },
  'corvée': { jambes: 0.25, bras: 0.15, tronc: 0.4, tete: 0.2 },
};
export const ZONES_EN_MOTS = { tete: 'à la tête', tronc: 'à la poitrine', bras: 'au bras', jambes: 'à la jambe' };      // (la fiche n'en barre qu'une : un bras, une jambe)
// L'arme, en mots : `camp` est celui de qui a tiré (0 : nous, 1 : en face), `cal` le calibre d'un obus
export const ARMES_DE_CAMP = { tir: ['une balle de Lebel', 'une balle de Mauser'], nid: ['une rafale de Hotchkiss', 'une rafale de MG 08'] };
export function armeEnMots(cause, camp, cal) {
  if (ARMES_DE_CAMP[cause]) return ARMES_DE_CAMP[cause][camp] ?? ARMES_DE_CAMP[cause][0];
  if (cause === 'obus') return cal ? `un éclat de ${cal}` : 'un éclat d\'obus';
  return { 'mêlée': 'un coup de baïonnette', crosse: 'un coup de crosse', char: 'les mitrailleuses d\'un char', avion: 'la mitrailleuse d\'un avion', noyade: 'noyé', feu: 'les flammes d\'un lance-flammes', gaz: 'le gaz', 'corvée': 'en corvée, la nuit', blessure: 'de ses blessures' }[cause] ?? cause;
}
