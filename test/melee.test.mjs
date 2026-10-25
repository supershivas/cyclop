// Les caractéristiques de chaque homme (adresse, force, endurance, calme) et le corps à corps (v0.69.0).
import { creerTerrain } from '../js/terrain.js';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, photoArmee, restaurerArmee, chanceTir, facteur, effrayer } from '../js/army.js';
import { caracteristiques, caracEnMots, CARACTERISTIQUES } from '../js/identite.js';
import { createRng } from '../js/lib/rng.js';
import { REGLAGES as R } from '../js/data/reglages.js';

// des duels : chaque homme est son propre régiment, et son ordre est de rester où il est ; `paires` : [[camp 0 : x, y], [camp 1 : x, y]]
function duels(paires, retouche = () => {}) {
  const T = creerTerrain(1, { largeur: 400, hauteur: 60, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  const A = creerArmee({ capacite: paires.length * 2, W: T.W, H: T.H }), regiments = [];
  const mettre = (x, y, camp) => {
    const i = ajouterSoldat(A, x, y, camp, regiments.length, 0, 0.5);
    regiments.push({ id: regiments.length, camp, effectif: 1, ordre: { x, y, fx: 0, fy: camp ? 1 : -1, cols: 1, esp: 2 } });
    A.tirT[i] = (i * 0.618) % 1.5;                  // les coups ne partent pas tous ensemble (le premier du pas frapperait toujours le premier)
    return i;
  };
  for (const [a, b] of paires) { const ia = mettre(a[0], a[1], 0), ib = mettre(b[0], b[1], 1); retouche(A, ia, ib); }
  const ctx = { T, R, regiments, champDe: () => null, rng: createRng(5), dt: 1 / 30, gel: false, frapper: i => { A.mort[i] = 1; }, faces: [] };
  return { A, ctx, pas: n => { for (let k = 0; k < n; k++) { construireGrille(A); pasArmee(A, ctx); } } };
}

group('caractéristiques');
test('quatre caractéristiques de 0 à 100, tirées du numéro et du camp : les mêmes à chaque fois, 50 en moyenne', () => {
  assert.equal(CARACTERISTIQUES.length, 4);
  assert.deepEqual(caracteristiques(12, 0), caracteristiques(12, 0));
  assert.notDeepEqual(caracteristiques(12, 0), caracteristiques(13, 0));
  const somme = [0, 0, 0, 0];
  for (let id = 0; id < 4000; id++) caracteristiques(id, id % 2).forEach((v, q) => { assert.ok(v >= 0 && v <= 100 && Number.isInteger(v)); somme[q] += v; });
  for (const s of somme) assert.ok(Math.abs(s / 4000 - 50) < 2, `moyenne ${s / 4000}`);
  assert.deepEqual([0, 30, 50, 70, 100].map(caracEnMots), ['faible', 'médiocre', 'moyen', 'bon', 'excellent']);
});
test('l\'armée garde les caractéristiques de chacun : à la création, après les morts retirés, dans la sauvegarde', () => {
  const T = creerTerrain(1, { largeur: 60, hauteur: 20, arbres: 0 }, R);
  const A = creerArmee({ capacite: 10, W: T.W, H: T.H });
  for (let k = 0; k < 6; k++) ajouterSoldat(A, 5 + k, 5, k % 2, 0, k, 0.5, 100 + k);
  for (let i = 0; i < 6; i++) assert.deepEqual([A.adresse[i], A.force[i], A.endurance[i], A.calme[i]], caracteristiques(A.id[i], A.camp[i]));
  const B = creerArmee({ capacite: 10, W: T.W, H: T.H }); restaurerArmee(B, photoArmee(A));
  for (let i = 0; i < 6; i++) assert.deepEqual([B.adresse[i], B.force[i], B.endurance[i], B.calme[i]], [A.adresse[i], A.force[i], A.endurance[i], A.calme[i]]);
});
test('l\'adresse règle la chance de toucher, l\'endurance la fatigue des jambes, le calme la peur : de × 0,7 à × 1,3, rien pour un homme moyen', () => {
  const c = a => chanceTir(R, 'volonte', 4, 0, a);
  assert.ok(c(100) > c(50) * 1.25 && c(0) < c(50) * 0.75 && Math.abs(c(50) - chanceTir(R, 'volonte', 4, 0)) < 1e-12);
  assert.equal(facteur(R.caracteristiques.endurance, 50, -1), 1);
  assert.ok(facteur(R.caracteristiques.endurance, 100, -1) < 0.75 && facteur(R.caracteristiques.endurance, 0, -1) > 1.25);
  // le calme : un obus qui tombe à côté effraie moins l'homme calme
  const T = creerTerrain(1, { largeur: 60, hauteur: 20, arbres: 0 }, R), A = creerArmee({ capacite: 4, W: T.W, H: T.H });
  const calme = ajouterSoldat(A, 10, 10, 0, 0, 0, 0.5), nerveux = ajouterSoldat(A, 10.5, 10, 0, 0, 1, 0.5);
  A.calme[calme] = 100; A.calme[nerveux] = 0; construireGrille(A);
  effrayer(A, 10.2, 10, 8, 0.3, R.experience, R.caracteristiques.calme);
  assert.ok(A.peur[calme] < A.peur[nerveux] * 0.6, `calme ${A.peur[calme].toFixed(2)}, nerveux ${A.peur[nerveux].toFixed(2)}`);
});
test('l\'endurance épargne les jambes : à marche égale, un homme endurant est moins fatigué', () => {
  const T = creerTerrain(1, { largeur: 200, hauteur: 20, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  const A = creerArmee({ capacite: 4, W: T.W, H: T.H }), regiments = [];
  for (const [k, e] of [[0, 100], [1, 0]]) { ajouterSoldat(A, 5, 5 + k * 6, 0, k, 0, 0.5); A.endurance[k] = e; A.tirT[k] = 1e9; regiments.push({ id: k, camp: 0, effectif: 1, ordre: { x: 190, y: 5 + k * 6, fx: 0, fy: -1, cols: 1, esp: 2 } }); }
  const ctx = { T, R, regiments, champDe: () => null, rng: createRng(1), dt: 1 / 30, gel: false, frapper: () => {} };
  for (let k = 0; k < 30 * 25; k++) { construireGrille(A); pasArmee(A, ctx); }
  assert.ok(A.fatJ[0] > 0 && A.fatJ[0] < A.fatJ[1] * 0.75, `endurant ${A.fatJ[0].toFixed(3)}, épuisable ${A.fatJ[1].toFixed(3)}`);
});

group('corps à corps');
test('deux ennemis à portée de baïonnette se font face ; deux hommes du même camp, ou deux ennemis trop loin, non', () => {
  const { A, pas } = duels([[[50, 20], [51, 20]], [[80, 20], [84, 20]]]);
  A.camp[3] = 0;                                          // (la deuxième paire : deux amis, et à quatre mètres l'un de l'autre)
  pas(1);
  assert.deepEqual([A.duel[0], A.duel[1]], [1, 1]);
  assert.ok(Math.abs(A.duelAng[0] - Math.PI / 2) < 1e-6 && Math.abs(A.duelAng[1] + Math.PI / 2) < 1e-6, 'chacun face à l\'autre : l\'angle est celui du cap (atan2(x, y))');
  assert.deepEqual([A.duel[2], A.duel[3]], [0, 0]);
  const loin = duels([[[50, 20], [52.5, 20]]]); loin.pas(1);
  assert.deepEqual([loin.A.duel[0], loin.A.duel[1]], [0, 0], 'au-delà de la portée');
  const ami = duels([[[50, 20], [51, 20]]]); ami.A.camp[1] = 0; ami.pas(1);
  assert.deepEqual([ami.A.duel[0], ami.A.duel[1]], [0, 0], 'les amis ne se battent pas');
});
test('au corps à corps, on ne marche plus : le duel retient les deux hommes, et le fusil ne tire plus', () => {
  const { A, pas, ctx } = duels([[[50, 20], [51, 20]]]);
  ctx.regiments[0].ordre.x = 150; ctx.frapper = () => {};      // il voudrait aller loin ; personne ne tombe : on ne mesure que la marche
  pas(300);
  assert.ok(A.x[0] < 58, `retenu : ${A.x[0].toFixed(1)}`);
  const libre = duels([[[50, 20], [51, 20]]]); libre.A.camp[1] = 0; libre.ctx.regiments[0].ordre.x = 150; libre.ctx.frapper = () => {}; libre.pas(300);
  assert.ok(libre.A.x[0] > 60, `libre : ${libre.A.x[0].toFixed(1)}`);
});
test('la force et l\'endurance décident : le fort et l\'endurant l\'emportent sur le faible, d\'un camp comme de l\'autre', () => {
  const run = (fortCamp) => {
    const paires = Array.from({ length: 120 }, (_, k) => [[10 + (k % 20) * 18, 10 + Math.floor(k / 20) * 8], [11 + (k % 20) * 18, 10 + Math.floor(k / 20) * 8]]);
    const { A, pas } = duels(paires, (A, a, b) => {
      for (const [i, fort] of [[a, fortCamp === 0], [b, fortCamp === 1]]) { A.force[i] = fort ? 100 : 0; A.endurance[i] = fort ? 100 : 0; }
    });
    pas(30 * 12);
    const morts = [0, 0]; for (let i = 0; i < A.n; i++) if (A.mort[i]) morts[A.camp[i]]++;
    return morts;
  };
  const a = run(0), b = run(1);
  assert.ok(a[1] > a[0] * 2 && a[1] > 30, `nous forts : nos morts ${a[0]}, les leurs ${a[1]}`);
  assert.ok(b[0] > b[1] * 2 && b[0] > 30, `eux forts : nos morts ${b[0]}, les leurs ${b[1]}`);
});
test('deux hommes moyens : le corps à corps est mortel pour les deux camps, à peu près également', () => {
  const paires = Array.from({ length: 200 }, (_, k) => [[10 + (k % 20) * 18, 10 + Math.floor(k / 20) * 5], [11 + (k % 20) * 18, 10 + Math.floor(k / 20) * 5]]);
  const { A, pas } = duels(paires, (A, a, b) => { A.force[a] = A.force[b] = A.endurance[a] = A.endurance[b] = 50; });
  pas(30 * 10);
  const morts = [0, 0]; for (let i = 0; i < A.n; i++) if (A.mort[i]) morts[A.camp[i]]++;
  assert.ok(morts[0] > 20 && morts[1] > 20 && Math.abs(morts[0] - morts[1]) < 40, `${morts}`);
});
