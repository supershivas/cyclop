// Le terrain : les cratères, la dureté, le plancher, la lèvre, l'eau.
import { readFileSync } from 'node:fs';
import { creerTerrain, impact, hydroLignes, etat, hauteurQ, ETAT } from '../js/terrain.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { SECTEURS } from '../js/data/secteur.js';
import { METEO } from '../js/data/meteo.js';

// un petit terrain plat et sec, la nappe très bas
function plat(W = 21, H = 21) {
  const T = creerTerrain(1, { largeur: W, hauteur: H, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  return T;
}
const diff = (T, i, j) => T.diff[j * T.W + i];

group('terrain — cratères');
test('un obus de 75 creuse son motif 3 × 3 : 1 m au centre, 50 cm sur les côtés, 25 cm aux coins', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(diff(T, 10, 10), -4);
  for (const [i, j] of [[9, 10], [11, 10], [10, 9], [10, 11]]) assert.equal(diff(T, i, j), -2);
  for (const [i, j] of [[9, 9], [11, 9], [9, 11], [11, 11]]) assert.equal(diff(T, i, j), -1);
});
test('la terre jetée fait une lèvre autour du cratère (jamais aux coins de l\'anneau)', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  let levre = 0;
  for (let j = 8; j <= 12; j++) for (let i = 8; i <= 12; i++) if (Math.max(Math.abs(i - 10), Math.abs(j - 10)) === 2 && diff(T, i, j) > 0) levre++;
  assert.ok(levre >= 6, `lèvre de ${levre} cases`);
  for (const [i, j] of [[8, 8], [12, 8], [8, 12], [12, 12]]) assert.equal(diff(T, i, j), 0);
});
test('plus profond, le sol est plus dur : un second obus au même endroit creuse deux fois moins', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(diff(T, 10, 10), -6);       // 4 quarts, puis 4 unités à 50 % = 2 quarts
});
test('le plancher dur arrête tout à −6 m', () => {
  const T = plat();
  for (let k = 0; k < 200; k++) impact(T, 10.5, 10.5, '220', R, k);
  assert.equal(diff(T, 10, 10), -R.terrain.plancher);
});
test('les gros calibres agrandissent le motif (5 × 5, 7 × 7)', () => {
  const T = plat(31, 31);
  impact(T, 15.5, 15.5, '155', R);
  assert.ok(diff(T, 13, 15) < 0 && diff(T, 17, 15) < 0, '155 : deux cases du centre');
  assert.equal(diff(T, 12, 15) > 0 || diff(T, 12, 15) === 0, true);
  const U = plat(31, 31);
  impact(U, 15.5, 15.5, '220', R);
  assert.ok(diff(U, 12, 15) < 0 && diff(U, 18, 15) < 0, '220 : trois cases du centre');
});
test('dans la boue, l\'obus s\'enfouit : il tue moins loin', () => {
  const T = plat(), U = plat();
  U.humid.fill(0.95);
  assert.ok(impact(U, 10.5, 10.5, '155', R).rayon < impact(T, 10.5, 10.5, '155', R).rayon);
});
test('un obus hors du champ ne fait rien', () => {
  const T = plat();
  assert.equal(impact(T, -5, 3, '75', R).rayon, 0);
  assert.ok(T.diff.every(v => v === 0));
});

group('terrain — eau');
test('même graine, même terrain ; autre graine, autre terrain', () => {
  const S = SECTEURS.essai;
  const a = creerTerrain(5, S, R), b = creerTerrain(5, S, R), c = creerTerrain(6, S, R);
  assert.deepEqual(a.base, b.base);
  assert.deepEqual(a.arbres, b.arbres);
  assert.notDeepEqual(a.base, c.base);
});
test('sous la pluie, l\'eau et l\'humidité montent dans un cratère plus que sur le plat', () => {
  const T = plat(31, 31);
  impact(T, 15.5, 15.5, '220', R);
  for (let h = 0; h < 24; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  const centre = 15 * T.W + 15, loin = 3 * T.W + 3;
  assert.ok(T.eau[centre] > T.eau[loin], `eau ${T.eau[centre]} contre ${T.eau[loin]}`);
  assert.ok(T.humid[centre] >= T.humid[loin]);
  assert.equal(etat(T, centre, R), ETAT.EAU);
});
test('par temps sec, le sol sèche', () => {
  const T = plat();
  T.humid.fill(0.6);
  for (let h = 0; h < 12; h++) hydroLignes(T, 0, T.H, METEO.sec, R);
  assert.ok(T.humid[0] < 0.6);
});
test('un trou creusé sous la nappe se remplit, même sans pluie', () => {
  const T = plat();
  T.nappe.fill(20 * 0.25 - 0.5);          // la nappe à 50 cm sous le sol
  impact(T, 10.5, 10.5, '75', R);         // un mètre de trou
  for (let h = 0; h < 12; h++) hydroLignes(T, 0, T.H, METEO.sec, R);
  assert.ok(T.eau[10 * T.W + 10] > R.hydro.eau, `eau ${T.eau[10 * T.W + 10]}`);
});
test('le gel : l\'eau devient de la glace, la boue porte', () => {
  const T = plat();
  T.eau[0] = 0.3; T.humid[1] = 0.95;
  assert.equal(etat(T, 0, R, true), ETAT.GLACE);
  assert.equal(etat(T, 1, R, true), ETAT.SEC);
  assert.equal(etat(T, 1, R, false), ETAT.BOUE);
});
test('hauteurQ = sol généré + différence', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(hauteurQ(T, 10 * T.W + 10), 16);
});

