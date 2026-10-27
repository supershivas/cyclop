// Les tranchées du labo (v0.84.0, sujet « Les tranchées ») : pour chaque variante, le dessin entier (ms, triangles dessinés, rendu logiciel, attendu jusqu'au bout) à quelques zooms, le tableau de la géométrie,
// la mesure « dans la scène » du bouton, et une image (lue dans le même instant que le dessin : une capture d'écran du canvas WebGL est noire). Les étiquettes (SVG) ne sont pas dans l'image.
//   node scripts/mesure-tranchees-labo.mjs [--sujet tranchees|tranchees-pres] [--variantes ABCDE] [--zooms 3,5] [--vues trois-quarts,dessus,profil] [--sortie captures/tranchees] [--png] [--scene]
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const o = options(process.argv.slice(2), { variantes: 'ABCDE', zooms: '0', vues: 'trois-quarts', sortie: 'captures/tranchees', png: '', scene: '', voir: '', sujet: 'tranchees', tirer: '', pauses: '1800,900,1500,4000' });
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
  await page.goto(`${srv.base}labo.html#${o.sujet}-${L}`);
  await page.waitForSelector('button.essai');
  for (const z of o.zooms.split(',')) {
    // le zoom : on part du zoom d'origine (indice 5 : 8 px/m) et `z` crans de plus (négatif : de moins) avec les boutons
    for (const v of o.vues.split(',')) {
      await page.getByRole('button', { name: 'Trois quarts' }).click();
      const bouton = +z < 0 ? 'Zoom −' : 'Zoom +';
      for (let k = 0; k < Math.abs(+z); k++) await page.getByRole('button', { name: bouton }).click();
      const nom = { dessus: 'De dessus', profil: 'De profil' }[v]; if (nom) await page.getByRole('button', { name: nom }).click();
      if (o.voir) await page.getByRole('button', { name: o.voir, exact: true }).click();
      await page.waitForTimeout(4500);
      let txt = '';
      for (let k = 0; k < 3; k++) { await page.waitForTimeout(600); txt = await page.locator('.releve, p:has-text("Dessin :")').first().textContent().catch(() => ''); }
      const pap = await page.evaluate(() => [...document.querySelectorAll('div')].map(d => d.textContent).find(t => /^.*niveau dessiné/.test(t) && t.length < 600) || '');
      if (o.png) {
        await page.evaluate(() => { window.__veut = true; });
        await page.waitForFunction(() => window.__pris, null, { timeout: 8000 });
        const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
        writeFileSync(`${o.sortie}/${L}-z${z}-${v}${o.voir ? '-' + o.voir.replace(/\W+/g, '_') : ''}.png`, Buffer.from(png.split(',')[1], 'base64'));
      }
      console.log(`${L} zoom ${z} vue ${v} : ${(pap.match(/Dessin : [^\n]*/) || [txt])[0]}`);
    }
  }
  if (o.tirer) {                                  // un obus sur le parapet, puis des images à intervalles (les sacs jetés en l'air)
    await page.getByRole('button', { name: `Obus de ${o.tirer}`, exact: true }).click();
    let n = 0;
    for (const t of o.pauses.split(',')) {
      await page.waitForTimeout(+t);
      await page.evaluate(() => { window.__veut = true; });
      await page.waitForFunction(() => window.__pris, null, { timeout: 15000 });
      const png = await page.evaluate(() => window.__pris); await page.evaluate(() => { window.__pris = null; });
      writeFileSync(`${o.sortie}/${L}-obus-${++n}.png`, Buffer.from(png.split(',')[1], 'base64'));
    }
  }
  if (o.scene) {
    await page.getByRole('button', { name: 'Mesurer dans la scène' }).click();
    await page.waitForFunction(() => document.body.textContent.includes('médiane de dix images'), null, { timeout: 120000 });
    console.log(await page.evaluate(() => [...document.querySelectorAll('table.contraste')].map(t => [...t.rows].map(r => [...r.cells].map(c => c.textContent.trim()).join(' | ')).join('\n')).join('\n---\n')));
  }
}
console.log(erreurs.length ? 'ERREURS : ' + erreurs.join(' | ') : 'aucune erreur console');
await nav.close(); srv.close();
