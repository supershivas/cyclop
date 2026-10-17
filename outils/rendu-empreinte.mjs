// L'empreinte du dessin : joue un scénario fixe dans le navigateur avec une horloge et un hasard truqués, et hache les pixels
// du canvas à chaque étape. Sert aux refontes de `rendu3d.js` : tant que le code ne change pas ce qui se dessine, l'empreinte ne
// bouge pas, au pixel près.
//
//   node outils/rendu-empreinte.mjs --ecrire    → écrit la référence (test/rendu.json)
//   node outils/rendu-empreinte.mjs             → compare ; code 1 au moindre pixel qui change (ou erreur console)
//   node outils/rendu-empreinte.mjs --png       → garde aussi chaque image dans captures/rendu/ (à regarder, ou à comparer)
//
// Ce qui rend le dessin reproductible : `performance.now` et `requestAnimationFrame` sont remplacés par une horloge qui n'avance
// que quand on le dit (1/30 s par image, un pas de la simulation par image), `Math.random` par un générateur à graine (la pluie, les
// éclats, les corbeaux le lisent), et le budget de ms du sol ne coupe plus rien (le temps ne passe pas dans une image).
// Le rendu logiciel de Chromium est exact sur une même machine ; une autre machine peut donner d'autres pixels : on réécrit alors la référence
// sur l'ancien code avant de découper (voir CLAUDE.md).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { servir, lancerChromium, options } from './navigateur.mjs';

const o = options(process.argv.slice(2), { ref: 'test/rendu.json', sortie: 'captures/rendu' });
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));
page.on('console', m => { if (m.type() === 'error') erreurs.push(`console : ${m.text()}`); });

await page.addInitScript(() => {
  // le hasard : un générateur à graine (mulberry32), le même à chaque lancement
  let a = 0x9e3779b9;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // le temps : il n'avance que d'une image à la fois
  let maintenant = 0, file = [];
  performance.now = () => maintenant;
  window.requestAnimationFrame = f => { file.push(f); return file.length; };
  window.cancelAnimationFrame = () => {};
  // `__images(n)` : n images (1/30 s chacune), puis les pixels du canvas, relus dans le même instant que le dessin
  window.__images = n => {
    for (let k = 0; k < n; k++) {
      maintenant += 1000 / 30;
      const aFaire = file; file = [];
      for (const f of aFaire) f(maintenant);
    }
    const c = document.getElementById('canvas'), copie = document.createElement('canvas');
    copie.width = c.width; copie.height = c.height;
    const x = copie.getContext('2d', { willReadFrequently: true });
    x.drawImage(c, 0, 0);
    return { l: c.width, h: c.height, px: x.getImageData(0, 0, c.width, c.height).data, png: copie.toDataURL('image/png') };
  };
});

