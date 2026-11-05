// Vérifie le Labo lumière dans le vrai navigateur (Chromium, rendu logiciel dans le conteneur) :
//   node outils/lumiere.mjs                  → la page se charge sans erreur console, un obus, un barrage, la comparaison, l'écran partagé, les trois niveaux de qualité,
//                                              les 50 000 soldats, l'export JSON ; écrit des captures dans le dossier --sortie (défaut : /tmp)
//   node outils/lumiere.mjs --banc           → ajoute le banc GPU (le coût de chaque étape ; lent en rendu logiciel)
//   node outils/lumiere.mjs --sortie dossier
// Code de sortie 1 s'il y a une erreur de console, une exception, ou une règle non tenue (le coût du recalcul local ne doit pas dépendre du nombre de soldats).
import { servir, lancerChromium, options } from './navigateur.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const o = options();
const sortie = typeof o.sortie === 'string' ? o.sortie : '/tmp';
mkdirSync(sortie, { recursive: true });
const srv = await servir(process.cwd());
const b = await lancerChromium({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const erreurs = [], echecs = [], rapport = { niveaux: {} };
p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /webgl|shader/i.test(m.text()) && !/GPU stall/i.test(m.text()))) erreurs.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', e => erreurs.push(`exception: ${e.stack || e.message}`));
const verifier = (ok, texte) => { console.log(`${ok ? 'ok  ' : 'ÉCHEC'} ${texte}`); if (!ok) echecs.push(texte); };
const J = (f, arg) => p.evaluate(f, arg);
const image = nom => p.screenshot({ path: `${sortie}/lumiere-${nom}.png` });

await p.goto(srv.base + 'labo-lumiere.html');
await p.waitForFunction(() => window.__lumiere, null, { timeout: 60000 });
await p.waitForTimeout(1500);
verifier(await J(() => document.title === 'Labo lumière — Cyclopéen'), 'le titre de la page');
verifier(await J(() => document.getElementById('ll-nom').getAttribute('href') === './'), 'le nom en haut à gauche ramène à l\'accueil');
verifier(await J(() => !!document.querySelector('link[rel=icon]')), 'un favicon');
await image('depart');
// L'AO de toute la carte se répartit sur plusieurs images (v0.114.0) : aucune image ne porte plus de quelques millisecondes de ce travail
await p.waitForFunction(() => !window.__lumiere.travail, null, { timeout: 240000 });
const ao = await J(() => ({ total: window.__lumiere.mesures.lire('ao:total')?.dernier, maxImage: window.__lumiere.mesures.lire('ao:image')?.max, n: window.__lumiere.mesures.lire('ao:image')?.n }));
verifier(ao.n > 8 && ao.maxImage < 20, `l'AO global est réparti : ${ao.n} images, au plus ${ao.maxImage?.toFixed(1)} ms par image (total ${ao.total?.toFixed(0)} ms ; avant : un bloc de ~230 ms)`);
rapport.ao = ao;

// Les ombres portées (étape 9) : la carte d'ombre change l'image, elle a des casteurs, et la nuit il n'y en a plus
await J(() => { const L = window.__lumiere; L.S.pause = true; L.S.etapes[9] || L.basculerEtape(9, true); document.getElementById('ll-heure').value = 11; document.getElementById('ll-heure').dispatchEvent(new Event('input')); L.voirPreset('engins', true); Object.assign(L.C, { distance: 28, tangage: 1.0, lacet: 0.3 }); });
await p.waitForTimeout(2500);
const avecO = (await p.screenshot()).toString('base64'), statO = await J(() => window.__lumiere.R.stats.ombre); await image('ombres-portees');
await J(() => window.__lumiere.basculerEtape(9, false)); await p.waitForTimeout(2000);
const sansO = (await p.screenshot()).toString('base64'); await J(() => window.__lumiere.basculerEtape(9, true));
verifier(!!statO && statO.casteurs > 0 && statO.texelCm < 40, `la carte d'ombre : ${JSON.stringify(statO)}`); verifier(avecO !== sansO, 'les ombres portées changent l\'image (chars, biplans, arbres, soldats)');
await J(() => { document.getElementById('ll-heure').value = 23; document.getElementById('ll-heure').dispatchEvent(new Event('input')); }); await p.waitForTimeout(1800);
verifier(await J(() => window.__lumiere.R.stats.ombre === null), 'la nuit : plus de carte d\'ombre (le soleil est couché)');
await J(() => { document.getElementById('ll-heure').value = 9; document.getElementById('ll-heure').dispatchEvent(new Event('input')); window.__lumiere.S.pause = false; }); await p.waitForTimeout(800);

