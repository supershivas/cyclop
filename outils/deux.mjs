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
for (const p of [A, Bp]) await p.evaluate(() => { const e = window.__jeu.bataille().etat; for (const K of [e.camp, e.campEux]) { K.batiments.artillerie.niveau = 3; K.batiments.aerodrome.niveau = 1; K.dotation = 5; } e.avions = [[100, 100], [100, 100]]; });
await A.click('#deux-pret'); await Bp.click('#deux-pret'); await A.waitForTimeout(3000);
const etat = async p => p.evaluate(() => window.__jeu.reseau());
console.log('A', JSON.stringify(await etat(A))); console.log('B', JSON.stringify(await etat(Bp)));
// des ordres des deux côtés
await A.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 0).slice(0, 2).map(r => r.id), 150, 150); window.__jeu.barrage('155', 200, 150); window.__jeu.barrage('avion', 150, 180, 0, 150, 110); window.__jeu.stance(B.etat.regiments.filter(r => r.camp === 0).slice(2, 4).map(r => r.id), 'retenu'); });
await Bp.evaluate(() => { const B = window.__jeu.bataille(); window.__jeu.marche(B.etat.regiments.filter(r => r.camp === 1).slice(0, 2).map(r => r.id), 250, 140); window.__jeu.barrage('75', 120, 170); window.__jeu.barrage('avion', 250, 100, 1, 250, 170); window.__jeu.stance(B.etat.regiments.filter(r => r.camp === 1).slice(4, 6).map(r => r.id), 'retenu'); });
await A.evaluate(() => window.__jeu.bat('chars', 0)); await Bp.evaluate(() => window.__jeu.bat('sapeurs', 0));      // une commande de chaque camp, par le lockstep : le jour, refusée chez les deux (on améliore le soir : la soirée, lot 1 ; la commande de nuit à deux : test/lockstep.test.mjs)
await A.waitForTimeout(12000);
// la vue d'un soldat à deux (v0.148.0) : chaque joueur prend la place d'un de ses hommes, marche et tire ; les commandes passent par le lockstep, les deux machines doivent voir les mêmes deux hommes aux mêmes places
const hommes = {};
for (const [p, camp] of [[A, 0], [Bp, 1]]) hommes[camp] = await p.evaluate(camp => { const Bt = window.__jeu.bataille(), Ar = Bt.armee; let i = 0; for (; i < Ar.n; i++) if (Ar.camp[i] === camp && !Ar.mort[i]) break; window.__jeu.suivi.verrouiller('soldat', Ar.id[i], 'personne'); return { id: Ar.id[i], x: Ar.x[i], y: Ar.y[i] }; }, camp);
await A.keyboard.down('KeyW'); await Bp.keyboard.down('KeyW'); await A.waitForTimeout(4000);
await A.evaluate(() => window.__jeu.suivi.tirer()); await Bp.evaluate(() => window.__jeu.suivi.tirer()); await A.waitForTimeout(3000);
await A.keyboard.up('KeyW'); await Bp.keyboard.up('KeyW'); await A.waitForTimeout(1500);
const place = async p => p.evaluate(ids => { const Ar = window.__jeu.bataille().armee; return JSON.stringify(ids.map(id => { for (let i = 0; i < Ar.n; i++) if (Ar.id[i] === id) return [Math.round(Ar.x[i] * 100), Math.round(Ar.y[i] * 100), Ar.mort[i], Ar.tirT[i] > 0 ? 1 : 0]; return null; })); }, [hommes[0].id, hommes[1].id]);
const fa = await place(A), fb = await place(Bp);
console.log('fps', fa, fb, JSON.stringify(hommes));
for (const p of [A, Bp]) await p.evaluate(() => window.__jeu.suivi.liberer());
// (les deux machines ne sont pas lues au même cadre : quelques décimètres d'écart de lecture ; l'écart de lockstep, lui, compare les empreintes toutes les 90 cadres : `ecart` plus bas)
const qa = JSON.parse(fa), qb = JSON.parse(fb), marche = qa.every((q, k) => q && Math.hypot(q[0] / 100 - hommes[k].x, q[1] / 100 - hommes[k].y) > 0.8), memes = qa.every((q, k) => q && qb[k] && Math.hypot((q[0] - qb[k][0]) / 100, (q[1] - qb[k][1]) / 100) < 0.5);
if (!memes || !marche) { console.log('✗ la vue d\'un soldat : les deux machines diffèrent ou les hommes n\'ont pas marché'); process.exitCode = 1; }
const a = await etat(A), b = await etat(Bp);
const camps = async p => p.evaluate(() => { const e = window.__jeu.bataille().etat; return JSON.stringify([e.camp.dotation, e.camp.panier, e.camp.batiments.chars.chantier, e.campEux.dotation, e.campEux.panier, e.campEux.batiments.sapeurs.chantier]); });
console.log('camps', await camps(A), await camps(Bp));
if (process.env.DEUX_PNG) for (const [nom, p] of [['hote', A], ['invite', Bp]]) {      // (à regarder : la touche B va au camp de chacun, la fenêtre d'un bâtiment à trois zooms ; DEUX_PNG = un dossier)
  await p.keyboard.press('b'); await p.waitForTimeout(1500);
  for (const [z, cle] of [[null, 'artillerie'], [2, 'caserne'], [3, 'sapeurs'], [0, 'chars']]) {
    if (z !== null) await p.evaluate(z => window.__jeu.zoom(z), z);
    await p.evaluate(cle => window.__jeu.batiment(cle), cle); await p.waitForTimeout(1800);
    await p.screenshot({ path: `${process.env.DEUX_PNG}/deux-${nom}-${cle}.png` });
  }
}
if (await camps(A) !== await camps(Bp) || await camps(A) !== JSON.stringify([5, [], null, 5, [], null])) { console.log('✗ les camps diffèrent, ou une commande de jour est passée'); process.exitCode = 1; }
console.log('A', JSON.stringify(a)); console.log('B', JSON.stringify(b));
const postures = async p => p.evaluate(() => window.__jeu.bataille().etat.regiments.map(r => r.stance).join());
const pa = await postures(A), pb = await postures(Bp);
console.log('postures', pa);
await nav.close(); await s.close();
const ok = pa === pb && pa.includes('retenu') && errs.length === 0 && a.ecart === null && b.ecart === null && a.cadre > 300 && b.cadre > 300;
console.log(ok ? '✓ deux machines, aucune désynchronisation' : `✗ ${errs.slice(0, 4).join(' | ')} écarts : ${JSON.stringify([a.ecart, b.ecart])}`);
process.exit(ok ? 0 : 1);
