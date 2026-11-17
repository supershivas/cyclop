// L'aspect d'un soldat (js/aspect-soldat.js) et le modèle articulé (js/rendu/soldat-articule.js) : le même homme pour le même numéro, des valeurs dans leurs bornes,
// des listes qui servent toutes, et une géométrie sans nombre fou. Le dessin seulement : aucune de ces valeurs n'entre dans la partie.
import { aspect, aspectEnMots } from '../js/aspect-soldat.js';
import { identite, caracteristiques } from '../js/identite.js';
import { COIFFES, CHEVEUX, BARBES, PEAUX, ACCESSOIRES } from '../js/data/aspect-soldat.js';
import { modeleArticule, boites, voir, trianglesVisibles, OS } from '../js/rendu/soldat-articule.js';

const homme = (id, camp = 0, graine = 7) => {
  const I = identite(graine, camp, id, id % 125, 125), c = caracteristiques(id, camp);
  return aspect(id, camp, graine, I.rang, I.age, c);
};

group('aspect — un homme, un visage');
test('le même numéro donne le même homme', () => {
  for (let id = 0; id < 200; id++) assert.deepEqual(homme(id), homme(id));
});
test('une autre graine ou un autre camp change les hommes', () => {
  let a = 0, b = 0;
  for (let id = 0; id < 200; id++) { if (JSON.stringify(homme(id)) !== JSON.stringify(homme(id, 0, 8))) a++; if (JSON.stringify(homme(id)) !== JSON.stringify(homme(id, 1))) b++; }
  assert.ok(a > 190 && b > 190, `${a} ${b}`);
});
test('toutes les valeurs restent dans leurs listes et leurs bornes', () => {
  for (let id = 0; id < 3000; id++) for (const camp of [0, 1]) {
    const h = homme(id, camp), c = h.carrure, t = h.traits;
    assert.ok(h.coiffe >= 0 && h.coiffe < COIFFES.length && Number.isInteger(h.coiffe));
    assert.ok(h.cheveux >= 0 && h.cheveux < CHEVEUX.length);
    assert.ok(h.couleur >= 0 && h.couleur < 5);
    assert.ok(h.barbe >= 0 && h.barbe < BARBES.length);
    assert.ok(h.peau >= 0 && h.peau < PEAUX.length);
    for (const v of Object.values(t)) assert.ok(v >= 0 && v < 3 && Number.isInteger(v));
    assert.ok(h.acc >= 0 && h.acc < (1 << ACCESSOIRES.length));
    for (const [k, v] of Object.entries(c)) assert.ok(v > 0.7 && v < 1.4, `${k} ${v}`);
  }
});
test('chaque coiffe, barbe, couleur et accessoire se rencontre', () => {
  const coiffes = new Set(), barbes = new Set(), cheveux = new Set(), couleurs = new Set(), acc = new Set(), peaux = new Set();
  for (let id = 0; id < 4000; id++) for (const camp of [0, 1]) {
    const h = homme(id, camp);
    coiffes.add(h.coiffe); barbes.add(h.barbe); cheveux.add(h.cheveux); couleurs.add(h.couleur); peaux.add(h.peau);
    ACCESSOIRES.forEach((_, k) => { if (h.acc & (1 << k)) acc.add(k); });
  }
  assert.equal(coiffes.size, COIFFES.length); assert.equal(barbes.size, BARBES.length); assert.equal(cheveux.size, CHEVEUX.length);
  assert.equal(couleurs.size, 5); assert.equal(peaux.size, PEAUX.length); assert.equal(acc.size, ACCESSOIRES.length);
});
test('tous les hommes portent le casque de leur armée, et le gris vient avec l\'âge', () => {
  let jeunes = 0, grisJ = 0, vieux = 0, grisV = 0;
  for (let id = 0; id < 4000; id++) {
    const I = identite(7, 0, id, 99, 125), h = aspect(id, 0, 7, I.rang, I.age);
    assert.equal(h.coiffe, 0);
    if (I.age < 25) { jeunes++; if (h.couleur === 4) grisJ++; } else if (I.age > 37) { vieux++; if (h.couleur === 4) grisV++; }
  }
  assert.ok(grisV / vieux > grisJ / jeunes + 0.1, `${grisJ / jeunes} ${grisV / vieux}`);
});
test('un officier ne porte ni pelle ni grenades ; un soldat n\'a pas de jumelles', () => {
  const pelle = ACCESSOIRES.findIndex(a => a.id === 'pelle'), grenades = ACCESSOIRES.findIndex(a => a.id === 'grenades'), jumelles = ACCESSOIRES.findIndex(a => a.id === 'jumelles');
  for (let id = 0; id < 3000; id++) {
    const off = aspect(id, 0, 7, 0, 35), sol = aspect(id, 0, 7, 6, 25);
    assert.equal(off.acc & ((1 << pelle) | (1 << grenades)), 0);
    assert.equal(sol.acc & (1 << jumelles), 0);
  }
});
test('les plus forts ont les épaules plus larges, les plus vieux plus de ventre', () => {
  let faible = 0, fort = 0, jeune = 0, vieux = 0;
  for (let id = 0; id < 500; id++) {
    faible += aspect(id, 0, 7, 6, 25, [50, 15, 50, 50]).carrure.epaules; fort += aspect(id, 0, 7, 6, 25, [50, 85, 50, 50]).carrure.epaules;
    jeune += aspect(id, 0, 7, 6, 20).carrure.ventre; vieux += aspect(id, 0, 7, 6, 42).carrure.ventre;
  }
  assert.ok(fort > faible && vieux > jeune);
});
test('l\'aspect se dit en mots', () => {
  const mots = aspectEnMots(homme(12));
  assert.ok(mots.length >= 2 && mots.every(m => typeof m === 'string' && m.length));
});

