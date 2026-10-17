// Le test de déterminisme : Node contre Chromium (même graine, mêmes ordres, même empreinte ?).
//   node outils/determinisme.mjs [--secondes 120] [--graine 7]
// Firefox : ouvrir `determinisme.html` dans chaque navigateur et comparer les empreintes affichées (le conteneur n'a que Chromium).
import { servir, lancerChromium, options } from './navigateur.mjs';
import { empreinteMaths, empreintesBataille } from '../js/determinisme.js';

const o = options(process.argv.slice(2), { secondes: '120', graine: '7' });
const noeud = { maths: empreinteMaths(), points: empreintesBataille({ graine: +o.graine, secondes: +o.secondes }) };
const srv = await servir('.'); const nav = await lancerChromium();
const page = await (await nav.newContext()).newPage();
await page.goto(new URL('determinisme.html?auto=1&secondes=' + o.secondes + '&graine=' + o.graine, srv.base).href);
await page.waitForFunction(() => window.__determinisme, null, { timeout: 280000 });
const nav1 = await page.evaluate(() => window.__determinisme);
await nav.close(); await srv.close();
let diff = 0;
for (const k of Object.keys(noeud.maths)) if (noeud.maths[k] !== nav1.maths[k]) { diff++; console.log(`✗ Math ${k} : Node ${noeud.maths[k]}, Chromium ${nav1.maths[k]}`); }
noeud.points.forEach((p, i) => { const q = nav1.points[i]; if (!q || p[1] !== q[1]) { diff++; console.log(`✗ t = ${p[0]} s : Node ${p[1]}, Chromium ${q?.[1]}`); } });
console.log(diff ? `${diff} écart(s)` : `✓ identique : ${Object.keys(noeud.maths).length} fonctions, ${noeud.points.length} empreintes d'état (jusqu'à ${o.secondes} s)`);
process.exit(diff ? 1 : 0);
