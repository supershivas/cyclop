// Une bataille de trois jours, jouée sans les mains, pour juger la lisibilité
// (cratère, boue, eau, soldat) et mesurer le rendu sur un champ labouré.
//
//   node scripts/trois-jours.mjs                      → 2 000 soldats, graine 7
//   node scripts/trois-jours.mjs --soldats 8000 --graine 3 --sortie captures/trois-jours
//   node scripts/trois-jours.mjs --sol facettes --rendu sprites --sortie captures/variantes   (les variantes du labo)
//
// Chaque soir : une capture du champ entier (un point par soldat) et deux de
// près (zoom 4 et 8) là où les obus sont tombés. À la fin : les mesures.
import { mkdir } from 'node:fs/promises';
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';

const o = options(process.argv.slice(2), { soldats: '2000', graine: '7', sortie: 'captures/trois-jours', sol: 'cubes', rendu: 'boites' });
await mkdir(o.sortie, { recursive: true });
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(`${srv.base}index.html?debug=1&mesure=1&seed=${o.graine}&soldats=${o.soldats}&sol=${o.sol}&soldats-rendu=${o.rendu}`);
await page.waitForTimeout(600);
await page.click('#nouvelle');
await page.waitForTimeout(1200);
await page.keyboard.press('F9');                // le panneau du mode debug ne cache pas le champ

// Les ordres d'une journée : nos barrages sur leur ligne et le no man's land ;
// le deuxième jour, nos régiments du centre avancent de 60 m.
async function journee(jour) {
  for (let k = 0; k < 40; k++) {
    await page.evaluate(([jour, k]) => {
      const B = __jeu.bataille();
      if (B.etat.phase !== 'jour') return;
      if (k % 4 === 0) for (const cal of ['75', '155', '220']) __jeu.barrage(cal, 80 + ((k * 53 + jour * 31) % 240), 70 + ((k * 17) % 90));
      if (jour === 2 && k === 2) __jeu.marche([2, 3, 4, 5], 200, 170);
      __jeu.avancer(270, false);
    }, [jour, k]);
    const ph = await page.evaluate(() => __jeu.bataille().etat.phase);
    if (ph !== 'jour') break;
  }
}
// de près : là où nos régiments du centre sont montés, au bord des trous
const vues = [['champ', 0, 200, 150], ['zoom4', 3, 200, 150], ['zoom8', 5, 200, 160]];
async function capturer(jour) {
  for (const [nom, z, x, y] of vues) {
    await page.evaluate(([z, x, y]) => { __jeu.zoom(z); __jeu.teleport({ x, y }); }, [z, x, y]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${o.sortie}/jour${jour}-${nom}.png` });
  }
}
for (let jour = 1; jour <= 3; jour++) {
  await journee(jour);
  // finir la journée (le soir), photographier, puis passer la nuit
  await page.evaluate(() => { const B = __jeu.bataille(); while (B.etat.phase === 'jour') __jeu.avancer(300, false); });
  // la boîte de la nuit est cachée le temps des photos (la fermer ferait venir l'aube)
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => { d.style.visibility = 'hidden'; }));
  await capturer(jour);
  const etat = await page.evaluate(() => ({ ...__jeu.state(), bilan: (() => { const B = __jeu.bataille(); const n = [0, 0, 0, 0, 0]; const T = B.terrain; for (let c = 0; c < T.W * T.H; c++) { const e = T.eau[c] > B.R.hydro.eau ? 3 : T.humid[c] > B.R.hydro.boue ? 2 : T.humid[c] > B.R.hydro.humide ? 1 : 0; n[e]++; } return n; })() }));
  console.log(`soir du jour ${jour} : ${etat.meteo}, morts ${etat.pertes}, impacts ${etat.impacts}, cases sec/humide/boue/eau ${etat.bilan.slice(0, 4).join('/')}`);
  await page.evaluate(() => { document.querySelectorAll('dialog').forEach(d => { d.style.visibility = ''; }); __jeu.avancer(20); });
}
// la mesure sur le champ labouré
await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
for (const [nom, z, x, y] of vues) {
  await page.evaluate(([z, x, y]) => { __jeu.zoom(z); __jeu.teleport({ x, y }); __jeu.bataille().etat.phase = 'jour'; }, [z, x, y]);
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => window.cyclopStats());
  console.log(`${nom.padEnd(6)} rendu ${s.ms.rendu} ms côté jeu, ${s.ms.renduFini} ms jusqu'au bout du dessin, ${s.trianglesDessines} triangles, ${s.fps} i/s`);
}
if (erreurs.length) console.log('Erreurs :', erreurs.slice(0, 5));
await nav.close(); await srv.close();
process.exit(erreurs.length ? 1 : 0);
