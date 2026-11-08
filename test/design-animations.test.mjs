// Les animations publiées (js/animations-store.js) et les animations d'origine (js/data/animations.js).
import { MODELES } from '../js/anim-modeles.js';
import { assainir } from '../js/anim-edition.js';
import { borner } from '../js/pose-soldat.js';
import { CHAMPS } from '../js/data/poses-soldat.js';
import { ANIMATIONS } from '../js/data/animations.js';
import { animationsOrigine, fichierAnimations, lireAnimations, FORMAT_ANIMATIONS } from '../js/animations-store.js';

group('animations — l\'origine');
test('les animations d\'origine sont les modèles de l\'atelier (à 1e-3 près), poses complètes', () => {
  assert.equal(ANIMATIONS.length, MODELES.length);
  MODELES.forEach((m, n) => {
    const att = assainir(m.creer(), borner), a = animationsOrigine()[n];
    assert.equal(a.nom, att.nom); assert.equal(a.mode, att.mode); assert.ok(Math.abs(a.duree - att.duree) < 1e-3);
    assert.equal(a.images.length, att.images.length);
    a.images.forEach((im, i) => {
      assert.ok(Math.abs(im.t - att.images[i].t) < 1e-3); assert.equal(im.courbe, att.images[i].courbe);
      for (const c of Object.keys(att.images[i].pose)) assert.ok(Math.abs(im.pose[c] - att.images[i].pose[c]) < 1e-3, `${a.nom} image ${i} ${c}`);
    });
  });
});
test('un nom d\'animation d\'origine est unique', () => { const n = animationsOrigine().map(a => a.nom); assert.equal(new Set(n).size, n.length); });

group('animations — le fichier publié');
test('publier puis relire rend les mêmes animations', () => {
  const f = fichierAnimations(animationsOrigine());
  assert.equal(f.format, FORMAT_ANIMATIONS);
  const r = lireAnimations(JSON.parse(JSON.stringify(f)));
  assert.equal(r.publie, true); assert.deepEqual(r.animations, f.animations);
});
test('sans fichier, illisible ou vide : les animations d\'origine', () => {
  for (const d of [null, {}, { format: 'autre', animations: [{ nom: 'x', images: [{ t: 0 }] }] }, { format: FORMAT_ANIMATIONS, animations: [] }]) {
    const r = lireAnimations(d); assert.equal(r.publie, false); assert.deepEqual(r.animations, animationsOrigine());
  }
});
test('un refus se dit : bibliothèque vide, noms doublés', () => {
  assert.throws(() => fichierAnimations([]), /Aucune animation/);
  const [a] = animationsOrigine();
  assert.throws(() => fichierAnimations([a, structuredClone(a)]), /s'appellent/);
});
