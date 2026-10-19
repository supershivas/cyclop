// La campagne depuis l'écran titre (lot 7, v0.36.6) : « Nouvelle campagne », « Continuer » qui devient « Continuer la campagne », la partie remplacée par une autre (le titre
// propose alors « Continuer la campagne », qui repart de la bataille qui suit) et les confirmations. Aucune bataille n'est jouée : rapide (≈ 30 s).
//   node outils/campagne-titre.mjs
import { servir, lancerChromium } from './navigateur.mjs';

const srv = await servir('.'), nav = await lancerChromium();
const contexte = await nav.newContext({ viewport: { width: 1280, height: 800 } });
// les contenus publiés par l'atelier (assets/design : réglages, retouches et cartes) ne comptent pas ici : la référence est celle du jeu d'origine (sinon chaque publication de l'atelier la ferait bouger)
await contexte.route('**/assets/design/*.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));
page.on('console', m => { if (m.type() === 'error') erreurs.push(`console : ${m.text()}`); });
const verifier = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) erreurs.push(texte); };
const titre = () => page.evaluate(() => ({ continuer: document.getElementById('continuer').hidden ? null : document.getElementById('continuer').textContent, campagne: !document.getElementById('continuer-campagne').hidden, nouvelleCampagne: !document.getElementById('nouvelle-campagne').hidden, visible: !document.getElementById('titre').hidden }));
const bataille = () => page.evaluate(() => { const e = __jeu.bataille().etat; return { n: e.campagne?.n ?? null, id: e.campagne?.id ?? null, graine: e.graine, secteur: e.secteur }; });
const quitter = async () => { await page.click('#pause'); await page.click('#quitter'); await page.waitForTimeout(400); };
const confirmer = async () => { const t = await page.evaluate(() => document.getElementById('dialogue-confirmer').open ? document.getElementById('confirmer-texte').textContent : null); if (t) await page.click('#confirmer-oui'); await page.waitForTimeout(1500); return t; };

await page.goto(`${srv.base}index.html?debug=1&seed=5`);
await page.waitForTimeout(800);
let t = await titre();
verifier(t.visible && t.nouvelleCampagne && !t.campagne && !t.continuer, `au départ : « Nouvelle campagne », rien à continuer (${JSON.stringify(t)})`);

await page.click('#nouvelle-campagne'); await page.waitForTimeout(2500);
let b = await bataille();
verifier(b.n === 1 && b.id === 5 && b.secteur === 'essai', `« Nouvelle campagne » lance la bataille 1 des labours (${JSON.stringify(b)})`);
const graine1 = b.graine;
await quitter();
t = await titre();
verifier(t.continuer === 'Continuer la campagne' && !t.campagne, `de retour au titre : « Continuer » dit la campagne, pas de second bouton (${JSON.stringify(t)})`);
await page.click('#continuer'); await page.waitForTimeout(2500);
b = await bataille();
verifier(b.n === 1 && b.id === 5 && b.graine === graine1, 'la même bataille est reprise');

// une autre partie remplace la bataille de campagne : la campagne reste, « Continuer la campagne » la reprend
await quitter();
await page.click('#nouvelle');
const texte1 = await confirmer();
verifier(/campagne/.test(texte1 ?? '') && /Continuer la campagne/.test(texte1), `la confirmation le dit : « ${texte1} »`);
b = await bataille();
verifier(b.n === null, 'une partie ordinaire est lancée');
await quitter();
t = await titre();
verifier(t.continuer === 'Continuer' && t.campagne, `le titre propose « Continuer » et « Continuer la campagne » (${JSON.stringify(t)})`);
await page.click('#continuer-campagne');
const texte2 = await confirmer();
verifier(!!texte2, `elle demande avant de remplacer la partie : « ${texte2} »`);
b = await bataille();
verifier(b.n === 1 && b.id === 5 && b.graine === graine1, 'la campagne repart de sa bataille 1, la même');

// une campagne neuve demande avant d'effacer celle qui est en cours
await quitter();
await page.click('#nouvelle-campagne');
const texte3 = await confirmer();
verifier(/campagne est en cours/.test(texte3 ?? ''), `« Nouvelle campagne » demande : « ${texte3} »`);
// l'export garde la campagne ; la clé de debug n'est pas celle de la production
const cles = await page.evaluate(() => Object.keys(localStorage).filter(k => /campagne/.test(k)));
verifier(cles.length === 1 && cles[0] === 'cyclopeen:debug:campagne', `une clé de debug seulement : ${cles}`);
const exporte = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('cyclopeen:debug:campagne')).data).includes('graineIdentite'));
verifier(exporte, 'le registre est un JSON complet (export, import)');

await nav.close(); srv.close?.();
if (erreurs.length) { console.log(erreurs.join('\n')); process.exit(1); }
console.log('✓ la campagne se lance, se reprend et se remplace depuis l\'écran titre, sans erreur');
