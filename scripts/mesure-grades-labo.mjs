// Les grades du labo (v0.68.0, sujet « Les grades se voient ») : pour chaque variante et chaque zoom, le coût du dessin (ms, rendu logiciel, dessin attendu), les triangles,
// les soldats et les gradés dessinés, et une image (lue dans le même instant que le dessin : une capture d'écran du canvas WebGL est noire).
//   node scripts/mesure-grades-labo.mjs [--variantes ABCD] [--zooms 1,2,3,4,6,8,12,16] [--camp nous|en face|aucun] [--sortie <dossier>] [--png]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { variantes: 'ABCD', zooms: '1,2,3,4,6,8,12,16', camp: 'nous', sortie: 'captures/grades', png: '' });
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
for (const L of o.variantes.split('')) {
  await page.goto(`${srv.base}labo.html#grades-${L}`);
  await page.waitForSelector('button.essai');
  await page.waitForFunction(() => /soldats dessinés/.test(document.querySelector('.releve')?.textContent || ''), null, { timeout: 60000 });
  if (o.camp !== 'aucun' && L !== 'A') await page.getByRole('button', { name: new RegExp('^Un capitaine · ' + o.camp) }).click();
  for (const z of o.zooms.split(',')) {
    await page.getByRole('button', { name: new RegExp('^Zoom ' + z + '$') }).click();
    await page.waitForTimeout(2500);
    let txt = '';
    for (let k = 0; k < 3; k++) { await page.waitForTimeout(600); txt = await page.locator('.releve').first().textContent(); }
    if (o.png) {
      await page.evaluate(() => { window.__veut = true; });
      await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
      const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
      writeFileSync(`${o.sortie}/${L}-${o.camp.replace(/\W+/g, '_')}-z${z}.png`, Buffer.from(png.split(',')[1], 'base64'));
    }
    const m = txt.match(/Dessin : ([\d.]+) ms.* · (\d+) triangles · (\d+) soldats dessinés(?: · (\d+) gradés)?/);
    console.log(`${L} zoom ${String(z).padStart(2)}  ${m ? `${m[1].padStart(6)} ms  ${m[2].padStart(7)} t  ${m[3].padStart(4)} soldats  ${m[4] ?? '-'} gradés` : txt}`);
  }
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
