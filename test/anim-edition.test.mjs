// L'édition des images clés (js/anim-edition.js) : la logique pure de la frise de l'atelier d'animation.
import { poseNeutre, poseDe, echantillon, borner } from '../js/pose-soldat.js';
import * as E from '../js/anim-edition.js';

const proche = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clip = (ts = [0, 0.2, 0.5, 1], mode = 'unefois') => ({ nom: 'essai', mode, duree: 1, images: ts.map((t, n) => ({ id: `k${n + 1}`, t, pose: { ...poseNeutre(), buste: n * 0.1 }, courbe: 'lineaire' })) });
const temps = a => a.images.map(i => +i.t.toFixed(4));
const ids = a => a.images.map(i => i.id);

group('frise — créer');
test('ajouter une image : rangée par temps, numéro neuf, durée étendue ; à un instant déjà pris, la pose est remplacée', () => {
  const a = clip();
  const k = E.ajouterCle(a, 0.35, { ...poseNeutre(), buste: 9 }, 'doux');
  assert.deepEqual(temps(a), [0, 0.2, 0.35, 0.5, 1]); assert.ok(!ids(a).slice(0, 2).includes(k.id) && new Set(ids(a)).size === 5);
  const m = E.ajouterCle(a, 0.5, { ...poseNeutre(), buste: -2 }); assert.equal(m.id, 'k3'); assert.equal(a.images.length, 5); assert.equal(m.pose.buste, -2);
  E.ajouterCle(a, 2.5, poseNeutre()); assert.equal(a.duree, 2.5);
});
test('insérer entre deux images : au milieu, avec la pose que donne l\'interpolation', () => {
  const a = clip([0, 1]); a.images[1].pose.buste = 1;
  const k = E.insererEntre(a, 'k1'); assert.ok(proche(k.t, 0.5) && proche(k.pose.buste, 0.5));
  const d = E.insererEntre(a, 'k2'); assert.ok(d.t > 0.5 && d.t < 1);              // (la dernière : avec la précédente)
});
test('maintenir une pose : une image identique plus loin, la pose dure', () => {
  const a = clip([0, 1]); const m = E.maintenir(a, 'k1', 0.9);          // (k2 a un buste de 0,1 : la pose de k1 tient jusqu'à 0,9, puis rejoint k2)
  assert.ok(proche(m.t, 0.9) && proche(echantillon(a, 0.6).buste, 0) && echantillon(a, 0.95).buste > 0.04); assert.equal(E.maintenir(a, 'k1', 0), null);
});

group('frise — supprimer, dupliquer, copier, coller');
test('supprimer : les images choisies partent, il en reste toujours une', () => {
  const a = clip(); assert.equal(E.supprimerCles(a, ['k2', 'k3']), 2); assert.deepEqual(ids(a), ['k1', 'k4']);
  E.supprimerCles(a, ['k1', 'k4']); assert.equal(a.images.length, 1);
});
test('dupliquer : le groupe se recopie juste après lui, ou à un écart donné ; les nouvelles images ont leur numéro', () => {
  const a = clip([0, 0.2, 0.5, 1]); const n = E.dupliquerCles(a, ['k2', 'k3']);
  assert.equal(n.length, 2); assert.deepEqual(temps(a), [0, 0.2, 0.5, 0.6, 0.9, 1]); assert.equal(new Set(ids(a)).size, 6);
  const b = clip([0, 0.2]); E.dupliquerCles(b, ['k1'], { ecart: 0.5 }); assert.deepEqual(temps(b), [0, 0.2, 0.5]);
  const c = clip([0, 0.2]); E.dupliquerCles(c, ['k1']); assert.deepEqual(temps(c), [0, 0.1, 0.2]);        // (une image seule : un pas de 0,1 s)
  const d = clip([0, 0.2]); E.dupliquerCles(d, ['k2'], { ecart: 0.8 }); assert.equal(d.duree, 1); E.dupliquerCles(d, ['k2'], { ecart: 2 }); assert.ok(d.duree >= 2.2);
});
test('dupliquer sur une image existante : la copie la remplace', () => {
  const a = clip([0, 0.5]); a.images[0].pose.buste = 7; E.dupliquerCles(a, ['k1'], { ecart: 0.5 });
  assert.equal(a.images.length, 2); assert.equal(a.images[1].pose.buste, 7);
});
test('copier puis coller : les instants relatifs sont gardés, à l\'endroit voulu', () => {
  const a = clip([0, 0.2, 0.5, 1]), p = E.copierCles(a, ['k2', 'k3']);
  assert.ok(proche(p.span, 0.3) && p.cles.length === 2);
  const n = E.collerCles(a, p, 2); assert.equal(n.length, 2); assert.deepEqual(temps(a), [0, 0.2, 0.5, 1, 2, 2.3]);
  assert.equal(E.copierCles(a, []), null); assert.deepEqual(E.collerCles(a, null, 0), []);
});
test('coller par canaux : seuls les groupes choisis changent, le reste garde la pose de l\'animation', () => {
  const a = clip([0, 1]); a.images[0].pose = { ...poseNeutre(), brasD: 0, epauleD: 1, coudeD: 2, hancheG: 0.7, buste: 0.3 }; a.images[1].pose = { ...poseNeutre() };
  const p = E.copierCles(a, ['k1']); E.collerCles(a, p, 0.5, { canaux: ['brasD'] });
  const k = a.images.find(i => Math.abs(i.t - 0.5) < 1e-6);
  assert.equal(k.pose.epauleD, 1); assert.equal(k.pose.coudeD, 2);
  assert.ok(Math.abs(k.pose.hancheG - 0.7 * 0.5) < 0.2 || k.pose.hancheG !== 0.7, 'la jambe n\'a pas été collée');
  assert.notEqual(k.pose.buste, 0.3);
});

