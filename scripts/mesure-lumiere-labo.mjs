// La lumière dans le relief (sujet « La lumière dans le relief » du labo) : pour chaque réglage (variante, heure, saison, soleil, azimut, zoom), le coût du dessin (ms, rendu logiciel,
// dessin attendu), le temps du sol côté jeu, et une image lue dans le même instant que le dessin (une capture d'écran du canvas WebGL est noire).
//   node scripts/mesure-lumiere-labo.mjs --sortie <dossier> [--variantes AB] [--heures 8,12,16] [--saisons Automne,Hiver] [--soleils "Soleil du jeu,Soleil de la saison"] [--azimuts sud,sud-est] [--zooms 6] [--png]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { variantes: 'AB', heures: '8,12,16', saisons: 'Automne', soleils: 'Soleil du jeu', azimuts: 'sud', zooms: '6', sortie: 'captures/lumiere', png: '', attente: '3500' });
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
const clic = nom => page.getByRole('button', { name: new RegExp('^' + nom + '$') }).click();
for (const L of o.variantes.split('')) {
  await page.goto(`${srv.base}labo.html#lumiere-relief-${L}`);
  await page.waitForSelector('button.essai');
  for (const sai of o.saisons.split(',')) for (const sol of o.soleils.split(',')) for (const az of o.azimuts.split(',')) for (const h of o.heures.split(',')) for (const z of o.zooms.split(',')) {
    await clic(sai); await clic(sol); await clic(az); await clic(`${h} h`); await clic(`Zoom ${z}`);
    await page.waitForTimeout(Number(o.attente));
    let txt = '';
    for (let k = 0; k < 3; k++) { await page.waitForTimeout(600); txt = await page.locator('.releve').first().textContent(); }
    const nom = `${L}-${sai}-${sol.replace(/\W+/g, '_')}-${az.replace(/\W+/g, '_')}-${h}h-z${z}`;
    if (o.png) {
      await page.evaluate(() => { window.__veut = true; });
      await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
      const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
      writeFileSync(`${o.sortie}/${nom}.png`, Buffer.from(png.split(',')[1], 'base64'));
    }
    const m = txt.match(/Dessin : ([\d.]+) ms.* · (\d+) triangles.*ombres du relief : ([^,]+), sol ([\d.]+) ms/);
    console.log(`${nom.padEnd(52)} ${m ? `${m[1].padStart(6)} ms  ${m[2].padStart(6)} t  sol ${m[4]} ms  ombres ${m[3]}` : txt}`);
  }
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
