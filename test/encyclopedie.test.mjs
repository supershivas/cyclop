// L'encyclopédie des règles (v0.100.0) : du texte, mais un texte qui ne ment pas sur sa propre structure : aucun doublon, aucun renvoi vers un mot absent, chaque mot a une définition et une catégorie, et
// tout ce que le jeu a en données (calibres, météos, corvées, bâtiments, postures, difficultés) y figure.
import { ENTREES, PAR_ID, CATEGORIES, trier, lexique } from '../js/data/encyclopedie.js';
import { CALIBRES } from '../js/data/calibres.js';
import { METEO } from '../js/data/meteo.js';
import { CORVEES } from '../js/data/corvees.js';
import { ORDRE_BATIMENTS } from '../js/data/batiments.js';
import { STANCES } from '../js/data/stances.js';
import { DIFFICULTES } from '../js/data/difficulte.js';

group('encyclopédie — la structure');
test('chaque entrée a un identifiant unique, un terme, une définition et une catégorie connue', () => {
  const ids = new Set(), cats = new Set(CATEGORIES.map(c => c.id));
  for (const e of ENTREES) {
    assert.ok(e.id && e.terme && e.def && e.def.length > 20, e.id);
    assert.ok(cats.has(e.cat), `${e.id} : catégorie ${e.cat}`);
    assert.ok(!ids.has(e.id), `doublon : ${e.id}`); ids.add(e.id);
  }
});
test('aucun renvoi ne mène à un mot absent, aucune entrée ne se renvoie à elle-même', () => {
  for (const e of ENTREES) for (const v of e.voir) { assert.ok(PAR_ID[v], `${e.id} → ${v}`); assert.notEqual(v, e.id); }
});
test('chaque catégorie a des entrées ; les deux tris gardent tout', () => {
  for (const c of CATEGORIES) assert.ok(ENTREES.some(e => e.cat === c.id), c.id);
  assert.equal(trier(ENTREES).length, ENTREES.length); assert.equal(lexique().length, ENTREES.length);
});

group('encyclopédie — tout ce que le jeu a en données y est');
test('calibres, météos, corvées, bâtiments, postures et difficultés', () => {
  for (const c of Object.keys(CALIBRES)) assert.ok(PAR_ID[`calibre-${c}`], c);
  for (const m of Object.keys(METEO)) assert.ok(PAR_ID[`meteo-${m}`], m);
  for (const c of CORVEES) assert.ok(PAR_ID[c.equipe ? `equip-${c.id.replace('eq-', '')}` : `corvee-${c.id}`], c.id);
  for (const k of ORDRE_BATIMENTS) assert.ok(PAR_ID[`bat-${k}`], k);
  for (const k of Object.keys(STANCES)) assert.ok(PAR_ID[`posture-${k}`], k);
  for (const k of Object.keys(DIFFICULTES)) assert.ok(PAR_ID[`difficulte-${k}`], k);
});
test('les termes de l\'interface que le joueur lit sont définis', () => {
  for (const id of ['carte', 'carnet', 'billet', 'papier-nuit', 'fenetre-regiment', 'carte-regiment', 'fiche-homme', 'batteries', 'plan-secteur', 'pertes', 'medailles', 'terrain-survole']) assert.ok(PAR_ID[id], id);
});