group('soldat articulé — la géométrie');
test('le modèle n\'a aucun nombre fou, ses os et ses parties sont connus', () => {
  const M = modeleArticule();
  assert.ok(M.position.every(Number.isFinite) && M.boites > 60);
  assert.equal(M.position.length, M.triangles * 9);
  assert.equal(M.part.length, M.triangles * 3);
  const os = Object.values(OS);
  for (const o of M.os) assert.ok(os.includes(o), `os ${o}`);
  for (const [x0, x1, y0, y1, z0, z1] of boites()) assert.ok(x0 < x1 && y0 < y1 && z0 < z1, 'une boîte à l\'envers');
});
test('le modèle complet a deux triangles de plus par boîte', () => {
  const M = modeleArticule(), dos = boites().filter(b => b[13]?.prisme && b[12] !== 2).reduce((n, b) => n + b[13].prisme.length - 2, 0);      // (les profils extrudés : leur face arrière)
  assert.equal(modeleArticule({ complet: true }).triangles - M.triangles, M.boites * 2 + dos);
});
test('chaque condition de visibilité sert à quelqu\'un', () => {
  const codes = new Set(boites().map(b => b[8]));
  for (const code of codes) {
    let vu = false;
    for (let id = 0; id < 6000 && !vu; id++) for (const camp of [0, 1]) for (const bl of [0, 1, 2, 3]) if (voir(code, homme(id, camp), camp, bl)) vu = true;
    assert.ok(vu, `code ${code}`);
  }
});
test('les officiers ont un pistolet et pas de fusil, les autres un fusil', () => {
  for (let id = 0; id < 400; id++) for (const camp of [0, 1]) for (const rang of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const a = aspect(id, camp, 7, rang, 30);
    assert.equal(voir(1000, a, camp), rang <= 2); assert.equal(voir(1100, a, camp), rang > 2);
  }
});
test('le casque se porte toujours, sauf à la blessure à la tête (les cheveux se voient alors)', () => {
  const a = aspect(5, 0, 7, 6, 25); a.cheveux = 2;
  for (const camp of [0, 1]) {
    assert.ok(voir(1500 + camp, a, camp, 0) && voir(1500 + camp, a, camp, 1) && voir(1500 + camp, a, camp, 2));
    assert.ok(!voir(1500 + camp, a, camp, 3) && voir(202, a, camp, 3) && !voir(202, a, camp, 0));
    assert.ok(voir(1500 + (1 - camp), a, camp, 0) === false);          // le casque de l'autre armée jamais
  }
});
test('galons : barrettes blanches françaises, épaulettes et galon de col allemands', () => {
  const fr = r => aspect(1, 0, 7, r, 30), de = r => aspect(1, 1, 7, r, 30);
  // officiers français : trois, deux, une barrettes larges (1700 : rang ≤ 0, 1701 : ≤ 1, 1702 : ≤ 2)
  assert.deepEqual([0, 1, 2].map(r => [1700, 1701, 1702].filter(c => voir(c, fr(r), 0)).length), [3, 2, 1]);
  // sous-officiers français : minces (2005 : rang 3 à 5, 2004 : 3 à 4, 2003 : 3)
  assert.deepEqual([3, 4, 5].map(r => [2005, 2004, 2003].filter(c => voir(c, fr(r), 0)).length), [3, 2, 1]);
  assert.ok(![6, 7].some(r => [1700, 1701, 1702, 2003, 2004, 2005].some(c => voir(c, fr(r), 0))));
  // les Allemands n'ont pas de barrettes de manche : épaulettes (officiers, 1800 à 1802), galon de col (sous-officiers, 2103 à 2105)
  assert.ok(![0, 1, 2, 3, 4, 5].some(r => [1700, 1701, 1702, 2003, 2004, 2005].some(c => voir(c, de(r), 1))));
  assert.deepEqual([0, 1, 2].map(r => [1800, 1801, 1802].filter(c => voir(c, de(r), 1)).length), [3, 2, 1]);
  assert.ok(![3, 4, 5, 6, 7].some(r => voir(1802, de(r), 1)));
  assert.deepEqual([3, 4, 5].map(r => [2103, 2104, 2105].filter(c => voir(c, de(r), 1)).length), [3, 2, 1]);
  // et les Français n'ont ni épaulettes ni galon de col
  assert.ok(![0, 1, 2, 3, 4, 5].some(r => [1800, 1801, 1802, 2103, 2104, 2105].some(c => voir(c, fr(r), 0))));
});
test('un homme dessine entre 200 et 800 triangles (les autres sont aplatis ; 800 depuis les épaules et le crâne arrondis, v0.144.5)', () => {
  let min = 1e9, max = 0, somme = 0;
  for (let id = 0; id < 1000; id++) { const n = trianglesVisibles(homme(id), 0); min = Math.min(min, n); max = Math.max(max, n); somme += n; }
  assert.ok(min >= 200 && max <= 800, `${min} ${max}`);
  console.log(`  triangles dessinés par homme : ${min} à ${max}, moyenne ${Math.round(somme / 1000)} ; modèle entier ${modeleArticule().triangles} (${modeleArticule({ complet: true }).triangles} complet)`);
});
test('le niveau intermédiaire dessine nettement moins que le fin, et jamais ce qu\'il ne montre pas', () => {
  let fin = 0, moyen = 0;
  for (let id = 0; id < 600; id++) for (const camp of [0, 1]) {
    const a = homme(id, camp);
    fin += trianglesVisibles(a, camp, 0, { niveau: 'fin' }); moyen += trianglesVisibles(a, camp, 0, { niveau: 'moyen' });
  }
  console.log(`  par homme : fin ${Math.round(fin / 1200)}, intermédiaire ${Math.round(moyen / 1200)} triangles (modèles entiers ${modeleArticule().triangles} et ${modeleArticule({ niveau: 'moyen' }).triangles})`);
  assert.ok(moyen < fin * 0.72, `${moyen} ${fin}`);
  assert.ok(modeleArticule({ niveau: 'moyen' }).triangles < modeleArticule().triangles);
  // les deux niveaux partagent le corps : mêmes os et mêmes parties pour ce qui est commun
  const corps = n => boites().filter(b => b[12] === 0).length;
  assert.ok(corps() > 40);
});