group('frise — le temps');
test('déplacer : jamais avant 0, et une image qui en recouvre une autre la remplace', () => {
  const a = clip([0.1, 0.4, 0.7]); const d = E.deplacerCles(a, ['k1', 'k2'], -0.5); assert.ok(proche(d, -0.1)); assert.deepEqual(temps(a), [0, 0.3, 0.7]);
  const b = clip([0, 0.5, 0.6]); E.deplacerCles(b, ['k1'], 0.5); assert.deepEqual(temps(b), [0.5, 0.6]); assert.equal(b.images[0].id, 'k1');
  assert.equal(E.deplacerCles(b, [], 1), 0);
});
test('étirer : autour du pivot, ou toute l\'animation avec sa durée', () => {
  const a = clip([0, 0.2, 0.5, 1]); E.etirerCles(a, null, 2); assert.deepEqual(temps(a), [0, 0.4, 1, 2]); assert.equal(a.duree, 2);
  const b = clip([0, 0.2, 0.5, 1]); E.etirerCles(b, ['k2', 'k3'], 2); assert.deepEqual(temps(b), [0, 0.2, 0.8, 1]);
  const c = clip([0, 0.2, 0.5]); E.etirerCles(c, ['k2', 'k3'], 2, 0); assert.deepEqual(temps(c), [0, 0.4, 1]);
});
test('inverser : l\'ordre se retourne sur l\'étendue, les courbes aussi', () => {
  const a = clip([0, 0.2, 0.5]); a.images[0].courbe = 'entree'; a.images[1].courbe = 'sortie';
  E.inverserCles(a); assert.deepEqual(temps(a), [0, 0.3, 0.5]); assert.deepEqual(ids(a), ['k3', 'k2', 'k1']);
  assert.equal(a.images.find(i => i.id === 'k2').courbe, 'sortie'); assert.equal(a.images.find(i => i.id === 'k3').courbe, 'entree');      // (le segment qui suit k3 est l'ancien k2→k3 à l'envers : « sortie » devient « entree »)
  const b = clip([0, 0.2, 0.5, 1]); E.inverserCles(b, ['k2', 'k3']); assert.deepEqual(ids(b), ['k1', 'k3', 'k2', 'k4']); assert.deepEqual(temps(b), [0, 0.2, 0.5, 1]);
  E.inverserCles(b, ['k1']);                                                                  // (une seule : rien)
});
test('répartir : espacement régulier entre la première et la dernière', () => {
  const a = clip([0, 0.1, 0.2, 1]); E.repartirCles(a, ['k1', 'k2', 'k3', 'k4']); assert.deepEqual(temps(a), [0, 0.3333, 0.6667, 1]);
  const b = clip([0, 1]); E.repartirCles(b, ['k1', 'k2']); assert.deepEqual(temps(b), [0, 1]);
});
test('quantifier : les instants se calent sur la grille d\'images', () => {
  const a = clip([0, 0.234, 0.5]); E.quantifierCles(a, null, 10); assert.deepEqual(temps(a), [0, 0.2, 0.5]);
  const b = clip([0, 0.21, 0.19]); E.quantifierCles(b, null, 10); assert.equal(b.images.length, 2);
});
test('ajuster la durée : la dernière image, plus la marge', () => {
  const a = clip([0, 0.6]); a.duree = 3; assert.equal(E.ajusterDuree(a), 0.6); assert.ok(proche(E.ajusterDuree(a, 0.2), 0.8));
});

