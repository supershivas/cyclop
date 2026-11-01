// Les épaves (1er novembre) : la disposition d'un avion écrasé et d'un char détruit vient d'un hachage de la graine ; elle est la même à chaque lancement, et elle change beaucoup d'une graine à l'autre.
import { dispositionAvion, dispositionChar, EPAVES } from '../js/epaves.js';
import { ARBRES_COURONNES, ARBRES_FAMILLES, ARBRES_VARIANTES } from '../js/data/arbres.js';

group('épaves — avions');
test('la même graine donne la même épave, une autre graine une autre', () => {
  assert.deepEqual(dispositionAvion(7), dispositionAvion(7));
  assert.notDeepEqual(dispositionAvion(7), dispositionAvion(8));
});
test('au moins trois pièces libres sur huit, le fuselage ne l\'est jamais, rien n\'est NaN', () => {
  for (let g = 1; g <= 400; g++) {
    const D = dispositionAvion(g), libres = Object.entries(D.pieces).filter(([n, p]) => n !== 'fuselage' && p.libre);
    assert.ok(libres.length >= EPAVES.avion.auMoins, `graine ${g} : ${libres.length} libres`);
    assert.equal(D.pieces.fuselage.libre, false);
    for (const p of Object.values(D.pieces)) for (const k of ['dx', 'dz', 'yaw', 'roulis', 'tangage', 'enfonce']) assert.ok(Number.isFinite(p[k]), `${g} ${k}`);
  }
});
test('le chaos : sur 200 graines, toutes les pièces partent parfois seules, parfois non ; le fuselage prend les trois attitudes ; la dispersion va de quelques mètres à plus de quinze', () => {
  const part = {}, att = { plat: 0, flanc: 0, dos: 0 }; let loin = 0, pres = 0, brules = 0;
  for (let g = 1; g <= 200; g++) {
    const D = dispositionAvion(g);
    for (const [n, p] of Object.entries(D.pieces)) { if (n !== 'fuselage') part[n] = (part[n] ?? 0) + (p.libre ? 1 : 0); if (p.brule) brules++; if (p.libre) { const d = Math.hypot(p.dx, p.dz); if (d > 15) loin++; if (d < 6) pres++; } }
    const r = Math.abs(D.pieces.fuselage.roulis); att[r > 2.6 ? 'dos' : r > 0.9 ? 'flanc' : 'plat']++;
  }
  for (const [n, k] of Object.entries(part)) assert.ok(k > 40 && k < 200, `${n} libre ${k} fois sur 200`);
  assert.ok(att.plat > 40 && att.flanc > 30 && att.dos > 8, JSON.stringify(att));
  assert.ok(loin > 100 && pres > 30, `loin ${loin}, près ${pres}`);
  assert.ok(brules > 150);
});
group('épaves — chars');
test('la même graine donne le même char détruit ; chaque côté de chenille, la caisse, la coupole et le canon prennent toutes leurs formes ; il ne reste pas deux chars semblables', () => {
  assert.deepEqual(dispositionChar(3), dispositionChar(3));
  const vus = { chenille: new Set(), eventre: new Set(), coupole: new Set(), canon: new Set(), brule: new Set() }, signatures = new Set();
  for (let g = 1; g <= 120; g++) {
    const D = dispositionChar(g);
    D.chenilles.forEach(c => vus.chenille.add(c)); vus.eventre.add(D.eventre); vus.coupole.add(D.coupole); vus.canon.add(D.canon); vus.brule.add(D.brule);
    signatures.add(JSON.stringify([D.chenilles, D.eventre, D.coupole, D.canon, D.brule]));
    assert.ok(D.debris.length >= 4 && D.debris.every(d => Number.isFinite(d.dx + d.dz + d.yaw)));
  }
  assert.equal(vus.chenille.size, 3); assert.equal(vus.eventre.size, 3); assert.equal(vus.coupole.size, 3); assert.equal(vus.canon.size, 3); assert.equal(vus.brule.size, 3);
  assert.ok(signatures.size > 100, `${signatures.size} combinaisons sur 120 chars`);
});
test('la moitié des chars au plus ont deux chenilles intactes, et presque aucun n\'est sans aucun dégât', () => {
  let deuxIntactes = 0, sansDegat = 0;
  for (let g = 1; g <= 300; g++) { const D = dispositionChar(g); if (D.chenilles.every(c => c === 'intacte')) deuxIntactes++; if (D.chenilles.every(c => c === 'intacte') && D.eventre === 'non' && D.brule === 'non') sansDegat++; }
  assert.ok(deuxIntactes < 150, `${deuxIntactes} sur 300`); assert.ok(sansDegat < 12, `${sansDegat} sans aucun dégât`);
});
group('arbres — les formes de couronne');
test('chaque famille a ses formes, et trois variantes de largeur', () => {
  const connues = new Set(['dome', 'boule', 'galette', 'colonne', 'cone', 'irregulier']);
  for (const F of ARBRES_FAMILLES) { const f = ARBRES_COURONNES[F.id]; assert.ok(f?.length >= 1, F.id); assert.ok(f.every(n => connues.has(n)), F.id); }
  assert.equal(ARBRES_VARIANTES.largeur.length, ARBRES_VARIANTES.n);
  const toutes = new Set(Object.values(ARBRES_COURONNES).flat()); assert.ok(toutes.size >= 5, 'au moins cinq formes en tout : plus des champignons');
});
