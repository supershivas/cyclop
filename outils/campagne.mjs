// La campagne dans le navigateur (v0.36.4) : démarre une campagne (mode debug : l'écran titre vient au lot 7), joue la bataille 1 jusqu'à sa fin,
// vérifie que le registre (variante A du labo) remplace l'écran de fin, appuie sur Entrée, et que la bataille 2 est celle de la crête avec nos survivants.
// Aucune erreur de console. Long (sept jours de 750 hommes par camp : une à deux minutes).
//   node outils/campagne.mjs [--graine 11] [--capture captures/campagne.png]
//   --tout oui  → joue les trois batailles (≈ 5 minutes) et vérifie la fin de la campagne : sobre, les noms, l'écran titre (capture : --capture-fin captures/campagne-fin.png)
import { servir, lancerChromium, options } from './navigateur.mjs';

const o = options(process.argv.slice(2), { graine: '11', capture: 'captures/campagne.png', tout: 'non', 'capture-fin': 'captures/campagne-fin.png' });
const srv = await servir('.'), nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));
page.on('console', m => { if (m.type() === 'error') erreurs.push(`console : ${m.text()}`); });
const verifier = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) erreurs.push(texte); };

await page.goto(`${srv.base}index.html?debug=1&seed=1`);
await page.waitForTimeout(800);
await page.evaluate(g => __jeu.campagne(g), +o.graine);
await page.waitForTimeout(1500);
const d = await page.evaluate(() => { const e = __jeu.bataille().etat; return { n: e.campagne?.n, secteur: e.secteur, mission: e.mission, jours: e.meteo.length, nous: e.parCamp, eux: e.parCampEux }; });
verifier(d.n === 1 && d.secteur === 'essai' && d.mission === 'tenir' && d.jours === 7, `bataille 1 : ${JSON.stringify(d)}`);
verifier(d.eux < d.nous, `en surnombre au début (${d.nous} contre ${d.eux})`);

await page.keyboard.press('F9');
const t0 = Date.now();
while (await page.evaluate(() => __jeu.bataille().etat.phase !== 'fin')) await page.evaluate(() => __jeu.avancer(900, true));
console.log(`bataille 1 jouée en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await page.evaluate(() => __jeu.fin());                       // l'événement de fin ne passe pas par `avancer` du mode debug : on l'ouvre comme la boucle le fait
await page.waitForTimeout(500);
const p = await page.evaluate(() => __jeu.papierCampagne());
verifier(p.ouvert, 'le registre est ouvert à la fin de la bataille');
verifier(/Partir pour la bataille 2 · La crête/.test(p.texte), 'il propose la bataille 2, la crête');
verifier(!(await page.evaluate(() => document.getElementById('dialogue-fin').open)), 'pas d\'écran de fin : la campagne continue');
verifier(await page.evaluate(() => document.activeElement?.id !== 'canvas' && document.activeElement?.tagName === 'BUTTON'), 'le bouton a le focus (Entrée)');
await page.screenshot({ path: o.capture });
const registre = await page.evaluate(() => JSON.parse(localStorage.getItem('cyclopeen:debug:campagne')));
verifier(registre?.data?.batailles?.length === 1 && registre.v === 1, 'le registre est écrit (clé debug, version 1)');

await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
const d2 = await page.evaluate(() => { const B = __jeu.bataille(), e = B.etat, A = B.armee; let vet = 0, nous = 0; for (let i = 0; i < A.n; i++) if (A.camp[i] === 0) { nous++; if (A.exp[i] > 0) vet++; } return { n: e.campagne?.n, secteur: e.secteur, mission: e.mission, jours: e.meteo.length, nous, vet, papier: document.getElementById('campagne').hidden }; });
verifier(d2.n === 2 && d2.secteur === 'crete' && d2.jours === 7, `bataille 2 : ${JSON.stringify(d2)}`);
verifier(d2.nous === 750 && d2.vet > 0, `elle reprend ses survivants : ${d2.vet} vétérans parmi ${d2.nous}`);
verifier(d2.papier, 'le papier est refermé');
verifier(d2.mission === (registre.data.batailles[0].issue?.reussie ? 'prendre' : 'tenir'), `mission selon l'issue (${d2.mission})`);

if (o.tout === 'oui') {
  // les batailles suivantes, jusqu'à la fin de la campagne : le registre entre chacune, puis le papier de fin
  const jouerJusquaLaFin = async () => { while (await page.evaluate(() => __jeu.bataille().etat.phase !== 'fin')) await page.evaluate(() => __jeu.avancer(900, true)); await page.evaluate(() => __jeu.fin()); await page.waitForTimeout(500); };
  for (let n = 2; n <= 3; n++) {
    await jouerJusquaLaFin();
    const etat = await page.evaluate(() => JSON.parse(localStorage.getItem('cyclopeen:debug:campagne')).data.statut);
    const p2 = await page.evaluate(() => __jeu.papierCampagne());
    if (etat === 'en cours') { verifier(/Partir pour la bataille/.test(p2.texte), `bataille ${n} finie, le registre propose la suivante`); await page.keyboard.press('Enter'); await page.waitForTimeout(2500); }
    else {
      verifier(true, `la campagne s'arrête après la bataille ${n - 1} (${etat})`);
      break;
    }
    if (n === 3) await jouerJusquaLaFin();
  }
  const fin = await page.evaluate(() => ({ ...__jeu.papierCampagne(), dialogue: document.getElementById('dialogue-fin').open, details: document.querySelectorAll('#campagne details').length, noms: document.querySelectorAll('#campagne details li').length, statut: JSON.parse(localStorage.getItem('cyclopeen:debug:campagne')).data.statut }));
  verifier(fin.ouvert && !fin.dialogue, 'le papier de fin remplace l\'écran de fin');
  verifier(/La campagne est finie|plus de quoi tenir/.test(fin.texte), `il le dit sans fanfare : « ${fin.texte.slice(0, 60)} »`);
  verifier(!/victoire|gloire|bravo|score|médaille/i.test(fin.texte), 'aucun mot de victoire, de gloire ni de score');
  verifier(fin.details === 2 && fin.noms > 0, `les noms : ${fin.noms} lignes dans 2 listes repliées`);
  await page.click('#campagne details summary');           // « Les tombés » s'ouvre au clavier ou à la souris
  await page.screenshot({ path: o['capture-fin'] });
  await page.focus('#campagne .bouton');                  // (le clic sur la liste a pris le focus : Entrée y ouvrirait la liste)
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  verifier(await page.evaluate(() => !document.getElementById('titre').hidden && document.getElementById('campagne').hidden), 'Entrée ramène à l\'écran titre');
}

await nav.close(); srv.close?.();
if (erreurs.length) { console.log(erreurs.join('\n')); process.exit(1); }
console.log('✓ la campagne passe de la bataille 1 à la bataille 2, sans erreur');
