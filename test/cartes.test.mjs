// Les cartes du soir (lot 1) : le tirage à graine, les règles des paquets et des raretés, la carte gardée qui monte, les refus, la sauvegarde.
import { CARTES, FAMILLES_CARTES, ORDRE_FAMILLES, PAQUETS, GLOSSAIRE_CARTES } from '../js/data/cartes.js';
import { ORDRE_RARETES } from '../js/data/largages.js';
import { tirerOffre, offrirCartes, ouvrirPaquet, garderCarte, cartesDeDepart, cartesProposables } from '../js/cartes.js';
import { nouvelleBataille as nb, photo, restaurer } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('cartes du soir');
const RANG = Object.fromEntries(ORDRE_RARETES.map((r, k) => [r, k]));

test('les données : chaque carte a une famille connue, un nom, une image et ses six raretés ; chaque famille a des cartes ; les termes ont leur bulle', () => {
  for (const C of Object.values(CARTES)) {
    assert.ok(FAMILLES_CARTES[C.famille], C.id);
    assert.ok(C.nom && C.image, C.id);
    for (const r of ORDRE_RARETES) {
      assert.ok(typeof C.r[r] === 'string' && C.r[r].length > 10, `${C.id} ${r}`);
      for (const m of C.r[r].matchAll(/\[\[([^\]|]+)/g)) assert.ok(GLOSSAIRE_CARTES[m[1]], `${C.id} ${r} : [[${m[1]}]] sans bulle`);
    }
  }
  for (const f of ORDRE_FAMILLES) assert.ok(cartesProposables(f, {}).length >= 3, f);
  assert.equal(ORDRE_FAMILLES.length, 6);
});

test('le tirage est pur (même graine, même soir : même offre) et suit les règles : trois familles distinctes, 3 à 5 cartes, brillant et rose', () => {
  assert.deepEqual(tirerOffre(7, 3), tirerOffre(7, 3));
  assert.notDeepEqual(tirerOffre(7, 3), tirerOffre(7, 4));
  const n = { commun: 0, brillant: 0, rose: 0 }, rar = Object.fromEntries(ORDRE_RARETES.map(r => [r, 0]));
  for (let s = 1; s <= 2000; s++) {
    const O = tirerOffre(11, s);
    assert.equal(O.paquets.length, 3);
    assert.equal(new Set(O.paquets.map(p => p.famille)).size, 3);
    for (const p of O.paquets) {
      n[p.rarete]++;
      assert.ok(p.cartes.length >= 3 && p.cartes.length <= 5);
      for (const [id, r] of p.cartes) { assert.equal(CARTES[id].famille, p.famille); rar[r]++; }
      if (p.rarete === 'brillant') assert.ok(p.cartes.some(([, r]) => RANG[r] >= RANG.rare));
      if (p.rarete === 'rose') assert.ok(p.cartes.some(([, r]) => r === 'relique'));
    }
  }
  // 6 000 paquets : environ 70 / 25 / 5 sur 100
  assert.ok(n.commun > 3900 && n.commun < 4500 && n.rose > 200 && n.rose < 420, JSON.stringify(n));
  assert.ok(rar.commun > rar.peuCommun && rar.peuCommun > rar.rare && rar.rare > rar.epique);
});

test('une carte en stock n\'est jamais tirée (Jérôme, 27 nov.)', () => {
  const stock = new Set(Object.values(CARTES).filter(C => C.stock).map(C => C.id));
  assert.ok(stock.has('cheddite') && stock.has('coureurs'));
  for (let s = 1; s <= 1000; s++) for (const p of tirerOffre(9, s).paquets) for (const [id] of p.cartes) assert.ok(!stock.has(id), id);
});

test('on ouvre un paquet, on garde une carte ; les refus sont dits à voix haute', () => {
  const etat = { graine: 5, jour: 2, cartes: cartesDeDepart() };
  assert.ok(garderCarte(etat, 0).refus);
  assert.ok(ouvrirPaquet(etat, 0).refus);
  const { offre } = offrirCartes(etat);
  assert.equal(offrirCartes(etat).offre, offre, 'relue telle quelle le même soir');
  assert.ok(garderCarte(etat, 0).refus, 'pas de paquet ouvert');
  assert.ok(ouvrirPaquet(etat, 9).refus);
  assert.ok(ouvrirPaquet(etat, 1).ok);
  assert.ok(ouvrirPaquet(etat, 2).refus, 'un seul paquet par soir');
  assert.ok(garderCarte(etat, 99).refus);
  const [id, r] = offre.paquets[1].cartes[0];
  const g = garderCarte(etat, 0);
  assert.deepEqual([g.id, g.rarete], [id, r]);
  assert.equal(etat.cartes.tenues[id], r);
  assert.equal(etat.cartes.offre, null);
  assert.deepEqual(etat.cartes.histo, [[2, id, r]]);
  assert.ok(offrirCartes({ graine: 5, jour: 2, cartes: null }).refus);
});

test('une carte tenue revient à la rareté au-dessus ; tenue mythique, elle ne revient plus', () => {
  const tenues = { depot: 'rare' };
  for (let s = 1; s <= 400; s++) for (const p of tirerOffre(3, s, tenues).paquets) for (const [id, r] of p.cartes) if (id === 'depot') assert.ok(RANG[r] >= RANG.epique, r);
  const toutes = Object.fromEntries(Object.values(CARTES).filter(C => C.famille === 'musette' && C.id !== 'depot').map(C => [C.id, 'relique']));
  for (let s = 1; s <= 400; s++) for (const p of tirerOffre(3, s, toutes).paquets) for (const [id] of p.cartes) assert.ok(toutes[id] !== 'relique', id);
  // toute une famille tenue mythique : elle n'est plus tirée
  const famille = Object.fromEntries(Object.values(CARTES).filter(C => C.famille === 'musette').map(C => [C.id, 'relique']));
  for (let s = 1; s <= 200; s++) assert.ok(!tirerOffre(3, s, famille).paquets.some(p => p.famille === 'musette'));
  // gardée de nouveau, elle prend la rareté proposée (au-dessus)
  const etat = { graine: 3, jour: 1, cartes: { tenues: { depot: 'commun' }, histo: [], offre: { soir: 1, ouvert: 0, paquets: [{ famille: 'musette', rarete: 'commun', cartes: [['depot', 'peuCommun']] }] } } };
  const g = garderCarte(etat, 0);
  assert.ok(g.monte);
  assert.equal(etat.cartes.tenues.depot, 'peuCommun');
});

test('la bataille : sans l\'option, pas de cartes ; avec, l\'état des cartes se sauvegarde et se relit', () => {
  assert.equal(nb(7, R, { soldats: 200 }).etat.cartes, null);
  const B = nb(7, R, { soldats: 200, cartes: true });
  offrirCartes(B.etat, 1); ouvrirPaquet(B.etat, 2); garderCarte(B.etat, 1);
  offrirCartes(B.etat, 2);
  const C = restaurer(photo(B), R);
  assert.deepEqual(C.etat.cartes, B.etat.cartes);
});
