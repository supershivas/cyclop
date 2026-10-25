// Les caractéristiques de chaque homme (adresse, force, endurance, calme) et le corps à corps (v0.69.0).
import { creerTerrain } from '../js/terrain.js';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, photoArmee, restaurerArmee, chanceTir, facteur, effrayer, gagner, perdre, abimerCaracs, poserCaracs, lireCaracs } from '../js/army.js';
import { caracteristiques, caracEnMots, CARACTERISTIQUES, departCaracs } from '../js/identite.js';
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

group('progression des caractéristiques');
const PG = R.progression;
const seul = () => { const T = creerTerrain(1, { largeur: 60, hauteur: 20, arbres: 0 }, R), A = creerArmee({ capacite: 4, W: T.W, H: T.H }); ajouterSoldat(A, 10, 10, 0, 0, 0, 0.5, 7); poserCaracs(A, 0, [50, 50, 50, 50]); return A; };
test('le départ tient compte du grade, de l\'âge et de l\'esprit du régiment, entre 15 et 85, et se refait à l\'identique', () => {
  const moy = (k, q) => { let s = 0; for (let id = 0; id < 600; id++) s += departCaracs(3, 0, id, id, k, 125, 2)[q]; return s / 600; };
  assert.ok(moy(0, 3) > moy(100, 3) + 8, 'un capitaine est plus calme');
  assert.ok(moy(30, 2) > moy(100, 2) + 4 && moy(30, 1) > moy(100, 1) + 2, 'un sergent est plus endurant et plus fort');
  for (let id = 0; id < 400; id++) for (const v of departCaracs(3, id % 2, id, id, id % 130, 125, id % 8)) assert.ok(v >= 15 && v <= 85 && Number.isInteger(v));
  assert.deepEqual(departCaracs(3, 0, 12, 12, 4, 125, 1), departCaracs(3, 0, 12, 12, 4, 125, 1));
  const a = departCaracs(3, 0, 12, 12, 100, 125, 1), b = departCaracs(3, 0, 12, 12, 100, 125, 5);
  assert.notDeepEqual(a, b, 'l\'esprit du régiment décale tout son monde');
});
test('on progresse en pratiquant, de moins en moins vite, jamais au-delà du plafond de la bataille ; un mot franchi se note', () => {
  const A = seul();
  gagner(A, 0, 'adresse', 10, PG);
  assert.ok(Math.abs(A.adresse[0] - 55) < 1e-4, `${A.adresse[0]}`);
  const bas = A.adresse[0] - 50; A.adresse[0] = 80; gagner(A, 0, 'adresse', 10, PG); const haut = A.adresse[0] - 80;
  assert.ok(haut < bas * 0.6, 'près de 100, moins de gain');
  A.adresse[0] = 50;
  for (let k = 0; k < 500; k++) gagner(A, 0, 'adresse', 5, PG);
  assert.ok(Math.abs(A.adresse[0] - (50 + PG.plafond)) < 1e-3, `plafond : ${A.adresse[0]}`);
  A.adresse[0] = 59.9; A.palier[0] = 0; gagner(A, 0, 'adresse', 1, PG);
  assert.equal(A.palier[0] & 1, 1, 'passé de « moyen » à « bon »');
});
test('une blessure et la terreur font perdre pour de bon, jamais sous le plancher', () => {
  const A = seul();
  abimerCaracs(A, 0, 1, PG); assert.deepEqual([A.adresse[0], A.force[0], A.endurance[0], A.calme[0]], [50 - PG.blessure.bras, 50 - PG.blessure.bras, 50, 50]);
  abimerCaracs(A, 0, 2, PG); assert.equal(A.endurance[0], 50 - PG.blessure.jambe);
  abimerCaracs(A, 0, 3, PG); assert.equal(A.calme[0], 50 - PG.blessure.tete);
  for (let k = 0; k < 20; k++) perdre(A, 0, 'calme', 20, PG);
  assert.equal(A.calme[0], PG.plancher);
});
test('sous le feu on se forge le calme, dans la terreur on le perd ; en déroute aussi', () => {
  const marche = (peur, deroute = false) => {
    const A = seul(), T = creerTerrain(1, { largeur: 60, hauteur: 20, arbres: 0 }, R); T.base.fill(20); T.nappe.fill(-20);
    const regiments = [{ id: 0, camp: 0, effectif: 1, deroute, ordre: { x: 10, y: 10, fx: 0, fy: -1, cols: 1, esp: 2 } }];
    A.tirT[0] = 1e9;
    const ctx = { T, R, regiments, champDe: () => null, rng: createRng(1), dt: 1 / 30, gel: false, frapper: () => {} };
    for (let k = 0; k < 30 * 20; k++) { A.peur[0] = peur; construireGrille(A); pasArmee(A, ctx); }
    return A.calme[0];
  };
  assert.ok(marche(0.5) > 50.1, 'inquiet : il gagne');
  assert.ok(marche(0) === 50, 'au calme : rien');
  assert.ok(marche(1) < 47, 'terrifié : il perd');
  assert.ok(marche(0, true) < 49.5, 'en déroute : il perd');
});
test('le corps à corps endurcit : après un duel, le survivant a de la force en plus ; l\'adresse monte en tirant', () => {
  const { A, pas } = duels(Array.from({ length: 30 }, (_, k) => [[10 + k * 12, 20], [11 + k * 12, 20]]), (A, a, b) => { for (const i of [a, b]) poserCaracs(A, i, [50, 50, 50, 50]); });
  pas(30 * 20);
  let gain = 0, n = 0; for (let i = 0; i < A.n; i++) if (!A.mort[i]) { gain += A.force[i] - 50; n++; }
  assert.ok(n > 0 && gain / n > 1.5, `gain moyen ${(gain / Math.max(1, n)).toFixed(2)}`);
});
test('la sauvegarde garde les valeurs et leur point de départ ; un évacué revenu les retrouve', () => {
  const A = seul(); A.adresse[0] = 63.4; A.endurance[0] = 37.2; A.force0[0] = 44;
  const B = creerArmee({ capacite: 4, W: A.W, H: A.H }); restaurerArmee(B, photoArmee(A));
  assert.deepEqual(lireCaracs(B, 0), lireCaracs(A, 0));
  const pack = lireCaracs(A, 0), C = creerArmee({ capacite: 4, W: A.W, H: A.H }); ajouterSoldat(C, 5, 5, 0, 0, 0, 0.5, 9); poserCaracs(C, 0, pack);
  assert.deepEqual(lireCaracs(C, 0), pack);
  assert.equal(pack.length, 8);
});
