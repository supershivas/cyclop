// Les arbres du labo (v0.52.6, sujet « Des arbres plus variés ») : pour chaque variante, saison et zoom, le coût du dessin (ms, rendu logiciel, dessin attendu),
// les triangles de la scène et ceux des arbres seuls, le tri des arbres par image, et une image (lue dans le même instant que le dessin : une capture d'écran du canvas WebGL est noire).
//   node scripts/mesure-arbres-labo.mjs [--variantes ABCDEFGH] [--saisons Automne,Été] [--zooms 4,8,16] [--sortie captures/arbres] [--png]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { variantes: 'ABCDEFGH', saisons: '', zooms: '4,8,16', sortie: 'captures/arbres', png: '' });
if (o.png) mkdirSync(o.sortie, { recursive: true });
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
const saisons = o.saisons ? o.saisons.split(',') : [null];
for (const L of o.variantes.split('')) {
  await page.goto(`${srv.base}labo.html#arbres-varies-${L}`);
  await page.waitForSelector('button.essai');
  for (const sai of saisons) {
    if (sai) await page.getByRole('button', { name: new RegExp('^' + sai + '$') }).click();
    for (const z of o.zooms.split(',')) {
      await page.getByRole('button', { name: new RegExp('^Zoom ' + z + '$') }).click();
      await page.waitForTimeout(3500);
      let txt = '';
      for (let k = 0; k < 3; k++) { await page.waitForTimeout(600); txt = await page.locator('.releve').first().textContent(); }
      if (o.png) {
        await page.evaluate(() => { window.__veut = true; });
        await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
        const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
        writeFileSync(`${o.sortie}/${L}${sai ? '-' + sai.replace(/\W+/g, '_') : ''}-z${z}.png`, Buffer.from(png.split(',')[1], 'base64'));
      }
      const m = txt.match(/Dessin : ([\d.]+) ms.* · (\d+) triangles.*arbres : (\d+) triangles, tri ([\d.]+) ms/);
      console.log(`${L} ${(sai || '').padEnd(14)} zoom ${String(z).padStart(2)}  ${m ? `${m[1].padStart(6)} ms  scène ${m[2].padStart(6)} t  arbres ${m[3].padStart(6)} t  tri ${m[4]} ms` : txt}`);
    }
  }
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
