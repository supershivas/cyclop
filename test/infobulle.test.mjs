// L'infobulle (v0.100.0) : un titre n'existe que s'il a un corps ; une bulle d'une seule ligne est une ligne simple en gras.
import { lignesInfo } from '../js/hud/infobulle.js';

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
