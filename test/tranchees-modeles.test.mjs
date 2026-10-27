// Les tranchées en trois niveaux de détail (v0.84.0) : la géométrie pure (budgets, état, déterminisme) et la solidité d'un tronçon (la barre de vie du coin de l'écran).
import { nouvelleBataille, tronconSolidite, terrainResume } from '../js/bataille.js';
import { impact } from '../js/terrain.js';
import { ligneY, demiLargeur, etatTranchee, ETATS_TRANCHEE } from '../js/tranchees.js';
import { primitives, ouvrageTroncon, mesurerNiveau, niveauSelonZoom, couchesDe, ORDRE_COUCHES, NIVEAUX_TRANCHEES } from '../js/rendu/tranchee-modeles.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('tranchées — niveaux de détail');
test('chaque niveau coûte plus que le précédent, et une tranchée détruite coûte moins qu\'une intacte', () => {
  const tri = (n, e) => mesurerNiveau(n, e, 4).triangles / 4;
  for (const n of [1, 2, 3]) { assert.ok(tri(n, 2) >= tri(n, 1) && tri(n, 1) > tri(n, 0), `niveau ${n} : intact ≥ abîmé > détruit`); }
  assert.ok(tri(1, 2) < tri(2, 2) && tri(2, 2) < tri(3, 2));
});
test('le budget d\'un tronçon intact, avec la texture du jeu (joints, grain et usure) : au plus 150 triangles au niveau 1, 2 300 au niveau 2, 5 600 au niveau 3', () => {
  const budget = { 1: 150, 2: 2300, 3: 5600 };
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

group('tranchées — échelles');
// ce que dessine un tronçon avec ces échelles : les boîtes et les poutres (leurs deux bouts), avec le nom de leur sorte
function dessin(niveau, etat, echelles, pris = false, face = -1) {
  const noms = ORDRE_COUCHES, K = Object.fromEntries(noms.map(n => [n, [n + '/haut', n + '/flanc']])), B = [], P = [];
  const hz = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); };
  const boite = (x0, x1, y0, y1, z0, z1, k) => B.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), nom: k[0].split('/')[0] });
  const poutre = (ax, ay, az, bx, by, bz, e, k) => P.push({ a: [ax, ay, az], b: [bx, by, bz], e, nom: k[0].split('/')[0] });
  const Lt = { camp: 0, rang: 0, y0: 50, amp: 1.5, phase: 2, face };
  // un sol creusé comme une vraie tranchée : le fond à 0, le terrain autour à 1,5 m (la profondeur de 6 quarts), entre les deux la paroi
  const surface = (x, z) => (Math.abs(z - ligneY(Lt, Math.floor(x) + 0.5)) < demiLargeur(Lt, Math.floor(x) + 0.5) ? 0 : 1.5);
  ouvrageTroncon({ boite, poutre, trait: () => {}, surface, etat: () => etat, j: hz, K, prof: 6, pris, coupe: pris, texture: 3, echelles }, { x0: 0, x1: 25 }, Lt, niveau);
  return { B, P };
}
const meme = (u, v) => JSON.stringify(u) === JSON.stringify(v);
test('chaque niveau pose les échelles de TRANCHEE_OUVRAGES (le dessin change quand on en retire)', async () => {
  const { TRANCHEE_OUVRAGES } = await import('../js/data/tranchees.js');
  assert.deepEqual(TRANCHEE_OUVRAGES.echelles, [9, 21]);
  for (const n of [1, 2, 3]) for (const e of [2, 1, 0]) {
    const a = dessin(n, e, undefined), b = dessin(n, e, [9]), c = dessin(n, e, []);
    assert.ok(!meme(a, b) && !meme(b, c), `niveau ${n}, état ${e}`);
  }
});
test('une échelle ne traverse rien : ses montants ne passent dans aucun sac, lisse, montant, panneau ni banquette (seul le caillebotis porte son pied)', () => {
  for (const niveau of [1, 2, 3]) for (const pris of [false, true]) for (const face of [-1, 1]) {
    const avec = dessin(niveau, 2, [9], pris, face), sans = dessin(niveau, 2, [], pris, face);
    const rails = avec.P.filter(p => !sans.P.some(q => meme(p, q)));
    assert.ok(rails.length >= 1, `des montants (niveau ${niveau})`);
    const sol = b => b.y1 < 0.25 && ['planche', 'planche2', 'boue', 'ombre', 'eau'].includes(b.nom);          // le caillebotis et ce qui le couvre (grain, boue, eau) : le pied de l'échelle y repose
    const autres = avec.B.filter(b => sans.B.some(q => meme(b, q)) && !sol(b));       // ce qui était déjà là, sauf le fond
    for (const r of rails) for (let u = 0.25; u <= 1; u += 0.05) {                                  // le long du montant, sauf le pied
      const x = r.a[0] + (r.b[0] - r.a[0]) * u, y = r.a[1] + (r.b[1] - r.a[1]) * u, z = r.a[2] + (r.b[2] - r.a[2]) * u, e = r.e - 0.01;
      const dedans = autres.find(b => x + e > b.x0 + 0.01 && x - e < b.x1 - 0.01 && y + e > b.y0 + 0.01 && y - e < b.y1 - 0.01 && z + e > b.z0 + 0.01 && z - e < b.z1 - 0.01);
      assert.ok(!dedans, `niveau ${niveau}, ${pris ? 'pris' : 'tenu'}, face ${face} : le montant entre dans ${dedans?.nom} en (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}), u = ${u.toFixed(2)}`);
    }
  }
});

