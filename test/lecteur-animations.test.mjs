// Le lecteur d'animations (js/lecteur-animations.js) : couches par canaux, fondu, miroir, refus.
import { nouvelEtat, etatAnimation, termine } from '../js/lecteur-animations.js';
import { animationsOrigine } from '../js/animations-store.js';
import { CANAUX, NOMS_CHAMPS } from '../js/data/poses-soldat.js';
import { FONDU, CANAUX_TIR_EN_MARCHE } from '../js/data/lecteur-animations.js';
import { echantillon, miroir } from '../js/pose-soldat.js';

const animations = animationsOrigine();
const par = n => animations.find(a => a.nom.startsWith(n));
const MARCHE = par('marche').nom, TIR = par('tir').nom, REPOS = par('repos').nom;
const proche = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const lire = (couches, t, etat = nouvelEtat(), opt = {}) => etatAnimation(etat, couches, t, { animations, ...opt });

group('lecteur d\'animations — poses');
test('les canaux couvrent exactement les champs d\'une pose', () => {
  const tous = Object.values(CANAUX).flat().sort();
  assert.deepEqual(tous, [...NOMS_CHAMPS].sort());
});
test('une couche seule rend l\'échantillon de l\'animation, à la vitesse demandée', () => {
  const p = lire([{ anim: MARCHE, depart: 0, vitesse: 2 }], 0.15);
  const att = echantillon(par('marche'), 0.3);
  for (const c of NOMS_CHAMPS) assert.ok(proche(p[c], att[c]), c);
});
test('le départ décale la lecture', () => {
  const p = lire([{ anim: MARCHE, depart: 10 }], 10.2), att = echantillon(par('marche'), 0.2);
  for (const c of NOMS_CHAMPS) assert.ok(proche(p[c], att[c]), c);
});
test('la marche boucle', () => {
  const a = lire([{ anim: MARCHE, depart: 0 }], 0.3), b = lire([{ anim: MARCHE, depart: 0 }], 0.3 + 0.8);
  for (const c of NOMS_CHAMPS) assert.ok(proche(a[c], b[c], 1e-6), c);
});
test('« une fois » tient la dernière pose, et `termine` le dit', () => {
  const tir = par('tir'), couche = { anim: TIR, depart: 5 };
  assert.ok(!termine(tir, couche, 5.5)); assert.ok(termine(tir, couche, 6)); assert.ok(termine(tir, couche, 9));
  const a = lire([couche], 6.5), b = lire([couche], 20);
  for (const c of NOMS_CHAMPS) assert.ok(proche(a[c], b[c]), c);
});

group('lecteur d\'animations — couches par canaux');
test('tir en marchant : jambes et buste de la marche, bras et fusil du tir', () => {
  const couches = [{ anim: MARCHE, depart: 0 }, { anim: TIR, depart: 0, canaux: CANAUX_TIR_EN_MARCHE }];
  const p = lire(couches, 0.45), m = echantillon(par('marche'), 0.45), tir = echantillon(par('tir'), 0.45);
  for (const canal of ['corps', 'jambeG', 'jambeD']) for (const c of CANAUX[canal]) assert.ok(proche(p[c], m[c]), `${canal}/${c}`);
  for (const canal of CANAUX_TIR_EN_MARCHE) for (const c of CANAUX[canal]) assert.ok(proche(p[c], tir[c]), `${canal}/${c}`);
});
test('tir à l\'arrêt : tout vient du tir', () => {
  const p = lire([{ anim: REPOS, depart: 0 }, { anim: TIR, depart: 0 }], 0.3), tir = echantillon(par('tir'), 0.3);
  for (const c of NOMS_CHAMPS) assert.ok(proche(p[c], tir[c]), c);
});
test('la couche la plus haute gagne ; un canal non couvert refuse à voix haute', () => {
  assert.throws(() => lire([{ anim: MARCHE, depart: 0, canaux: ['jambeG'] }], 0), /Aucune couche/);
  assert.throws(() => lire([{ anim: 'nulle', depart: 0 }], 0), /inconnue/);
  assert.throws(() => lire([{ anim: MARCHE, depart: 0, canaux: ['queue'] }], 0), /Canal inconnu/);
});

