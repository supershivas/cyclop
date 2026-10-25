// Une journée en dix secondes (sujet « Une journée en dix secondes » du labo) : pour chaque saison, des images prises à intervalles réguliers (lues dans le même instant que le dessin : une capture
// d'écran du canvas WebGL est noire) avec l'heure, le temps et le coût du dessin.
//   node scripts/mesure-journee-labo.mjs --sortie <dossier> [--saisons ABC] [--images 8] [--pas 1300] [--debut 0 (ms avant la première image : sauter des jours)] [--png]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { saisons: 'ABC', images: '8', pas: '1300', debut: '0', sortie: 'captures/journee', png: '' });
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
for (const L of o.saisons.split('')) {
  await page.goto(`${srv.base}labo.html#journee-saison-${L}`);
  await page.waitForSelector('button.essai');
  await page.waitForTimeout(+o.debut);
  for (let k = 0; k < +o.images; k++) {
    await page.waitForTimeout(+o.pas);
    const txt = await page.locator('.releve').first().textContent();
    const h = txt.match(/jour (\d+)\/\d+, (\d+) h (\d+), ([^,]+), (\w+)/);
    const dessin = txt.match(/Dessin : ([\d.]+) ms/);
    const nom = `${L}-${String(k).padStart(2, '0')}-j${h?.[1]}-${h?.[2]}h${h?.[3]}`;
    if (o.png) {
      await page.evaluate(() => { window.__veut = true; });
      await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
      const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
      writeFileSync(`${o.sortie}/${nom}.png`, Buffer.from(png.split(',')[1], 'base64'));
    }
    console.log(`${nom.padEnd(22)} ${h ? `${h[4]} (${h[5]})` : txt.slice(-90)}  dessin ${dessin?.[1]} ms`);
  }
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