group('frise — les poses');
test('miroir des images choisies : gauche et droite échangées, deux fois on retrouve la pose', () => {
  const a = clip([0, 1]); a.images[0].pose = { ...poseDe({ vit: 1, phase: 1 }), fusilX: -0.2 };
  const p0 = JSON.stringify(a.images[0].pose); E.miroirCles(a, ['k1']);
  assert.ok(Math.abs(a.images[0].pose.hancheG - poseDe({ vit: 1, phase: 1 }).hancheD) < 1e-12);
  E.miroirCles(a, ['k1']); for (const [c, v] of Object.entries(JSON.parse(p0))) assert.ok(Math.abs(a.images[0].pose[c] - v) < 1e-9, c);
});
test('courbe des images choisies ; une courbe inconnue est refusée', () => {
  const a = clip(); E.appliquerCourbe(a, ['k1', 'k2'], 'palier'); assert.equal(a.images[1].courbe, 'palier'); assert.equal(a.images[2].courbe, 'lineaire');
  E.appliquerCourbe(a, ['k3'], 'nimporte'); assert.equal(a.images[2].courbe, 'lineaire');
});
test('mélanger deux images : une image à la fraction k entre les deux', () => {
  const a = clip([0, 1]); a.images[1].pose.buste = 1; const k = E.melangerCles(a, 'k1', 'k2', 0.25); assert.ok(proche(k.t, 0.25) && proche(k.pose.buste, 0.25));
});

test('le glissé à la souris : on repasse sur une autre image sans la perdre, le recouvrement se règle au relâchement', () => {
  const a = clip([0, 0.5, 0.6]), ors = new Map([['k1', 0]]);
  assert.ok(proche(E.placerCles(a, ['k1'], ors, 0.5), 0.5)); assert.equal(a.images.length, 3);          // (au même instant que k2 : rien n'est encore perdu)
  assert.ok(proche(E.placerCles(a, ['k1'], ors, 0.2), 0.2)); assert.deepEqual(temps(a), [0.2, 0.5, 0.6]);
  assert.ok(proche(E.placerCles(a, ['k1'], ors, -3), 0)); assert.deepEqual(temps(a), [0, 0.5, 0.6]);       // (jamais avant 0)
  E.placerCles(a, ['k1'], ors, 0.5); E.finirDeplacement(a, ['k1']); assert.equal(a.images.length, 2); assert.equal(a.images[0].id, 'k1');
});

group('frise — la sélection');
test('tout sélectionner, inverser, par intervalle, image précédente et suivante', () => {
  const a = clip([0, 0.2, 0.5, 1]);
  assert.equal(E.toutes(a).size, 4); assert.deepEqual([...E.inverserSelection(a, ['k1', 'k2'])], ['k3', 'k4']);
  assert.deepEqual([...E.clesDansIntervalle(a, 0.5, 0.15)].sort(), ['k2', 'k3']);
  assert.equal(E.clePrecedente(a, 0.5).id, 'k2'); assert.equal(E.cleSuivante(a, 0.5).id, 'k4'); assert.equal(E.clePrecedente(a, 0), null); assert.equal(E.cleSuivante(a, 1), null);
});

group('frise — les animations');
test('l\'animation en miroir est une autre (nom, poses) ; l\'originale ne bouge pas', () => {
  const a = clip(); a.images[0].pose = poseDe({ vit: 1, phase: 1 }); const m = E.miroirAnimation(a);
  assert.equal(m.nom, 'essai (gaucher)'); assert.notEqual(m.images[0].pose.hancheG, a.images[0].pose.hancheG); assert.equal(a.nom, 'essai');
});
test('noms uniques dans la bibliothèque', () => {
  const L = [{ nom: 'tir' }, { nom: 'tir 2' }];
  assert.equal(E.nomUnique(L, 'marche'), 'marche'); assert.equal(E.nomUnique(L, 'tir'), 'tir 3'); assert.equal(E.nomUnique(L, 'tir 2'), 'tir 3');
});
test('assainir : un fichier abîmé donne une animation jouable (images rangées, numéros, courbes, mode, aucune limite de valeur)', () => {
  const a = E.assainir({ nom: 'x'.repeat(80), boucle: false, duree: -3, images: [{ t: 1, pose: { buste: 99 }, courbe: 'zzz' }, { t: 0, id: 'k9', pose: {} }, { t: 0.5, id: 'k9', pose: {} }, { t: 'abc' }] }, borner);
  assert.equal(a.nom.length, 40); assert.equal(a.mode, 'unefois'); assert.ok(a.duree >= 1);
  assert.ok(new Set(ids(a)).size === a.images.length && a.images.every(i => i.id));
  assert.ok(a.images.every((i, n) => n === 0 || i.t > a.images[n - 1].t)); assert.equal(a.images.find(i => i.t === 1).courbe, 'doux'); assert.equal(a.images.find(i => i.t === 1).pose.buste, 99);
  assert.equal(E.assainir({ images: [] }, borner).images.length, 1); assert.equal(E.assainir(null, borner).images.length, 1);
  assert.equal(E.assainir({ mode: 'allerretour', images: [{ t: 0, pose: {} }] }, borner).mode, 'allerretour');
});