const hashes = {};
if (o.png) await mkdir(o.sortie, { recursive: true });
async function etape(nom, images = 3, avant = null, arg = null) {
  if (avant) await page.evaluate(avant, arg);
  const r = await page.evaluate(async ([n, png]) => {
    const r = window.__images(n);
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', r.px));
    return { hash: Array.from(d, b => b.toString(16).padStart(2, '0')).join('').slice(0, 24), png: png ? r.png : null };
  }, [images, !!o.png]);
  hashes[nom] = r.hash;
  if (o.png) await writeFile(`${o.sortie}/${nom}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
}

await page.goto(`${srv.base}index.html?debug=1&seed=7`);
await page.waitForTimeout(800);
await etape('titre', 8);                                       // l'écran titre : le décor, ses obus et ses colonnes de fumée
await page.evaluate(() => { document.getElementById('nouvelle').click(); });
await page.waitForTimeout(500);
await page.evaluate(() => { window.__images(2); });             // la partie commence
await page.evaluate(() => { __jeu.setSeed(7); });
await etape('z2', 4);
await etape('z1', 3, () => { __jeu.zoom(0); __jeu.teleport({ x: 200, y: 150 }); });
await etape('z4', 3, () => { __jeu.zoom(3); __jeu.teleport({ x: 200, y: 215 }); });
await etape('z6', 3, () => { __jeu.zoom(4); });
await etape('z8', 3, () => { __jeu.zoom(5); });
// des obus : en vol, à l'impact, la fumée qui reste
await etape('obus-vol', 12, () => { __jeu.zoom(3); __jeu.teleport({ x: 200, y: 150 }); for (const [c, x, y] of [['75', 180, 140], ['155', 210, 150], ['220', 200, 165]]) __jeu.barrage(c, x, y); });
await etape('obus-impact', 30);
await etape('obus-fumee', 80);
// la bataille elle-même : des tirs, des balles, des blessés
await etape('melee', 400, () => { __jeu.marche([0, 1, 2, 3], 200, 120); });
await etape('melee-z6', 3, () => { __jeu.zoom(4); __jeu.teleport({ x: 200, y: 150 }); });
// ce que l'interface fait allumer sur le terrain : un ordre qui clignote, la visée (tronçons et emprise), le survol d'un tronçon
await etape('clignote', 2, () => { __jeu.zoom(3); __jeu.teleport({ x: 200, y: 215 }); __jeu.rendu().clignoter([20, 21, 22]); });
await etape('surbrillance', 2, () => { __jeu.rendu().surligner({ troncons: [30, 31], rects: [{ x: 190, y: 200, l: 40, p: 20 }] }); __jeu.rendu().survoler(-1, [40, 41]); });
await etape('surbrillance-fin', 2, () => { __jeu.rendu().surligner(null); __jeu.rendu().survoler(-1, []); });
// le souffle : un 155 sur nos propres hommes à qui il faut voir sauter, tirer, se tapir
await etape('souffle', 6, () => { __jeu.zoom(4); __jeu.teleport({ x: 200, y: 215 }); __jeu.barrage('155', 200, 215); });
await etape('souffle-bond', 4);
// les régiments choisis (leurs anneaux d'os), un régiment survolé (l'anneau à la couleur de son camp), des tombes ; de près, puis tout dézoomé (des points)
await etape('choix-z4', 3, () => { const B = __jeu.bataille(); B.etat.tombes.push([1950, 2140, 0, 1, 1, 1], [2010, 2150, 0, 1, 2, 1], [2060, 2160, 1, 1, 3, 1]); __jeu.rendu().choisis = new Set([2, 3]); __jeu.rendu().survoler(5, []); __jeu.zoom(3); __jeu.teleport({ x: 200, y: 215 }); });
await etape('choix-z1', 3, () => { __jeu.zoom(0); });
await etape('choix-fin', 2, () => { __jeu.rendu().choisis = new Set(); __jeu.rendu().survoler(-1, []); __jeu.zoom(3); });
await etape('rotation', 10, () => { __jeu.zoom(3); __jeu.camera(0.5, 1.1); });
await etape('rotation-z1', 3, () => { __jeu.zoom(0); __jeu.camera(-0.45, 0.8); });
// la fin du jour : le soleil bas, puis la nuit et ses lumières
await page.evaluate(() => { __jeu.camera(0.15, 0.95); __jeu.zoom(3); __jeu.teleport({ x: 200, y: 215 }); const B = __jeu.bataille(); while (B.etat.phase === 'jour' && __jeu.state().heure < 16) __jeu.avancer(30, false); });
await etape('soir', 4);
await etape('soir-z1', 3, () => { __jeu.zoom(0); });
await etape('nuit', 4, () => { __jeu.zoom(3); const B = __jeu.bataille(); while (B.etat.phase === 'jour') __jeu.avancer(30, false); __jeu.nuit(); });
// les trois styles de nuit que le labo compare (la trame, le voile continu, le voile et ses halos : le jeu garde les halos)
await etape('nuit-trame', 2, () => { __jeu.rendu().styleNuit = 'trame'; });
await etape('nuit-doux', 2, () => { __jeu.rendu().styleNuit = 'doux'; });
await etape('nuit-halos', 2, () => { __jeu.rendu().styleNuit = 'halos'; });
// le temps qu'il fait : de la pluie, du brouillard, du gel (un jour de plus, pour tout reprendre au matin)
await etape('matin', 4, () => { document.getElementById('aube').click(); document.getElementById('aube').click(); });
for (const m of ['pluie', 'brouillard', 'gel']) {
  await etape(`meteo-${m}`, 6, m => { const B = __jeu.bataille(); B.etat.meteo[B.etat.jour - 1] = m; __jeu.zoom(3); }, m);
  await etape(`meteo-${m}-z1`, 3, () => { __jeu.zoom(0); });
}

await nav.close(); await srv.close();

let code = 0;
if (erreurs.length) { console.log('✗ erreurs :', [...new Set(erreurs)].slice(0, 5)); code = 1; }
if (o.ecrire) {
  await writeFile(o.ref, JSON.stringify(hashes, null, 1) + '\n');
  console.log(`✓ référence écrite : ${o.ref} (${Object.keys(hashes).length} images)`);
} else {
  const ref = JSON.parse(await readFile(o.ref, 'utf8'));
  for (const [nom, h] of Object.entries(hashes)) {
    if (ref[nom] === h) console.log(`✓ ${nom}`); else { code = 1; console.log(`✗ ${nom} : ${ref[nom] ? 'les pixels ont changé' : 'pas dans la référence'}`); }
  }
  for (const nom of Object.keys(ref)) if (!(nom in hashes)) { code = 1; console.log(`✗ ${nom} : absent de cette lecture`); }
}
process.exit(code);
