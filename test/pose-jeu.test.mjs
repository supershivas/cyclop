// La pose d'un homme articulé du jeu, calculée côté processeur pour la texture de poses (js/rendu/pose-jeu.js).
import { poseJeu, FLOTTANTS, TEXELS } from '../js/rendu/pose-jeu.js';
import { poseDe } from '../js/pose-soldat.js';
import { NOMS_CHAMPS } from '../js/data/poses-soldat.js';

const champ = (v, c) => v[NOMS_CHAMPS.indexOf(c)];
const base = { vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, rang: 6 };
const proche = (a, b) => Math.abs(a - b) < 1e-5;

group('pose du jeu — texture de poses');
test('7 texels de 4 flottants, 25 champs utilisés', () => {
  assert.equal(TEXELS * 4, FLOTTANTS);
  assert.equal(poseJeu(base, 0, 1).length, FLOTTANTS);
  assert.equal(NOMS_CHAMPS.length, 25);
});
test('la marche, le tir, l\'accroupi, le feu retenu, la mêlée et le couché redonnent poseDe, champ par champ', () => {
  const sph = Math.sin(1.1), cph = Math.cos(1.1);
  const cas = [
    [{ vit: 1 }, { vit: 1 }], [{ vit: 0.4, tir: 0.7 }, { vit: 0.4, tir: 0.7 }], [{ tapi: 1 }, { tapi: 1 }], [{ couche: 1 }, { couche: 1 }],
    [{ tir: -1 }, { retenu: true }], [{ tir: 2.5 }, { melee: true, pouss: 0.5 }],
  ];
  for (const [h, e] of cas) {
    const p = poseJeu({ ...base, ...h }, sph, cph), att = poseDe({ phase: 1.1, ...e });
    for (const c of NOMS_CHAMPS) assert.ok(proche(champ(p, c), att[c]), `${JSON.stringify(h)} ${c}`);
  }
});
test('un officier (pistolet) ne fait ni feu retenu ni mêlée : il tire d\'une main', () => {
  const off = poseJeu({ ...base, rang: 1, tir: 2.5 }, 0, 1), art = poseDe({ pistolet: true, tir: 1 });
  assert.ok(proche(champ(off, 'epauleD'), art.epauleD));
  assert.ok(proche(champ(poseJeu({ ...base, rang: 1, tir: -1 }, 0, 1), 'epauleD'), poseDe({ pistolet: true }).epauleD));
});
test('les blessures : la tête baissée, le bras gauche serré, le genou à terre seulement à l\'arrêt', () => {
  assert.ok(proche(champ(poseJeu({ ...base, blessure: 3 }, 0, 1), 'tete'), 0.45));
  const bras = poseJeu({ ...base, blessure: 1, vit: 1 }, 0, 1);
  assert.ok(proche(champ(bras, 'epauleG'), 0.5) && proche(champ(bras, 'coudeG'), 1.9) && proche(champ(bras, 'convG'), 0.6));
  const arret = poseJeu({ ...base, blessure: 2 }, 0, 1), marche = poseJeu({ ...base, blessure: 2, vit: 1 }, 0, 1);
  assert.ok(proche(champ(arret, 'genouG'), 2.0) && proche(champ(arret, 'hancheD'), 1.3) && proche(champ(arret, 'descente'), 0.42));
  assert.ok(champ(marche, 'genouG') !== 2.0);
});