// Un obus : un cube entier, quatre demi-cubes, quatre quarts (sur un terrain plat : on aplatit d'abord un coin)
const motif = await J(() => {
  const { M } = window.__lumiere, i = 20, j = 20; for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const k = (j + dj) * M.W + i + di; M.sol[k] = 40; M.top[k] = 40; M.veg[k] = 0; M.toit[k] = 0; }
  window.__lumiere.obus(i + 0.5, j + 0.5, { silencieux: true });
  return [0, 1, -1].flatMap(dj => [-1, 0, 1].map(di => 40 - M.sol[(j + dj) * M.W + i + di])).join(',');
});
verifier(motif === '1,2,1,4,2,2,1,2,1' || motif.split(',').map(Number).sort().join() === '1,1,1,1,2,2,2,2,4', `un obus : 1 cube entier, 4 demi-cubes, 4 quarts (${motif})`);

// Les trois niveaux : chaque étape, activée seule ou toutes, sans erreur, et le recalcul local reste local
for (const q of ['bas', 'moyen', 'haut']) {
  await J(qq => window.__lumiere.appliquerQualite(qq), q); await p.waitForTimeout(600);
  const etat = await J(() => ({ etapes: Object.entries(window.__lumiere.S.etapes).filter(([, v]) => v).map(([k]) => +k), cases: window.__lumiere.M.n }));
  const attendu = { bas: '1,2,3', moyen: '1,2,3,4,5,6,9', haut: '1,2,3,4,5,6,7,8,9' }[q];
  verifier(etat.etapes.join() === attendu, `qualité ${q} : étapes ${etat.etapes.join(',')}`);
  // des obus au même endroit avec 1 000 puis 50 000 soldats : le recalcul ne dépend pas de la foule
  const mes = {};
  for (const n of [1000, 50000]) {
    await J(nn => { const e = document.getElementById('ll-unites'); e.value = nn; e.dispatchEvent(new Event('input')); window.__lumiere.mesures.v.delete('recalcul:total'); for (let k = 0; k < 12; k++) window.__lumiere.obus(60 + k * 9, 70 + (k % 4) * 5, { silencieux: true }); }, n);
    await p.waitForTimeout(500);
    mes[n] = await J(() => window.__lumiere.mesures.lire('recalcul:total').moy);
  }
  rapport.niveaux[q] = { recalcul_ms_1000: +mes[1000].toFixed(2), recalcul_ms_50000: +mes[50000].toFixed(2), colonnes: etat.cases };
  verifier(Math.abs(mes[50000] - mes[1000]) < Math.max(1.5, mes[1000] * 0.6), `qualité ${q} : le recalcul local ne dépend pas des soldats (${mes[1000].toFixed(2)} ms à 1 000, ${mes[50000].toFixed(2)} ms à 50 000)`);
  await image(`niveau-${q}`);
  await J(() => { const e = document.getElementById('ll-unites'); e.value = 8000; e.dispatchEvent(new Event('input')); });
}