group('lecteur d\'animations — fondu');
test('le premier appel ne fond pas : la pose est celle de l\'animation tout de suite', () => {
  const p = lire([{ anim: TIR, depart: 0 }], 0), att = echantillon(par('tir'), 0);
  for (const c of NOMS_CHAMPS) assert.ok(proche(p[c], att[c]), c);
});
test('changer d\'animation fond en FONDU secondes, sans saut au départ ni à l\'arrivée', () => {
  const etat = nouvelEtat(), marche = [{ anim: MARCHE, depart: 0 }];
  const avant = lire(marche, 1, etat);
  const tirCouches = [{ anim: TIR, depart: 1 }];
  const zero = lire(tirCouches, 1, etat);                      // l'instant du changement : encore la pose d'avant
  for (const c of NOMS_CHAMPS) assert.ok(proche(zero[c], avant[c]), 'départ ' + c);
  const mi = lire(tirCouches, 1 + FONDU / 2, etat), tir0 = echantillon(par('tir'), FONDU / 2);
  const c0 = 'epauleG';
  assert.ok(Math.min(avant[c0], tir0[c0]) < mi[c0] && mi[c0] < Math.max(avant[c0], tir0[c0]) || proche(avant[c0], tir0[c0]), 'à mi-fondu, entre les deux');
  const fin = lire(tirCouches, 1 + FONDU, etat), att = echantillon(par('tir'), FONDU);
  for (const c of NOMS_CHAMPS) assert.ok(proche(fin[c], att[c]), 'arrivée ' + c);
});
test('un fondu interrompu repart de la pose montrée', () => {
  const etat = nouvelEtat();
  lire([{ anim: MARCHE, depart: 0 }], 1, etat);
  lire([{ anim: TIR, depart: 1 }], 1.1, etat);
  const montre = lire([{ anim: TIR, depart: 1 }], 1.15, etat);
  const reprise = lire([{ anim: REPOS, depart: 1.15 }], 1.15, etat);
  for (const c of NOMS_CHAMPS) assert.ok(proche(reprise[c], montre[c]), c);
});
test('un tir relancé (départ neuf) fond aussi ; un fondu nul saute', () => {
  const etat = nouvelEtat();
  lire([{ anim: TIR, depart: 0 }], 1.5, etat);
  const relance = lire([{ anim: TIR, depart: 1.5 }], 1.5, etat), fini = echantillon(par('tir'), 1);
  for (const c of NOMS_CHAMPS) assert.ok(proche(relance[c], fini[c]), c);
  const e2 = nouvelEtat();
  lire([{ anim: MARCHE, depart: 0 }], 1, e2);
  const net = lire([{ anim: TIR, depart: 1 }], 1, e2, { fondu: 0 }), att = echantillon(par('tir'), 0);
  for (const c of NOMS_CHAMPS) assert.ok(proche(net[c], att[c]), c);
});
test('chaque canal fond à son rythme : le tir en marchant ne touche pas aux jambes', () => {
  const etat = nouvelEtat(), base = { anim: MARCHE, depart: 0 };
  lire([base], 1, etat);
  const sans = lire([base], 1.1, etat);
  const avec = lire([base, { anim: TIR, depart: 1, canaux: CANAUX_TIR_EN_MARCHE }], 1.1, etat);
  for (const c of [...CANAUX.jambeG, ...CANAUX.jambeD, ...CANAUX.corps]) assert.ok(proche(avec[c], sans[c]), c);
});

group('lecteur d\'animations — gaucher');
test('le gaucher est le miroir exact du droitier, et l\'état reste de droitier', () => {
  const etat = nouvelEtat(), couches = [{ anim: MARCHE, depart: 0 }, { anim: TIR, depart: 0, canaux: CANAUX_TIR_EN_MARCHE }];
  const d = lire(couches, 0.5, etat), g = lire(couches, 0.5, etat, { gaucher: true }), att = miroir(d);
  for (const c of NOMS_CHAMPS) assert.ok(proche(g[c], att[c]), c);
  const d2 = lire(couches, 0.5, etat);
  for (const c of NOMS_CHAMPS) assert.ok(proche(d2[c], d[c]), c);
});
