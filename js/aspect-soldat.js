/* L'aspect d'un soldat : sa coiffure, ses cheveux, sa barbe, sa peau, les traits de son visage, ses accessoires et sa carrure, tirés de son numéro, de son camp et
   de la graine d'identité (comme son nom : `identite.js`) : le même homme d'une partie relue à l'autre, et rien de sauvegardé. Logique pure (aucun DOM, aucun `Math.random`),
   testée dans Node ; le jeu et la fabrique de soldats du labo lisent la même fonction, donc la fabrique montre ce que le jeu dessine.
   L'aspect ne change jamais la partie : il ne lit que des tirages de son numéro, jamais l'état (les caractéristiques qu'on lui passe viennent de `caracteristiques`,
   elles aussi tirées du numéro). */
import { hash2 } from './lib/rng.js?v=0.122.0';
import { COIFFES, CHEVEUX, BARBES, PEAUX, ACCESSOIRES, CARRURE, COULEURS_CHEVEUX } from './data/aspect-soldat.js?v=0.122.0';

// un indice tiré d'une liste à poids (`poids` : un nombre, ou un nombre par camp)
function tirer(liste, u, camp) {
  const p = e => Array.isArray(e.poids) ? e.poids[camp] : e.poids;
  const total = liste.reduce((s, e) => s + p(e), 0);
  let a = u * total;
  for (let k = 0; k < liste.length; k++) { a -= p(liste[k]); if (a < 0) return k; }
  return liste.length - 1;
}

/* id : le numéro de l'homme ; camp : 0 nous, 1 en face ; graine : celle de l'identité ; rang : son rang (0 capitaine … 7 soldat de 2e classe, `identite().rang`) ; age : son âge ;
   caracs : [adresse, force, endurance, calme] de 0 à 100 (facultatif : 50 partout). Rend l'objet que lit le dessin (rendu/soldat-articule.js, `ATTRIBUTS`). */
export function aspect(id, camp, graine, rang = 6, age = 25, caracs = [50, 50, 50, 50]) {
  const h = q => hash2(id, 100 + q, (graine | 0) + camp * 7919 + 31337);
  const centre = u => 2 * u - 1;
  // la coiffe : toujours le casque de l'armée (il ne tombe qu'à la blessure à la tête : le dessin)
  const coiffe = tirer(COIFFES, h(1), camp);
  // les cheveux : la couleur grise avec l'âge (à 45 ans, la moitié des cheveux sont gris)
  const cheveux = tirer(CHEVEUX, h(3), camp);
  let couleur = Math.floor(h(4) * 4);                                   // noir, brun, châtain, blond
  if (h(5) < Math.max(0, (age - 28) * 0.03)) couleur = COULEURS_CHEVEUX.length - 1;       // gris
  // la calvitie vient avec l'âge
  const chauve = cheveux === 0 || (age > 38 && h(6) < 0.25) ? 0 : cheveux;
  const barbe = tirer(BARBES, h(7), camp);
  // la peau : un tirage, un peu plus pâle chez les officiers
  const u = h(8) + (rang <= 3 ? -0.12 : 0.04), peau = u < 0.45 ? 0 : u < 0.85 ? 1 : 2;      // surtout pâle ou clair, un homme sur sept hâlé
  // les rides : le pli du nez à la bouche et les pattes d'oie avec l'âge (le front plissé à partir de 38 ans)
  const rides = age >= 38 ? 2 : age >= 28 ? (h(18) < 0.5 ? 1 : 0) : 0;
  const traits = { yeux: Math.floor(h(9) * 3), nez: Math.floor(h(10) * 3), bouche: Math.floor(h(11) * 3), sourcils: Math.floor(h(12) * 3), rides };
  // les accessoires : un bit par entrée de `ACCESSOIRES`
  let acc = 0;
  ACCESSOIRES.forEach((A, k) => {
    if (A.camp != null && A.camp !== camp) return;
    if (A.sans?.includes(rang)) return;
    const p = A.p + (A.rang ? A.rang[rang] : 0) + (A.age ? A.age * Math.max(0, age - 20) : 0);
    if (h(20 + k) < p) acc |= 1 << k;
  });
  // la carrure : du hasard autour de 1, et la force et l'âge qui la poussent
  const [, force = 50, endurance = 50] = caracs;
  const taille = 1 + CARRURE.taille.ecart * centre(h(13));
  const epaules = 1 + CARRURE.epaules.ecart * centre(h(14)) + CARRURE.epaules.force * (force - 50) / 50;
  const jambes = 1 + CARRURE.jambes.ecart * centre(h(15));
  const tete = 1 + CARRURE.tete.ecart * centre(h(16));
  const ventre = 1 + CARRURE.ventre.ecart * centre(h(17)) * 0.5 + CARRURE.ventre.age * Math.max(0, (age - 30) / 12) - 0.03 * (endurance - 50) / 50;
  return { rang, coiffe, cheveux: chauve, couleur, barbe, peau, traits, acc, carrure: { taille, epaules, jambes, tete, ventre } };
}

// L'aspect en mots, pour la fiche (la fabrique de soldats du labo)
export function aspectEnMots(a, camp = 0) {
  const mots = [];
  mots.push(camp ? COIFFES[a.coiffe].nomEux : COIFFES[a.coiffe].nom);
  mots.push(a.cheveux === 0 ? 'crâne nu' : `cheveux ${CHEVEUX[a.cheveux].nom}`);
  if (a.barbe) mots.push(BARBES[a.barbe].nom);
  for (let k = 0; k < ACCESSOIRES.length; k++) if (a.acc & (1 << k)) mots.push(ACCESSOIRES[k].nom);
  return mots;
}
