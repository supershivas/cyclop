// Test de fumée du jeu dans le navigateur : joue un scénario fixe (graine 7, temps arrêté, pas
// de hasard hors de la graine), n'accepte aucune erreur de console, et relève l'empreinte du HUD
// (texte et attributs des éléments de l'écran) à chaque étape.
//
//   node outils/fumee.mjs --ecrire    → écrit l'empreinte de référence (test/fumee.json)
//   node outils/fumee.mjs             → compare à la référence ; code 1 au moindre écart ou à la moindre erreur
//
// Sert surtout aux refontes sans changement visible (découper main.js, rendu3d.js) : l'empreinte ne
// doit pas bouger. Une règle ou un texte qui change exprès demande de réécrire la référence.
import { readFile, writeFile } from 'node:fs/promises';
import { servir, lancerChromium, options } from './navigateur.mjs';

const o = options(process.argv.slice(2), { graine: '7', ref: 'test/fumee.json' });
const srv = await servir('.');
const nav = await lancerChromium();
const contexte = await nav.newContext({ viewport: { width: 1280, height: 800 } });
// les contenus publiés par l'atelier (assets/design : réglages, retouches et cartes) ne comptent pas ici : la référence est celle du jeu d'origine (sinon chaque publication de l'atelier la ferait bouger)
await contexte.route('**/assets/design/*.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));
page.on('console', m => { if (m.type() === 'error') erreurs.push(`console : ${m.text()}`); });

// L'empreinte d'un instant : le HTML de chaque élément à id du HUD et des papiers (sans l'écran
// titre, le canvas ni ce qui change à chaque image comme les étiquettes et la bulle).
const ignorer = ['canvas', 'ecran', 'etiquettes', 'equerres', 'repere', 'repere-soldat', 'bulle', 'visee', 'visee-nid', 'version', 'changelog'];
const empreinte = ignorer => page.evaluate(ignorer => {
  const sortie = {};
  for (const e of document.querySelectorAll('[id]')) {
    if (ignorer.includes(e.id) || e.closest('dialog:not([open])')) continue;
    sortie[e.id] = `${e.hidden ? 'H|' : ''}${e.className}|${e.innerHTML.length > 4000 ? e.innerHTML.length : e.innerHTML}`;
  }
  return sortie;
}, ignorer);

const etapes = {};
async function etape(nom) { await page.waitForTimeout(250); etapes[nom] = await empreinte(ignorer); }
const jeu = (f, ...a) => page.evaluate(([f, a]) => new Function('a', `return (${f})(...a)`)(a), [f, a]);

await page.goto(`${srv.base}index.html?debug=1&seed=${o.graine}`);
await page.waitForTimeout(600);
await page.click('#nouvelle');
await page.waitForTimeout(1200);
await page.keyboard.press('F9');
// Le temps s'arrête dans le même instant que la partie (re)commence : la boucle n'a pas le temps d'avancer d'un pas,
// sinon le nombre de pas joués avant l'arrêt dépend de la vitesse de la machine.
await page.evaluate(() => { __jeu.setSeed(7); document.getElementById('temps-pause').click(); });
await etape('debut');

await page.keyboard.press('t');                            // tous les régiments
await etape('tous-choisis');
await page.evaluate(() => document.querySelectorAll('#carte-grille .cel')[17].click());   // un ordre depuis la carte (notre 1re ligne, secteur B)
await etape('ordre-carte');
await page.evaluate(() => document.querySelector('#carte-grille .sect').click());          // la lettre d'un secteur choisit ses régiments
await etape('secteur-A');
await page.waitForTimeout(3600);                           // le clignotement d'un ordre dure trois secondes d'horloge : on attend qu'il finisse
await jeu('() => __jeu.marche([2, 3, 4, 5], 200, 170)');   // un ordre de marche (un clic à l\'écran dépend de la respiration de la caméra, donc de l\'horloge)
await jeu('() => __jeu.avancer(60, false)');
await etape('apres-ordre');
await jeu('() => { __jeu.bataille().etat.camp.batiments.artillerie.niveau = 3; for (const c of [75, 155, 220]) __jeu.barrage(String(c), 150 + c / 3, 100); __jeu.avancer(300, false); }');
await etape('apres-barrages');
await page.click('.pastille[data-cle="chars"]');           // le camp (v0.85.0) : un bâtiment à bâtir, son papier
await etape('camp-chars');
await page.click('.bat-ameliorer');                          // 3 points : le chantier est payé
await etape('camp-chantier');
await page.keyboard.press('Escape');                          // Échap ferme le papier du bâtiment
await page.mouse.move(600, 380);
await page.mouse.click(600, 380, { button: 'right' });     // le clic droit annule
await etape('annule');
// la posture : un régiment choisi, le bouton « Feu retenu » de son rabat, puis la marche qui la remet à volonté
await page.evaluate(() => document.querySelectorAll('.reg-carte')[1].click());
await page.waitForTimeout(250);
await page.evaluate(() => document.querySelector('[data-stance="retenu"]').click());
await page.waitForFunction(() => document.querySelector('[data-stance="retenu"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
await etape('posture');
await jeu('() => __jeu.marche([1], 200, 190)');
// (la marche remet la posture à volonté, mais le rabat du régiment se rafraîchit à son rythme : 250 ms ne suffisaient pas toujours, l'étape lisait tantôt « tient B1, feu retenu », tantôt « en terrain libre » ;
// on attend que le rabat dise la posture d'après, au lieu de compter sur le temps)
await page.waitForFunction(() => document.querySelector('[data-stance="volonte"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
await etape('posture-marche');
// la fiche d'un régiment (la carte du régiment choisi, son bouton « Fiche »), puis celle d'un officier
await page.evaluate(() => document.querySelector('.reg-carte').click());
await page.waitForTimeout(1000);                           // le clic sur une carte glisse la caméra 0,6 s (v0.32.2) : le terrain sous la souris dépend de l'instant ; on attend la fin
// La souris est posée sur le champ, loin des cartes, du rabat et du carnet : là où elle restait après le clic droit (600, 380), elle tombait
// sur un élément du HUD selon la taille de la fenêtre, et le terrain sous la souris y est caché (v0.41.0) ou non.
await page.mouse.move(700, 300);
await page.evaluate(() => document.querySelector('[data-act="fiche"]').click());
await etape('fiche-regiment');
await page.evaluate(() => document.querySelector('#fiche-liste button.nom').click());
await etape('fiche-homme');
await page.evaluate(() => document.getElementById('fiche-fermer').click());
await jeu('() => { const B = __jeu.bataille(); while (B.etat.phase === "jour") __jeu.avancer(300, false); }');
await etape('soir');
await jeu('() => __jeu.nuit?.()');
await etape('nuit');
await page.keyboard.press('t');
await etape('nuit-choisis');
// un ordre de nuit aux régiments choisis : leurs cartes se grisent (`donne`, v0.38.3) ; en solo, aucune erreur (le réseau n'existe pas)
await page.evaluate(() => document.querySelector('[data-corvee="evacuer"]').click());
await etape('nuit-ordre');
await jeu('() => __jeu.fin?.()');
await etape('fin');

await nav.close(); await srv.close();

let code = 0;
if (erreurs.length) { console.log('✗ erreurs :', [...new Set(erreurs)].slice(0, 5)); code = 1; }
if (o.ecrire) {
  await writeFile(o.ref, JSON.stringify(etapes, null, 1));
  console.log(`✓ empreinte de référence écrite : ${o.ref} (${Object.keys(etapes).length} étapes)`);
} else {
  const ref = JSON.parse(await readFile(o.ref, 'utf8'));
  for (const [nom, vue] of Object.entries(etapes)) {
    const r = ref[nom] || {};
    const ecarts = [...new Set([...Object.keys(vue), ...Object.keys(r)])].filter(k => vue[k] !== r[k]);
    if (ecarts.length) { code = 1; console.log(`✗ ${nom} : ${ecarts.length} écart(s) — ${ecarts.slice(0, 8).join(', ')}`); }
    else if (process.argv.includes('--detail')) console.log(`✓ ${nom}`);
  }
  if (!code) console.log(`✓ ${Object.keys(etapes).length} étapes identiques à la référence (--detail : une ligne par étape)`);
}
process.exit(code);
