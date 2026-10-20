// La bataille : déterminisme, ordres refusés à voix haute, sauvegarde qui rejoue la même partie.
import { readFileSync } from 'node:fs';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, aube, photo, restaurer, effectifs, horloge, zone, tronconsTenus, rangDe, moralEnMots, abriDe, terrainSous, terrainResume, peutOrdonner } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { calculerCouts, dimensionsCouts, BLOC } from '../js/champs.js';
import { tronconsDe, refusCorvee, chezLEnnemi, choixEnFace } from '../js/nuit.js';
import { CORVEES } from '../js/data/corvees.js';
import { SECTEURS as SECT } from '../js/data/secteur.js';
import { identite, etatEnMots, chevrons, prochainGrade } from '../js/identite.js';
import { legere } from '../js/army.js';
import { arriereDe } from '../js/bataille.js';
import { SECTEURS } from '../js/data/secteur.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 3) => nouvelleBataille(graine, R, { soldats: 200, jours: 3 });
// (x, y) dans le secteur → dans le terrain (les marges autour)
const M = SECTEURS.essai.marges, P = (x, y) => [x + M.x, y + M.y];
const empreinte = B => JSON.stringify(photo(B));

group('bataille');
test('même graine, mêmes ordres : même bataille', () => {
  const a = petite(), b = petite();
  for (const B of [a, b]) { ordonnerMarche(B, [0, 1], ...P(150, 150)); ordonnerBarrage(B, '155', ...P(200, 90)); }
  for (let k = 0; k < 600; k++) { avancer(a); avancer(b); }
  assert.equal(empreinte(a), empreinte(b));
});
test('le compteur de pertes est juste : morts + vivants = l\'effectif de départ', () => {
  const B = petite();
  ordonnerBarrage(B, '220', ...P(100, 216)); ordonnerBarrage(B, '155', ...P(300, 84), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  const [nous, eux] = effectifs(B);
  assert.equal(nous + B.etat.pertes[0], 200);
  assert.equal(eux + B.etat.pertes[1], 200);
  assert.equal(B.armee.n, nous + eux);
  assert.ok(B.etat.pertes[0] + B.etat.pertes[1] > 0, 'des morts');
});
test('les morts restent où ils sont tombés : un corps par mort, gardé par la sauvegarde', () => {
  const B = petite();
  ordonnerBarrage(B, '220', ...P(100, 216)); ordonnerBarrage(B, '155', ...P(300, 84), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  const C = B.etat.corps;
  assert.equal(C.length, B.etat.pertes[0] + B.etat.pertes[1]);
  const vivants = new Set(Array.from(B.armee.id.subarray(0, B.armee.n)));
  for (const c of C) assert.ok(!vivants.has(c[4]), 'un corps est un homme qui n\'est plus dans la foule');
  assert.deepEqual(restaurer(photo(B), R).etat.corps, C);
});
test('le terrain sous la souris : un résumé sans la vitesse, et la vitesse en nombre', () => {
  const B = petite(), [x, y] = P(150, 150), long = terrainSous(B, x, y), court = terrainResume(B, x, y);
  assert.ok(court.lignes.length >= 1 && !court.lignes.some(l => l.startsWith('On y marche')));
  assert.ok(long.some(l => l.startsWith('On y marche')) && court.vitesse > 0 && court.vitesse <= 1);
  assert.equal(terrainResume(B, -5, -5), null);
});
test('les chevrons suivent les mots de l\'expérience, sans compter ce qu\'on a tué', () => {
  assert.deepEqual([0, 0.07, 0.08, 0.3, 0.6, 5].map(chevrons), [0, 0, 1, 2, 3, 3]);
});
test('l\'ordre à sec ne change rien, et dit ce que l\'ordre fera', () => {
  const B = petite(), avant = empreinte(B), [x, y] = P(150, 150);
  const libre = peutOrdonner(B, [0, 1], x, y);
  assert.equal(empreinte(B), avant);
  assert.equal(libre.ok, true); assert.equal(libre.tranchee, false); assert.equal(libre.emprises.length, 2);
  assert.deepEqual(ordonnerMarche(B, [0, 1], x, y).regiments, libre.regiments);
  const L = B.lignes.find(l => l.camp === 0 && l.rang === 0), yl = ligneY(L, M.x + 150), C = petite();
  const tr = peutOrdonner(C, [0], M.x + 150, yl), vrai = ordonnerMarche(C, [0], M.x + 150, yl);
  assert.equal(tr.tranchee, true); assert.deepEqual(tr.troncons, vrai.troncons);
  assert.equal(peutOrdonner(C, [0], -5, -5).refus, 'Hors du secteur.');
});
test('à l\'abri : un carré où passe une tranchée coûte moins qu\'un carré à découvert, et rien d\'autre ne change', () => {
  const B = petite(), T = B.terrain, { bw, bh } = dimensionsCouts(T), avec = new Uint8Array(bw * bh), sans = new Uint8Array(bw * bh);
  const R2 = structuredClone(R); R2.foule.abri = 1; R2.foule.abriPart = 2;      // l'ancienne règle
  calculerCouts(T, R, avec); calculerCouts(T, R2, sans);
  let moins = 0, pareil = 0, plus = 0;
  for (let c = 0; c < avec.length; c++) { if (!sans[c]) { assert.equal(avec[c], 0); continue; } if (avec[c] < sans[c]) moins++; else if (avec[c] === sans[c]) pareil++; else plus++; }
  assert.ok(moins > 20, `des carrés de tranchée moins chers (${moins})`);
  assert.equal(plus, 0);
  assert.ok(pareil > moins, 'le reste du terrain ne change pas');
});
test('chez l\'ennemi, on n\'évacue ni ne ravitaille, sauf tranchée toute à nous et personne tout près', () => {
  const R2 = structuredClone(R); R2.nuit.calme = 0;                                  // (personne n'est « trop près »)
  const B = nouvelleBataille(3, R2, { soldats: 200, jours: 3 }), reg = B.etat.regiments.find(r => r.camp === 0);
  assert.equal(chezLEnnemi(B, reg), false);
  assert.equal(refusCorvee(B, reg, 'evacuer'), null);                                   // chez nous : possible
  const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), x = M.x + 150;
  assert.ok(ordonnerMarche(B, [reg.id], x, ligneY(L, x)).ok);
  assert.equal(chezLEnnemi(B, reg), true);
  assert.match(refusCorvee(B, reg, 'evacuer'), /ne passent pas.*pas toute à nous/);     // la tranchée est à eux
  assert.match(refusCorvee(B, reg, 'ravitailler'), /la soupe ne passe pas/);
  assert.equal(refusCorvee(B, reg, 'repos'), null); assert.equal(refusCorvee(B, reg, 'reparer'), null); assert.equal(refusCorvee(B, reg, 'inhumer'), null);
  for (const k of tronconsDe(B, reg)) B.etat.troncons[k] = 0;                           // la tranchée est toute à nous
  assert.equal(refusCorvee(B, reg, 'evacuer'), null); assert.equal(refusCorvee(B, reg, 'ravitailler'), null);
  B.R.nuit.calme = 1e6;                                                                  // … mais un régiment d'en face est tout près
  assert.match(refusCorvee(B, reg, 'evacuer'), /trop près/);
});
test('les formations : la ligne est large, la colonne étroite, la forme est dans l\'ordre', () => {
  const [x, y] = P(150, 150), cols = f => { const B = petite(); const r = peutOrdonner(B, [0], x, y, f); assert.equal(r.ok, true); ordonnerMarche(B, [0], x, y, f); return [B.etat.regiments[0].ordre.cols, B.etat.regiments[0].ordre.forme, r.emprises[0].l]; };
  const [bloc, ligne, deux, colonne] = ['bloc', 'ligne', 'deux', 'colonne'].map(cols);
  assert.equal(bloc[1], 'bloc'); assert.equal(deux[0], 2); assert.ok(colonne[0] > deux[0] && colonne[0] < bloc[0] && bloc[0] < ligne[0]);
  assert.ok(ligne[2] > bloc[2] && colonne[2] < bloc[2]); assert.equal(colonne[1], 'colonne');
  assert.deepEqual(cols(undefined), bloc);
});
test('un mort d\'obus est jeté à l\'opposé du point de chute, de 3 à 15 m, et son corps reste là où il tombe', () => {
  const B = petite(5), r = B.etat.regiments.find(g => g.camp === 0), o = r.ordre;
  const vus = [];
  for (let k = 0; k < 6; k++) ordonnerBarrage(B, '155', o.x, o.y), B.etat.batteries['155'] = 0;
  for (let t = 0; t < 600; t++) { avancer(B); for (const v of B.volants) if (!vus.some(w => w[0] === v[0])) vus.push([...v]); }
  assert.ok(vus.length > 0, 'des morts d\'obus');
  for (const [ic, x0, y0] of vus) {
    const c = B.etat.corps[ic], d = Math.hypot(c[0] / 10 - x0, c[1] / 10 - y0);
    assert.ok(d >= 3 && d <= 15.5, `projeté de ${d.toFixed(1)} m`);
  }
  assert.equal(B.volants.length, 0, 'plus rien ne vole après la durée du vol');
});
test('trois secteurs : la crête est haute devant leurs lignes, le marais est plat et mouillé, et leurs tranchées serpentent sans se couper', () => {
  const faire = id => nouvelleBataille(3, R, { secteur: id, soldats: 200, jours: 3 });
  const [lab, cre, mar] = ['essai', 'crete', 'marais'].map(faire);
  const moy = (B, j0, j1) => { const T = B.terrain; let s = 0, n = 0; for (let j = j0; j < j1; j++) for (let i = 100; i < 700; i++) { s += T.base[j * T.W + i]; n++; } return s / n / 4; };
  const m = SECTEURS.essai.marges;
  assert.ok(moy(cre, m.y + 45, m.y + 80) > moy(cre, m.y + 220, m.y + 260) + 3, 'une crête devant leurs lignes');
  assert.ok(moy(cre, m.y + 45, m.y + 80) > moy(lab, m.y + 45, m.y + 80) + 2);
  const relief = B => { const T = B.terrain; let mn = 1e9, mx = -1e9; for (let c = 0; c < T.base.length; c += 7) { mn = Math.min(mn, T.base[c]); mx = Math.max(mx, T.base[c]); } return (mx - mn) / 4; };
  assert.ok(relief(mar) < relief(lab) && relief(lab) < relief(cre), `relief : marais ${relief(mar)}, labours ${relief(lab)}, crête ${relief(cre)}`);
  for (const B of [lab, cre, mar]) {
    assert.equal(B.lignes.length, 8);
    // chaque colonne d'une ligne a ses cases creusées, et d'une colonne à la suivante le tracé ne saute pas de plus d'une case : la tranchée se suit
    for (const L of B.lignes) for (let x = M.x; x < M.x + 399; x += 3) assert.ok(Math.abs(ligneY(L, x + 0.5) - ligneY(L, x + 1.5)) < 1, 'la ligne ne saute pas');
    const L = B.lignes[0], T = B.terrain; let creuses = 0;
    for (let x = M.x; x < M.x + 400; x++) for (let j = Math.round(ligneY(L, x + 0.5)) - 2; j <= Math.round(ligneY(L, x + 0.5)) + 1; j++) if (T.diff[j * T.W + x] <= -2) creuses++;
    assert.ok(creuses >= 800, `tranchée creusée : ${creuses}`);
  }
});
test('à deux : l\'IA d\'en face se tait, le second joueur marche et tire avec ses batteries', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3, deux: true });
  const eux = B.etat.regiments.filter(r => r.camp === 1), nos = B.etat.regiments.filter(r => r.camp === 0);
  assert.ok(eux.every(r => r.nom), 'des noms en face');
  const avant = eux.map(r => JSON.stringify(r.ordre));
  for (let t = 0; t < 30 * 200; t++) avancer(B);       // 200 s sans un ordre : rien ne part d'en face
  assert.equal(B.etat.barrages.length, 0); assert.deepEqual(eux.map(r => JSON.stringify(r.ordre)), avant);
  assert.match(ordonnerMarche(B, [nos[0].id], ...P(100, 100), 'bloc', 1).refus, /Aucun régiment/, 'un joueur ne commande que son camp');
  const [x, y] = P(200, 110), r = ordonnerMarche(B, [eux[0].id], x, y, 'ligne', 1);
  assert.equal(r.ok, true); assert.equal(eux[0].ordre.forme, 'ligne'); assert.equal(eux[0].ordre.fy, 1);
  assert.equal(ordonnerBarrage(B, '155', x, y, 1).ok, true);
  assert.match(ordonnerBarrage(B, '155', x, y, 1).refus, /recharge/);       // sa batterie à lui
  assert.equal(ordonnerBarrage(B, '155', x, y, 0).ok, true);                // la nôtre est prête
  // la partie à deux se sauve et se relit
  const C = restaurer(photo(B), R); assert.equal(C.etat.deux, true); assert.equal(empreinte(C), empreinte(B));
});
test('un ordre impossible se refuse, avec sa raison', () => {
  const B = petite();
  assert.match(ordonnerMarche(B, [], ...P(10, 10)).refus, /Aucun régiment/);
  assert.match(ordonnerMarche(B, [0], -5, 10).refus, /Hors du secteur/);
  assert.match(ordonnerMarche(B, [0], ...P(-20, 10)).refus, /Hors du secteur/, 'les marges ne prennent pas d\'ordres');
  assert.match(ordonnerMarche(B, [9], ...P(10, 10)).refus, /Aucun régiment/, 'un régiment d\'en face ne nous obéit pas');
  assert.ok(ordonnerBarrage(B, '75', ...P(200, 100)).ok);
  assert.match(ordonnerBarrage(B, '75', ...P(200, 100)).refus, /recharge/);
  assert.match(ordonnerBarrage(B, '420', 200, 100).refus, /Pas de batterie/);
});
test('la journée finit à 18 h, la nuit attend l\'aube, puis le dernier jour finit la bataille', () => {
  const B = petite();
  let n = 0;
  while (B.etat.phase === 'jour') { avancer(B); n++; }
  assert.equal(B.etat.phase, 'nuit');
  assert.equal(horloge(B).heure, 18);
  assert.equal(avancer(B).length, 0, 'rien ne bouge la nuit');
  assert.match(ordonnerMarche(B, [0], ...P(100, 100)).refus, /aube/);
  assert.ok(aube(B).ok);
  assert.equal(B.etat.jour, 2);
  while (B.etat.phase !== 'fin') { if (B.etat.phase === 'nuit') aube(B); avancer(B); }
  assert.equal(B.etat.jour, B.etat.meteo.length);
  assert.ok(n > 1000);
});
test('il pleut au moins un jour (le lot minimal doit voir venir la boue), jamais le premier', () => {
  for (let g = 1; g < 30; g++) {
    const m = nouvelleBataille(g, R, { soldats: 20 }).etat.meteo;
    assert.ok(m.includes('pluie'), `graine ${g} : ${m}`);
    assert.equal(m[0], 'sec');
  }
});

