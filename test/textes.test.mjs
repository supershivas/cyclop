// Les textes par langue (js/textes.js) et les éditions (js/data/editions.js) : sans navigateur.
import { t, choisirLangue, langueDe, langues } from '../js/textes.js';
import { TEXTES } from '../js/data/textes/fr.js';
import { EDITIONS, EDITION_DEFAUT, editionDe } from '../js/data/editions.js';

group('les textes et les éditions');

test('un texte se lit par sa clé, ses variables sont remplacées', () => {
  choisirLangue('fr');
  assert.equal(t('titre.edition.itch'), TEXTES['titre.edition.itch']);
  const cle = Object.keys(TEXTES)[0];
  assert.equal(typeof t(cle), 'string');
  assert.equal(t('__absente__'), '__absente__');      // un texte oublié se voit
});

test('la langue du navigateur : seulement une langue que le jeu parle', () => {
  assert.equal(langueDe('fr-FR'), 'fr');
  assert.equal(langueDe('xx-YY'), 'fr');
  assert.equal(langueDe(''), 'fr');
  assert.ok(langues().includes('fr'));
  assert.equal(choisirLangue('xx'), 'fr');
});

test('chaque édition a sa propre clé de sauvegarde ; l\'adresse choisit l\'édition', () => {
  const cles = Object.values(EDITIONS).map(e => e.cle);
  assert.equal(new Set(cles).size, cles.length);
  assert.equal(editionDe(new URLSearchParams('edition=itch')), 'itch');
  assert.equal(editionDe(new URLSearchParams('edition=nimporte')), EDITION_DEFAUT);
  assert.equal(editionDe(new URLSearchParams('')), EDITION_DEFAUT);
  assert.equal(EDITIONS.itch.deux, false);
});
