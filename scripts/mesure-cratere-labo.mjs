// Les cratères du labo (v0.52.4) : le coût de dessin de chaque forme (triangles, ms, rendu logiciel, dessin attendu)
// au sol fin (6 px/m) et au mètre (3 px/m), et une image de chacun (lue dans le même instant que le dessin :
// une capture d'écran du canvas WebGL est noire).
//   node scripts/mesure-cratere-labo.mjs [--sortie captures/cratere]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { sortie: 'captures/cratere' });
mkdirSync(o.sortie, { recursive: true });
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.addInitScript(() => {
  window.__pris = null; window.__veut = false;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const lire = C.prototype.readPixels;
    C.prototype.readPixels = function (...a) {
      const r = lire.apply(this, a);
      if (window.__veut) { const c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height; c.getContext('2d').drawImage(this.canvas, 0, 0); window.__pris = c.toDataURL('image/png'); window.__veut = false; }
      return r;
    };
  }
});
const lignes = [];
for (const L of 'ABCDEF') {
  await page.goto(`${srv.base}labo.html#cratere-forme-${L}`);
  for (const [nom, bouton] of [['fin', 'Sol fin'], ['metre', 'Au mètre']]) {
    await page.waitForSelector('button.essai');
    await page.getByRole('button', { name: new RegExp('^' + bouton) }).click();
    await page.waitForTimeout(4000);            // les morceaux se refont à l'autre finesse, le dessin est attendu
    const tri = [];
    for (let k = 0; k < 3; k++) { await page.waitForTimeout(700); tri.push(await page.locator('.releve').first().textContent()); }
    await page.evaluate(() => { window.__veut = true; });
    await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
    const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
    writeFileSync(`${o.sortie}/${L}-${nom}.png`, Buffer.from(png.split(',')[1], 'base64'));
    const m = tri[2].match(/Dessin : ([\d.]+) ms.* · (\d+) triangles/);
    lignes.push(`${L} ${nom.padEnd(5)} ${m ? `${m[1]} ms  ${m[2]} triangles` : tri[2]}`);
    console.log(lignes[lignes.length - 1]);
  }
  if (L === 'A') console.log(await page.locator('.releve').nth(1).textContent());
  else console.log(await page.locator('.releve').nth(1).textContent());
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
