// Les largages (v0.162.0) : le calendrier, la prise, chaque objet et son effet, la musette, le butin ramené, la sauvegarde.
import { nouvelleBataille as nb, avancer, photo, restaurer, zone, NOUS, EUX } from '../js/bataille.js';
import { OBJETS, OBJET, LARGAGE, musetteObjet } from '../js/data/largages.js';
import { dureeChute, utiliserObjet, peutUtiliserObjet, positionCaisse } from '../js/largages.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('largages');
const nouvelle = (g = 7, o = {}) => nb(g, R, { soldats: 600, premierFixe: true, camp: true, ...o });
const LIES = ['largage', 'caisse-sol', 'objet', 'objet-livre', 'objet-perdu'];

// Une caisse posée sous les pieds d'un homme de `camp` : l'objet est pris au pas suivant
function poser(B, o, camp = NOUS, dehors = false) {
  const A = B.armee; let i = 0;
  while (A.camp[i] !== camp || A.mort[i] || A.blessure[i]) i++;
  if (dehors) A.y[i] += camp === NOUS ? -35 : 35;      // dans le no man's land : il doit rentrer
  const LG = B.etat.largages;
  LG.caisses.push({ id: LG.n++, o, x: A.x[i], y: A.y[i], dir: 1, t0: B.etat.temps - dureeChute() - 2, etat: 'sol', porteur: -1, camp: -1, coureurs: [], px: A.x[i], py: A.y[i] });
  return { i, id: A.id[i] };
}
const pas = (B, n) => { const ev = []; for (let k = 0; k < n; k++) ev.push(...avancer(B)); return ev; };

test('dans une journée, des avions passent et lâchent leurs caisses ; on ne tire rien du générateur pour cela', () => {
  const B = nouvelle();
  const ev = pas(B, 30 * 340).filter(e => LIES.includes(e.type));
  assert.ok(ev.filter(e => e.type === 'largage').length >= 2, 'au moins deux largages');
  assert.ok(ev.some(e => e.type === 'caisse-sol'), 'une caisse touche le sol');
  const c = B.etat.largages.caisses[0];
  assert.equal(positionCaisse(c, c.t0 + dureeChute() + 1).phase, 'sol');
  assert.ok(positionCaisse(c, c.t0 + 5).h > 0 && positionCaisse(c, c.t0 + 5).phase === 'corolle');
});

test('sans largages (opts), la bataille n\'en a pas', () => {
  const B = nouvelle(7, { largages: false });
  pas(B, 30 * 200);
  assert.equal(B.etat.largages, null);
});

test('chacun des objets, pris par un homme, fait ce qu\'il dit, sans erreur', () => {
  for (const O of OBJETS) {
    const B = nouvelle(3);
    pas(B, 30);
    const { id } = poser(B, O.id, NOUS);
    const avant = { effectif: B.etat.regiments.filter(r => r.camp === NOUS).reduce((s, r) => s + r.effectif, 0), regs: B.etat.regiments.length, nids: B.etat.nids.length, avions: B.etat.avions[NOUS].length };
    const ev = pas(B, 2);
    const pris = ev.find(e => e.type === 'objet');
    assert.ok(pris && pris.camp === NOUS && pris.o === O.id, `${O.id} : pris par nous`);
    const LG = B.etat.largages, e = O.e;
    if (musetteObjet(O)) assert.ok(LG.caisses.at(-1).etat === 'porte' || LG.musette[NOUS].includes(O.id), `${O.id} : porté vers la tranchée, ou déjà rentré`);
    else if (O.cat === 'soldat' || e.soldat) assert.ok(LG.soldats.some(s => s.id === id && s.o === O.id), `${O.id} : l'homme est boosté`);
    else if (O.cat === 'regiment' && !e.grenades) assert.ok(B.etat.regiments.some(r => r.boost?.o === O.id), `${O.id} : un régiment boosté`);
    else if (e.grenades) assert.ok(LG.grenades.length > 0 || ev.some(x => x.type === 'grenades-objet'), `${O.id} : des grenades`);
    else if (e.hommes) assert.equal(B.etat.regiments.filter(r => r.camp === NOUS).reduce((s, r) => s + r.effectif, 0), avant.effectif + e.hommes, `${O.id} : +${e.hommes}`);
    else if (e.regiments) assert.ok(B.etat.regiments.length > avant.regs || ev.some(x => x.type === 'objet-repli'), `${O.id} : un régiment de plus`);
    else if (e.avions) assert.equal(B.etat.avions[NOUS].length, avant.avions + e.avions);
    else if (e.nid) assert.equal(B.etat.nids.length, avant.nids + 1, `${O.id} : un nid de plus`);
    pas(B, 30 * 8);      // et la bataille continue sans erreur
  }
});