test('le secteur est entouré de marges, et les régiments sont dedans', () => {
  const B = petite();
  const Z = zone(B);
  assert.equal(B.terrain.W, Z.x1 + M.x); assert.equal(B.terrain.H, Z.y1 + M.y);
  for (let i = 0; i < B.armee.n; i++) assert.ok(B.armee.x[i] > Z.x0 && B.armee.x[i] < Z.x1 && B.armee.y[i] > Z.y0 && B.armee.y[i] < Z.y1);
});
test('touchés, certains meurent et d\'autres sont blessés ; blessé deux fois, on meurt', () => {
  const B = petite(8);
  for (let k = 0; k < 8; k++) ordonnerBarrage(B, '155', ...P(25 + k * 50, 233), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  assert.ok(B.etat.blesses[0] > 0 && B.etat.pertes[0] > 0, `${B.etat.blesses[0]} blessés, ${B.etat.pertes[0]} morts`);
  let blesses = 0;
  for (let i = 0; i < B.armee.n; i++) if (B.armee.blessure[i]) blesses++;
  assert.ok(blesses > 0 && blesses <= B.etat.blesses[0]);
});
test('chaque soldat a un nom, un âge, un grade : toujours les mêmes pour la même graine', () => {
  const a = identite(5, 0, 17), b = identite(5, 0, 17), c = identite(5, 1, 17);
  assert.deepEqual(a, b);
  assert.ok(a.prenom && a.nom && a.age >= 19 && a.age <= 45 && a.grade);
  // la hiérarchie d'un régiment de 125 : un capitaine, deux lieutenants, un adjudant, des sergents, des caporaux, des soldats
  const grades = Array.from({ length: 125 }, (_, k) => identite(5, 0, k, k, 125).grade);
  const n = g => grades.filter(x => x === g).length;
  assert.equal(grades[0], 'capitaine'); assert.equal(n('capitaine'), 1);
  assert.equal(n('lieutenant') + n('sous-lieutenant'), 2); assert.equal(n('adjudant'), 1);
  assert.equal(n('sergent'), 10); assert.equal(n('caporal'), 21);
  assert.ok(n('soldat de 1re classe') > 10 && n('soldat de 2e classe') > 50);
  assert.equal(identite(5, 1, 0, 0, 125).grade, 'Hauptmann');
  assert.notDeepEqual(a, c);
  const noms = new Set(Array.from({ length: 200 }, (_, i) => { const x = identite(5, 0, i); return x.prenom + x.nom; }));
  assert.ok(noms.size > 150, 'peu de doublons');
  assert.deepEqual(etatEnMots(0, 0, 0, 0), ['reposé, calme']);
  assert.deepEqual(etatEnMots(0.8, 0.5, 0.9, 2), ['blessé à la jambe', 'jambes épuisées', 'bras las', 'terrifié']);
});
test('les numéros des soldats restent les leurs après les morts', () => {
  const B = petite(8);
  const avant = new Map();
  for (let i = 0; i < B.armee.n; i++) avant.set(B.armee.id[i], B.armee.camp[i]);
  ordonnerBarrage(B, '220', ...P(150, 216));
  for (let k = 0; k < 600; k++) avancer(B);
  const vus = new Set();
  for (let i = 0; i < B.armee.n; i++) { const id = B.armee.id[i]; assert.ok(!vus.has(id)); vus.add(id); assert.equal(avant.get(id), B.armee.camp[i]); }
});

group('sauvegarde');
test('une bataille relue est la même, et se comporte pareil', () => {
  const A = petite(11);
  ordonnerMarche(A, [0, 1, 2], ...P(200, 160)); ordonnerBarrage(A, '155', ...P(180, 120));
  for (let k = 0; k < 450; k++) avancer(A);
  const p = JSON.parse(JSON.stringify(photo(A)));
  const B = restaurer(p, R);
  assert.equal(empreinte(B), empreinte(A));
  assert.deepEqual(B.terrain.diff, A.terrain.diff);
  assert.deepEqual(B.terrain.eau, A.terrain.eau);
  for (let k = 0; k < 600; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('relue au milieu de l\'étalement des champs (v0.34.4), la bataille suit les mêmes champs', () => {
  const A = petite(12);
  ordonnerMarche(A, [0, 1, 2, 3], ...P(150, 150)); ordonnerMarche(A, [4, 5, 6, 7], ...P(260, 120));
  for (let k = 0; k < 90; k++) { if (k % 15 === 0) ordonnerBarrage(A, '155', ...P(120 + k, 140)); avancer(A); }
  // on avance jusqu'à 1 s après un changement de version : les régiments n'ont pas tous passé à la nouvelle
  const v = A.etat.couts.version;
  while (A.etat.couts.version === v) avancer(A);
  for (let k = 0; k < 30; k++) avancer(A);
  assert.ok(A.etat.temps - A.etat.couts.depuis < R.foule.champGroupes * R.foule.champRetard, 'au milieu de l\'étalement');
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.equal(empreinte(B), empreinte(A));
  for (let k = 0; k < 400; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('relue après une nuit, la bataille rejoue aussi l\'eau de la nuit', () => {
  const A = petite(4);
  ordonnerBarrage(A, '220', ...P(200, 150));
  while (A.etat.phase === 'jour') avancer(A);
  aube(A);
  for (let k = 0; k < 300; k++) avancer(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.terrain.humid, A.terrain.humid);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('la sauvegarde ne contient pas le relief (graine et impacts seulement)', () => {
  const B = petite();
  const p = photo(B);
  assert.ok(!('terrain' in p) && !('base' in p) && Array.isArray(p.impacts));
});

test('une sauvegarde d\'avant les marges (v0.2) se relit : tout glisse dans le secteur', () => {
  const A = petite(4);
  ordonnerBarrage(A, '155', ...P(200, 150));
  for (let k = 0; k < 300; k++) avancer(A);
  // la même partie, écrite comme en v0.2 : sans marges, sans numéros ni fatigue
  const p = JSON.parse(JSON.stringify(photo(A)));
  delete p.marges; delete p.blesses;
  for (const imp of p.impacts) { imp[2] -= M.x * 10; imp[3] -= M.y * 10; }
  for (const r of p.regiments) for (const o of [r.ordre, r.depart]) { o.x -= M.x; o.y -= M.y; }
  for (const b of p.barrages) { b.x -= M.x; b.y -= M.y; }
  const xs = Float32Array.from({ length: p.armee.n }, (_, i) => A.armee.x[i] - M.x);
  p.armee.x = Buffer.from(xs.buffer).toString('base64');
  for (const k of ['id', 'fatJ', 'fatB', 'peur', 'blessure']) delete p.armee[k];
  const B = restaurer(p, R);
  assert.deepEqual(B.terrain.diff, A.terrain.diff);
  for (let i = 0; i < A.armee.n; i++) assert.ok(Math.abs(B.armee.x[i] - A.armee.x[i]) < 1e-3);
  assert.equal(B.armee.id[5], 5);
  for (let k = 0; k < 60; k++) avancer(B);
});

group('pureté');
group('tranchées');
test('quatre lignes par camp, creusées d\'un mètre et demi, en tronçons de 25 m ; les régiments sont dedans', () => {
  const B = petite(), T = B.terrain, S = SECTEURS.essai;
  assert.equal(B.lignes.length, 8);
  assert.equal(B.troncons.length, 8 * S.largeur / S.tranchees.troncon);
  for (const L of B.lignes) for (const x of [M.x + 13, M.x + 200, M.x + 377]) {
    const c = Math.round(ligneY(L, x + 0.5) - 0.5) * T.W + x;
    assert.ok(T.diff[c] <= -S.tranchees.profondeur, 'la ligne est creusée');
  }
  assert.deepEqual(tronconsTenus(B), [64, 64]);
  const A = B.armee;
  let dedans = 0;
  for (let i = 0; i < A.n; i++) if (T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] >= 0) dedans++;
  assert.ok(dedans > A.n * 0.8, `les hommes partent de leurs tranchées (${dedans} sur ${A.n})`);
});
test('un ordre sur une tranchée l\'occupe : les hommes se rangent le long du tracé', () => {
  // (sans déroute : un petit régiment pris sous un barrage en chemin refluerait)
  const B = nouvelleBataille(3, { ...R, moral: { ...R.moral, deroute: -1 } }, { soldats: 200 });
  const L = B.lignes.find(l => l.camp === 0 && l.rang === 2);
  const x = M.x + 30, r = ordonnerMarche(B, [0], x, ligneY(L, x));
  assert.ok(r.ok && r.tranchee);
  for (let k = 0; k < 30 * 120; k++) avancer(B);
  const A = B.armee, T = B.terrain;
  let n = 0, dedans = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === 0) { n++; if (T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] >= 0 && Math.abs(A.y[i] - L.y0) < 6) dedans++; }
  assert.ok(dedans > n * 0.8, `dans la troisième ligne (${dedans} sur ${n})`);
});
test('un tronçon vide de ses défenseurs, occupé par l\'autre camp, change de main ; la sauvegarde le garde', () => {
  const B = petite(), A = B.armee, T = B.terrain;
  // trois hommes d'en face dans un tronçon de notre quatrième ligne (vide)
  const L = B.lignes.find(l => l.camp === 0 && l.rang === 3), k = B.lignes.indexOf(L);
  const t = B.troncons.findIndex(tr => tr.ligne === k && tr.x0 === M.x + 200);
  let mis = 0;
  for (let i = 0; i < A.n && mis < 3; i++) if (A.camp[i] === 1) {
    const x = M.x + 210 + mis * 2; A.x[i] = x + 0.5; A.y[i] = ligneY(L, x + 0.5); mis++;
    assert.equal(T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)], t);
  }
  avancer(B);
  for (let p = 1; p < 15; p++) avancer(B);
  assert.equal(B.etat.troncons[t], 1, 'pris');
  assert.deepEqual(tronconsTenus(B), [63, 65]);
  assert.equal(B.etat.prises[0][1], 1);
  assert.deepEqual(restaurer(photo(B), R).etat.troncons, B.etat.troncons);
});
test('en face prépare au 220 là où nous tenons ; il monte à l\'assaut là où nos lignes se sont vidées', () => {
  // nos lignes tenues : pas d'assaut au premier coup, mais un barrage de préparation
  const B = petite();
  for (let k = 0; k < 30 * 175; k++) avancer(B);
  const sortis = B => B.etat.regiments.filter(r => r.camp === 1 && r.ordre.trace && r.ordre.trace.ligne < 10);
  assert.equal(sortis(B).length, 0, 'il ne sort pas contre une ligne tenue');
  assert.ok(B.etat.impacts.some(i => i[4] === 2), 'il prépare au 220');
  // notre première ligne vidée : il sort
  const C = petite(), A = C.armee;
  // (la moitié de notre première ligne : si tous tombaient, la bataille finirait)
  const premiers = new Set(C.etat.regiments.filter(r => r.camp === 0 && r.ordre.trace?.ligne === 0).map(r => r.id).slice(0, 4));
  for (let i = 0; i < A.n; i++) if (premiers.has(A.reg[i])) A.mort[i] = 1;
  for (const r of C.etat.regiments) if (premiers.has(r.id)) r.effectif = 0;
  for (let k = 0; k < 30 * 175; k++) avancer(C);
  assert.ok(sortis(C).length > 0, 'un assaut');
});

group('moral et expérience');
test('les morts font tomber le moral ; en déroute, un régiment refuse les ordres et reflue ; ébranlé, il ne sort pas', () => {
  const B = petite(), reg = B.etat.regiments[0];
  reg.moral = 0.45;                                   // (un régiment déjà ébranlé : de 34 hommes, étalés dans leur tranchée, il tiendrait longtemps)
  const avant = reg.moral;
  let deroute = false;
  for (let k = 0; k < 30 * 300 && !deroute; k++) {
    if (k % 240 === 0) ordonnerBarrage(B, '220', reg.ordre.x, reg.ordre.y, 1);
    for (const e of avancer(B)) if (e.type === 'deroute' && e.reg === 0) deroute = true;
  }
  assert.ok(reg.moral < avant, 'le moral a baissé');
  assert.ok(deroute && reg.deroute, 'la déroute');
  assert.equal(moralEnMots(reg, R), 'en déroute');
  assert.deepEqual(reg.ordre, reg.depart, 'il reflue vers sa tranchée de départ');
  const r = ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y + 30);
  assert.ok(r.refus && /déroute/.test(r.refus), r.refus);
  // ébranlé (mais pas en déroute) : reculer, oui ; sortir vers l'ennemi, non
  reg.deroute = false; reg.moral = 0.4;
  assert.ok(ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y + 20).ok);
  assert.match(ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y - 60).refus, /ne sortira pas/);
});
test('une déroute gagne les voisins (moins les plus loin) ; un régiment brisé refuse de monter de toute la journée', () => {
  const B = petite(), regs = B.etat.regiments.filter(r => r.camp === 0);
  const a = regs[0], d = r => Math.hypot(r.ordre.x - a.ordre.x, r.ordre.y - a.ordre.y);
  const b = regs.slice(1).sort((u, v) => d(u) - d(v))[0];
  for (const r of regs) r.moral = 0.5;
  a.moral = 0.19;
  for (let k = 0; k < 30; k++) avancer(B);
  assert.ok(a.deroute, 'la déroute');
  assert.ok(b.moral < 0.5 - 0.02, `le voisin s'en ressent (${b.moral.toFixed(3)})`);
  // brisé : à l'aube, il refuse (refusChance : 1), tout le jour ; il tient sa tranchée
  const C = nouvelleBataille(3, { ...R, moral: { ...R.moral, refusChance: 1 } }, { soldats: 200, jours: 3 });
  const reg = C.etat.regiments[0];
  reg.moral = 0.05; reg.pertes = Math.ceil(reg.initial * 0.5);
  C.etat.phase = 'nuit';
  const r = aube(C);
  assert.deepEqual(r.bilan[0].refus, [0]);
  assert.equal(reg.refus, C.etat.jour);
  assert.match(ordonnerMarche(C, [0], reg.ordre.x, reg.ordre.y + 20).refus, /refuse de monter/);
  assert.ok(ordonnerMarche(C, [1], C.etat.regiments[1].ordre.x, C.etat.regiments[1].ordre.y + 20).ok, 'les autres obéissent');
});
test('la nuit rend une part du moral, jamais au-dessus de ce que les pertes laissent', () => {
  const B = petite(), reg = B.etat.regiments[0];
  reg.moral = 0.1; reg.pertes = 10;
  B.etat.phase = 'nuit'; aube(B);
  const plafond = 1 - R.moral.cicatrice * 10 / reg.initial;
  assert.ok(reg.moral > 0.1 && reg.moral < plafond);
});
test('un capitaine tombé est remplacé par un lieutenant ; ce dernier par un sous-lieutenant…', () => {
  const B = petite(), A = B.armee;
  const cap = [...A.id.subarray(0, A.n)].findIndex((id, i) => A.reg[i] === 0 && rangDe(B, id, 0) === 0);
  assert.ok(cap >= 0);
  // un barrage exactement sur lui jusqu'à ce qu'il tombe
  for (let k = 0; k < 30 * 200 && !A.mort[cap] && A.id[cap] === 0; k++) {
    if (k % 300 === 0) ordonnerBarrage(B, '220', A.x[cap], A.y[cap], 1);
    avancer(B);
  }
  const vivants = [...A.id.subarray(0, A.n)];
  assert.ok(!vivants.includes(0), 'le capitaine est mort');
  const capitaines = vivants.filter((id, i) => A.reg[i] === 0 && rangDe(B, id, 0) === 0);
  assert.equal(capitaines.length, 1, 'un nouveau capitaine');
  assert.ok(B.etat.grades[capitaines[0]], 'promu');
});
test('ceux qui survivent au feu prennent de l\'expérience ; elle se sauvegarde', () => {
  const B = petite(), A = B.armee;
  ordonnerBarrage(B, '155', ...P(100, 216));
  for (let k = 0; k < 30 * 60; k++) avancer(B);
  let max = 0; for (let i = 0; i < A.n; i++) max = Math.max(max, A.exp[i]);
  assert.ok(max > 0.1, `aguerris (${max.toFixed(2)})`);
  const C = restaurer(photo(B), R).armee;
  assert.deepEqual(Array.from(C.exp.subarray(0, C.n)), Array.from(A.exp.subarray(0, A.n)));
});

group('la nuit et ses corvées');
// une journée sous les obus, jusqu'à la nuit
function jusquALaNuit(B) {
  const reg = B.etat.regiments[0];
  for (let k = 0; B.etat.phase === 'jour'; k++) {
    if (k % 600 === 0) ordonnerBarrage(B, '220', reg.ordre.x, reg.ordre.y, 1);
    avancer(B);
  }
}
test('évacuer : les blessés du régiment quittent le front vivants ; ce ne sont pas des morts', () => {
  const B = petite(); jusquALaNuit(B);
  const A = B.armee, nb = new Map();
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.blessure[i]) nb.set(A.reg[i], (nb.get(A.reg[i]) || 0) + 1);
  const g = [...nb.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  assert.ok(g !== undefined, 'des blessés');
  const blesses = [...A.id.subarray(0, A.n)].filter((id, i) => A.reg[i] === g && A.blessure[i]);
  const pertes = B.etat.pertes[0], r = aube(B, { [g]: 'evacuer' });
  assert.ok(r.ok);
  const restants = [...A.id.subarray(0, A.n)];
  for (const id of blesses) assert.ok(!restants.includes(id), 'parti');
  assert.equal(r.bilan[0].evacues + r.bilan[0].mortsCorvee, blesses.length, 'chacun évacué, ou tombé en route');
  assert.equal(B.etat.pertes[0], pertes + r.bilan[0].mortsCorvee + r.bilan[0].mortsBlesses);
  assert.equal(B.etat.evacues.length, r.bilan[0].evacues + r.bilan[1].evacues, 'en face évacue aussi les siens');
});
test('réparer : les tronçons comblés sont recreusés ; la partie relue rejoue la réparation', () => {
  const B = petite(); jusquALaNuit(B);
  const T = B.terrain, reg = B.etat.regiments[0], ks = new Set(tronconsDe(B, reg));
  const combles = () => { let n = 0; for (let c = 0; c < T.W * T.H; c++) if (ks.has(T.troncon[c]) && T.diff[c] > -B.profondeur) n++; return n; };
  assert.ok(combles() > 0, 'les obus en ont comblé');
  const r = aube(B, { 0: 'reparer' });
  assert.equal(combles(), 0);
  assert.ok(r.bilan[0].repares > 0);
  for (let k = 0; k < 300; k++) avancer(B);
  const C = restaurer(photo(B), R);
  assert.deepEqual(Array.from(C.terrain.diff), Array.from(T.diff));
});
test('inhumer : les corps proches partent en terre ; une corvée de tranchée se refuse sans tranchée', () => {
  const B = petite(); jusquALaNuit(B);
  const corps = B.etat.corps.length;
  assert.ok(corps > 0);
  const r = aube(B, { 0: 'inhumer' });
  assert.ok(r.bilan[0].inhumes > 0);
  assert.equal(B.etat.tombes.length, r.bilan[0].inhumes);
  // (les morts de la nuit, des deux camps)
  assert.equal(B.etat.corps.length, corps - r.bilan[0].inhumes + r.bilan[0].mortsCorvee + r.bilan[0].mortsBlesses + r.bilan[1].mortsCorvee + r.bilan[1].mortsBlesses);
  const reg = B.etat.regiments[2]; reg.ordre = { ...reg.ordre, trace: undefined };
  assert.match(refusCorvee(B, reg, 'reparer'), /ne tient pas de tranchée/);
});
test('sept corvées (v0.38.3) : les caillebotis et le coup de main sont retirés, ni nous ni en face ne les choisissent, une ancienne s\'efface', () => {
  const ids = CORVEES.map(c => c.id);
  assert.deepEqual(ids, ['repos', 'reparer', 'inhumer', 'evacuer', 'abri', 'ravitailler', 'releve']);
  const B = petite(); jusquALaNuit(B);
  for (const id of ['caillebotis', 'coup']) assert.match(refusCorvee(B, B.etat.regiments[0], id), /Pas de telle corvée/);
  for (let n = 0; n < 5; n++) {
    for (const id of Object.values(choixEnFace(B))) assert.ok(ids.includes(id), id);
    B.etat.phase = 'nuit'; aube(B, { 0: 'coup', 1: 'caillebotis' });       // (un choix d'avant : le repos)
    assert.equal(B.etat.nuits.at(-1).choix[0], 'repos');
    assert.equal(B.etat.nuits.at(-1).choix[1], 'repos');
  }
  assert.ok(!('prisonniers' in B.etat) && !('caille' in B.terrain));
});
test('les abris : un niveau par nuit, trois au plus ; les obus y tuent moins ; un 220 en crève un ; relu', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 6 });
  const reg = B.etat.regiments[0], ks = tronconsDe(B, reg);
  for (let n = 0; n < 4; n++) { B.etat.phase = 'nuit'; aube(B, { 0: 'abri' }); }
  for (const k of ks) assert.equal(B.etat.abris[k], R.nuit.abriMax);
  assert.match(refusCorvee(B, reg, 'abri'), /aussi profonds/);
  // dans le tronçon, un obus ne fait plus que 40 % de ce qu'il faisait (le calcul est dans army.test : tuerDans)
  const T = B.terrain;
  const c = T.troncon.findIndex(k => k === ks[0]);
  assert.ok(c >= 0 && Math.abs(abriDe(B, c) - (1 - R.nuit.abriParNiveau * R.nuit.abriMax)) < 1e-9);
  assert.equal(abriDe(B, T.troncon.findIndex(k => k === -1)), 1);
  const C = restaurer(photo(B), R);
  for (let n = 0; n < 6; n++) ordonnerBarrage(C, '220', reg.ordre.x + (n - 3) * 6, reg.ordre.y, 1);   // (le secteur n'a que deux tronçons : plusieurs salves)
  for (let k = 0; k < 30 * 40; k++) avancer(C);
  assert.ok(ks.some(k => (C.etat.abris[k] || 0) < R.nuit.abriMax), 'crevé');
  assert.deepEqual(restaurer(photo(C), R).etat.abris, C.etat.abris);
});
test('les vivres : trois nuits ; sans eux, la nuit repose moins et le moral baisse ; ravitailler les rend', () => {
  const B = petite();
  const [a, b] = B.etat.regiments;
  let r;
  for (let n = 0; n < 3; n++) { B.etat.phase = 'nuit'; r = aube(B, { 1: 'ravitailler' }); }
  assert.equal(a.vivres, 0);
  assert.equal(b.vivres, R.nuit.vivres);
  assert.ok(r.bilan[0].affames >= 1);
  const m = a.moral, mb = b.moral;
  B.etat.phase = 'nuit'; aube(B, { 1: 'ravitailler' });
  assert.ok(a.moral < m || a.moral < b.moral, 'la faim pèse');
  B.etat.phase = 'nuit'; aube(B, { 0: 'ravitailler' });
  assert.equal(a.vivres, R.nuit.vivres);
});
test('un blessé laissé au front peut mourir dans la nuit', () => {
  const B = nouvelleBataille(3, { ...R, nuit: { ...R.nuit, mortBlesse: 1 } }, { soldats: 200 });
  jusquALaNuit(B);
  const A = B.armee;
  let blesses = 0; for (let i = 0; i < A.n; i++) if (A.blessure[i]) blesses++;
  assert.ok(blesses > 0);
  const r = aube(B, {});
  // (sauf ceux qu'en face évacue)
  assert.equal(r.bilan[0].mortsBlesses + r.bilan[1].mortsBlesses + r.bilan[1].evacues + r.bilan[1].mortsCorvee, blesses);
  for (let i = 0; i < A.n; i++) assert.equal(A.blessure[i], 0);
});

