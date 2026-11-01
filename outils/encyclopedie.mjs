// Les captures de l'encyclopédie des règles (v0.100.0) : joue le jeu dans le navigateur (mode debug, graine 7, 1 280 × 800), met en scène chaque élément et l'enregistre dans
// assets/encyclopedie/<id>.png, avec un index.json (les captures présentes et leur taille) que lit le labo (sujet « Encyclopédie »). Ce que `js/data/encyclopedie.js` appelle `capture: '<id>'` vient d'ici.
//
//   node outils/encyclopedie.mjs                  → toutes les captures
//   node outils/encyclopedie.mjs --seulement carte,nuit   → quelques-unes
//   node outils/encyclopedie.mjs --manque         → dit seulement ce que l'encyclopédie attend et que le dossier n'a pas
//
// Chaque capture est indépendante (une qui échoue ne retient pas les autres) ; l'échec est dit à la fin. Aucune règle du jeu n'est touchée : la mise en scène passe par `window.__jeu`.
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { servir, lancerChromium, options } from './navigateur.mjs';
import { ENTREES } from '../js/data/encyclopedie.js';

const o = options(process.argv.slice(2), { seulement: '', manque: false });
const attendues = [...new Set(ENTREES.map(e => e.capture).filter(Boolean))].sort();
const DOSSIER = 'assets/encyclopedie';
await mkdir(DOSSIER, { recursive: true });
if (o.manque) {
  const la = new Set((await readdir(DOSSIER)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)));
  const m = attendues.filter(c => !la.has(c));
  console.log(m.length ? `Manque (${m.length}) : ${m.join(', ')}` : 'Toutes les captures attendues sont là.');
  process.exit(0);
}
const voulues = new Set(o.seulement ? String(o.seulement).split(',') : attendues);

const srv = await servir('.');
const nav = await lancerChromium();
// un contexte neuf par partie : sans cela, la partie sauvegardée de la précédente fait demander « Une bataille est en cours. La remplacer ? » et la capture montre la question
const nouveauContexte = async () => {
  const c = await nav.newContext({ viewport: { width: 1280, height: 800 } });
  await c.route('**/assets/design/*.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  return c;
};
const faites = {}, echecs = [];
const pause = ms => new Promise(r => setTimeout(r, ms));

// Une page de jeu neuve (bataille de décor ou partie, graine 7, mode debug) ; `url` ajoute des paramètres
async function partie(extra = '') {
  const page = await (await nouveauContexte()).newPage();
  page.on('pageerror', e => echecs.push(`exception : ${e.message}`));
  await page.goto(`${srv.base}index.html?debug=1&seed=7${extra}`);
  await page.waitForTimeout(700);
  await page.click('#nouvelle');
  await page.waitForTimeout(1500);
  await page.keyboard.press('F9');
  await page.evaluate(() => { __jeu.setSeed(7); document.getElementById('temps-pause').click(); });      // le temps s'arrête : les captures sont stables
  return page;
}
// Enregistre une capture : tout l'écran, un élément (sélecteur) ou une zone { x, y, width, height }
async function prendre(page, id, cible) {
  if (!voulues.has(id)) return;
  try {
    const chemin = `${DOSSIER}/${id}.png`;
    if (typeof cible === 'string') await page.locator(cible).first().screenshot({ path: chemin });
    else await page.screenshot({ path: chemin, ...(cible ? { clip: cible } : {}) });
    faites[id] = true;
  } catch (e) { echecs.push(`${id} : ${String(e.message).split('\n')[0]}`); }
}
// Échap, puis toute fenêtre restée ouverte (un Échap de trop ouvre le menu de pause : il ne doit jamais figurer sur une capture)
const echap = async page => { await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await page.waitForTimeout(200); };
// Poser la vue 3D : centre (coordonnées du terrain), zoom (indice de ZOOMS), puis laisser dessiner
const vue = (page, x, y, zoom) => page.evaluate(([x, y, z]) => { const r = __jeu.rendu(); r.vue.zoom = z; r.vue.cx = x; r.vue.cz = y; r.deplacer(0, 0); }, [x, y, zoom]);
const centreRegiment = (page, reg) => page.evaluate(reg => {
  const B = __jeu.bataille(), A = B.armee; let x = 0, y = 0, n = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg && !A.mort[i]) { x += A.x[i]; y += A.y[i]; n++; }
  return { x: x / n, y: y / n };
}, reg);

