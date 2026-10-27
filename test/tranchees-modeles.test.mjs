// Les tranchées en trois niveaux de détail (v0.84.0) : la géométrie pure (budgets, état, déterminisme) et la solidité d'un tronçon (la barre de vie du coin de l'écran).
import { nouvelleBataille, tronconSolidite, terrainResume } from '../js/bataille.js';
import { impact } from '../js/terrain.js';
import { ligneY, etatTranchee, ETATS_TRANCHEE } from '../js/tranchees.js';
import { primitives, ouvrageTroncon, mesurerNiveau, niveauSelonZoom, NIVEAUX_TRANCHEES } from '../js/rendu/tranchee-modeles.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('tranchées — niveaux de détail');
test('chaque niveau coûte plus que le précédent, et une tranchée détruite coûte moins qu\'une intacte', () => {
  const tri = (n, e) => mesurerNiveau(n, e, 4).triangles / 4;
  for (const n of [1, 2, 3]) { assert.ok(tri(n, 2) >= tri(n, 1) && tri(n, 1) > tri(n, 0), `niveau ${n} : intact ≥ abîmé > détruit`); }
  assert.ok(tri(1, 2) < tri(2, 2) && tri(2, 2) < tri(3, 2));
});
test('le budget d\'un tronçon intact : au plus 150 triangles au niveau 1, 1 500 au niveau 2, 4 000 au niveau 3', () => {
  const budget = { 1: 150, 2: 1500, 3: 4000 };
  for (const n of [1, 2, 3]) assert.ok(mesurerNiveau(n, 2, 8).triangles / 8 <= budget[n], `niveau ${n}`);
});
test('la géométrie est la même à chaque appel (aucun hasard : un hachage de la position)', () => {
  const a = mesurerNiveau(3, 1, 6), b = mesurerNiveau(3, 1, 6);
  assert.equal(a.triangles, b.triangles); assert.equal(a.traits, b.traits);
});
test('une poutre de longueur nulle ne dessine rien ; une poutre debout et une couchée dessinent chacune 10 triangles', () => {
  let t = 0; const { poutre, boite } = primitives(() => { t += 2; });
  poutre(1, 1, 1, 1, 1, 1, 0.1, [0, 0]); assert.equal(t, 0);
  poutre(0, 0, 0, 0, 2, 0, 0.1, [0, 0]); assert.equal(t, 10);
  poutre(0, 1, 0, 3, 1, 0, 0.1, [0, 0]); assert.equal(t, 20);
  boite(0, 1, 0, 1, 0, 1, [0, 0]); assert.equal(t, 30);
});
test('toute la géométrie est finie (pas de NaN) à chaque niveau et à chaque état, du côté pris comme du nôtre', () => {
  for (const n of [1, 2, 3]) for (const e of [2, 1, 0]) for (const pris of [false, true]) for (const face of [-1, 1]) {
    let ok = true; const verifie = a => { if (!a.every(Number.isFinite)) ok = false; };
    const { boite, poutre } = primitives((a, b, c, d) => { verifie(a); verifie(b); verifie(c); verifie(d); });
    const K = new Proxy({}, { get: () => [0, 0] });
    const g = { boite, poutre, trait: (...v) => verifie(v), surface: () => 0, etat: () => e, j: (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); }, K, prof: 6, pris, coupe: pris };
    ouvrageTroncon(g, { x0: 0, x1: 25 }, { camp: 0, rang: 0, y0: 50, amp: 1.5, phase: 2, face }, n);
    assert.ok(ok, `niveau ${n}, état ${e}, pris ${pris}, face ${face}`);
  }
});
test('le niveau selon le zoom : la silhouette de loin, tout le détail de près', () => {
  assert.deepEqual([1, 2, 3, 4, 6, 8, 12, 16].map(niveauSelonZoom), [1, 1, 1, 2, 2, 3, 3, 3]);
  assert.equal(NIVEAUX_TRANCHEES.length, 3);
});

group('tranchées — solidité');
const bataille = () => nouvelleBataille(5, structuredClone(R), { soldats: 200, jours: 3 });
const premiereLigne = B => B.troncons.map((t, i) => i).filter(i => { const L = B.lignes[B.troncons[i].ligne]; return L.camp === 0 && L.rang === 0; });
test('au départ chaque tronçon est creusé comme au premier jour : solidité 1', () => {
  const B = bataille();
  for (let t = 0; t < B.troncons.length; t++) assert.equal(tronconSolidite(B, t), 1);
});
test('les obus la font tomber, d\'autant plus qu\'ils sont gros et nombreux, sans toucher le tronçon voisin', () => {
  const B = bataille(), k = premiereLigne(B)[6], t = B.troncons[k], L = B.lignes[t.ligne];
  const tir = (cal, n, depart) => { for (let q = 0; q < n; q++) { const x = t.x0 + (q + 0.5) * 25 / n; impact(B.terrain, x, ligneY(L, x), cal, R, depart + q); } };
  const s0 = tronconSolidite(B, k); tir('75', 3, 0); const s1 = tronconSolidite(B, k); tir('155', 4, 10); const s2 = tronconSolidite(B, k); tir('155', 10, 20); const s3 = tronconSolidite(B, k);
  assert.ok(s0 > s1 && s1 > s2 && s2 > s3, `${s0} ${s1} ${s2} ${s3}`);
  assert.ok(s3 >= 0 && s3 < 0.5, 'bouleversé');
  const voisin = premiereLigne(B)[7];
  assert.ok(tronconSolidite(B, voisin) > 0.97, 'le voisin est à peine touché (une lèvre qui retombe)');
});
test('le coin de l\'écran la donne, et les mots suivent les seuils', () => {
  const B = bataille(), k = premiereLigne(B)[3], t = B.troncons[k], L = B.lignes[t.ligne], x = (t.x0 + t.x1) / 2, y = ligneY(L, x);
  const r = terrainResume(B, x, y);
  assert.equal(r.troncon, k); assert.equal(r.solidite, 1);
  assert.equal(terrainResume(B, x, y - 40).solidite, null, 'hors tranchée : pas de barre');
  assert.deepEqual(ETATS_TRANCHEE.map(([, m]) => m), ['Intacte', 'Abîmée', 'Bouleversée']);
  assert.equal(etatTranchee(1), 'Intacte'); assert.equal(etatTranchee(0.85), 'Intacte'); assert.equal(etatTranchee(0.84), 'Abîmée'); assert.equal(etatTranchee(0.5), 'Abîmée'); assert.equal(etatTranchee(0.49), 'Bouleversée'); assert.equal(etatTranchee(0), 'Bouleversée');
});
