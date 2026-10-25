// La mesure du critère de validation : simulation et rendu de la bataille,
// chacun sous 8 ms, dans Chromium sans carte graphique (comme pierreStats()).
//
//   node scripts/mesure.mjs                 → 8 000 soldats (4 000 par camp)
//   node scripts/mesure.mjs --soldats 2000 --secondes 20
//   node scripts/mesure.mjs --arbres '{"feuilles":true}'   (les arbres variés du labo, v0.52.6 : `{}` les formes seules, `feuilles`, `chute`, `abattus: "longs"`)
//   node scripts/mesure.mjs --ombres 1 --zooms 3,4,5   (les ombres du relief du labo, v0.67 : éteintes dans le jeu)
//   node scripts/mesure.mjs --ombres 1 --parois 1 --zooms 3,4,5   (avec les parois qui suivent le soleil)
//   node scripts/mesure.mjs --nuages 1 --zooms 3,4,5   (les ombres de nuages du labo)
//   node scripts/mesure.mjs --finesse 2 --zooms 3,4,5   (le sol en demi-mètres ; indices de ZOOMS : 3 = 4 px/m, 4 = 6, 5 = 8)
//
// Le rendu est mesuré avec ?mesure=1 : chaque image attend la fin du dessin
// (gl.finish), sinon on ne mesure que l'envoi des commandes. Trois vues : tout
// le champ (un point par soldat), zoom 4 et zoom 8 (des boîtes), avec des
// barrages en cours (le sol se refait).
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';

const o = options(process.argv.slice(2), { soldats: '8000', secondes: '12', largeur: '1280', hauteur: '800', finesse: 'auto', zooms: '0,3,5', arbres: '', ombres: '', parois: '', nuages: '' });
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: +o.largeur, height: +o.hauteur } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
await page.goto(`${srv.base}index.html?debug=1&mesure=1&seed=7&soldats=${o.soldats}`);
await page.waitForTimeout(600);
await page.click('#nouvelle');
await page.waitForTimeout(1500);
// les deux camps marchent l'un vers l'autre, et l'artillerie tonne
await page.evaluate(() => {
  const B = __jeu.bataille();
  __jeu.marche(B.etat.regiments.filter(r => r.camp === 0).map(r => r.id), 200, 150);
  __jeu.barrage('155', 200, 120, 0); __jeu.barrage('75', 120, 180, 1); __jeu.barrage('220', 280, 170, 0);
});
const resultats = [];
const VUES = [['tout le champ (points)', 0, 200, 150], ['zoom 3 (boîtes)', 2, 200, 165], ['zoom 4 (boîtes)', 3, 200, 170], ['zoom 6 (silhouettes)', 4, 200, 180], ['zoom 8 (silhouettes)', 5, 200, 190]];
if (o.ombres) await page.evaluate(() => { __jeu.rendu().ombresRelief = true; });
if (o.nuages) await page.evaluate(() => { __jeu.rendu().ombresNuages = true; });
if (o.parois) await page.evaluate(() => { __jeu.rendu().soleilLabo = { parois: true }; });
if (o.arbres) await page.evaluate(a => __jeu.rendu().reglerArbres(JSON.parse(a)), o.arbres);
await page.evaluate(f => { const r = __jeu.rendu(); if (f !== 'auto') { r.finesseDes = null; r.finesse = +f; } }, o.finesse);      // auto : le réglage du jeu (le sol fin dès 4 px/m)
for (const [nom, zoom, x, y] of VUES.filter(v => o.zooms.split(',').map(Number).includes(v[1]))) {
  await page.evaluate(([z, x, y]) => { __jeu.zoom(z); __jeu.teleport({ x, y }); }, [zoom, x, y]);
  await page.waitForTimeout(+o.secondes * 1000);
  const s = await page.evaluate(() => window.cyclopStats());
  resultats.push({ vue: nom, ...s });
  console.log(`${nom.padEnd(24)} soldats ${s.soldats}  simulation ${s.ms.simulation} ms  rendu ${s.ms.renduFini} ms (envoi ${s.ms.rendu} ms, sol ${s.ms.sol} ms)  ${s.fps} i/s  ${s.trianglesDessines} triangles dessinés, ${s.soldatsVus} soldats vus, arbres ${Math.round(s.trianglesArbres ?? 0)} t (tri ${s.msArbres ?? 0} ms)  ${s.vue.largeur}×${s.vue.hauteur} ×${s.vue.facteur}`);
}
// une image vide (rien à dessiner) : ce que coûte la mesure elle-même (effacer, lire un pixel, attendre)
await page.evaluate(() => { __jeu.rendu().vide = true; });
await page.waitForTimeout(4000);
const vide = (await page.evaluate(() => window.cyclopStats())).ms.renduFini;
console.log(`${'image vide'.padEnd(24)} rendu ${vide} ms (le prix de l'attente : effacer et relire un pixel)`);
const pire = k => Math.max(...resultats.map(r => r.ms[k]));
const net = +(pire('renduFini') - vide).toFixed(2);
// le critère, sur le modèle de pierreStats() : le temps passé par le jeu (simulation, rendu)
const ok = pire('simulation') < 8 && pire('rendu') < 8;
const v = x => (x < 8 ? 'sous 8 ms ✓' : 'au-dessus de 8 ms ✗');
console.log(`\nCritère (comme pierreStats) : simulation ${pire('simulation')} ms ${v(pire('simulation'))} ; rendu ${pire('rendu')} ms ${v(pire('rendu'))}`);
console.log(`Plus strict (en attendant la fin du dessin logiciel) : ${pire('renduFini')} ms, dont ${net} ms de dessin net : ${v(net)}`);
if (erreurs.length) console.log('Erreurs :', erreurs);
await nav.close(); await srv.close();
process.exit(ok && !erreurs.length ? 0 : 1);
