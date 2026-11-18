// L'infobulle (v0.100.0) : un titre n'existe que s'il a un corps ; une bulle d'une seule ligne est une ligne simple en gras.
import { lignesInfo, typographie } from '../js/hud/infobulle.js';

group('infobulle — la hiérarchie');
test('un titre seul n\'est pas un h1', () => {
  const h = lignesInfo('# Déplier le secteur de la carte');
  assert.ok(!h.includes('class="h1"') && h.includes('class="seul"') && h.includes('Déplier le secteur de la carte'));
});
test('un titre suivi d\'un corps garde son h1, son h2 et son gras', () => {
  const h = lignesInfo('# Caissons doublés\n## Parc renforcé · 3 pts\nIl manque **2 points** de dotation.');
  assert.ok(h.includes('class="h1"') && h.includes('class="h2"') && h.includes('class="p"') && h.includes('<b>2 points</b>'));
});
test('le texte est échappé', () => {
  assert.ok(!lignesInfo('<b>x</b>').includes('<b>x'));
});

// La règle commune des infobulles (Jérôme, 18 nov.) : la typographie posée au rendu, les tableaux plutôt qu'un bloc de texte
group('infobulle — typographie et tableaux');
test('une espace insécable avant : ; ! ? et dans les guillemets, posée au rendu', () => {
  const t = typographie('Coque : 80 % ; « Feu » ! Prêt? Vivres: 2');
  assert.equal(t, 'Coque : 80 % ; « Feu » ! Prêt ? Vivres : 2');
});
test('les heures, les nombres et les adresses ne bougent pas', () => {
  assert.equal(typographie('12:30 · x2 · https://exemple.fr'), '12:30 · x2 · https://exemple.fr');
});
test('une ligne à « | » est une rangée ; les rangées qui se suivent font un seul tableau, le libellé en th', () => {
  const h = lignesInfo('# Régiment\nVivres | **2** sur 3\nMoral | 80 %\nUn clic : le choisir.');
  assert.equal((h.match(/<table/g) || []).length, 1);
  assert.ok(h.includes('<tr><th>Vivres</th><td><b>2</b> sur 3</td></tr>') && h.includes('class="p"'));
});
test('la première rangée sans chiffre d\'un tableau à plusieurs colonnes est son en-tête', () => {
  assert.ok(lignesInfo('# E\nHommes | Nous | En face\nDebout | 1 | 2').includes('<th>Nous</th><th>En face</th>'));
});