group('les casques de près (labo, v0.143.3)');
import { reglerCasques, STYLES_CASQUE, CASQUE_JEU, modeleArticule as modeleCasques } from '../js/rendu/soldat-articule.js';
test('le jeu porte le dôme à 8 pans ; un dôme tourné coûte peu (8 pans) ou un cinquième (16 pans) ; tout revient au style du jeu', () => {
  assert.equal(CASQUE_JEU, 'tour8');
  const jeu = modeleCasques().triangles, compte = {};
  for (const st of STYLES_CASQUE) { reglerCasques(st); compte[st] = modeleCasques().triangles; }
  reglerCasques();
  assert.equal(modeleCasques().triangles, jeu);
  assert.equal(compte.tour8, jeu);
  const ref = compte.anneaux;
  assert.ok(compte.tour8 - ref < 60, `tour8 +${compte.tour8 - ref}`);
  assert.ok(compte.tour16 > compte.tour8 && compte.tour16 - ref < 260, `tour16 +${compte.tour16 - ref}`);
  assert.equal(reglerCasques('inconnu'), CASQUE_JEU);
});
import { reglerArrondi, ARRONDI_JEU, trianglesVisibles as triVis } from '../js/rendu/soldat-articule.js';
import { aspect as aspectDe } from '../js/aspect-soldat.js';
test('les épaules et le crâne arrondis : seulement au niveau fin, quelques dizaines de triangles de plus, et tout revient au réglage du jeu', () => {
  const a = aspectDe(5, 0, 7, 6, 25);
  reglerArrondi(false); const avant = [triVis(a, 0), triVis(a, 0, 0, { niveau: 'moyen' })];
  reglerArrondi(true);
  const apres = [triVis(a, 0), triVis(a, 0, 0, { niveau: 'moyen' })], M = modeleCasques();
  reglerArrondi();
  assert.equal(apres[1], avant[1], 'le niveau intermédiaire ne change pas');
  assert.ok(apres[0] > avant[0] && apres[0] - avant[0] < 140, `+${apres[0] - avant[0]}`);
  assert.ok(M.position.every(Number.isFinite) && M.tours > 2);
  assert.equal(triVis(a, 0), ARRONDI_JEU ? apres[0] : avant[0]);
});