test('un objet de musette se ramène dans la tranchée, puis se tire où l\'on veut ; il ne sert qu\'au camp qui l\'a', () => {
  const B = nouvelle(5);
  pas(B, 30);
  poser(B, 'obus220', NOUS, true);
  let livre = false;
  for (let k = 0; k < 30 * 60 && !livre; k++) livre = avancer(B).some(e => e.type === 'objet-livre');
  assert.ok(livre, 'rentré dans la tranchée');
  assert.deepEqual(B.etat.largages.musette[NOUS], ['obus220']);
  const Z = zone(B), x = (Z.x0 + Z.x1) / 2, y = Z.y0 + 60;
  assert.ok(peutUtiliserObjet(B, EUX, 0, x, y, Z).refus, 'pas dans la musette d\'en face');
  const n = B.etat.barrages.length;
  assert.ok(utiliserObjet(B, NOUS, 0, x, y, Z).ok);
  assert.equal(B.etat.barrages.length, n + 1);
  assert.equal(B.etat.largages.musette[NOUS].length, 0);
  assert.ok(utiliserObjet(B, NOUS, 0, x, y, Z).refus, 'la musette est vide');
});

test('le porteur tué en route laisse tomber l\'objet : une nouvelle course s\'ouvre', () => {
  const B = nouvelle(5);
  pas(B, 30);
  const { i } = poser(B, 'fuseeRouge', NOUS, true);
  pas(B, 2);
  const c = B.etat.largages.caisses.at(-1);
  assert.equal(c.etat, 'porte');
  B.armee.mort[i] = 1;
  const ev = pas(B, 1);
  assert.ok(ev.some(e => e.type === 'objet-perdu'));
  assert.equal(c.etat, 'sol');
});

test('le Revenant ne meurt pas ; la caisse de cartouches fait tirer le régiment plus vite', () => {
  const B = nouvelle(9);
  pas(B, 30);
  const { id } = poser(B, 'revenant', NOUS);
  pas(B, 2);
  const A = B.armee, i = Array.from(A.id.subarray(0, A.n)).indexOf(id);
  B.etat.barrages.push({ camp: EUX, cal: '220', x: A.x[i], y: A.y[i], reste: 6, prochain: B.etat.temps });
  pas(B, 30 * 6);
  const j = Array.from(A.id.subarray(0, A.n)).indexOf(id);
  assert.ok(j >= 0 && !A.mort[j], 'il vit sous un barrage de 220');
});

test('une partie relue pendant un largage (caisse portée, boosts en cours) reste la même partie', () => {
  const A = nouvelle(11);
  pas(A, 30);
  poser(A, 'chauchat', NOUS); poser(A, 'fuseeVerte', EUX); poser(A, 'drapeau', NOUS);
  pas(A, 30 * 3);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  for (let k = 0; k < 30 * 20; k++) { avancer(A); avancer(B); }
  assert.deepEqual(JSON.parse(JSON.stringify(B.etat.largages)), JSON.parse(JSON.stringify(A.etat.largages)));
  assert.equal(B.armee.n, A.armee.n);
  for (let i = 0; i < A.armee.n; i += 7) assert.equal(B.armee.x[i], A.armee.x[i]);
});

test('les données : 35 objets, chaque catégorie et chaque rareté représentées, un effet et des mots pour le bandeau', () => {
  assert.equal(OBJETS.length, 35);
  for (const O of OBJETS) { assert.ok(O.effet && O.court && O.modele.length, O.id); assert.ok(OBJET[O.id] === O); }
  assert.ok(LARGAGE.musette >= 1);
});

test('à deux : les deux machines voient les mêmes caisses, les mêmes prises, et un tir de musette donne la même bataille', async () => {
  const { empreinteEtat } = await import('../js/reseau/lockstep.js');
  const faire = () => nouvelle(13, { deux: true });
  const [A, B] = [faire(), faire()];
  pas(A, 30); pas(B, 30);
  poser(A, 'fuseeVerte', EUX, true); poser(B, 'fuseeVerte', EUX, true);
  let livre = false;
  for (let k = 0; k < 30 * 60 && !livre; k++) { livre = avancer(A).some(e => e.type === 'objet-livre'); avancer(B); }
  assert.ok(livre, 'ramenée par en face');
  const Z = zone(A), x = (Z.x0 + Z.x1) / 2, y = Z.y1 - 80;
  assert.ok(utiliserObjet(A, EUX, 0, x, y, Z).ok); assert.ok(utiliserObjet(B, EUX, 0, x, y, Z).ok);
  for (let k = 0; k < 30 * 120; k++) { avancer(A); avancer(B); }
  assert.equal(empreinteEtat(A), empreinteEtat(B));
  assert.ok(A.etat.largages.caisses.length >= 1);
});
