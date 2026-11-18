// Les infobulles du jeu, relues (règle commune des jeux, Jérôme, 18 nov. : un liseré sombre, jamais de césure,
// jamais de bloc de texte, une espace insécable avant « : ; ! ? » et dans les guillemets).
// Ouvre le jeu (graine 7, comme outils/fumee.mjs), relève toutes les bulles de trois moments (le jour, les
// régiments choisis, la nuit), les rend comme le jeu (`lignesInfo` de js/hud/infobulle.js) et signale :
//   - les paragraphes trop longs : une ligne simple de plus de `--max` caractères (76 par défaut : deux lignes
//     d'une bulle de 38 caractères ; au-delà, c'est un bloc : un tableau, du gras ou une icône) ;
//   - les blocs : trois lignes simples ou plus qui se suivent, sans titre ni tableau ;
//   - les deux-points sans insécable, dans les bulles rendues (le rendu doit les poser) et, à part, dans les
//     textes visibles de l'écran hors des bulles (ceux-là ne passent pas par `typographie`).
//
//   node outils/infobulles.mjs            → le rapport (code 0)
//   node outils/infobulles.mjs --strict   → code 1 si une bulle a un défaut
//   node outils/infobulles.mjs --max 90   → un autre seuil de paragraphe
import { servir, lancerChromium } from './navigateur.mjs';
import { lignesInfo } from '../js/hud/infobulle.js';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const MAX = +(args[args.indexOf('--max') + 1] ?? 0) || 76;
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));

const bulles = new Map();       // texte → { ou }
const horsBulles = new Map();   // texte → id de l'élément
const relever = async moment => {
  const r = await page.evaluate(() => {
    const vus = [], textes = [];
    for (const e of document.querySelectorAll('[data-info], [title]')) {
      if (e.closest('dialog:not([open]), [hidden]')) continue;
      const t = e.dataset.info || e.getAttribute('title');
      if (t) vus.push([t, e.id || e.className?.baseVal || e.className || e.tagName]);
    }
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement;
      if (!p || p.closest('script, style, #infobulle, dialog:not([open]), [hidden]') || !p.getClientRects().length) continue;
      if (/[^ \d]:(\s|$)| [;!?]/.test(n.textContent)) textes.push([n.textContent.trim().slice(0, 80), p.closest('[id]')?.id ?? p.tagName]);
    }
    return { vus, textes };
  });
  for (const [t, ou] of r.vus) if (!bulles.has(t)) bulles.set(t, `${moment} · ${String(ou).slice(0, 40)}`);
  for (const [t, ou] of r.textes) if (!horsBulles.has(t)) horsBulles.set(t, `${moment} · ${ou}`);
};

await page.goto(`${srv.base}index.html?debug=1&seed=7`);
await page.waitForTimeout(600);
await page.click('#nouvelle');
await page.waitForTimeout(1200);
await page.keyboard.press('F9');
await page.evaluate(() => { __jeu.setSeed(7); document.getElementById('temps-pause').click(); });
await relever('jour');
await page.keyboard.press('t');
await page.waitForTimeout(250);
await relever('choisis');
await page.evaluate(() => __jeu.nuit?.());
await page.waitForTimeout(400);
await relever('nuit');
await nav.close(); srv.close?.();

// le texte d'une bulle rendue, ligne à ligne : [classe, texte]
const lignes = html => [...html.matchAll(/<(span|table) class="([^"]+)">([\s\S]*?)<\/\1>/g)].map(m => [m[2], m[3].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/ +/g, ' ').trim()]);
const defauts = [], formes = new Map();
// les bulles qui ne diffèrent que par un nombre ou une case (« A8 », « B7 ») ne comptent qu'une fois, avec leur nombre
for (const [texte, ou] of bulles) { const f = texte.replace(/\b[A-D]\d\b/g, '#').replace(/\d+/g, '0'); const v = formes.get(f); if (v) v.n++; else formes.set(f, { texte, ou, n: 1 }); }
for (const { texte, ou: lieu, n } of formes.values()) {
  const ou = n > 1 ? `${lieu}, ×${n}` : lieu;
  const html = lignesInfo(texte), L = lignes(html), titre = L.find(([c]) => c === 'h1' || c === 'seul')?.[1] ?? texte.slice(0, 30);
  let suite = 0;
  for (const [c, t] of L) {
    if ((c === 'p' || c === 'seul') && t.length > MAX) defauts.push({ genre: 'paragraphe', ou, titre, detail: `${t.length} car. : « ${t.slice(0, 60)}… »` });
    suite = c === 'p' ? suite + 1 : 0;
    if (suite === 3) defauts.push({ genre: 'bloc', ou, titre, detail: 'trois lignes simples à la suite' });
    if (/[^ \d]:(\s|$)| [;!?»]|« /.test(t)) defauts.push({ genre: 'insécable', ou, titre, detail: `« ${t.slice(0, 60)} »` });
  }
}
const parGenre = g => defauts.filter(d => d.genre === g);
console.log(`${bulles.size} bulles relevées (jour, régiments choisis, nuit) ; paragraphe au-delà de ${MAX} caractères.`);
for (const g of ['paragraphe', 'bloc', 'insécable']) {
  const l = parGenre(g);
  console.log(`\n${g === 'insécable' ? 'Deux-points ou ponctuation sans insécable' : g === 'bloc' ? 'Blocs de texte' : 'Paragraphes trop longs'} : ${l.length}`);
  for (const d of l.slice(0, 40)) console.log(`  - ${d.titre} (${d.ou}) : ${d.detail}`);
  if (l.length > 40) console.log(`  … et ${l.length - 40} de plus`);
}
console.log(`\nHors des bulles, des textes visibles avec « : » ou « ; ! ? » sans insécable : ${horsBulles.size}`);
for (const [t, ou] of [...horsBulles].slice(0, 15)) console.log(`  - ${ou} : « ${t} »`);
if (erreurs.length) { console.log(`\nErreurs de la page : ${erreurs.join(' | ')}`); process.exitCode = 1; }
if (strict && defauts.length) process.exitCode = 1;