group('terrain — végétation');
test('de l\'herbe, des buissons en haies ; un obus souffle l\'herbe et arrache les buissons autour de lui', () => {
  const T = creerTerrain(5, { largeur: 200, hauteur: 150, arbres: 10, haies: 3, buissons: 40 }, R);
  let herbe = 0; for (let c = 0; c < T.W * T.H; c++) if (T.herbe[c]) herbe++;
  assert.ok(herbe > T.W * T.H * 0.3, `de l'herbe (${herbe} cases)`);
  assert.ok(T.buissons.length > 40, 'des buissons');
  const b = T.buissons[0];
  impact(T, b.i + 0.5, b.j + 0.5, '220', R);
  assert.equal(b.detruit, 1, 'arraché');
  for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
    const i = b.i + di, j = b.j + dj;
    if (i >= 0 && j >= 0 && i < T.W && j < T.H) assert.equal(T.herbe[j * T.W + i], 0);
  }
});
test('la boue et l\'eau tuent l\'herbe, heure après heure', () => {
  const T = creerTerrain(5, { largeur: 60, hauteur: 40, arbres: 0 }, R);
  T.herbe.fill(3); T.humid.fill(0.95);
  for (let h = 0; h < 4; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  assert.ok(T.herbe.every(v => v === 0));
});

group('terrain — le secteur de départ (l\'Atelier le montre)');
test('terrainDuSecteur monte les marges et creuse les tranchées ; deux fois la même graine, le même sol', async () => {
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  const S = SECTEURS.essai, a = terrainDuSecteur(S, S.marges, 7, R), b = terrainDuSecteur(S, S.marges, 7, R), c = terrainDuSecteur(S, S.marges, 8, R);
  assert.equal(a.terrain.W, S.largeur + 2 * S.marges.x);
  assert.equal(a.terrain.H, S.hauteur + 2 * S.marges.y);
  assert.equal(a.lignes.length, 8);
  assert.deepEqual(a.terrain.base, b.terrain.base);
  assert.notDeepEqual(a.terrain.base, c.terrain.base);
  assert.equal(terrainDuSecteur(S, S.marges, 7, R, { tranchees: false }).lignes.length, 0);
});

group('atelier — les retouches d\'un secteur');
test('les retouches à plat se déplient, se posent sur le secteur sans toucher sa donnée, et changent le terrain', async () => {
  const { deplier, secteurEffectif, appliquerSecteurs, lireChemin } = await import('../js/design-store.js');
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  assert.deepEqual(deplier({ 'relief.bosses': 2, arbres: 10, 'relief.crete.hauteur': 3 }), { relief: { bosses: 2, crete: { hauteur: 3 } }, arbres: 10 });
  const base = SECTEURS.crete, r = deplier({ 'relief.bosses': 2.5, 'relief.crete.hauteur': 3, arbres: 20 });
  const S = secteurEffectif(base, r);
  assert.equal(lireChemin(S, 'relief.bosses'), 2.5);
  assert.equal(lireChemin(S, 'relief.crete.largeur'), base.relief.crete.largeur, 'le reste de la crête est gardé');
  assert.equal(base.relief.bosses, 1.6, 'la donnée n\'est pas modifiée');
  const a = terrainDuSecteur(base, base.marges, 3, R).terrain, b = terrainDuSecteur(S, S.marges, 3, R).terrain;
  assert.notDeepEqual(a.base, b.base);
  assert.ok(b.arbres.length < a.arbres.length, 'moins d\'arbres : 20 contre 60 dans le secteur');
  const copie = { essai: SECTEURS.essai };
  appliquerSecteurs(copie, { essai: { arbres: 7 }, inconnu: { arbres: 1 } });
  assert.equal(copie.essai.arbres, 7);
  assert.equal(SECTEURS.essai.arbres, 150);
});

group('terrain — les formes de l\'atelier (lot 2)');
test('une bosse monte, un creux descend, une crête suit son segment, un plateau aplanit ; sans formes, rien ne bouge', async () => {
  const { appliquerFormes, distanceForme } = await import('../js/formes.js');
  const faire = formes => { const b = new Int16Array(100 * 100).fill(20); appliquerFormes(b, 100, 100, 0, 0, formes); return b; };
  const au = (b, x, y) => b[y * 100 + x];
  assert.equal(au(faire([]), 50, 50), 20);
  assert.equal(au(faire([{ f: 'bosse', x: 50.5, y: 50.5, r: 10, h: 3 }]), 50, 50), 32, '3 m = 12 quarts au centre');
  assert.equal(au(faire([{ f: 'bosse', x: 50.5, y: 50.5, r: 10, h: 3 }]), 50, 65), 20, 'rien au-delà du rayon');
  assert.equal(au(faire([{ f: 'creux', x: 50.5, y: 50.5, r: 10, h: 2 }]), 50, 50), 12);
  const c = faire([{ f: 'crete', x: 20.5, y: 50.5, x2: 80.5, y2: 50.5, r: 6, h: 2 }]);
  assert.equal(au(c, 50, 50), 28, 'le long du segment'); assert.equal(au(c, 20, 50), 28); assert.equal(au(c, 50, 70), 20);
  const p = faire([{ f: 'plateau', x: 50.5, y: 50.5, r: 20, h: 10 }]);
  assert.equal(au(p, 50, 50), 40); assert.equal(au(p, 55, 50), 40, 'plein jusqu\'à 0,6 r'); assert.ok(au(p, 68, 50) > 20 && au(p, 68, 50) < 40, 'fondu au bord');
  assert.equal(Math.round(distanceForme({ f: 'crete', x: 0, y: 0, x2: 10, y2: 0, r: 1, h: 1 }, 5, 3)), 3);
});
test('les formes d\'un secteur changent le sol, tranchées comprises ; la partie en garde une copie et la relit pareille après republication', async () => {
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  const { nouvelleBataille, photo, restaurer } = await import('../js/bataille.js');
  const S = SECTEURS.essai, formes = [{ f: 'bosse', x: 200, y: 150, r: 30, h: 4 }];
  const a = terrainDuSecteur(S, S.marges, 5, R).terrain, b = terrainDuSecteur({ ...S, retouches: formes }, S.marges, 5, R).terrain;
  const c = (S.marges.y + 150) * a.W + S.marges.x + 200;
  assert.equal(b.base[c] - a.base[c], 16);
  assert.equal(a.base[0], b.base[0], 'loin de la forme, le sol est le même');
  // les modules du jeu s'importent avec ?v=version : c'est une autre instance de `secteur.js` que celle du test
  const { version } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const dedans = (await import(`../js/data/secteur.js?v=${version}`)).SECTEURS;
  dedans.essai = { ...S, retouches: formes };
  let B; try { B = nouvelleBataille(5, R, { soldats: 100, jours: 3 }); } finally { dedans.essai = S; }
  assert.deepEqual(B.etat.sol.retouches, formes);
  assert.equal(B.terrain.base[c], b.base[c]);
  const C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);          // le secteur republié depuis n'a plus de formes : la partie a gardé les siennes
  assert.deepEqual(C.terrain.base, B.terrain.base);
});

