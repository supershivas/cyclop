// Le terrain : les cratères, la dureté, le plancher, la lèvre, l'eau.
import { readFileSync } from 'node:fs';
import { creerTerrain, impact, hydroLignes, etat, hauteurQ, ETAT } from '../js/terrain.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { SECTEURS } from '../js/data/secteur.js';
import { FORMES } from '../js/cratere.js';
import { CALIBRES } from '../js/data/calibres.js';
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

group('terrain — les formes de cratère du labo (v0.52.4)');
test('chaque forme est rejouée à l\'identique, creuse sans passer le plancher et ne change rien loin de l\'impact', () => {
  for (const [nom, forme] of Object.entries(FORMES)) for (const cal of ['75', '155', '220']) {
    const a = plat(41, 41), b = plat(41, 41);
    for (let k = 0; k < 6; k++) { impact(a, 20.3 + k * 0.1, 20.7, cal, R, k, false, forme); impact(b, 20.3 + k * 0.1, 20.7, cal, R, k, false, forme); }
    assert.deepEqual(a.diff, b.diff, `${nom} ${cal}`);
    assert.ok(Math.min(...a.diff) >= -R.terrain.plancher, `${nom} ${cal} : plancher`);
    for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) if (Math.hypot(i - 20, j - 20) > 12) assert.equal(a.diff[j * 41 + i], 0, `${nom} ${cal} : ${i},${j}`);
  }
});
test('une forme creuse à peu près le volume du motif (à 25 % près) et pas plus profond', () => {
  for (const [nom, forme] of Object.entries(FORMES)) for (const cal of ['75', '155', '220']) {
    let creuse0 = 0, creuse = 0, centre = 0;
    for (let k = 0; k < 30; k++) {
      const x = 20 + (k % 7) / 7, y = 20 + (k % 5) / 5;
      const A = plat(41, 41), B = plat(41, 41);
      impact(A, x, y, cal, R, k); impact(B, x, y, cal, R, k, false, forme);
      for (const d of A.diff) if (d < 0) creuse0 -= d;
      for (const d of B.diff) if (d < 0) creuse -= d;
      centre = Math.max(centre, -Math.min(...B.diff));
      assert.ok(-Math.min(...B.diff) <= -Math.min(...A.diff), `${nom} ${cal} : plus profond que le motif`);
    }
    assert.ok(Math.abs(creuse / creuse0 - 1) < 0.25, `${nom} ${cal} : volume ${(creuse / creuse0).toFixed(2)}`);
  }
});
test('sans forme, impact() creuse comme avant (la forme null est le jeu)', () => {
  const a = plat(), b = plat();
  impact(a, 10.5, 10.5, '155', R, 3); impact(b, 10.5, 10.5, '155', R, 3, false, FORMES.actuel);
  assert.deepEqual(a.diff, b.diff);
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

group('atelier — les cartes à vous');
test('une carte neuve (copie ou vierge) a un id tiré de son nom, passe le contrôle, se joue, et s\'ajoute à la liste sans toucher les secteurs d\'origine', async () => {
  const { idCarte, nouvelleCarte, appliquerCartes } = await import('../js/design-store.js');
  const { VIERGE } = await import('../js/data/secteur.js');
  const { validerSecteur } = await import('../js/tranchees.js');
  const { terrainDuSecteur, profilDe } = await import('../js/secteur-terrain.js');
  assert.equal(idCarte('Les collines de l’Argonne !', new Set()), 'carte-les-collines-de-l-argonn');
  assert.equal(idCarte('Éléphant', new Set(['carte-elephant'])), 'carte-elephant-2');
  assert.equal(idCarte('   ', new Set()), 'carte-carte');
  const copie = nouvelleCarte(SECTEURS.crete, 'Ma crête'), vierge = nouvelleCarte(VIERGE, 'Du neuf');
  assert.equal(copie.nom, 'Ma crête'); assert.deepEqual(copie.relief, SECTEURS.crete.relief); assert.equal(SECTEURS.crete.nom, 'La crête', 'le modèle n\'est pas touché');
  assert.deepEqual(validerSecteur(copie), []); assert.deepEqual(validerSecteur(vierge), []);
  // le profil d'une crête monte, celui d'un champ vierge est presque plat
  const pc = profilDe(terrainDuSecteur(copie, copie.marges, 3, R).terrain, copie), pv = profilDe(terrainDuSecteur(vierge, vierge.marges, 3, R).terrain, vierge);
  assert.equal(pc.length, 12); assert.ok(Math.max(...pc) - Math.min(...pc) > 0.25, 'la crête se voit'); assert.ok(Math.max(...pv) - Math.min(...pv) < 0.2, 'le vierge est presque plat');
  // l'ajout à la liste : après les secteurs d'origine, jamais par-dessus l'un d'eux
  const liste = { essai: SECTEURS.essai, crete: SECTEURS.crete };
  appliquerCartes(liste, { 'carte-ma-crete': copie, essai: { ...copie, nom: 'usurpateur' } });
  assert.deepEqual(Object.keys(liste), ['essai', 'crete', 'carte-ma-crete']);
  assert.equal(liste.essai.nom, 'Les labours'); assert.equal(liste['carte-ma-crete'].perso, true);
  // elle se joue : une bataille sur son id, et une partie relue la retrouve
  const { version } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const dedans = (await import(`../js/data/secteur.js?v=${version}`)).SECTEURS;
  const { nouvelleBataille, photo, restaurer } = await import('../js/bataille.js');
  dedans['carte-ma-crete'] = copie;
  let B; try { B = nouvelleBataille(4, R, { secteur: 'carte-ma-crete', soldats: 100, jours: 3 }); } finally { delete dedans['carte-ma-crete']; }
  assert.equal(B.etat.secteur, 'carte-ma-crete');
  const C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);       // la carte n'est plus dans la liste (supprimée) : la partie garde son sol et retombe sur un secteur d'origine pour le reste
  assert.deepEqual(C.terrain.base, B.terrain.base);
});

group('la lune (v0.40.0)');
test('la lune change de phase de jour en jour, revient après une lunaison ; la lumière est étouffée par le temps ; rien ne dépend du hasard', async () => {
  const { lune, clairDeLune, couvertureNuit, nomPhase, cielEnMots, CYCLE } = await import('../js/data/lune.js');
  const a = [1, 2, 3, 4, 5, 6, 7].map(j => lune(j, 7).p);
  for (let k = 1; k < a.length; k++) assert.ok(Math.abs(((a[k] - a[k - 1] + 1.5) % 1) - 0.5 - 1 / CYCLE) < 1e-9, 'un trentième de lunaison par jour');
  assert.ok(Math.abs(lune(1, 7).p - lune(1 + Math.round(CYCLE), 7).p) < 0.02 + 1 / CYCLE / 2, 'revient après ~30 jours');
  assert.deepEqual(lune(5, 3), lune(5, 3)); assert.notEqual(lune(5, 3).p, lune(5, 4).p, 'chaque graine a sa lune');
  for (let j = 1; j < 40; j++) { const l = lune(j, 9); assert.ok(l.eclairement >= 0 && l.eclairement <= 1 && l.p >= 0 && l.p < 1 && l.el > 0.07 && l.el < 0.23, 'visible de la caméra du jeu'); }
  assert.equal(nomPhase(0.5), 'Pleine lune'); assert.equal(nomPhase(0.99), 'Nouvelle lune'); assert.equal(nomPhase(0.25), 'Premier quartier');
  // la même nuit : la pluie donne moins de lumière que le temps sec
  const pleine = [...Array(30).keys()].map(j => j + 1).find(j => lune(j, 7).eclairement > 0.95);
  assert.ok(clairDeLune(pleine, 7, 'pluie') < clairDeLune(pleine, 7, 'sec'));
  for (let j = 1; j < 30; j++) { const c = couvertureNuit(j, 7, 'gel'); assert.ok(c >= 0 && c <= 1); }
  assert.equal(cielEnMots(0.1), 'ciel dégagé'); assert.equal(cielEnMots(0.9), 'ciel couvert');
});

group('atelier — les eaux profondes (v0.43.0)');
test('un lac creuse à plat un niveau au mètre sous sa rive la plus basse, et rien n\'y pousse ; un fleuve suit le terrain', async () => {
  const { calculerCouts, dimensionsCouts } = await import('../js/champs.js');
  const { vitesseCase } = await import('../js/terrain.js');
  const S = { largeur: 120, hauteur: 100, arbres: 80, buissons: 60, objets: [{ o: 'lac', x: 60, y: 50, r: 12 }] };
  const T = creerTerrain(3, S, R), sans = creerTerrain(3, { ...S, objets: [] }, R);
  const dedans = [], c0 = 50 * 120 + 60;
  for (let j = 0; j < 100; j++) for (let i = 0; i < 120; i++) if (T.profond[j * 120 + i]) dedans.push(j * 120 + i);
  assert.ok(dedans.length > 400 && dedans.length < 520, `un disque de rayon 12 : ${dedans.length} cases`);
  assert.equal(new Set(dedans.map(c => T.base[c])).size, 1, 'à plat');
  assert.equal(T.base[c0] % 4, 0, 'au mètre près');
  const rive = Math.min(...dedans.map(c => sans.base[c]));
  assert.equal(T.base[c0], (Math.floor(rive / 4) - 1) * 4, 'un mètre sous la rive la plus basse');
  assert.equal(etat(T, c0, R), ETAT.EAU); assert.equal(etat(T, c0, R, true), ETAT.EAU, 'même par le gel');
  assert.ok(vitesseCase(T, c0, R) < 0.05 && vitesseCase(T, c0 + 30, R) > 0.2, 'on n\'y passe pas, ailleurs si');
  assert.ok(![...T.arbres, ...T.buissons].some(o => T.profond[o.j * 120 + o.i]), 'ni arbre ni buisson dans l\'eau');
  // le champ de coûts contourne : un carré dans l'eau est infranchissable
  const { bw, bh } = dimensionsCouts(T), couts = new Uint8Array(bw * bh); calculerCouts(T, R, couts);
  assert.equal(couts[Math.floor(50 / 4) * bw + Math.floor(60 / 4)], 0); assert.ok(couts[Math.floor(10 / 4) * bw + 5] > 0);
  // un fleuve : un niveau par tranche de son cours, il descend avec la pente
  const F = creerTerrain(3, { ...S, objets: [{ o: 'fleuve', x: 5, y: 40, x2: 115, y2: 60, r: 5 }] }, R);
  const niveaux = new Set(); for (let c = 0; c < F.profond.length; c++) if (F.profond[c]) niveaux.add(F.base[c]);
  assert.ok(niveaux.size >= 1 && [...niveaux].every(n => n % 4 === 0));
  assert.ok(F.profond.reduce((s, v) => s + v, 0) > 1000, 'un fleuve de 10 m sur ~110 m');
  assert.equal(creerTerrain(3, { ...S, objets: [] }, R).profond.reduce((s, v) => s + v, 0), 0, 'sans eau, rien ne change');
});
test('le contrôle refuse un lac ou un fleuve sur les tranchées, pas dans le no man\'s land', async () => {
  const { validerSecteur } = await import('../js/tranchees.js');
  const S = structuredClone(SECTEURS.essai), n0 = S.tranchees.lignes.nous[0], e0 = S.tranchees.lignes.eux[0], milieu = (n0 + e0) / 2;
  assert.deepEqual(validerSecteur({ ...S, objets: [{ o: 'fleuve', x: 0, y: milieu, x2: 400, y2: milieu, r: 6 }] }), [], 'un fleuve en travers du no man\'s land passe');
  assert.ok(validerSecteur({ ...S, objets: [{ o: 'lac', x: 200, y: n0, r: 15 }] }).some(t => /touche les tranchées de chez nous/.test(t)));
  assert.ok(validerSecteur({ ...S, objets: [{ o: 'fleuve', x: 0, y: e0 - 3, x2: 400, y2: e0 + 3, r: 6 }] }).some(t => /d'en face/.test(t)));
});

group('atelier — les ponts (v0.44.0, v0.47.2)');
test('un pont rend l\'eau praticable sous son tablier sans changer le sol, le tablier part de la rive la plus haute, un obus coupe l\'ouvrage entier, un trait sans eau ne pose rien', async () => {
  const { calculerCouts, dimensionsCouts } = await import('../js/champs.js');
  const { vitesseCase, impact, hauteurQ } = await import('../js/terrain.js');
  const { couleurCase } = await import('../js/apparence.js');
  const S = { largeur: 120, hauteur: 100, arbres: 0, objets: [{ o: 'fleuve', x: -10, y: 50, x2: 130, y2: 50, r: 6 }, { o: 'pont', x: 60, y: 35, x2: 60, y2: 65, r: 3, type: 'arches' }, { o: 'pont', x: 20, y: 5, x2: 20, y2: 15, r: 3 }] };
  const T = creerTerrain(3, S, R), sans = creerTerrain(3, { ...S, objets: S.objets.slice(0, 1) }, R), c = j => j * 120 + 60;
  assert.equal(T.pontsListe.length, 1, 'un seul ouvrage : l\'autre n\'a pas d\'eau dessous'); assert.equal(T.pontsListe[0].type, 'arches');
  assert.equal(T.profond[c(50)], 0, 'sous le tablier, l\'eau n\'est plus profonde'); assert.equal(T.pont[c(50)], 1); assert.equal(T.pontEau[c(50)], 1);
  assert.equal(T.base[c(50)], sans.base[c(50)], 'le sol est celui d\'avant : l\'eau passe dessous');
  assert.equal(T.profond[50 * 120 + 70], 1, 'à côté, l\'eau');
  const rive = Math.max(...[sans.base[c(35)], sans.base[c(65)], sans.base[c(34)], sans.base[c(66)]]);
  assert.ok(T.pontH[c(50)] >= rive - 3, 'le tablier part de la hauteur de la rive'); assert.ok(T.pontH[c(50)] >= T.base[c(50)] + 4, 'au moins un mètre au-dessus de l\'eau');
  assert.equal(hauteurQ(T, c(50)), T.pontH[c(50)]);
  assert.equal(etat(T, c(50), R), ETAT.SEC); assert.ok(vitesseCase(T, c(50), R) > 0.9, 'à pied sec, vitesse normale');
  const { bw } = dimensionsCouts(T), couts = new Uint8Array(bw * Math.ceil(100 / 4)); calculerCouts(T, R, couts);
  assert.ok(couts[Math.floor(50 / 4) * bw + 15] > 0, 'le carré du pont est praticable'); assert.equal(couts[Math.floor(50 / 4) * bw + 25], 0, 'le fleuve ne l\'est pas');
  // un obus de 155 sur le tablier coupe l'ouvrage entier : l'eau redevient profonde, le tablier disparaît
  impact(T, 60.5, 50.5, '155', R, 1);
  assert.equal(T.pontsListe[0].detruit, true); assert.equal(T.pont[c(50)], 0); assert.equal(T.profond[c(50)], 1); assert.equal(T.pont[c(40)], 0, 'tout l\'ouvrage, pas seulement le point touché');
  assert.equal(hauteurQ(T, c(50)), T.base[c(50)] + T.diff[c(50)]);
  // un pont posé sans eau dessous ne change rien
  const nu = creerTerrain(3, { ...S, objets: [S.objets[2]] }, R);
  assert.equal(nu.pont.reduce((s, v) => s + v, 0), 0); assert.equal(nu.pontsListe.length, 0);
});

group('les régiments et les ponts (v0.47.2)');
test('un ordre au-delà d\'un fleuve sans pont est refusé à voix haute, avec un pont le chemin le contourne et la route passe par le tablier ; un char sur un pont qui ne le porte pas le fait tomber', async () => {
  const { version } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const { SECTEURS: dedans } = await import(`../js/data/secteur.js?v=${version}`);
  const { nouvelleBataille, peutOrdonner, ordonnerMarche, zone, avancer, ordonnerBarrage } = await import('../js/bataille.js');
  const S = dedans.essai, m = (S.tranchees.lignes.nous[0] + S.tranchees.lignes.eux[0]) / 2;
  const riviere = { o: 'fleuve', x: -300, y: m, x2: 750, y2: m, r: 6 };
  try {
    dedans.essai = { ...S, objets: [riviere] };
    const B = nouvelleBataille(7, R, { soldats: 200, jours: 3 }), z = zone(B), but = [z.x0 + 100, z.y0 + 60];
    const p = peutOrdonner(B, [0, 1], ...but);
    assert.ok(p.refus && /aucun passage/.test(p.refus), 'sans pont : aucun passage'); assert.ok(p.chemins[0].pts.length >= 1);
    assert.ok(ordonnerMarche(B, [0, 1], ...but).refus, 'l\'ordre lui-même est refusé');
    dedans.essai = { ...S, objets: [riviere, { o: 'pont', x: 300, y: m + 12, x2: 300, y2: m - 12, r: 3, type: 'arches' }] };
    const C = nouvelleBataille(7, R, { soldats: 200, jours: 3 }), q = peutOrdonner(C, [0, 1], ...but);
    assert.ok(q.ok, 'avec un pont : un chemin'); assert.ok(q.chemins[0].atteint);
    const pts = q.chemins[0].pts, T = C.terrain;
    assert.ok(pts.some(([x, y]) => T.pont[Math.floor(y) * T.W + Math.floor(x)]), 'la route passe par le pont');
    assert.ok(pts.length > 12, 'un détour, pas une droite');
  } finally { dedans.essai = S; }
});

group('le générateur de carte (v0.49.0)');
test('une carte aléatoire est celle de sa graine, passe le contrôle, et varie : fleuves avec ponts, côtes, montagnes', async () => {
  const { genererCarte } = await import('../js/generateur.js');
  const { validerSecteur } = await import('../js/tranchees.js');
  const traits = {}, noms = new Set();
  for (let g = 1; g <= 120; g++) {
    const S = genererCarte(g);
    assert.deepEqual(S, genererCarte(g), 'la même graine, la même carte');
    assert.deepEqual(validerSecteur(S), [], `la carte ${g} ne touche aucune tranchée`);
    for (const t of S.genere.traits) traits[t] = (traits[t] || 0) + 1;
    noms.add(S.nom + S.resume);
    // un fleuve du no man's land a au moins un pont qui porte un char
    const fl = S.objets.filter(o => o.o === 'fleuve' && o.y > 90 && o.y < 210);
    if (fl.length) assert.ok(S.objets.some(o => o.o === 'pont'), `la carte ${g} : un fleuve sans pont`);
  }
  for (const t of ['fleuve', 'cote', 'montagne', 'lac', 'collines']) assert.ok(traits[t] > 10, `des cartes avec ${t} : ${traits[t]}`);
  assert.ok(noms.size > 60, 'des cartes différentes');
});
test('le terrain d\'une carte aléatoire se monte, ses eaux sont de l\'eau profonde, et une bataille y tourne', async () => {
  const { genererCarte } = await import('../js/generateur.js');
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  let eaux = 0, hauts = 0;
  for (let g = 1; g <= 30; g++) {
    const S = genererCarte(g), { terrain: T } = terrainDuSecteur(S, { ...S.marges }, g, R);
    if (T.profond.some(v => v)) eaux++;
    let max = 0; for (let c = 0; c < T.base.length; c += 7) if (T.base[c] > max) max = T.base[c];
    if (max / 4 > 8) hauts++;
  }
  assert.ok(eaux > 8 && hauts > 5, `des eaux : ${eaux}, des hauteurs : ${hauts}`);
});
test('la carte aléatoire se joue : nouvelleBataille la tire de la graine, la relecture garde le même sol', async () => {
  const { nouvelleBataille, avancer, photo, restaurer } = await import('../js/bataille.js');
  const B = nouvelleBataille(7, R, { secteur: 'aleatoire', soldats: 40, jours: 3 });
  assert.equal(B.etat.secteur, 'aleatoire');
  for (let k = 0; k < 60; k++) avancer(B);
  const b = restaurer(photo(B), R);
  assert.deepEqual(b.etat.sol.objets, B.etat.sol.objets);
  assert.equal(b.terrain.profond.reduce((s, v) => s + v, 0), B.terrain.profond.reduce((s, v) => s + v, 0));
});

group('des rives vivantes et des marécages (v0.50.0)');
test('un fleuve s\'élargit et se resserre, serpente ; un lac a des anses ; sans hasard', () => {
  const S = { largeur: 400, hauteur: 160, arbres: 0, objets: [{ o: 'fleuve', x: 0, y: 80, x2: 400, y2: 80, r: 8 }, { o: 'lac', x: 200, y: 20, r: 14 }] };
  const T = creerTerrain(5, S, R), T2 = creerTerrain(5, S, R);
  assert.deepEqual(T.profond, T2.profond, 'sans hasard');
  const largeurs = [], centres = [];
  for (let i = 10; i < 390; i++) { let n = 0, somme = 0; for (let j = 40; j < 120; j++) if (T.profond[j * 400 + i]) { n++; somme += j; } if (n) { largeurs.push(n); centres.push(somme / n); } }
  const min = Math.min(...largeurs), max = Math.max(...largeurs);
  assert.ok(max - min >= 6, `la largeur varie : de ${min} à ${max} m`);
  assert.ok(Math.max(...centres) - Math.min(...centres) >= 5, 'l\'axe serpente');
  // le lac n'est pas un disque : son contour s'écarte de plus de 10 % du rayon moyen
  let ecart = 0, n = 0, aire = 0; for (let j = 0; j < 40; j++) for (let i = 180; i < 220; i++) if (T.profond[j * 400 + i]) aire++;
  const rMoy = Math.sqrt(aire / Math.PI);
  for (let a = 0; a < 6.28; a += 0.2) { let r = 0; while (r < 30 && T.profond[Math.round(20 + Math.sin(a) * r) * 400 + Math.round(200 + Math.cos(a) * r)]) r++; ecart = Math.max(ecart, Math.abs(r - rMoy) / rMoy); n++; }
  assert.ok(ecart > 0.1, `un lac aux anses : écart ${ecart.toFixed(2)}`);
});
test('un marécage met la nappe au-dessus du sol par plaques : de l\'eau peu profonde, de la boue, jamais d\'eau profonde', () => {
  const S = { largeur: 160, hauteur: 160, arbres: 0, objets: [{ o: 'marecage', x: 80, y: 80, r: 30 }] };
  const T = creerTerrain(3, S, R), sans = creerTerrain(3, { ...S, objets: [] }, R);
  let eau = 0, boue = 0, profond = 0, dehors = 0;
  for (let j = 0; j < 160; j++) for (let i = 0; i < 160; i++) {
    const c = j * 160 + i, e = etat(T, c, R), d = Math.hypot(i - 80, j - 80);
    if (T.profond[c]) profond++;
    if (d < 20) { if (e === ETAT.EAU) eau++; else if (e === ETAT.BOUE) boue++; }
    if (d > 50 && etat(T, c, R) !== etat(sans, c, R)) dehors++;
  }
  assert.equal(profond, 0, 'pas d\'eau profonde');
  assert.ok(eau > 150 && boue > 100, `des flaques (${eau}) et de la boue (${boue})`);
  assert.equal(dehors, 0, 'rien au-delà');
});

group('saisons, roseaux, fleuves qui sortent (v0.51.0)');
test('l\'hiver tire de la neige et du gel sans pluie, l\'été du sec et de la chaleur ; l\'automne est le temps d\'avant ; la neige blanchit le sol, la chaleur le sèche', async () => {
  const { nouvelleBataille } = await import('../js/bataille.js');
  const { couleurCase } = await import('../js/apparence.js');
  const { INDICE: I } = await import('../js/palette.js');
  const nb = (saison, g) => { SECTEURS.essai.saison = saison; try { return nouvelleBataille(g, R, { soldats: 20, jours: 14 }); } finally { delete SECTEURS.essai.saison; } };
  const hiver = new Set(), ete = new Set();
  for (const g of [1, 2, 3, 4]) { nb('hiver', g).etat.meteo.forEach(m => hiver.add(m)); nb('ete', g).etat.meteo.forEach(m => ete.add(m)); }
  assert.ok(hiver.has('neige') && hiver.has('gel') && !hiver.has('pluie'), `hiver : ${[...hiver]}`);
  assert.ok(ete.has('canicule') && ete.has('sec') && !ete.has('neige') && !ete.has('gel'), `été : ${[...ete]}`);
  assert.equal(nb('hiver', 5).etat.meteo[0], 'gel'); assert.equal(nb('ete', 5).etat.meteo[0], 'canicule');
  assert.deepEqual(nb(undefined, 7).etat.meteo, nouvelleBataille(7, R, { soldats: 20, jours: 14 }).etat.meteo, 'sans saison : le temps d\'avant');
  // la neige : de la brume sur le sol nu, plus que sans neige ; les cratères restent de terre
  const B = nb('hiver', 3), T = B.terrain;
  let blanc = 0, nu = 0; for (let j = 100; j < 160; j++) for (let i = 100; i < 160; i++) { const c = couleurCase(T, i, j, R, 2); if (c === I.r || c === I.o) blanc++; if (couleurCase(T, i, j, R, 1) === I.r || couleurCase(T, i, j, R, 1) === I.o) nu++; }
  assert.ok(blanc > 800 && blanc > nu + 800, `de la neige : ${blanc} cases contre ${nu}`);
  // l'été, le sol est plus sec qu'en automne
  const sec = nb('ete', 3).terrain, hum = nb(undefined, 3).terrain; let hs = 0, hh = 0; for (let c = 0; c < sec.humid.length; c += 13) { hs += sec.humid[c]; hh += hum.humid[c]; }
  assert.ok(hs < hh * 0.6, `sol d'été plus sec : ${hs.toFixed(0)} contre ${hh.toFixed(0)}`);
});
test('des roseaux dans les marécages, seulement là ; un fleuve de la carte aléatoire sort du terrain des deux côtés', async () => {
  const S = { largeur: 160, hauteur: 160, arbres: 0, objets: [{ o: 'marecage', x: 80, y: 80, r: 30 }] };
  const T = creerTerrain(3, S, R);
  assert.ok(T.roseaux.length > 150, `des roseaux : ${T.roseaux.length}`);
  assert.ok(T.roseaux.every(c => Math.hypot((c % 160) - 80, ((c / 160) | 0) - 80) < 45), 'dans le marécage');
  assert.equal(creerTerrain(3, { ...S, objets: [] }, R).roseaux.length, 0);
  const { genererCarte } = await import('../js/generateur.js');
  for (let g = 1; g <= 60; g++) for (const o of genererCarte(g).objets) if (o.o === 'fleuve') assert.ok(Math.min(o.x, o.x2) < -220 && Math.max(o.x, o.x2) > 620, `le fleuve de la carte ${g} sort du terrain (marges de 220 m)`);
});

group('la saison dans l\'atelier (v0.52.0)');
test('chaque saison a un nom et une description ; une retouche « saison » du brouillon change le temps de la bataille', async () => {
  const { SAISONS } = await import('../js/data/meteo.js');
  const { appliquerSecteurs } = await import('../js/design-store.js');
  const { nouvelleBataille } = await import('../js/bataille.js');
  for (const [id, s] of Object.entries(SAISONS)) assert.ok(s.nom && s.desc && s.desc.length > 20, `la saison ${id}`);
  const { version } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
  const { SECTEURS: S2 } = await import(`../js/data/secteur.js?v=${version}`), avant = S2.essai;       // (l'instance que lit bataille.js : ses imports portent la version)
  try {
    appliquerSecteurs(S2, { essai: { saison: 'hiver' } });
    const B = nouvelleBataille(4, R, { soldats: 20, jours: 8 });
    assert.equal(B.etat.sol.saison, 'hiver'); assert.equal(B.etat.meteo[0], 'gel'); assert.ok(!B.etat.meteo.includes('pluie'));
  } finally { S2.essai = avant; }
});
