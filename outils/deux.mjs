// Le jeu à deux, de bout en bout (v0.30.0) : deux pages du même Chromium s'appairent par le lien WebRTC (l'invitation et la réponse se passent par le script),
// jouent ensemble une dizaine de secondes avec des ordres des deux côtés, et ne doivent voir aucune désynchronisation (comparée toutes les 90 cadres).
//   node outils/deux.mjs           (invitation et réponse passées par le script)
//   node outils/deux.mjs --code    (par le code court et le relais : demande le réseau)
import { servir, lancerChromium, CIBLES } from './navigateur.mjs';
const s = await servir('.'); const nav = await lancerChromium({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
const errs = [];
const ouvrir = async nom => { const p = await (await nav.newContext(CIBLES.bureau)).newPage(); p.on('pageerror', e => errs.push(nom + ' ' + e)); p.on('console', m => { if (m.type() === 'error') errs.push(nom + ' ' + m.text()); }); await p.goto(new URL('index.html?debug=1&seed=7', s.base).href); await p.waitForSelector('#jouer-deux', { state: 'visible' }); await p.waitForTimeout(500); return p; };
const A = await ouvrir('A'), Bp = await ouvrir('B');
if (process.argv.includes('--code')) {       // le rendez-vous par code court : passe par le relais public (ntfy.sh), il faut le réseau
  await A.click('#jouer-deux'); await A.click('#deux-inviter');
  await A.waitForFunction(() => /^[A-Z0-9]{6}$/.test(document.getElementById('deux-code').textContent), null, { timeout: 20000 });
  const code = await A.textContent('#deux-code');
  await Bp.click('#jouer-deux'); await Bp.click('#deux-rejoindre'); await Bp.fill('#deux-code-saisi', code); await Bp.click('#deux-rejoindre-code');
} else {
await A.click('#jouer-deux'); await A.click('#deux-inviter');
await A.waitForFunction(() => document.getElementById('deux-invitation').value.length > 100);
const inv = await A.inputValue('#deux-invitation');
await A.evaluate(() => document.querySelectorAll('#dialogue-deux details').forEach(d => { d.open = true; }));      // (le copier-coller est replié)
await Bp.click('#jouer-deux'); await Bp.click('#deux-rejoindre'); await Bp.evaluate(() => document.querySelectorAll('#dialogue-deux details').forEach(d => { d.open = true; })); await Bp.fill('#deux-invitation-recue', inv); await Bp.click('#deux-repondre');
await Bp.waitForFunction(() => document.getElementById('deux-ma-reponse').value.length > 100);
const rep = await Bp.inputValue('#deux-ma-reponse');
await A.fill('#deux-reponse', rep); await A.click('#deux-connecter');
}
await A.waitForFunction(() => window.__jeu?.reseau?.(), null, { timeout: 20000 }); await Bp.waitForFunction(() => window.__jeu?.reseau?.(), null, { timeout: 20000 });
// (v0.94.0 : chacun a son camp, bridé ; avant le départ, la même ouverture des deux côtés : l'artillerie au niveau 3, un aérodrome et ses deux avions, pour que le scénario tire comme avant)
for (const p of [A, Bp]) await p.evaluate(() => { const e = window.__jeu.bataille().etat; for (const K of [e.camp, e.campEux]) { K.batiments.artillerie.niveau = 3; K.batiments.aerodrome.niveau = 1; } e.avions = [[100, 100], [100, 100]]; });
await A.click('#deux-pret'); await Bp.click('#deux-pret'); await A.waitForTimeout(3000);
const etat = async p => p.evaluate(() => window.__jeu.reseau());
console.log('A', JSON.stringify(await etat(A))); console.log('B', JSON.stringify(await etat(Bp)));
// des ordres des deux côtés
await A.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 0).slice(0, 2).map(r => r.id), 150, 150); window.__jeu.barrage('155', 200, 150); window.__jeu.barrage('avion', 150, 180, 0, 150, 110); window.__jeu.stance(B.etat.regiments.filter(r => r.camp === 0).slice(2, 4).map(r => r.id), 'retenu'); });
await Bp.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 1).slice(0, 2).map(r => r.id), 250, 140); window.__jeu.barrage('75', 120, 170); window.__jeu.barrage('avion', 250, 100, 1, 250, 170); window.__jeu.stance(B.etat.regiments.filter(r => r.camp === 1).slice(4, 6).map(r => r.id), 'retenu'); });
await A.evaluate(() => window.__jeu.bat('chars')); await Bp.evaluate(() => window.__jeu.bat('sapeurs'));      // un chantier de chaque camp, par le lockstep
await A.waitForTimeout(12000);
const a = await etat(A), b = await etat(Bp);
const camps = async p => p.evaluate(() => { const e = window.__jeu.bataille().etat; return JSON.stringify([e.camp.dotation, e.camp.batiments.chars.chantier, e.campEux.dotation, e.campEux.batiments.sapeurs.chantier]); });
console.log('camps', await camps(A), await camps(Bp));
if (process.env.DEUX_PNG) for (const [nom, p] of [['hote', A], ['invite', Bp]]) {      // (à regarder : la touche B va au camp de chacun, la fenêtre d'un bâtiment à trois zooms ; DEUX_PNG = un dossier)
  await p.keyboard.press('b'); await p.waitForTimeout(1500);
  for (const [z, cle] of [[null, 'artillerie'], [2, 'caserne'], [3, 'sapeurs'], [0, 'chars']]) {
    if (z !== null) await p.evaluate(z => window.__jeu.zoom(z), z);
    await p.evaluate(cle => document.querySelector(`.pastille[data-cle="${cle}"]`).click(), cle); await p.waitForTimeout(1800);
    await p.screenshot({ path: `${process.env.DEUX_PNG}/deux-${nom}-${cle}.png` });
  }
}
if (await camps(A) !== await camps(Bp) || !JSON.parse(await camps(A))[1] || !JSON.parse(await camps(A))[3]) { console.log('✗ les camps diffèrent ou les chantiers manquent'); process.exitCode = 1; }
console.log('A', JSON.stringify(a)); console.log('B', JSON.stringify(b));
const postures = async p => p.evaluate(() => window.__jeu.bataille().etat.regiments.map(r => r.stance).join());
const pa = await postures(A), pb = await postures(Bp);
console.log('postures', pa);
await nav.close(); await s.close();
const ok = pa === pb && pa.includes('retenu') && errs.length === 0 && a.ecart === null && b.ecart === null && a.cadre > 300 && b.cadre > 300;
console.log(ok ? '✓ deux machines, aucune désynchronisation' : `✗ ${errs.slice(0, 4).join(' | ')} écarts : ${JSON.stringify([a.ecart, b.ecart])}`);
process.exit(ok ? 0 : 1);