// Les soldats du jeu avec son échelle de détail (articulés, équipés, allégés, boîtes, points), les lanternes des tranchées, la colline et la grande carte
await J(() => { window.__lumiere.S.pause = false; window.__lumiere.voirPreset('tranchee', true); Object.assign(window.__lumiere.C, { distance: 15, tangage: 0.5 }); }); await p.waitForTimeout(1500);
const cpt = await J(() => ({ ...window.__lumiere.comptes, fixes: window.__lumiere.LA.fixes.length, W: window.__lumiere.M.largeurM, D: window.__lumiere.M.profondeurM, colline: window.__lumiere.M.colline.hauteurM }));
verifier(cpt.art > 3, `de près : des soldats articulés (${cpt.art}), des équipés (${cpt.equipe}), des allégés (${cpt.legere})`); await image('vrais-soldats');
verifier(cpt.W >= 512 && cpt.D >= 320, `la carte est grande (${cpt.W} × ${cpt.D} m)`); verifier(cpt.colline > 8, `une colline de ${cpt.colline} m`);
verifier(cpt.fixes > 100, `des lanternes dans les tranchées (${cpt.fixes})`);
await J(() => { window.__lumiere.voirPreset('colline', true); }); await p.waitForTimeout(1200); await image('colline');
await J(() => { const J = window.__lumiere; document.getElementById('ll-heure').value = 22; document.getElementById('ll-heure').dispatchEvent(new Event('input')); J.voirPreset('tranchee', true); Object.assign(J.C, { distance: 22, tangage: 0.6 }); }); await p.waitForTimeout(2200); await image('nuit-lanternes');
await J(() => { const J = window.__lumiere; document.getElementById('ll-heure').value = 9; document.getElementById('ll-heure').dispatchEvent(new Event('input')); J.voirPreset('large', true); }); await p.waitForTimeout(1200);
const large = await J(() => window.__lumiere.comptes);
verifier(large.art + large.equipe + large.legere + large.boite === 0, `vue large (≈ 1 px/m) : des points, comme le jeu aux zooms 1 et 2 (${JSON.stringify(large)})`); await image('vue-large');
await J(() => { window.__lumiere.voirPreset('colline', true); }); await p.waitForTimeout(1500);
const moyen = await J(() => window.__lumiere.comptes);
verifier(moyen.art === 0 && moyen.legere + moyen.boite + moyen.equipe > 50, `vue moyenne (≈ 5 px/m) : des silhouettes allégées et des boîtes (${JSON.stringify(moyen)})`); await image('vue-moyenne');
await J(() => { window.__lumiere.voirPreset('large', true); Object.assign(window.__lumiere.C, { distance: 140, tangage: 0.1 }); }); await p.waitForTimeout(1200); await image('faux-terrain');
// Le clignotement des soldats (v0.114.0) : une image fixe est identique d'une image à l'autre, et, la foule en marche, les hommes ne changent pas de niveau de détail à tout bout de champ
await J(() => { const L = window.__lumiere; L.voirPreset('colline', true); L.S.pause = true; }); await p.waitForTimeout(1500);
const habillage = ['ll-mesures', 'll-barre', 'll-etat', 'll-toast', 'll-nom'];            // le texte des mesures change à chaque image : on ne compare que le dessin
const cacher = v => J(([ids, v2]) => ids.forEach(i => { const e = document.getElementById(i); if (e) e.style.visibility = v2; }), [habillage, v]);
const buffer = async () => (await p.screenshot()).toString('base64');
await cacher('hidden'); await p.waitForTimeout(400);
const [f1, f2, f3] = [await buffer(), await buffer(), await buffer()]; await cacher('');
verifier(f1 === f2 && f2 === f3, 'une image fixe (temps arrêté, vue moyenne) est identique d\'une image à l\'autre : aucun scintillement du dessin');
await J(() => { window.__lumiere.S.pause = false; }); await p.waitForTimeout(800);
const bascule = await J(async () => {
  const L = window.__lumiere, C = L.classes; let prev = Uint8Array.from(C.niv), total = 0, vus = 0, images = 0;
  await new Promise(res => { const f = () => { const niv = C.niv; let ch = 0, n = 0; for (let i = 0; i < niv.length; i++) { if (niv[i] < 4 || prev[i] < 4) n++; if (niv[i] !== prev[i]) ch++; } total += ch; vus += n; images++; prev = Uint8Array.from(niv); if (images < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return { total, vus, images, part: vus ? total / vus : 0 };
});
verifier(bascule.images >= 60 && bascule.part < 0.02, `la foule en marche : ${(bascule.part * 100).toFixed(2)} % des hommes vus changent de niveau de détail d'une image à l'autre (${bascule.total} sur ${bascule.vus} en ${bascule.images} images)`);
rapport.clignotement = bascule;
// La météo : chaque temps, puis le temps qui change tout seul
for (const m of ['pluie', 'neige', 'brouillard', 'boue', 'sec']) { await J(mm => { const J = window.__lumiere; J.S.meteo = mm; if (!J.S.etapes[7]) J.basculerEtape(7, true); Object.assign(J.meteoNow, J.METEOS[mm]); }, m); await p.waitForTimeout(700); await image(`meteo-${m}`); }
const avant = await J(() => window.__lumiere.S.meteo);
await J(() => { window.__lumiere.voirPreset('large', true); document.getElementById('ll-meteo-auto').click(); });
await p.waitForFunction(av => window.__lumiere.S.meteo !== av, avant, { timeout: 150000 }).catch(() => {});   // le temps de jeu avance lentement en rendu logiciel : on attend le changement
const apres = await J(() => window.__lumiere.S.meteo);
verifier(await J(() => window.__lumiere.S.meteoAuto === true) && apres !== avant, `le temps change tout seul (${avant} → ${apres})`);
await J(() => document.getElementById('ll-meteo-auto').click());
// Un barrage, la comparaison, l'écran partagé, la météo, la nuit
await J(() => window.__lumiere.barrage(128, 80)); await p.waitForTimeout(3500); await image('barrage');
await p.keyboard.press('c'); await p.waitForTimeout(400); verifier(await J(() => window.__lumiere.S.comparer === 'tout-off'), 'la touche C bascule « tout désactivé »'); await image('compare-off');
await p.keyboard.press('c'); await p.keyboard.press('v'); await p.waitForTimeout(400); verifier(await J(() => window.__lumiere.S.comparer === 'partage'), 'la touche V ouvre l\'écran partagé'); await image('compare-partage');
await p.keyboard.press('v');
await J(() => { window.__lumiere.S.meteo = 'boue'; document.getElementById('ll-heure').value = 17; document.getElementById('ll-heure').dispatchEvent(new Event('input')); }); await p.waitForTimeout(800); await image('boue-17h');
await J(() => { document.getElementById('ll-heure').value = 22; document.getElementById('ll-heure').dispatchEvent(new Event('input')); window.__lumiere.barrage(); }); await p.waitForTimeout(2200); await image('nuit-barrage');

// Les réglages par l'engrenage, la version
await p.click('#ll-ouvrir'); await p.waitForTimeout(300);
verifier(await J(() => !document.getElementById('ll-reglages').hidden && /^v\d+\.\d+\.\d+$/.test(document.getElementById('ll-version').textContent)), 'l\'engrenage ouvre les réglages ; la version y est affichée');
await image('reglages'); await p.keyboard.press('Escape');

if (o.banc) {
  await J(() => window.__lumiere.appliquerQualite('haut'));
  await J(() => window.__lumiere.lancerBanc());
  rapport.banc = await J(() => window.__lumiere.banque);
  verifier(!!rapport.banc, 'le banc GPU a tourné');
}
// L'export
const json = await J(async () => { let r = null; const orig = URL.createObjectURL; URL.createObjectURL = b => { r = b; return orig(b); }; document.getElementById('ll-export').click(); URL.createObjectURL = orig; return r ? await r.text() : null; });
verifier(!!json && !!JSON.parse(json).etapes?.length, 'l\'export JSON est lisible et porte les étapes');
if (json) writeFileSync(`${sortie}/lumiere-mesures.json`, json);
writeFileSync(`${sortie}/lumiere-rapport.json`, JSON.stringify(rapport, null, 2));

verifier(erreurs.length === 0, `aucune erreur en console (${erreurs.length})`);
for (const e of erreurs.slice(0, 8)) console.log('   ', e);
console.log(JSON.stringify(rapport.niveaux));
await b.close(); await srv.close();
process.exit(echecs.length ? 1 : 0);