group('la bataille entière');
test('elle dure de 10 à 15 jours, et sa mission est tirée de la graine (toujours la même pour la même graine)', () => {
  const vus = new Set();
  for (let g = 1; g <= 12; g++) {
    const B = nouvelleBataille(g, R, { soldats: 60 });
    assert.ok(B.etat.meteo.length >= 10 && B.etat.meteo.length <= 15, `${B.etat.meteo.length} jours`);
    assert.ok(SECT.essai.missions.includes(B.etat.mission));
    vus.add(B.etat.meteo.length);
    assert.equal(nouvelleBataille(g, R, { soldats: 60 }).etat.meteo.length, B.etat.meteo.length);
  }
  assert.ok(vus.size > 1, 'des durées différentes');
});
test('à la fin, la mission est jugée ; le secteur qui tombe finit la bataille avant son terme', () => {
  const B = petite();
  while (B.etat.phase !== 'fin') { if (B.etat.phase === 'nuit') aube(B); avancer(B); }
  assert.ok(B.etat.issue && typeof B.etat.issue.texte === 'string');
  // plus un homme des nôtres dans le secteur
  const C = petite(), A = C.armee;
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0) A.mort[i] = 1;
  for (const r of C.etat.regiments) if (r.camp === 0) r.effectif = 0;
  for (let k = 0; k < 31 && C.etat.phase === 'jour'; k++) avancer(C);
  assert.equal(C.etat.phase, 'fin');
  assert.equal(C.etat.issue.reussie, false);
  assert.match(C.etat.issue.texte, /plus un homme/);
});
test('la relève : un régiment frais prend la place du régiment relevé ; la réserve s\'épuise ; la sauvegarde le garde', () => {
  const B = petite(); jusquALaNuit(B);
  const avant = B.etat.reserves[0], n = B.etat.regiments.length, vieux = B.etat.regiments[1];
  const r = aube(B, { 1: 'releve' });
  assert.ok(r.ok);
  assert.equal(vieux.effectif, 0); assert.equal(vieux.releve, 1);
  assert.equal(B.etat.reserves[0], avant - 1);
  const neuf = B.etat.regiments.find(g => g.id >= n && g.camp === 0);
  assert.ok(neuf && neuf.nom && neuf.effectif === B.etat.parRegiment, 'un régiment frais, nommé');
  assert.equal(neuf.stance, 'volonte');
  const A = B.armee, ids = new Set();
  for (let i = 0; i < A.n; i++) { assert.ok(!ids.has(A.id[i]), 'des numéros neufs'); ids.add(A.id[i]); }
  // ses hommes rejoignent la tranchée du régiment relevé
  for (let k = 0; k < 30 * 120; k++) avancer(B);
  let dedans = 0, tous = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === neuf.id) { tous++; if (B.terrain.troncon[(A.y[i] | 0) * B.terrain.W + (A.x[i] | 0)] >= 0) dedans++; }
  assert.ok(dedans > tous * 0.6, `dans la tranchée (${dedans} sur ${tous})`);
  const C = restaurer(photo(B), R);
  assert.equal(C.etat.regiments.length, B.etat.regiments.length);
  assert.equal(empreinte(C), empreinte(B));
  // plus de réserve : la relève se refuse
  B.etat.reserves[0] = 0;
  assert.match(refusCorvee(B, B.etat.regiments[0], 'releve'), /réserve/);
});

