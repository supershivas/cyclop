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
await A.waitForTimeout(3000);
const etat = async p => p.evaluate(() => window.__jeu.reseau());
console.log('A', JSON.stringify(await etat(A))); console.log('B', JSON.stringify(await etat(Bp)));
// des ordres des deux côtés
await A.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 0).slice(0, 2).map(r => r.id), 150, 150); window.__jeu.barrage('155', 200, 150); });
await Bp.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 1).slice(0, 2).map(r => r.id), 250, 140); window.__jeu.barrage('75', 120, 170); });
await A.waitForTimeout(12000);
const a = await etat(A), b = await etat(Bp);
console.log('A', JSON.stringify(a)); console.log('B', JSON.stringify(b));
await nav.close(); await s.close();
const ok = errs.length === 0 && a.ecart === null && b.ecart === null && a.cadre > 300 && b.cadre > 300;
console.log(ok ? '✓ deux machines, aucune désynchronisation' : `✗ ${errs.slice(0, 4).join(' | ')} écarts : ${JSON.stringify([a.ecart, b.ecart])}`);
process.exit(ok ? 0 : 1);
