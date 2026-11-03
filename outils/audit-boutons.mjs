// Audit des boutons et des unités du HUD (v0.109.2 ; docs/design-system.md, « Troisième jet »).
//
//   node outils/audit-boutons.mjs            → échoue (code 1) à la moindre entorse, une ligne par entorse
//   node outils/audit-boutons.mjs --detail   → ajoute le tableau des familles mesurées
//
// Mesuré sur le rendu réel (1280 × 800, partie lancée en mode debug, puis la nuit, le camp, les réglages), jamais déduit du CSS. Cinq règles :
//   1. HAUTEUR : tout bouton visible fait `--jeu-cible` (44 px) au moins, sauf les exceptions DECLAREES (cellules de la carte, « ? », flèches, liens du texte) ;
//   2. FILET BAS : plus de bouton à filet bas épais sans contour (l'ancien `.bouton`, remplacé par l'ombre d'un cran) ;
//   3. CASSE : aucun bouton en `text-transform: uppercase`, hors les en-têtes de papier (`.entete`, des titres) (tout ce qui se clique est en casse de phrase) ;
//   4. UNITÉS : carte de régiment, étiquette de régiment, étiquette de char ou de poste, batterie : liseré de 3 px en haut de la couleur de `--jeu-nous`, ombre d'un cran (sauf muette) ;
//   5. BARRES : une étiquette de char ou de poste a ses barres dans l'ordre nom, chevrons, vie, tir, expérience.
// Ce qu'il ne voit pas : un état que le scénario ne montre pas (le survol, un régiment ébranlé) ; ajouter l'étape au scénario plutôt que d'élargir une exception.
import { readFile } from 'node:fs/promises';
import { servir, lancerChromium, options } from './navigateur.mjs';

const o = options(process.argv.slice(2), {});
const version = JSON.parse(await readFile('version.json', 'utf8')).version;
const srv = await servir('.');
const nav = await lancerChromium();
const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.route('**/assets/design/*.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));

// Des cellules ou des repères, pas des boutons de papier (déclaré, docs/design-system.md) : hors du contrôle de hauteur
const EXCEPTIONS_HAUTEUR = ['.carte-grille .cel', '.carte-grille .sect', '.carte-ronde', '.aide', '.fleche', '.lien', '.fiche-liste .nom', 'summary', '.legende-carte summary', '.carte-3d *', '.titre-carnet', '.replier', 'a', 'input'];

const MESURE = ([exceptions, nous]) => {
  const visible = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false; if (el.closest('[hidden], dialog:not([open]), .jeu-cache')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nom = el => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
  const ent = [], fam = {};
  const boutons = [...document.querySelectorAll('button, [role="button"], .bouton')].filter(visible);
  for (const b of boutons) {
    const c = getComputedStyle(b), r = b.getBoundingClientRect(), n = nom(b);
    const k = `${c.borderTopWidth}/${c.borderBottomWidth} ${c.boxShadow === 'none' ? 'sans ombre' : 'ombre'}`;
    fam[k] = (fam[k] || 0) + 1;
    if (r.height < 43.5 && !exceptions.some(s => b.matches(s) || b.closest(s))) ent.push(`HAUTEUR ${n} : ${Math.round(r.height)} px (44 attendus)`);
    if (parseFloat(c.borderBottomWidth) >= 3 && parseFloat(c.borderTopWidth) === 0 && c.borderBottomStyle !== 'none') ent.push(`FILET BAS ${n} : ${c.borderBottomWidth} sans contour`);
    if (c.textTransform === 'uppercase' && !b.closest('.entete')) ent.push(`CASSE ${n} : en capitales (un bouton se lit en casse de phrase)`);
  }
  for (const u of [...document.querySelectorAll('.reg-carte, .etiquette, .char-etiq, .batterie')].filter(visible)) {
    const c = getComputedStyle(u), n = nom(u);
    if (parseFloat(c.borderTopWidth) !== 3 || c.borderTopColor !== nous) ent.push(`UNITÉ ${n} : liseré haut ${c.borderTopWidth} ${c.borderTopColor} (3 px de la couleur de l'armée attendus)`);
    if (c.boxShadow === 'none' && !u.classList.contains('muet')) ent.push(`UNITÉ ${n} : pas d'ombre d'un cran`);
  }
  for (const u of [...document.querySelectorAll('.char-etiq')].filter(visible)) {
    const ordre = [...u.children].map(e => e.className.split(' ')[0]).join(' ');
    if (ordre !== 'nom chevrons pv canon xp') ent.push(`BARRES ${nom(u)} : « ${ordre} » (nom chevrons pv canon xp attendus)`);
  }
  return { ent, fam, n: boutons.length };
};

await page.goto(`${srv.base}index.html?debug=1&seed=7`);
await page.waitForTimeout(600);
await page.click('#nouvelle'); await page.waitForTimeout(1200);
await page.keyboard.press('F9');
await page.evaluate(() => document.getElementById('temps-pause').click());
const nous = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--jeu-nous').trim());
const nousRgb = await page.evaluate(c => { const e = document.createElement('i'); e.style.color = c; document.body.append(e); const v = getComputedStyle(e).color; e.remove(); return v; }, nous);

const releves = [];
const releve = async nom => { await page.waitForTimeout(1000);       // (la fenêtre d'ordres s'ouvre en grandissant : mesurée trop tôt, un bouton fait 1 px)
   releves.push([nom, await page.evaluate(MESURE, [EXCEPTIONS_HAUTEUR, nousRgb])]); };
await releve('bataille');
await page.evaluate(() => document.querySelectorAll('.reg-carte')[2].click()); await releve('régiment choisi, ses ordres');
await page.evaluate(async v => {      // un char à nous (ses étiquettes : char et postes de mitrailleuse)
  const B = __jeu.bataille(), m = await import(`/js/chars.js?v=${v}`), n = B.etat.nids.find(k => k.camp === 0);
  m.lancerChar(B, 0, { x: n.x + 6, y: n.y + 20, ar: n.y + 30 }, n.x + 6, n.y - 60);
  __jeu.avancer(10, false);
}, version);
await releve('un char sur le champ');
await page.evaluate(() => document.querySelector('.char-etiq')?.click()); await releve('fiche du char');
await page.evaluate(() => document.querySelector('.batterie[data-cal="75"]').click()); await releve('barrage visé');
await page.keyboard.press('Escape');
await page.evaluate(() => { __jeu.bataille().etat.camp.dotation = 5; document.querySelector('.camp-btn').click(); }); await releve('le camp');
await page.keyboard.press('Escape');
await page.evaluate(() => document.getElementById('hud-reglages').click()); await releve('réglages');
await page.evaluate(() => document.querySelector('dialog[open] form button, dialog[open] .bouton:last-child')?.click());
await page.evaluate(() => __jeu.nuit()); await releve('la nuit');

let entorses = 0;
const vus = new Set();
for (const [etape, m] of releves) for (const e of m.ent) { const cle = e; if (vus.has(cle)) continue; vus.add(cle); entorses++; console.log(`✗ [${etape}] ${e}`); }
if (o.detail) for (const [etape, m] of releves) console.log(`  ${etape} : ${m.n} boutons, familles (contour haut/bas, ombre) ${JSON.stringify(m.fam)}`);
for (const e of erreurs) { entorses++; console.log(`✗ ${e}`); }
console.log(entorses ? `${entorses} entorse(s) au design system` : `✓ boutons et unités conformes (${releves.length} états mesurés)`);
await nav.close(); await srv.close();
process.exit(entorses ? 1 : 0);