try {
  // ── l'écran titre et le choix du secteur (sans le mode debug, qui lance tout de suite) ──
  if (['titre', 'choix-secteur'].some(i => voulues.has(i))) {
    const page = await (await nouveauContexte()).newPage();
    await page.goto(`${srv.base}index.html`);
    await page.waitForTimeout(3500);
    await prendre(page, 'titre');
    if (voulues.has('choix-secteur')) { await page.click('#nouvelle'); await page.waitForTimeout(3000); await prendre(page, 'choix-secteur'); }
    await page.close();
  }

  // ── la bataille, l'interface ──
  const p = await partie();
  await p.evaluate(() => __jeu.avancer(80, false));
  await p.waitForTimeout(500);
  await prendre(p, 'champ');
  await prendre(p, 'billet', '.haut-bloc');
  await prendre(p, 'temps', '.haut-bloc .boutons');
  await prendre(p, 'frise', '#frise');
  await p.mouse.move(640, 520); await p.waitForTimeout(500);
  await prendre(p, 'terrain-survole', '.billet');
  await prendre(p, 'pertes', '.haut-centre');
  await prendre(p, 'carte', '#carte');
  await prendre(p, 'regiments', { x: 0, y: 700, width: 960, height: 100 });
  await prendre(p, 'batteries', '#batteries');
  // les cartouches des régiments, au-dessus des hommes
  await p.evaluate(() => { const r = __jeu.rendu(); r.vue.zoom = 4; });
  await p.waitForTimeout(500);
  if (voulues.has('etiquette')) { const c = await centreRegiment(p, 2); await vue(p, c.x, c.y, 4); await p.waitForTimeout(700); await prendre(p, 'etiquette', { x: 240, y: 200, width: 800, height: 400 }); }
  // la fenêtre d'ordres d'un régiment, sa fiche
  await p.click('#reg-rang .reg-carte >> nth=2'); await p.waitForTimeout(900);
  await prendre(p, 'fenetre-regiment', { x: 0, y: 380, width: 960, height: 420 });
  if (voulues.has('fiche-regiment')) { await p.click('#reg-ouvert .aide'); await p.waitForTimeout(500); await prendre(p, 'fiche-regiment', '#fiche'); await echap(p); }
  await echap(p);
  // la fiche d'un homme
  if (voulues.has('fiche-homme')) { await p.evaluate(() => __jeu.ouvrirFiche(__jeu.bataille().armee.id[0])); await p.waitForTimeout(500); await prendre(p, 'fiche-homme', '#fiche'); await echap(p); }
  // le carnet de bord
  if (voulues.has('carnet')) {
    await p.evaluate(() => __jeu.raconter([{ type: 'prise', camp: 0, troncon: 2 }, { type: 'dispute', camp: 0, troncon: 6 }, { type: 'deroute', camp: 0, reg: 1 }, { type: 'prise', camp: 1, troncon: 5 }]));
    await p.waitForTimeout(1500); await prendre(p, 'carnet', '#carnet');
  }
  // la mission
  if (voulues.has('mission')) { await p.click('#mission'); await p.waitForTimeout(500); await prendre(p, 'mission', '#dialogue-mission'); await echap(p); await p.waitForTimeout(300); }
  // le gros plan d'un secteur (la vue 3D cadrée et le plan à la place de la carte)
  if (voulues.has('secteur-gros-plan')) { await p.evaluate(() => document.querySelectorAll('#carte-grille .sect')[2].click()); await p.waitForTimeout(1800); await prendre(p, 'secteur-gros-plan'); await echap(p); await p.waitForTimeout(900); }
  // le camp : un bâtiment après l'autre
  if (['fenetre-batiment', ...['artillerie', 'aerodrome', 'chars', 'sapeurs', 'caserne'].map(k => `fenetre-batiment-${k}`)].some(i => voulues.has(i))) {
    await p.keyboard.press('b'); await p.waitForTimeout(1800);
    for (const k of ['artillerie', 'aerodrome', 'chars', 'sapeurs', 'caserne']) {
      await p.evaluate(k => __jeu.batiment(k), k); await p.waitForTimeout(800);
      if (k === 'artillerie') await prendre(p, 'fenetre-batiment', { x: 240, y: 0, width: 800, height: 700 });
      await prendre(p, `fenetre-batiment-${k}`, '#batiment');
    }
    await echap(p); await p.keyboard.press('b'); await p.waitForTimeout(1200);
  }
  // la nuit, la fin
  if (voulues.has('nuit')) { await p.evaluate(() => __jeu.avancer(900, false)); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await p.evaluate(() => __jeu.nuit()); await p.waitForTimeout(800); await prendre(p, 'nuit', '#nuit'); }
  if (voulues.has('fin')) { await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await p.evaluate(() => __jeu.fin()); await p.waitForTimeout(800); await prendre(p, 'fin', '#dialogue-fin'); }
  await p.close();

  // ── le terrain et les hommes, vus de près ──
  const t = await partie();
  const centre = { x: 200, y: 150 };
  if (['soldats-pres', 'tranchee', 'nid', 'arbres', 'cratere'].some(i => voulues.has(i))) {
    const c = await centreRegiment(t, 2); await vue(t, c.x, c.y, 6); await t.waitForTimeout(900); await prendre(t, 'soldats-pres', { x: 240, y: 150, width: 800, height: 500 });
    const tr = await t.evaluate(() => { const B = __jeu.bataille(), k = B.troncons.findIndex(x => B.lignes[x.ligne].rang === 0 && B.lignes[x.ligne].camp === 0); const x = B.troncons[k]; return { x: (x.x0 + x.x1) / 2, y: B.lignes[x.ligne].y0 }; });
    await vue(t, tr.x, tr.y, 5); await t.waitForTimeout(900); await prendre(t, 'tranchee', { x: 140, y: 100, width: 1000, height: 600 });
    const nid = await t.evaluate(() => { const n = __jeu.bataille().etat.nids?.[0]; return n ? { x: n.x, y: n.y } : null; });
    if (nid) { await vue(t, nid.x, nid.y, 6); await t.waitForTimeout(900); await prendre(t, 'nid', { x: 240, y: 150, width: 800, height: 500 }); }
    const arbre = await t.evaluate(() => { const a = __jeu.bataille().terrain.arbres.find(x => !x.abattu); const m = __jeu.bataille().etat.marges; return a ? { x: a.i, y: a.j } : null; });
    if (arbre) { await vue(t, arbre.x, arbre.y, 3); await t.waitForTimeout(900); await prendre(t, 'arbres', { x: 140, y: 100, width: 1000, height: 600 }); }
    // des cratères : quelques barrages de 155 au centre du champ, puis la vue dessus
    await t.evaluate(() => { __jeu.bataille().etat.camp.batiments.artillerie.niveau = 3; for (const [x, y] of [[190, 140], [210, 150], [200, 165]]) __jeu.barrage('155', x, y); __jeu.avancer(260, false); });
    const m = await t.evaluate(() => __jeu.bataille().etat.marges);
    await vue(t, centre.x + m.x, centre.y + m.y, 5); await t.waitForTimeout(1000); await prendre(t, 'cratere', { x: 140, y: 100, width: 1000, height: 600 });
  }
  // un char, un avion
  if (voulues.has('char') || voulues.has('avion')) {
    const m = await t.evaluate(() => __jeu.bataille().etat.marges);
    if (voulues.has('avion')) {
      await t.evaluate(() => { __jeu.barrage('avion', 120, 150, 0, 280, 150); __jeu.avancer(520, false); });
      const a = await t.evaluate(() => { const v = (__jeu.bataille().etat.avionsVol ?? __jeu.bataille().etat.avionsEnVol ?? []).find(Boolean); return v ? { x: v.x, y: v.y } : null; });
      await vue(t, (a?.x ?? 200 + m.x), (a?.y ?? 150 + m.y), 3); await t.waitForTimeout(900); await prendre(t, 'avion', { x: 140, y: 100, width: 1000, height: 600 });
    }
    if (voulues.has('char')) {
      await t.evaluate(() => { __jeu.barrage('char', 200, 100); __jeu.avancer(1500, false); });
      const c = await t.evaluate(() => { const k = (__jeu.bataille().etat.chars ?? []).find(Boolean); return k ? { x: k.x, y: k.y } : null; });
      await vue(t, (c?.x ?? 200 + m.x), (c?.y ?? 200 + m.y), 4); await t.waitForTimeout(900); await prendre(t, 'char', { x: 140, y: 100, width: 1000, height: 600 });
    }
  }
  await t.close();

  // ── la boue et l'eau : un jour de pluie ──
  if (voulues.has('boue') || voulues.has('eau')) {
    const q = await partie();
    await q.evaluate(() => { const B = __jeu.bataille(); B.etat.meteo[0] = 'pluie'; B.etat.meteo[1] = 'pluie'; for (const [x, y] of [[190, 140], [210, 150], [200, 165], [185, 155]]) __jeu.barrage('220', x, y); __jeu.avancer(1500, false); });
    const m = await q.evaluate(() => __jeu.bataille().etat.marges);
    await vue(q, 200 + m.x, 150 + m.y, 4); await q.waitForTimeout(1200); await prendre(q, 'boue', { x: 140, y: 100, width: 1000, height: 600 });
    await vue(q, 200 + m.x, 152 + m.y, 6); await q.waitForTimeout(900); await prendre(q, 'eau', { x: 140, y: 100, width: 1000, height: 600 });
    await q.close();
  }

  // ── le temps qu'il fait : une capture par météo ──
  for (const temps of ['pluie', 'brouillard', 'gel', 'neige', 'tempete', 'canicule']) {
    if (!voulues.has(`meteo-${temps}`)) continue;
    const w = await partie(temps === 'neige' || temps === 'tempete' ? '&saison=hiver' : temps === 'canicule' ? '&saison=ete' : '');
    await w.evaluate(t => { const B = __jeu.bataille(); B.etat.meteo[0] = t; __jeu.avancer(500, false); }, temps);
    const m = await w.evaluate(() => __jeu.bataille().etat.marges);
    await vue(w, 200 + m.x, 150 + m.y, 3); await w.waitForTimeout(1500); await prendre(w, `meteo-${temps}`, { x: 0, y: 0, width: 1280, height: 700 });
    await w.close();
  }
  if (voulues.has('hiver')) {
    const w = await partie('&saison=hiver');
    const m = await w.evaluate(() => __jeu.bataille().etat.marges);
    await vue(w, 200 + m.x, 150 + m.y, 3); await w.waitForTimeout(1500); await prendre(w, 'hiver', { x: 0, y: 0, width: 1280, height: 700 });
    await w.close();
  }
} finally {
  await nav.close(); await srv.close();
}

// l'index : les captures présentes (le labo ne montre que celles-là)
const la = (await readdir(DOSSIER)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort();
await writeFile(`${DOSSIER}/index.json`, JSON.stringify({ captures: la }, null, 1) + '\n');
const manque = attendues.filter(c => !la.includes(c));
console.log(`${Object.keys(faites).length} capture(s) faite(s) ; ${la.length} dans le dossier ; ${manque.length ? `manque : ${manque.join(', ')}` : 'rien ne manque'}.`);
if (echecs.length) console.log(`Échecs :\n  ${echecs.join('\n  ')}`);