group('tranchées — la carte des échelles');
test('chaque tronçon de ligne a ses échelles au pied desquelles la carte vaut 1 (3 m de large, la tranchée et le parapet), les boyaux et le reste du sol : 0', () => {
  const B = nouvelleBataille(5, structuredClone(R), { soldats: 200, jours: 3 }), T = B.terrain, E = T.echelle;
  assert.ok(E instanceof Uint8Array && E.length === T.W * T.H);
  for (let t = 0; t < B.troncons.length; t++) {
    const tr = B.troncons[t], L = B.lignes[tr.ligne];
    for (const d of [9, 21]) {
      const i = Math.floor(tr.x0 + d), yc = di => ligneY(L, i + di + 0.5);
      for (const di of [-1, 0, 1]) assert.equal(E[Math.round(yc(di)) * T.W + i + di], 1, `tronçon ${t}, ${d} m, colonne ${di}`);
      assert.equal(E[Math.round(yc(3)) * T.W + i + 3], 0, 'à 3 m de l\'échelle : plus rien');
    }
  }
  let n = 0; for (const v of E) n += v;
  assert.ok(n > 0 && n < T.W * T.H * 0.01, `${n} cases`);
});
test('la carte se refait à l\'identique avec le terrain (rien à sauvegarder)', () => {
  const a = nouvelleBataille(5, structuredClone(R), { soldats: 200, jours: 3 }).terrain.echelle, b = nouvelleBataille(5, structuredClone(R), { soldats: 200, jours: 3 }).terrain.echelle;
  assert.deepEqual(a, b);
});

group('tranchées — le scintillement');
// les faces de boîtes dans le même plan, tournées du même côté, de couleurs différentes : celles qui se disputent les pixels
function paires(niveau, etat, texture, pris, face, tolerance) {
  const noms = ORDRE_COUCHES, K = Object.fromEntries(noms.map(n => [n, [n + '/haut', n + '/flanc']])), Q = [];
  const { boite, poutre } = primitives((a, b, c, d, col) => Q.push({ a, b, c, d, col }), couchesDe(K));
  const hz = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); };
  ouvrageTroncon({ boite, poutre, trait: () => {}, surface: () => 0, etat: () => etat, j: hz, K, prof: 6, pris, coupe: pris, texture }, { x0: 0, x1: 25 }, { camp: 0, rang: 0, y0: 50, amp: 1.5, phase: 2, face }, niveau);
  const F = [];
  for (const q of Q) {
    const u = [q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]], v = [q.c[0] - q.a[0], q.c[1] - q.a[1], q.c[2] - q.a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (let ax = 0; ax < 3; ax++) {
      const o = [0, 1, 2].filter(i => i !== ax), pts = [q.a, q.b, q.c, q.d];
      if (Math.abs(n[ax]) > 1e-9 && o.every(i => Math.abs(n[i]) < 1e-9) && pts.every(p => Math.abs(p[ax] - q.a[ax]) < 1e-9))
        F.push({ ax, sens: Math.sign(n[ax]), c: q.a[ax], u: [Math.min(...pts.map(p => p[o[0]])), Math.max(...pts.map(p => p[o[0]]))], v: [Math.min(...pts.map(p => p[o[1]])), Math.max(...pts.map(p => p[o[1]]))], col: q.col });
    }
  }
  let n = 0;
  for (let i = 0; i < F.length; i++) for (let k = i + 1; k < F.length; k++) {
    const a = F[i], b = F[k];
    if (a.ax !== b.ax || a.sens !== b.sens || Math.abs(a.c - b.c) > tolerance || a.col === b.col) continue;
    if (Math.min(a.u[1], b.u[1]) - Math.max(a.u[0], b.u[0]) > 1e-3 && Math.min(a.v[1], b.v[1]) - Math.max(a.v[0], b.v[0]) > 1e-3) n++;
  }
  return n;
}
test('deux faces de couleurs différentes ne tombent presque jamais dans le même plan, du même côté (avant : 1 610 paires à 0,1 mm, après : moins de 200 à 1 mm)', () => {
  let total = 0;
  for (const niveau of [1, 2, 3]) for (const etat of [2, 1, 0]) for (const texture of [0, 1, 2, 3]) for (const pris of [false, true]) for (const face of [-1, 1]) total += paires(niveau, etat, texture, pris, face, 0.001);
  assert.ok(total <= 200, `${total} paires`);
});
test('le plus gros des dangers, les joints, la boue et les sacs : plus aucune paire à 0,5 mm entre un sac et ce qui le recouvre', () => {
  let total = 0;
  for (const niveau of [2, 3]) for (const etat of [2, 1]) for (const texture of [2, 3]) total += paires(niveau, etat, texture, false, -1, 0.0005);
  assert.ok(total <= 40, `${total} paires`);
});