test('aucun hasard ni horloge dans les règles', () => {
  for (const f of ['bataille.js', 'terrain.js', 'army.js', 'champs.js', 'apparence.js', 'identite.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\./.test(src), `${f} doit rester pur (section 10)`);
  }
});

group('la mêlée');
test('trois défenseurs contre vingt attaquants ne tiennent que quelques secondes ; sans la mêlée (tenue infinie) ils tenaient indéfiniment', () => {
  const issue = tenue => {
    const B = nouvelleBataille(3, { ...R, tranchee: { ...R.tranchee, tenue } }, { soldats: 200, jours: 3 });
    const k = B.troncons.findIndex((t, i) => t.camp === 1 && B.lignes[t.ligne].rang === 0), A = B.armee, T = B.terrain;
    const cases = [];
    for (let c = 0; c < T.troncon.length && cases.length < 40; c++) if (T.troncon[c] === k) cases.push(c);
    const pos = c => [c % T.W + 0.5, Math.floor(c / T.W) + 0.5];
    // trois défenseurs (les autres d'en face, plus loin vers l'arrière), vingt attaquants des nôtres, tous épinglés dans le tronçon
    const dans = i => T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] === k;
    let def = 0; const defs = [], atts = [];
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 1 && dans(i)) { if (def++ < 3) defs.push(i); else A.y[i] -= 30; }
    for (let i = 0; i < A.n && atts.length < 20; i++) if (A.camp[i] === 0) atts.push(i);
    const epingler = () => {
      defs.forEach((i, n) => { const [x, y] = pos(cases[n * 3]); A.x[i] = x; A.y[i] = y; A.mort[i] = 0; });
      atts.forEach((i, n) => { const [x, y] = pos(cases[(n * 2) % cases.length]); A.x[i] = x; A.y[i] = y; A.mort[i] = 0; });
    };
    for (let s = 0; s < 30 * 12; s++) { epingler(); avancer(B); }
    return B.etat.troncons[k];
  };
  assert.equal(issue(R.tranchee.tenue), 0, 'pris par les nôtres');
  assert.equal(issue(1e9), 1, 'avant la mêlée, trois défenseurs gardaient le tronçon');
});