group('terrain — les objets et les tranchées de l\'atelier (lot 3)');
test('des arbres, des bois et des haies se posent ; un dégagement retire ce que la graine avait planté, pas ce qui est posé ; sans objets, rien ne bouge', async () => {
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  const S = SECTEURS.essai, m = S.marges, ou = (T, x, y, r) => [...T.arbres, ...T.buissons].filter(t => Math.hypot(t.i + 0.5 - m.x - x, t.j + 0.5 - m.y - y) < r).length;
  const nu = terrainDuSecteur(S, m, 5, R).terrain;
  assert.equal(terrainDuSecteur({ ...S, objets: [] }, m, 5, R).terrain.arbres.length, nu.arbres.length);
  const plante = terrainDuSecteur({ ...S, objets: [{ o: 'arbre', x: 10, y: 10 }, { o: 'bois', x: 300, y: 250, r: 15 }, { o: 'haie', x: 40, y: 200, x2: 100, y2: 210 }] }, m, 5, R).terrain;
  assert.ok(plante.arbres.some(a => a.i === m.x + 10 && a.j === m.y + 10), 'l\'arbre est là');
  assert.ok(plante.arbres.length > nu.arbres.length + 10, 'le bois ajoute des arbres');
  assert.ok(plante.buissons.length > nu.buissons.length + 15, 'la haie ajoute des buissons');
  const deux = terrainDuSecteur({ ...S, objets: [{ o: 'arbre', x: 10, y: 10 }, { o: 'bois', x: 300, y: 250, r: 15 }, { o: 'haie', x: 40, y: 200, x2: 100, y2: 210 }] }, m, 5, R).terrain;
  assert.deepEqual(deux.arbres, plante.arbres); assert.deepEqual(deux.buissons, plante.buissons);
  // un dégagement au milieu d'un bois de la graine
  const A = nu.arbres[0], ax = A.i - m.x, ay = A.j - m.y;
  assert.ok(ou(nu, ax, ay, 12) > 0);
  const vide = terrainDuSecteur({ ...S, objets: [{ o: 'degager', x: ax, y: ay, r: 12 }, { o: 'arbre', x: ax, y: ay }] }, m, 5, R).terrain;
  assert.equal(ou(vide, ax, ay, 12), 1, 'seul l\'arbre posé après le dégagement reste');
});
test('le contrôle d\'un secteur : les trois secteurs passent ; lignes dans le désordre, no man\'s land trop étroit, tracé coupé sont dits', async () => {
  const { validerSecteur } = await import('../js/tranchees.js');
  for (const id of Object.keys(SECTEURS)) assert.deepEqual(validerSecteur(SECTEURS[id]), [], id);
  const avec = (f) => { const S = structuredClone(SECTEURS.essai); f(S.tranchees); return validerSecteur(S); };
  assert.ok(avec(T => { T.lignes.nous[1] = 220; }).some(t => /nous, lignes 1 et 2/.test(t)));
  assert.ok(avec(T => { T.lignes.eux[0] = 170; }).some(t => /no man's land/.test(t)));
  assert.ok(avec(T => { T.lignes.nous[3] = 298; }).some(t => /trop près du bord/.test(t)));
  assert.ok(avec(T => { T.creneau = 5; }).some(t => /se coupe/.test(t)));
  assert.deepEqual(avec(T => { T.creneau = 2.5; }), [], 'l\'amplitude maximale de l\'atelier tient');
});
test('une partie garde ses tranchées et ses objets : republier le secteur ne les déplace pas', async () => {
  const { nouvelleBataille, photo, restaurer, secteurDuJeu } = await import('../js/bataille.js');
  const S = SECTEURS.essai, T = structuredClone(S.tranchees);
  T.lignes.nous = [212, 232, 256, 278];
  const { version } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const dedans = (await import(`../js/data/secteur.js?v=${version}`)).SECTEURS;
  dedans.essai = { ...S, tranchees: T, objets: [{ o: 'arbre', x: 12, y: 12 }] };
  let B; try { B = nouvelleBataille(5, R, { soldats: 100, jours: 3 }); } finally { dedans.essai = S; }
  const premiere = B.lignes.find(l => l.camp === 0 && l.rang === 0);
  assert.equal(premiere.y0, B.etat.marges.y + 212);
  const C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.equal(C.lignes.find(l => l.camp === 0 && l.rang === 0).y0, premiere.y0);
  assert.deepEqual(C.terrain.arbres, B.terrain.arbres);
  assert.equal(secteurDuJeu(C.etat).tranchees.lignes.nous[0], 212);
});

group('atelier — chaque chiffre a un nom et une description');
test('chaque réglage de secteur, chaque outil et chaque champ de forme porte un nom et une description lisibles', async () => {
  const { PARAMS } = await import('../js/data/secteur-params.js');
  const { OUTILS, CHAMPS, champ } = await import('../js/data/carte-outils.js');
  for (const p of PARAMS) { assert.ok(p.nom && p.nom.length > 3, p.cle); assert.ok(p.desc && p.desc.length > 25, `${p.cle} : une description`); }
  for (const [id, o] of Object.entries(OUTILS)) { assert.ok(o.nom && o.aide && o.icone, id); for (const k of o.champs || []) { const c = champ(k, o.genre); assert.ok(c.nom && c.desc, `${id}.${k}`); } }
  for (const k of Object.keys(CHAMPS)) { const c = champ(k); assert.ok(c.nom && c.desc, k); }
});

group('atelier — la vue 3D regarde le terrain à une heure donnée');
test('regarderAu règle l\'heure et le temps du premier jour sans toucher au reste', async () => {
  const { nouvelleBataille, regarderAu, horloge } = await import('../js/bataille.js');
  const B = nouvelleBataille(5, R, { soldats: 100, jours: 3 }), avant = B.etat.meteo.slice(1).join();
  regarderAu(B, 12, 'pluie');
  const h = horloge(B);
  assert.equal(h.heure, 12); assert.equal(h.meteo, 'pluie');
  assert.equal(B.etat.meteo.slice(1).join(), avant, 'les autres jours ne changent pas');
  regarderAu(B, 17.5, 'sec'); assert.deepEqual([horloge(B).heure, horloge(B).minute], [17, 30]);
});