group('les blessés qui reviennent');
test('un blessé évacué revient une fois sur deux, après 1 nuit (bras), 2 (jambe) ou 3 (tête) ; même numéro ; la partie relue le garde', () => {
  const B = nouvelleBataille(3, R, { soldats: 400, jours: 8 });
  const A = B.armee, reg = B.etat.regiments[0];
  let n = 0;
  for (let i = 0; i < A.n && n < 36; i++) if (A.reg[i] === reg.id) { A.blessure[i] = 1 + (n % 3); n++; }
  B.etat.phase = 'nuit'; aube(B, { [reg.id]: 'evacuer' });
  const evac = B.etat.evacues.filter(e => e.length >= 6);
  assert.ok(evac.length >= 10, `${evac.length} évacués`);
  assert.ok(evac.every(e => e[3] === 0 || e[3] === -1 && false), 'aucun retour la nuit même');
  const avant = reg.effectif;
  for (let nuit = 0; nuit < 4; nuit++) { B.etat.phase = 'nuit'; aube(B, {}); }
  const revenus = evac.filter(e => e[3] > 0), non = evac.filter(e => e[3] === -1);
  assert.ok(revenus.length >= 1 && non.length >= 1, `${revenus.length} revenus, ${non.length} non`);
  for (const e of revenus) assert.ok(e[3] - e[1] >= R.nuit.retourNuits[e[2]], 'jamais avant son délai');
  assert.equal(reg.effectif, avant + revenus.length);
  // même numéro, dans le même régiment
  for (const e of revenus) { const i = Array.from({ length: A.n }, (_, k) => k).find(k => A.id[k] === e[0] && !A.mort[k]); assert.ok(i !== undefined && A.reg[i] === reg.id, 'dans son régiment'); }
  const C = restaurer(photo(B), R);
  assert.deepEqual(C.etat.evacues, B.etat.evacues);
  assert.equal(C.etat.regiments[0].effectif, reg.effectif);
});

group('les blessés qui marchent');
test('un blessé au bras ou à la jambe légère regagne l\'arrière ; la tête et la jambe lourde restent à terre', () => {
  const B = petite(5), A = B.armee, ar = arriereDe(B);
  assert.ok(ar && ar[0] > ar[1], 'l\'arrière de chaque camp');
  const nos = []; for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.reg[i] === 0) nos.push(i);
  const legers = nos.filter(i => legere(A.id[i], R.soldat.jambeLegere)), lourds = nos.filter(i => !legere(A.id[i], R.soldat.jambeLegere));
  assert.ok(legers.length && lourds.length, 'des jambes légères et lourdes');
  const autres = [nos[0], nos[1]], quoi = { bras: [nos[0], 1], tete: [nos[1], 3], legere: [legers.find(i => !autres.includes(i)), 2], lourde: [lourds.find(i => !autres.includes(i)), 2] };
  const id = {}, y0 = {};
  for (const [k, [i, b]] of Object.entries(quoi)) { A.blessure[i] = b; id[k] = A.id[i]; y0[k] = A.y[i]; }
  for (let k = 0; k < 1800; k++) avancer(B);       // une minute
  const y = k => { for (let i = 0; i < A.n; i++) if (A.id[i] === id[k]) return A.y[i]; return null; };
  for (const k of ['bras', 'legere']) { if (y(k) === null) continue; assert.ok(y(k) > y0[k] + 8, `${k} recule : ${y0[k]} → ${y(k)}`); }
  for (const k of ['lourde', 'tete']) { if (y(k) === null) continue; assert.ok(Math.abs(y(k) - y0[k]) < 8, `${k} reste sur place : ${y0[k]} → ${y(k)}`); }
});
test('l\'arrière des deux camps : derrière leur dernière ligne', () => {
  const B = petite(), ar = arriereDe(B), L = SECTEURS.essai.tranchees.lignes, y0 = B.etat.marges.y;
  assert.equal(ar[0], y0 + Math.max(...L.nous) + R.soldat.arriere);
  assert.equal(ar[1], y0 + Math.min(...L.eux) - R.soldat.arriere);
});
test('un tireur qui abat un homme le compte parmi ses victimes ; la partie relue le garde', () => {
  const B = nouvelleBataille(7, R, { soldats: 300, jours: 3 });
  ordonnerMarche(B, [0, 1, 2], ...P(200, 120));
  for (let k = 0; k < 2400; k++) avancer(B);
  const A = B.armee;
  let total = 0; for (let i = 0; i < A.n; i++) total += A.victimes[i];
  assert.ok(total > 0, 'des victimes attribuées');
  const C = restaurer(photo(B), R);
  assert.deepEqual(Array.from(C.armee.victimes.subarray(0, C.armee.n)), Array.from(A.victimes.subarray(0, A.n)));
});
test('le prochain grade : celui du rang au-dessus, rien pour un capitaine', () => {
  assert.equal(prochainGrade(0, 0), '');
  assert.equal(prochainGrade(0, 5), 'sergent');
  assert.equal(prochainGrade(0, 6), 'caporal');
  assert.equal(prochainGrade(0, 7), 'soldat de 1re classe');
  assert.equal(prochainGrade(1, 7), '');      // en face, les deux classes sont des Musketier
});
