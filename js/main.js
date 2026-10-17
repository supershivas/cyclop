// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.22.0';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.22.0';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.22.0';
import { createGamepad } from './lib/gamepad.js?v=0.22.0';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.22.0';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.22.0';
import { ROLES } from './palette.js?v=0.22.0';
import { MISSIONS, nouvelleBataille, avancer, aube, ordonnerMarche, peutOrdonner, ordonnerBarrage, horloge, effectifs, tronconsTenus, moralEnMots, terrainResume, largeurZone, lettreZone, etendueZones, nomTroncon, actionDe, secteursDe, tronconsDeLigne, zone, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.22.0';
import { ligneY } from './tranchees.js?v=0.22.0';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.22.0';
import { METEO } from './data/meteo.js?v=0.22.0';
import { impact, hydroLignes } from './terrain.js?v=0.22.0';
import { hash2 } from './lib/rng.js?v=0.22.0';
import { creerRendu, CAMERA } from './rendu3d.js?v=0.22.0';
import { etatEnMots, experienceEnMots, chevrons } from './identite.js?v=0.22.0';
import { CORVEES } from './data/corvees.js?v=0.22.0';
import { refusCorvee } from './nuit.js?v=0.22.0';
import { chargerContenu } from './design-store.js?v=0.22.0';
import * as lecture from './hud/lecture.js?v=0.22.0';
import { creerFiche } from './hud/fiche.js?v=0.22.0';
import { creerCarnet, deux } from './hud/carnet.js?v=0.22.0';
import { creerCarte } from './hud/carte.js?v=0.22.0';
import { creerPertes } from './hud/pertes.js?v=0.22.0';

const JEU = 'cyclopeen';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const SOLDATS = Number(params.get('soldats')) || 0;      // essai de charge : ?soldats=8000 (les deux camps)
const MESURE = params.has('mesure');                      // le rendu attend la fin du dessin (mesure honnête, plus lente)

for (const [role, couleur] of Object.entries(ROLES)) document.documentElement.style.setProperty(`--jeu-${role}`, couleur);

const store = createStore({
  game: JEU,
  debug: DEBUG,
  entries: {
    partie: { version: 1 },
    prefs: { version: 1, debugWrites: false, defaults: { zoom: 2, camera: null, carte: true } },
  },
  secret: ['gh-token'],
});
const prefs = store.load('prefs');
const { reglages: R } = await chargerContenu();

let B = null;                 // la bataille en cours
let vitesse = 1;              // ×1, ×2, ×4 : la vitesse du temps (plafonnée par le coût de la simulation)
let pauseActive = false;      // Espace : le temps s'arrête, les ordres restent possibles
let modeMarche = false;        // le bouton « Marcher » d'une carte : le prochain clic sur le sol envoie les régiments choisis
let modeBarrage = null;       // un calibre : le prochain clic gauche vise
let choisis = new Set();      // les régiments choisis (ids)
const perf = { sim: 0, pas: 0 };

// Lire la bataille en mots (hud/lecture.js) et les fiches (hud/fiche.js) : la bataille en cours leur est donnée à chaque appel
const { majuscule, nomDe, enMots } = lecture;
const indiceDe = id => lecture.indiceDe(B, id), quiEst = id => lecture.quiEst(B, id), tombe = id => lecture.tombe(B, id);
const soldatSous = (x, y, r) => lecture.soldatSous(B, x, y, r), corpsSous = (x, y, r) => lecture.corpsSous(B, x, y, r);
const numeroDe = r => lecture.numeroDe(B, r);     // le numéro d'ordre : « 3 · Viride »
const bilan = reg => lecture.bilan(B, reg), refuseAujourdhui = reg => lecture.refuseAujourdhui(B, reg);
const { noter, vider: viderCarnet } = creerCarnet({ $, bataille: () => B });
const majPertes = creerPertes({ $ });
const laCarte = creerCarte({
  $, bataille: () => B, choisis: () => choisis,
  surSecteur: (s, ajout) => choisirSecteur(s, ajout), surCase: (idx, s) => ordreCase(idx, s),
  surRonde: (r, ajout) => r.camp === NOUS ? choisirRegiment(r.id, ajout) : montrerRegiment(r.id),
});
const laFiche = creerFiche({ $, R, bataille: () => B });
const { montrerFiche, montrerSoldat, montrerRegiment, fermer: fermerFiche, maj: majFiche } = laFiche;

lockBrowserGestures($('ecran'));
stopTypeahead();
const rendu = await creerRendu($('canvas'), { mesure: MESURE });
rendu.redimensionner();
addEventListener('resize', () => rendu.redimensionner());

// ─── Écrans ────────────────────────────────────────────────────────────────
const enJeu = () => !!B && $('titre').hidden;

/* Derrière l'écran titre, le moteur du jeu (Jérôme, v0.8.1) : une bataille de décor, jamais sauvegardée. Un
   no man's land labouré et gorgé de pluie, des morts, l'heure arrêtée au coucher du soleil (ombres longues, le
   soir qui tombe), des obus au loin et une fumée dense. La caméra au ras du sol, et une image différente à
   chaque lancement : la graine, le lieu, la direction, l'heure (Jérôme, v0.8.2). L'aspect seulement : le
   hasard d'ici n'entre dans aucune règle. */
let D = null, decorT = 0, decorObus = 0, decorVue = null;
function decor() {
  if (D) return D;
  const hasard = Math.random;
  D = nouvelleBataille(Math.floor(hasard() * 100000), R, { soldats: 240 });
  const T = D.terrain, m = D.etat.marges;
  // le lieu (dans le secteur), la direction (n'importe laquelle), la hauteur (quelques mètres), l'heure (17 h à 17 h 45)
  decorVue = {
    cx: m.x + 80 + hasard() * 240, cz: m.y + 70 + hasard() * 160,
    yaw: hasard() * Math.PI * 2, tangage: 0.045 + hasard() * 0.04,
    sens: hasard() < 0.5 ? -1 : 1, heure: 17 + hasard() * 0.75,
  };
  const { cx, cz } = decorVue;
  for (let k = 0; k < 220; k++) impact(T, cx - 150 + hasard() * 300, cz - 150 + hasard() * 300, NOMS_CALIBRES[k % 3], R, k);
  for (let h = 0; h < 18; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  for (let k = 0; k < 220; k++) D.etat.corps.push([Math.round((cx - 130 + hasard() * 260) * 10), Math.round((cz - 130 + hasard() * 260) * 10), k % 3 ? 0 : 1, 1, 900000 + k]);
  D.etat.meteo[0] = hasard() < 0.6 ? 'brouillard' : 'sec';
  return D;
}
// l'heure du décor, arrêtée
const tickDecor = h => Math.round(R.jour.duree / PAS * (h - R.jour.heureDebut) / (R.jour.heureFin - R.jour.heureDebut));
function decorPas(dt) {
  const d = decor(), v = decorVue;
  decorT += dt;
  d.etat.tickJour = tickDecor(v.heure);
  // des obus, devant la caméra, au loin
  if ((decorObus -= dt) < 0) {
    decorObus = 1.2 + Math.random() * 2;
    const loin = 60 + Math.random() * 160, cote = (Math.random() - 0.5) * 140;
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
    ordonnerBarrage(d, NOMS_CALIBRES[Math.floor(Math.random() * 3)], rendu.vue.cx + fx * loin - fz * cote, rendu.vue.cz + fz * loin + fx * cote, 1);
  }
  const ev = avancer(d);
  // la fumée dense : des colonnes qui montent de quelques trous et dérivent avec le vent
  for (let k = 0; k < 10; k++) {
    if (Math.random() > 0.35) continue;
    rendu.fumer(v.cx - 140 + hash2(k, 11, 3) * 280, v.cz - 140 + hash2(k, 12, 3) * 280);
  }
  // la vue glisse lentement de côté, et revient
  const g = Math.sin(decorT * 0.03) * 40 * v.sens;
  rendu.vue.cx = v.cx + Math.cos(v.yaw) * g;
  rendu.vue.cz = v.cz - Math.sin(v.yaw) * g;
  return ev;
}
function montrerDecor() {
  decor();
  rendu.attacher(D);
  rendu.vue.zoom = 4;
  rendu.cameraLibre(decorVue.yaw, decorVue.tangage);
  decorObus = 0.5;
}
function montrerTitre() {
  loop.pause();
  montrerDecor();
  $('titre').hidden = false;
  $('hud').hidden = true;
  $('continuer').hidden = !store.has('partie');
  ($('continuer').hidden ? $('nouvelle') : $('continuer')).focus();
}
function jouer(bataille) {
  B = bataille;
  rendu.attacher(B);
  rendu.vue.zoom = prefs.zoom ?? 2;
  // la caméra du joueur (ou celle de départ : l'écran titre a la sienne) ; un réglage de la v0.2, sans tangage, est ignoré
  if (prefs.camera?.tangage) rendu.placerCamera(prefs.camera.yaw, prefs.camera.tangage); else rendu.placerCamera(CAMERA.yaw, CAMERA.tangage);
  choisis = new Set(); rendu.choisis = choisis;
  modeBarrage = null; modeMarche = false; pauseActive = false; vitesse = 1; loop.setTimeScale(1); fermerFiche(); fermerNuit();
  viderCarnet(); regimentsVus = '';
  laCarte.construire();
  $('titre').hidden = true;
  $('hud').hidden = false;
  etiquettes();
  majHud();
  sauvegarder();
  if (B.etat.phase === 'nuit') montrerNuit();
  else if (B.etat.phase === 'fin') montrerFin();
  else loop.resume();
}
function sauvegarder() { if (B) store.save('partie', photo(B)); }
function pause() {
  if (!enJeu() || $('dialogue-pause').open) return;
  loop.pause();
  sauvegarder();
  $('dialogue-pause').showModal();
}
function reprendre() {
  if (!enJeu() || pauseActive || nuitEtat || B.etat.phase !== 'jour' || document.querySelector('dialog[open]')) return;
  loop.resume();
}

function nouvelle(graine) {
  return nouvelleBataille(graine, R, SOLDATS ? { soldats: Math.floor(SOLDATS / 2) } : {});
}
$('continuer').onclick = () => {
  const p = store.load('partie');
  try { jouer(p ? restaurer(p, R) : nouvelle(1)); } catch (e) { console.error(e); toast('Sauvegarde illisible : nouvelle bataille.'); jouer(nouvelle(1)); }
};
// une nouvelle bataille, et son ordre (la mission, la durée, la réserve) ; pas en mode debug, que les scripts pilotent
function commencer(graine) {
  jouer(nouvelle(graine));
  if (DEBUG || !B.etat.mission) return;
  loop.pause();
  const e = B.etat;
  $('ordre-mission').textContent = MISSIONS[e.mission];
  $('ordre-duree').textContent = `La bataille durera ${e.meteo.length} jours.`;
  $('ordre-reserves').textContent = `En réserve : ${pluriel(e.reserves[NOUS], 'régiment frais', 'régiments frais')}, pour la relève, la nuit.`;
  $('dialogue-ordre').showModal();
}
$('ordre-compris').onclick = () => $('dialogue-ordre').close();
$('dialogue-ordre').addEventListener('close', reprendre);
const pluriel = (n, un, des) => `${n} ${n > 1 ? des : un}`;
$('nouvelle').onclick = () => {
  const graine = window.__seed ?? Date.now() % 100000;      // la graine elle-même peut venir de l'horloge
  if (!store.has('partie')) return commencer(graine);
  const d = $('dialogue-confirmer');
  d.onclose = () => { if (d.returnValue === 'oui') commencer(graine); };
  d.showModal();
};
$('pause').onclick = pause;
$('reprendre').onclick = () => $('dialogue-pause').close();
$('dialogue-pause').addEventListener('close', reprendre);
$('quitter').onclick = () => { $('dialogue-pause').close(); sauvegarder(); montrerTitre(); };
$('pause-reglages').onclick = () => $('dialogue-reglages').showModal();
$('ouvrir-reglages').onclick = () => $('dialogue-reglages').showModal();
$('dialogue-reglages').addEventListener('close', reprendre);
// le bouton droit et celui de la molette appartiennent au jeu : leurs événements de souris ne vont pas plus loin que
// le canvas (empêcher le « pointerdown » supprime aussi mousedown et mouseup, que lisent les gestes)
for (const t of ['pointerdown', 'mousedown', 'mouseup', 'auxclick', 'contextmenu']) {
  window.addEventListener(t, e => {
    if (e.target !== $('canvas') || (t !== 'contextmenu' && e.button === 0)) return;
    e.preventDefault(); if (t !== 'pointerdown') e.stopImmediatePropagation();
  }, { capture: true });
}
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ─── La nuit, la fin ───────────────────────────────────────────────────────
const nomJour = n => (n === 1 ? '1er' : `${n}e`);
const tron = n => `${n} tronçon${n > 1 ? 's' : ''}`;
// les tronçons gagnés et perdus dans la journée, et ce qu'ils ont coûté se lit juste au-dessus
function enLignes([pris, perdus]) {
  if (!pris && !perdus) return 'Les lignes n\'ont pas bougé.';
  return [pris && `pris ${tron(pris)}`, perdus && `perdu ${tron(perdus)}`].filter(Boolean).join(', ').replace(/^./, c => c.toUpperCase()) + '.';
}
// Le papier de la nuit : un état (choix des corvées, puis le bilan de l'aube), jamais une boîte de dialogue : le champ reste
// là, on choisit des régiments (clic, cadre, T) et on leur donne une corvée (Jérôme, v0.13.0)
let nuitEtat = null;                 // 'choix' | 'aube' | null
let corveesNuit = {};                // la corvée de chacun de nos régiments cette nuit (id → corvée)
const corveeDe = id => CORVEES.find(c => c.id === id)?.nom || '';
const corveeCourte = id => CORVEES.find(c => c.id === id)?.court || '';
const nosRegiments = () => B.etat.regiments.filter(r => r.camp === NOUS && r.effectif);
function montrerNuit() {
  loop.pause(); sauvegarder();
  const e = B.etat, j = e.jour, [nous, eux] = e.pertesJour[j - 1], avant = e.nuits.at(-1)?.choix || {};
  $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
  $('nuit-pertes').textContent = `Morts du jour : ${nous} des nôtres, ${eux} en face.`;
  $('nuit-lignes').textContent = e.tranchees ? enLignes(e.prises[j - 1]) : '';
  $('nuit-demain').textContent = `Demain : ${METEO[e.previsions[j - 1]]?.prevision || '—'}.`;
  $('nuit-reserves').textContent = e.mission ? `En réserve : ${pluriel(e.reserves[NOUS], 'régiment frais', 'régiments frais')}.` : '';
  // la dernière corvée donnée, si elle est encore possible, sinon le repos
  corveesNuit = Object.fromEntries(nosRegiments().map(r => [r.id, avant[r.id] && !refusCorvee(B, r, avant[r.id]) ? avant[r.id] : 'repos']));
  nuitEtat = 'choix';
  $('nuit-corps').hidden = false; $('aube-bilan').hidden = true; $('aube').textContent = 'À l\'aube';
  $('nuit').hidden = false;
  regimentsVus = ''; nuitVue = '';
  majHud();
}
// une corvée aux régiments choisis (ceux qui la refusent le disent à voix haute)
function donnerCorvee(id) {
  const regs = [...choisis].map(i => B.etat.regiments[i]).filter(r => r && r.camp === NOUS && r.effectif);
  if (!regs.length) return toast('Choisissez d\'abord un régiment (clic, cadre, T pour tous).');
  const refus = [];
  for (const r of regs) { const m = refusCorvee(B, r, id); if (m) refus.push(`${r.nom} : ${m}`); else corveesNuit[r.id] = id; }
  if (refus.length) toast(refus[0]);
  regimentsVus = ''; nuitVue = ''; majHud();
}
// (la nuit, les corvées sont au-dessus de la carte du régiment choisi : `majRegiments`)
let nuitVue = '';
// le bilan de la nuit en quelques lignes (rien de ce qui n'a pas eu lieu)
function bilanEnMots(b) {
  const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
  const faits = [
    b.inhumes && `${pl(b.inhumes, 'mort inhumé', 'morts inhumés')}`,
    b.evacues && `${pl(b.evacues, 'blessé évacué', 'blessés évacués')}`,
    b.retours && `${pl(b.retours, 'blessé guéri revenu', 'blessés guéris revenus')} au front`,
    b.repares && `${pl(b.repares, 'tronçon réparé', 'tronçons réparés')}`,
    b.caillebotis && `des caillebotis dans ${pl(b.caillebotis, 'tronçon', 'tronçons')}`,
    b.releves && `${pl(b.releves, 'régiment relevé', 'régiments relevés')}`,
    b.abris && `des abris creusés sous ${pl(b.abris, 'tronçon', 'tronçons')}`,
    b.ravitailles && `${pl(b.ravitailles, 'régiment ravitaillé', 'régiments ravitaillés')}`,
    b.coups && `${pl(b.coups, 'coup de main', 'coups de main')} : ${b.prisonniers ? pl(b.prisonniers, 'prisonnier ramené', 'prisonniers ramenés') : 'personne ramené'}`,
  ].filter(Boolean);
  const morts = [
    b.mortsCorvee && `${b.mortsCorvee} aux corvées`,
    b.mortsBlesses && `${b.mortsBlesses} de leurs blessures`,
  ].filter(Boolean);
  const regs = B.etat.regiments;
  return [
    faits.length ? `Cette nuit : ${faits.join(', ')}.` : 'Une nuit de repos.',
    morts.length ? `Morts dans la nuit : ${morts.join(', ')}.` : 'Personne n\'est mort cette nuit.',
    b.pris && `En face nous a pris ${pl(b.pris, 'homme', 'hommes')} : un coup de main.`,
    b.affames && `${pl(b.affames, 'régiment n\'a', 'régiments n\'ont')} plus de vivres : la faim.`,
    ...(b.refus || []).map(id => `${regs[id].nom} refuse de monter aujourd'hui : il tiendra sa tranchée, rien de plus.`),
  ].filter(Boolean);
}
function passerLaNuit() {
  if (B?.etat.phase !== 'nuit') return;
  const r = aube(B, corveesNuit);
  if (!r.ok) return dire(r);
  sauvegarder(); majHud();
  nuitEtat = 'aube';
  $('nuit-titre').textContent = `L'aube du ${nomJour(B.etat.jour)} jour`;
  $('nuit-corps').hidden = true;
  $('aube-bilan').replaceChildren(...bilanEnMots(r.bilan[NOUS]).map(t => Object.assign(document.createElement('p'), { textContent: t })));
  $('aube-bilan').hidden = false; $('aube').textContent = 'Le jour se lève';
  regimentsVus = '';
}
function fermerNuit() { nuitEtat = null; $('nuit').hidden = true; regimentsVus = ''; }
$('aube').onclick = () => { if (nuitEtat === 'choix') passerLaNuit(); else { fermerNuit(); reprendre(); } };
function montrerFin() {
  loop.pause(); sauvegarder();
  const e = B.etat, [vNous, vEux] = effectifs(B);
  $('fin-titre').textContent = `${e.jour} jours.`;
  $('fin-issue').textContent = e.issue?.texte || '';
  // jour après jour : ce qu'il a coûté, sans un mot de plus
  $('fin-jours').replaceChildren(...e.pertesJour.slice(0, e.jour).map(([n, x], k) => Object.assign(document.createElement('li'), { textContent: `Jour ${k + 1} : ${n} des nôtres, ${x} en face.` })));
  $('fin-pertes').textContent = `${e.pertes[0]} des nôtres sont morts, ${e.pertes[1]} en face. Il en reste ${vNous} et ${vEux}.`;
  $('fin-lignes').textContent = e.tranchees ? `Tronçons tenus : ${tronconsTenus(B)[0]} des nôtres, ${tronconsTenus(B)[1]} en face.` : '';
  $('dialogue-fin').showModal();
}
$('fin-nouvelle').onclick = () => { $('dialogue-fin').close(); store.clear('partie'); commencer(window.__seed ?? Date.now() % 100000); };
$('fin-titre-btn').onclick = () => { $('dialogue-fin').close(); montrerTitre(); };

// ─── Réglages ──────────────────────────────────────────────────────────────
$('exporter').onclick = () => { sauvegarder(); downloadJSON(store.exportAll(), `${JEU}-sauvegarde.json`); };
$('importer').onclick = async () => {
  try {
    const n = store.importAll(await pickJSONFile());
    toast(`${n} élément(s) importé(s)`);
    setTimeout(() => location.reload(), 800);
  } catch (e) { toast(e.message); }
};
loadVersion().then(v => { $('version').textContent = v ? `v${v}` : ''; });
loadChangelog().then(entrees => {
  $('changelog').replaceChildren(...entrees.flatMap(e => {
    const h = document.createElement('h3'); h.textContent = `v${e.version} — ${e.date}`;
    const ul = document.createElement('ul');
    for (const c of e.changes) { const li = document.createElement('li'); li.textContent = c; ul.append(li); }
    return [h, ul];
  }));
});

function toast(texte) {
  const t = $('toast');
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}
// Un ordre refusé se dit à voix haute (section 12)
function dire(r) { if (r?.refus) toast(r.refus); return r; }

// ─── Le HUD ────────────────────────────────────────────────────────────────
const ordreEnMots = r => nuitEtat === 'choix' && corveesNuit[r.id] ? `cette nuit : ${corveeDe(corveesNuit[r.id]).toLowerCase()}` : actionDe(B, r);

// Nos régiments (Jérôme, v0.20.0 ; docs/ui-cible.md) : une rangée de cartes compactes (numéro et nom, chevrons d'expérience, la barre
// debout / blessés / tombés : plein, hachuré, vide) ; la carte choisie s'ouvre vers le haut (l'ordre en mots, les actions) sans pousser
// les autres. Plusieurs régiments choisis : s'ouvre celui qu'on a choisi en dernier. Trop étroit : des flèches font défiler la rangée.
let regimentsVus = '', regDebut = 0, regActifVu = -1;
const CARTE_L = 112, CARTE_ECART = 8;
const CHEVRON = '<svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 7l5-5 5 5"/></svg>';
function majRegiments() {
  const e = B.etat, A = B.armee, regs = e.regiments.filter(r => r.camp === NOUS && r.effectif);
  const bl = new Int32Array(e.regiments.length), ex = new Float32Array(e.regiments.length), vivants = new Int32Array(e.regiments.length);
  for (let i = 0; i < A.n; i++) if (A.camp[i] === NOUS) { const g = A.reg[i]; vivants[g]++; ex[g] += A.exp[i]; if (A.blessure[i]) bl[g]++; }
  const place = Math.max(0, $('regiments').clientWidth - 2 * 40), visibles = place ? Math.max(1, Math.min(regs.length, Math.floor((place + CARTE_ECART) / (CARTE_L + CARTE_ECART)))) : regs.length;
  const actif = [...choisis].reverse().map(id => e.regiments[id]).find(r => r && r.camp === NOUS && r.effectif) || null;
  const ia = actif ? regs.indexOf(actif) : -1;
  if (ia >= 0 && ia !== regActifVu && (ia < regDebut || ia >= regDebut + visibles)) regDebut = Math.min(Math.max(0, regs.length - visibles), Math.max(0, ia - Math.floor(visibles / 2)));
  regActifVu = ia;
  regDebut = Math.max(0, Math.min(regDebut, regs.length - visibles));
  const cle = regs.map(r => `${r.id}:${r.effectif}:${r.pertes}:${bl[r.id]}:${chevrons(ex[r.id] / Math.max(1, vivants[r.id]))}:${r.deroute ? 1 : 0}:${moralEnMots(r, R)}:${choisis.has(r.id) ? 1 : 0}:${nuitEtat === 'choix' ? corveesNuit[r.id] : ''}`).join('|')
    + `#${regDebut}/${visibles}#${actif ? `${actif.id}:${ordreEnMots(actif)}:${choisis.size}:${modeMarche}:${e.phase}` : ''}`;
  if (cle === regimentsVus) return;
  regimentsVus = cle;
  const pc = (n, r) => `${(n / r.initial * 100).toFixed(1)}%`;
  const cartes = regs.slice(regDebut, regDebut + visibles).map(r => {
    const bles = bl[r.id], debout = Math.max(0, r.effectif - bles), nb = chevrons(ex[r.id] / Math.max(1, vivants[r.id])), humeur = moralEnMots(r, R);
    const b = document.createElement('button');
    b.className = `reg-carte${choisis.has(r.id) ? ' choisi' : ''}`; b.dataset.id = r.id;
    b.setAttribute('aria-pressed', String(choisis.has(r.id)));
    b.setAttribute('aria-label', `${numeroDe(r)} · ${r.nom} : ${debout} debout, ${bles} blessés, ${r.pertes} tombés, ${'chevron '.repeat(nb).trim() || 'aucun chevron'}${humeur.startsWith('tient') ? '' : `, ${humeur}`}`);
    b.innerHTML = `<span class="l1"><b>${numeroDe(r)}</b> ${r.nom}${humeur.startsWith('tient') ? '' : '<i class="alerte" aria-hidden="true">!</i>'}</span>
      <span class="chevrons" aria-hidden="true">${nuitEtat === 'choix' ? `<span class="corvee">${corveeCourte(corveesNuit[r.id])}</span>` : [0, 1, 2].map(k => k < nb ? CHEVRON : CHEVRON.replace('class="chev"', 'class="chev vide"')).join('')}</span>
      <span class="barre" title="plein : debout (${debout}) · hachuré : blessés (${bles}) · vide : tombés (${r.pertes})"><i class="debout" style="width:${pc(debout, r)}"></i><i class="blesses" style="width:${pc(bles, r)}"></i><i class="tombes" style="width:${pc(r.pertes, r)}"></i></span>`;
    return b;
  });
  $('reg-rang').replaceChildren(...cartes);
  $('reg-prec').hidden = regDebut <= 0; $('reg-suiv').hidden = regDebut + visibles >= regs.length;
  const pan = $('reg-ouvert');
  if (!actif || ia < regDebut || ia >= regDebut + visibles) { pan.hidden = true; return; }
  const bles = bl[actif.id], debout = Math.max(0, actif.effectif - bles), humeur = moralEnMots(actif, R), tampon = humeur.startsWith('tient') ? '' : humeur, jour = e.phase === 'jour' && !nuitEtat;
  pan.dataset.id = actif.id;
  pan.innerHTML = `<div class="tete"><b>${numeroDe(actif)} · ${actif.nom}</b><span>${secteursDe(B, actif)}</span></div>
    <div class="compte">${debout} debout · ${bles} blessés · ${actif.pertes} tombés</div>
    <div class="ordre">${ordreEnMots(actif)}</div>${tampon ? `<span class="tampon">${tampon}</span>` : ''}
    ${choisis.size > 1 ? `<p class="discret">+ ${choisis.size - 1} autre${choisis.size > 2 ? 's' : ''} choisi${choisis.size > 2 ? 's' : ''}</p>` : ''}
    <div class="actions">${jour ? `<button data-act="marche" class="${modeMarche ? 'actif' : ''}" aria-pressed="${modeMarche}">Marcher</button><button data-act="depart">Regagner sa tranchée</button>` : nuitEtat === 'choix' ? CORVEES.map(c => {
      const m = refusCorvee(B, actif, c.id), toutes = [...choisis].every(i => corveesNuit[i] === c.id);
      return `<button data-corvee="${c.id}" class="${toutes ? 'actif' : ''}${m ? ' refus' : ''}" aria-disabled="${!!m}" title="${(m || c.dit).replace(/"/g, '&quot;')}">${c.nom}</button>`;
    }).join('') : ''}<button data-act="fiche">Fiche</button></div>`;
  pan.hidden = false;
  const carte = $('reg-rang').children[ia - regDebut], zone = $('regiments');
  // centrée sur sa carte (offsetLeft est déjà celui de la rangée entière : la carte a #regiments pour parent de position)
  pan.style.left = `${Math.round(Math.max(0, Math.min(carte.offsetLeft + carte.offsetWidth / 2 - pan.offsetWidth / 2, zone.clientWidth - pan.offsetWidth)))}px`;
}
$('reg-rang').onclick = e => {
  const c = e.target.closest('.reg-carte');
  if (!c || !B) return;
  const id = +c.dataset.id;
  if (e.shiftKey) choisirRegiment(id, true);
  else if (choisis.size === 1 && choisis.has(id)) { choisis = new Set(); rendu.choisis = choisis; modeMarche = false; majHud(); }
  else choisirRegiment(id, false);
  c.blur();
};
$('reg-ouvert').onclick = e => {
  const co = e.target.closest('button[data-corvee]');
  if (co && B) { co.blur(); return donnerCorvee(co.dataset.corvee); }
  const b = e.target.closest('button[data-act]');
  if (!b || !B) return;
  b.blur();
  if (b.dataset.act === 'fiche') return montrerRegiment(+$('reg-ouvert').dataset.id);
  if (b.dataset.act === 'marche') { modeMarche = !modeMarche; if (modeMarche) modeBarrage = null; return majHud(); }
  if (b.dataset.act === 'depart') {
    for (const id of [...choisis]) {
      const d = B.etat.regiments[id]?.depart;
      if (!d) continue;
      let x = d.x, y = d.y;
      if (d.trace) { const L = B.lignes.find(l => l.camp * 10 + l.rang === d.trace.ligne); x = (d.trace.x0 + d.trace.x1) / 2; y = L ? ligneY(L, x) : d.y; }
      const r = dire(ordonnerMarche(B, [id], x, y));
      if (r.ok) { marque = { x, y, t: 2 }; ordreDonne(r); }
    }
    sauvegarder(); majHud();
  }
};
$('reg-prec').onclick = () => { regDebut = Math.max(0, regDebut - 1); regimentsVus = ''; majRegiments(); };
$('reg-suiv').onclick = () => { regDebut += 1; regimentsVus = ''; majRegiments(); };

// ─── La carte du secteur (Jérôme, v0.14.0) : huit secteurs numérotés de l'ouest à l'est, les quatre lignes de chaque camp (en
// face au nord, en haut), chaque case en deux tronçons de 25 m, à la couleur de celui qui les tient. Un numéro choisit le
// régiment du secteur ; une case envoie les régiments choisis dans cette tranchée (et la fait clignoter, ici et sur le terrain).
// La carte en proportions (Jérôme, v0.19.0) : les lignes à 20 m l'une de l'autre, un no man's land resserré de 64 px entre les premières
// (la carte entière tiendrait mal à l'écran en vraie grandeur) ; les régiments y sont des cercles, à leur place (au centre de leurs hommes).
function choisirRegiment(id, ajout) {
  if (!ajout) choisis = new Set();
  if (ajout && choisis.has(id)) choisis.delete(id); else choisis.add(id);
  rendu.choisis = choisis; majHud();
}
function choisirSecteur(s, ajout) {
  const regs = B.etat.regiments.filter(r => { const [a, b] = etendueZones(B, r.depart); return r.camp === NOUS && r.effectif && s >= a && s <= b; });
  if (!regs.length) return toast(`Plus personne dans le secteur ${lettreZone(s)}.`);
  if (!ajout) choisis = new Set();
  for (const r of regs) { if (ajout && choisis.has(r.id)) choisis.delete(r.id); else choisis.add(r.id); }
  rendu.choisis = choisis; majHud();
}
function ordreCase(idx, s) {
  if (B.etat.phase !== 'jour') return toast('La nuit, pas de marche : choisissez des régiments, puis une corvée.');
  if (!choisis.size) return toast('Choisissez d\'abord un régiment (clic, cadre, T, ou la lettre d\'un secteur).');
  const Z = zone(B), x = Z.x0 + (s - 0.5) * largeurZone(B), y = ligneY(B.lignes[idx], x);
  const r = dire(ordonnerMarche(B, [...choisis], x, y));
  if (r.ok) { marque = { x, y, t: 2 }; sauvegarder(); ordreDonne(r); }
}
// Un ordre pris : les tronçons visés clignotent (sur le terrain et sur la carte, trois secondes) et le carnet dit ce que chacun va faire
function ordreDonne(r) {
  if (!r?.ok) return;
  if (r.tranchee && r.troncons?.length) {
    rendu.clignoter(r.troncons);
    const Z = zone(B), w = largeurZone(B), vises = new Set(r.troncons), els = [];
    for (const c of laCarte.cases) if (c.idx === r.ligne && tronconsDeLigne(B, c.idx, Z.x0 + (c.s - 1) * w, Z.x0 + c.s * w).some(k => vises.has(k))) els.push(c.el);
    for (const el of els) { el.classList.remove('clign'); void el.offsetWidth; el.classList.add('clign'); }
    setTimeout(() => { for (const el of els) el.classList.remove('clign'); }, 3200);
  }
  const regs = r.regiments.map(id => B.etat.regiments[id]);
  noter(regs.length > 2 ? `${regs.length} régiments en marche.` : regs.map(g => `${g.nom} : ${actionDe(B, g)}`).join(' ; ') + '.');
  regimentsVus = ''; majHud();
}

// Les événements de la bataille, racontés au carnet de bord (la boucle et le mode debug)
function raconter(ev) {
    if (vitesse > 1 && ev.some(p => p.type === 'prise' || p.type === 'dispute' || p.type === 'assaut' || (p.type === 'deroute' && p.camp === NOUS))) { vitesse = 1; appliquerVitesse(); }
    for (const p of ev) {
      const reg = p.reg !== undefined ? B.etat.regiments[p.reg] : null;
      if (p.type === 'prise') noter(`${p.camp === NOUS ? 'Pris' : 'Perdu'} : ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'dispute') noter(`Ceux d'en face sont dans ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'preparation') noter(`En face prépare au 220 sur ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'poursuite') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} poursuit sur notre ligne suivante.`);
      else if (p.type === 'assaut') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} sort de ses tranchées${p.troncon >= 0 ? ` : ${nomTroncon(B, p.troncon)}` : ''}.`);
      else if (p.camp !== NOUS) continue;
      else if (p.type === 'deroute') noter(`${reg.nom} est en déroute.`);
      else if (p.type === 'ralliement') noter(`${reg.nom} se rallie.`);
      else if (p.type === 'promu' && p.rang === 0) { const { qui } = quiEst(p.id); noter(`${qui.prenom} ${qui.nom} commande ${reg.nom}.`); }
    }
}
// Le temps (Jérôme, v0.19.0) : arrêter, ×1, ×2, ×4. Le pas de la simulation ne change pas (la partie est la même) : on en fait plus par
// image, tant que la simulation tient (`perf.sim` × la vitesse sous ~20 ms) ; un assaut, une déroute, un tronçon pris ramènent à ×1.
const ICONES_METEO = {
  sec: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  pluie: '<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17 15z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
  brouillard: '<path d="M4 9h16M3 13h14M6 17h14"/>',
  gel: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
};
function appliquerVitesse() {
  const plafond = perf.sim > 0 ? Math.max(1, Math.floor(20 / perf.sim)) : 4;
  loop.setTimeScale(Math.min(vitesse, plafond));
}
function basculerPause() { pauseActive = !pauseActive; if (pauseActive) loop.pause(); else reprendre(); majHud(); }
function majTemps(h) {
  appliquerVitesse();
  $('temps-pause').classList.toggle('actif', pauseActive); $('temps-pause').setAttribute('aria-pressed', String(pauseActive));
  for (const b of document.querySelectorAll('[data-vitesse]')) b.classList.toggle('actif', +b.dataset.vitesse === vitesse);
  const m = $('meteo');
  if (m.dataset.m !== h.meteo) { m.dataset.m = h.meteo; $('meteo-icone').innerHTML = ICONES_METEO[h.meteo] || ''; m.setAttribute('aria-label', `Le temps : ${METEO[h.meteo].nom}. Les prévisions.`); }
}

function majHud() {
  if (!B) return;
  const h = horloge(B), e = B.etat;
  $('horloge').textContent = `Jour ${h.jour} sur ${h.jours} · ${h.heure} h ${deux(h.minute)} · ${METEO[h.meteo].nom}`;
  $('demain').textContent = h.prevision ? `Demain : ${METEO[h.prevision].prevision}` : 'Dernier jour';
  $('mission').hidden = !e.mission;
  if (e.mission) $('mission').textContent = `${e.mission === 'tenir' ? 'Tenir le secteur' : 'Prendre leur première ligne'} · réserve : ${e.reserves[NOUS]}`;
  $('montre-m').style.transform = `rotate(${h.minute * 6}deg)`; $('montre-m').style.transformOrigin = '32px 32px';
  $('montre-h').style.transform = `rotate(${((h.heure % 12) + h.minute / 60) * 30}deg)`; $('montre-h').style.transformOrigin = '32px 32px';
  majPertes(B); majTemps(h);
  majFiche();
  $('pause-active').hidden = !pauseActive;
  for (const b of $('batteries').children) {
    const cal = b.dataset.cal, reste = Math.ceil(e.batteries[cal] - e.temps);
    b.querySelector('span').textContent = reste > 0 ? `${reste} s` : 'prête';
    b.classList.toggle('vise', modeBarrage === cal);
    b.classList.toggle('recharge', reste > 0);
  }
  majRegiments(); laCarte.maj();
  $('batteries').hidden = nuitEtat === 'choix';    // la nuit, pas de barrage
  $('ecran').classList.toggle('vise', !!modeBarrage || modeMarche);
}
$('batteries').append(...NOMS_CALIBRES.map((cal, k) => {
  const b = document.createElement('button');
  b.className = 'batterie'; b.dataset.cal = cal;
  b.setAttribute('aria-label', `Barrage de ${cal} (touche ${k + 1})`);
  const H = { 75: 34, 155: 44, 220: 54 }[cal] || 40, W = { 75: 12, 155: 16, 220: 20 }[cal] || 14;
  b.innerHTML = `<svg viewBox="0 0 ${W + 4} ${H + 4}" aria-hidden="true"><path d="M2 ${H + 2}V${Math.round(H * 0.45)}Q${2 + W / 2} 1 ${2 + W} ${Math.round(H * 0.45)}V${H + 2}Z"/><rect class="ceinture" x="2" y="${H - 8}" width="${W}" height="3"/></svg><b>${cal}</b><i class="touche" aria-hidden="true">${k + 1}</i><span>prête</span>`;
  b.onclick = () => viser(cal);
  return b;
}));
function viser(cal) {
  if (!B) return;
  if (B.etat.phase !== 'jour') return dire({ refus: 'Pas de barrage la nuit.' });
  modeBarrage = modeBarrage === cal ? null : cal; if (modeBarrage) modeMarche = false;
  majHud();
}

// Les noms de nos régiments, au-dessus d'eux
const etiq = new Map();
function etiquettes() {
  $('etiquettes').replaceChildren();
  etiq.clear();
  for (const r of B.etat.regiments) {
    if (r.camp !== NOUS) continue;
    const d = document.createElement('div');
    d.className = 'etiquette'; d.textContent = r.nom;
    $('etiquettes').append(d); etiq.set(r.id, d);
  }
}
const centres = new Map();
function majEtiquettes() {
  const A = B.armee;
  // (un régiment frais est arrivé à l'aube : son nom au-dessus de lui aussi)
  if (etiq.size !== B.etat.regiments.filter(r => r.camp === NOUS).length) etiquettes();
  centres.clear();
  for (let i = 0; i < A.n; i++) {
    if (A.camp[i] !== NOUS) continue;
    let c = centres.get(A.reg[i]);
    if (!c) centres.set(A.reg[i], c = { x: 0, y: 0, n: 0, ymin: 1e9 });
    c.x += A.x[i]; c.y += A.y[i]; c.n++; if (A.y[i] < c.ymin) c.ymin = A.y[i];
  }
  for (const [id, d] of etiq) {
    const c = centres.get(id);
    if (!c) { d.hidden = true; continue; }
    const [sx, sy] = rendu.versEcran(c.x / c.n, c.ymin - 2);
    // hors de l'écran : caché (sinon il dépasse, et l'audit d'écran le voit amputé)
    d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
    if (d.hidden) continue;
    d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    d.classList.toggle('choisi', choisis.has(id));
    // « S3 · Viride », puis la corvée de la nuit, ou le moral quand il baisse
    const reg = B.etat.regiments[id], m = moralEnMots(reg, R), base = `${numeroDe(reg)} · ${reg.nom} · ${secteursDe(B, reg)}`;
    const suite = nuitEtat === 'choix' && corveesNuit[id] ? corveeDe(corveesNuit[id]) : m.startsWith('tient') ? '' : m;
    const texte = suite ? `${base} · ${suite}` : base;
    if (d.textContent !== texte) d.textContent = texte;
  }
  const rs = $('repere-soldat'), is = laFiche.ouverte ? indiceDe(laFiche.ouverte.id) : -1;
  if (is >= 0) {
    const [sx, sy] = rendu.versEcran(B.armee.x[is], B.armee.y[is]);
    rs.hidden = false; rs.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
  } else rs.hidden = true;
  const m = $('repere');
  if (marque && marque.t > 0) {
    const [sx, sy] = rendu.versEcran(marque.x, marque.y);
    m.hidden = false; m.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
  } else m.hidden = true;
}
let marque = null;
// La visée (v0.21.0) : de chaque régiment choisi au curseur une ligne, une croix au bout ; l'ordre à sec (`peutOrdonner`) dit ce qu'il occuperait
function majVisee() {
  const svg = $('visee');
  if (!(enJeu() && B.etat.phase === 'jour' && !nuitEtat && choisis.size && souris && !glisse && !modeBarrage && !document.querySelector('dialog[open]'))) {
    if (!svg.hasAttribute('hidden')) { svg.setAttribute('hidden', ''); rendu.surligner(null); }
    return;
  }
  const [x, y] = rendu.versTerrain(souris.x, souris.y), plan = peutOrdonner(B, [...choisis], x, y);
  rendu.surligner(plan.ok ? { troncons: plan.troncons || [], rects: plan.emprises || [] } : null);
  const trait = (x1, y1, x2, y2) => `<line class="fond" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="encre" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let d = '';
  for (const id of choisis) { const c = centres.get(id); if (c) { const [sx, sy] = rendu.versEcran(c.x / c.n, c.y / c.n); d += trait(Math.round(sx), Math.round(sy), souris.x, souris.y); } }
  d += `<g class="croix">${trait(souris.x - 7, souris.y - 7, souris.x + 7, souris.y + 7)}${trait(souris.x - 7, souris.y + 7, souris.x + 7, souris.y - 7)}</g>`;
  svg.classList.toggle('refus', !plan.ok);
  svg.innerHTML = d; svg.removeAttribute('hidden');
}

// ─── Les fiches et le survol : voir hud/fiche.js et hud/lecture.js ─────────────────────────────────────
const DE_PRES = 3;                // à partir de 3 pixels par mètre, on survole et clique des hommes
const dePres = () => rendu.ppm >= DE_PRES;
// le rayon de prise du pointeur, en mètres : une douzaine de pixels d'écran
const prise = px => px * (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;

// ─── Le survol : de près un homme, de loin un régiment ─────────────────────
let souris = null;                // la position du pointeur sur le canvas (souris seulement)
$('canvas').addEventListener('pointermove', e => { souris = e.pointerType === 'mouse' && !e.buttons ? { x: e.clientX, y: e.clientY } : null; });
$('canvas').addEventListener('pointerleave', () => { souris = null; });
// le régiment sous le point (les deux camps), à moins de r mètres
function regimentSous(x, y, r = 4, camp = -1) {
  const A = B.armee;
  let best = -1, bd = r * r;
  for (let i = 0; i < A.n; i++) {
    if (camp >= 0 && A.camp[i] !== camp) continue;
    const d = (A.x[i] - x) ** 2 + (A.y[i] - y) ** 2;
    if (d < bd) { bd = d; best = A.reg[i]; }
  }
  return best;
}
// le terrain sous la souris, dans un coin (refait seulement quand la case ou ce qu'elle est change)
function majTerrain(x, y) {
  const p = $('terrain'), r = x === null ? null : terrainResume(B, x, y);
  if (!r) { p.hidden = true; return; }
  const cle = `${r.lignes.slice(0, 2).join('\n')}|${r.vitesse}`;
  if (p.dataset.cle !== cle) {
    p.dataset.cle = cle;
    const pc = Math.round(r.vitesse * 100);
    p.replaceChildren(...r.lignes.slice(0, 2).map((t, k) => Object.assign(document.createElement('p'), { textContent: t, className: k ? 'discret' : '' })),
      Object.assign(document.createElement('div'), { className: 'vit', innerHTML: `<span>marche</span><i class="plein"><b style="width:${pc}%"></b></i><span>${pc} %</span>` }));
  }
  p.hidden = false;
}
// Le survol global (Jérôme, v0.21.1) : le régiment sous la souris, ou sous une carte ou un cercle du HUD, s'allume avec tous ses hommes ; sinon le
// tronçon sous la souris (sauf quand la visée d'un ordre le montre déjà). Le dessin seulement.
let survolHud = -1;
function appliquerSurvol(reg, tr) {
  const vise = choisis.size && B.etat.phase === 'jour' && !nuitEtat && souris;
  rendu.survoler(survolHud >= 0 ? survolHud : reg, tr >= 0 && !vise && survolHud < 0 ? [tr] : []);
}
for (const [id, sel] of [['reg-rang', '.reg-carte'], ['carte-grille', '.carte-ronde']]) {
  $(id).addEventListener('pointerover', e => { const c = e.target.closest(sel); if (c) survolHud = c.dataset.id !== undefined ? +c.dataset.id : +c.dataset.reg; });
  $(id).addEventListener('pointerout', e => { if (e.target.closest(sel)) survolHud = -1; });
}
function majBulle() {
  const bulle = $('bulle');
  if (!souris || !enJeu() || glisse || document.querySelector('dialog[open]')) { bulle.hidden = true; majTerrain(null); appliquerSurvol(-1, -1); return; }
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  majTerrain(x, y);
  let lignes = null, regSous = -1;
  if (dePres()) {
    const i = soldatSous(x, y, Math.max(0.8, prise(12)));
    if (i >= 0) {
      const A = B.armee, { reg, qui } = quiEst(A.id[i]); regSous = A.reg[i];
      lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`,
        [...etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]), experienceEnMots(A.exp[i])].filter(Boolean).join(', ')];
    } else {
      const mort = corpsSous(x, y, Math.max(0.8, prise(10)));
      if (mort >= 0) {
        const { reg, qui } = quiEst(mort);
        lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`, tombe(mort)];
      }
    }
  } else {
    const r = regimentSous(x, y, Math.max(4, prise(16)));
    if (r >= 0) { regSous = r; const reg = B.etat.regiments[r]; lignes = [nomDe(reg), enMots(bilan(reg)), majuscule(moralEnMots(reg, R)), refuseAujourdhui(reg)].filter(Boolean); }
  }
  const T = B.terrain, cc = Math.floor(y) * T.W + Math.floor(x);
  appliquerSurvol(regSous, x >= 0 && y >= 0 && x < T.W && y < T.H && T.troncon ? T.troncon[cc] : -1);
  if (!lignes) { bulle.hidden = true; return; }
  const cle = lignes.join('\n');
  if (bulle.dataset.cle !== cle) {
    bulle.dataset.cle = cle;
    bulle.replaceChildren(...lignes.map((t, k) => Object.assign(document.createElement('p'), { textContent: t, className: k ? 'discret' : '' })));
  }
  bulle.hidden = false;
  // à droite et sous le pointeur, ramenée dans l'écran
  const w = bulle.offsetWidth, h = bulle.offsetHeight;
  const bx = Math.min(souris.x + 16, innerWidth - w - 8), by = souris.y + 18 + h > innerHeight - 8 ? souris.y - h - 10 : souris.y + 18;
  bulle.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
}

// Donner l'ordre de marche aux régiments choisis, là où l'on a cliqué
function ordreMarche(x, y) {
  const r = dire(ordonnerMarche(B, [...choisis], x, y));
  if (r.ok) { marque = { x, y, t: 2 }; sauvegarder(); ordreDonne(r); }
}
// Annuler, du plus récent au plus ancien : le barrage visé, « Marcher », la fiche, les régiments choisis (clic droit, Échap)
function annuler() {
  if (modeBarrage) modeBarrage = null;
  else if (modeMarche) modeMarche = false;
  else if (laFiche.ouverte) fermerFiche();
  else if (choisis.size) { choisis = new Set(); rendu.choisis = choisis; }
  majHud();
}

// ─── Commandes : clavier, souris (section 8) ───────────────────────────────
function choisirTout() {
  choisis = new Set(B.etat.regiments.filter(r => r.camp === NOUS && r.effectif).map(r => r.id));
  rendu.choisis = choisis; majHud();
}
const keys = createKeys({
  actions: {
    menu: 'Escape', pause: ' ', tout: 't', plus: ['+', '=', 'NumpadAdd'], moins: ['-', 'NumpadSubtract'],
    b1: 'Digit1', b2: 'Digit2', b3: 'Digit3',
  },
  onAction: nom => {
    if (!enJeu()) return;
    if (nom === 'menu') {
      if (modeBarrage || modeMarche || laFiche.ouverte || choisis.size) annuler(); else pause();
    }
    else if (nom === 'pause') basculerPause();
    else if (nom === 'tout') choisirTout();
    else if (nom === 'plus') zoomer(1);
    else if (nom === 'moins') zoomer(-1);
    else if (nom[0] === 'b') viser(NOMS_CALIBRES[Number(nom[1]) - 1]);
  },
});
const pad = createGamepad({ actions: { menu: 'start', pause: 'select' }, onAction: nom => { if (nom === 'menu') pause(); } });
function zoomer(d, ancre) { rendu.zoomer(d, ancre); prefs.zoom = rendu.vue.zoom; store.save('prefs', prefs); }

const cadre = $('cadre');
let glisse = null;

// Le cadran de la vue (à l'écran) : tourner et incliner sans souris à gestes, un bouton tenu enfoncé est lu en continu
const cadran = { tour: 0, incl: 0 };
for (const b of $('cadran').querySelectorAll('button')) {
  const dir = { tour: Number(b.dataset.tour || 0), incl: Number(b.dataset.incl || 0) };
  const lacher = () => { cadran.tour = 0; cadran.incl = 0; };
  b.onpointerdown = e => { if (e.button) return; e.preventDefault(); cadran.tour = dir.tour; cadran.incl = dir.incl; };
  b.onclick = e => { if (e.detail === 0 && dir.tour + dir.incl) rendu.tourner(dir.tour * 0.1, dir.incl * 0.06); };   // au clavier : un cran
  b.onpointerup = b.onpointerleave = b.onpointercancel = lacher;
}
$('cadran-centre').onclick = () => {
  rendu.placerCamera(CAMERA.yaw, CAMERA.tangage);
  prefs.camera = null; store.save('prefs', prefs);
};
createPointer($('canvas'), {
  threshold: 6,
  onTap: p => {
    if (!enJeu()) return;
    const [x, y] = rendu.versTerrain(p.x, p.y);
    // Le clic droit annule (Jérôme, v0.21.2) : le barrage visé, « Marcher », la fiche, puis les régiments choisis ; il ne donne plus d'ordre.
    if (p.button === 2) return annuler();
    if (p.button !== 0) return;
    if (modeBarrage) {
      if (dire(ordonnerBarrage(B, modeBarrage, x, y)).ok) { marque = { x, y, t: 2 }; modeBarrage = null; sauvegarder(); }
      return majHud();
    }
    const jour = B.etat.phase === 'jour';
    if (modeMarche && jour) { modeMarche = false; ordreMarche(x, y); return majHud(); }
    // Le clic gauche choisit, puis ordonne : sur un de nos régiments (Maj : en ajouter ou en retirer), il le choisit ; ailleurs, avec des
    // régiments choisis, ils y marchent (sur une tranchée : l'occupent) et restent choisis. La nuit, on ne marche pas : on choisit pour les corvées.
    const rNous = regimentSous(x, y, dePres() ? 4 : Math.max(4, prise(16)), NOUS);
    if (rNous >= 0) {
      if (!p.event.shiftKey) choisis = new Set();
      if (choisis.has(rNous) && p.event.shiftKey) choisis.delete(rNous); else choisis.add(rNous);
      rendu.choisis = choisis;
      return majHud();
    }
    if (jour && choisis.size && !p.event.shiftKey) { fermerFiche(); ordreMarche(x, y); return majHud(); }
    // sans régiment choisi : la fiche de ce qu'on touche, chez l'autre camp ou parmi les morts
    if (dePres()) {
      const i = soldatSous(x, y, Math.max(0.8, prise(12))), mort = i < 0 ? corpsSous(x, y, Math.max(0.8, prise(10))) : -1;
      if (i >= 0) montrerFiche(i); else if (mort >= 0) montrerSoldat(mort);
    } else {
      const r = regimentSous(x, y, Math.max(4, prise(16)));
      if (r >= 0) montrerRegiment(r);
    }
    majHud();
  },
  onDragStart: p => { glisse = { bouton: p.button, x0: p.startX, y0: p.startY, cx: rendu.vue.cx, cz: rendu.vue.cz, ddx: p.dx, ddy: p.dy }; },
  onDrag: p => {
    if (!glisse) return;
    if (glisse.bouton === 1 && p.event.shiftKey) {
      // Maj + glisser avec la molette : déplacer la vue (le terrain suit la souris)
      const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;
      rendu.vue.cx = glisse.cx; rendu.vue.cz = glisse.cz;
      rendu.deplacerEcran(-p.dx * k, -p.dy * k);
      return;
    }
    if (glisse.bouton === 1 || glisse.bouton === 2) {
      // glisser avec la molette (ou le bouton droit) : tourner (de gauche à droite) et incliner (de haut en bas) la caméra, un peu
      rendu.tourner((p.dx - glisse.ddx) * 0.004, -(p.dy - glisse.ddy) * 0.003);
      glisse.ddx = p.dx; glisse.ddy = p.dy;
      return;
    }
    const x = Math.min(p.startX, p.x), y = Math.min(p.startY, p.y);
    Object.assign(cadre.style, { left: `${x}px`, top: `${y}px`, width: `${Math.abs(p.dx)}px`, height: `${Math.abs(p.dy)}px` });
    cadre.hidden = false;
  },
  onDragEnd: p => {
    cadre.hidden = true;
    if (glisse?.bouton === 1 || glisse?.bouton === 2) { prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage }; store.save('prefs', prefs); }
    if (!glisse || glisse.bouton !== 0 || !enJeu()) { glisse = null; return; }
    glisse = null;
    // choisir au cadre : les régiments dont au moins un homme est dans le cadre (à l'écran)
    const x0 = Math.min(p.startX, p.x), x1 = Math.max(p.startX, p.x), y0 = Math.min(p.startY, p.y), y1 = Math.max(p.startY, p.y);
    if (!p.event.shiftKey) choisis = new Set();
    const A = B.armee;
    for (let i = 0; i < A.n; i++) {
      if (A.camp[i] !== NOUS || choisis.has(A.reg[i])) continue;
      const [sx, sy] = rendu.versEcran(A.x[i], A.y[i]);
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) choisis.add(A.reg[i]);
    }
    rendu.choisis = choisis; majHud();
  },
  onWheel: ({ delta, at }) => { if (enJeu()) zoomer(-delta, [at.x, at.y]); },
});

// ─── Boucle ────────────────────────────────────────────────────────────────
let derniere = performance.now();
const loop = createLoop({
  step: PAS,
  update() {
    if (!B) return;
    const t0 = performance.now();
    const ev = avancer(B);
    const ms = performance.now() - t0;
    perf.sim += (ms - perf.sim) * 0.05; perf.pas++;
    evenements.push(...ev);
    raconter(ev);
    if (ev.some(e => e.type === 'nuit')) { montrerNuit(); }
    if (ev.some(e => e.type === 'fin')) { montrerFin(); }
  },
  render() {
    const now = performance.now(), dt = Math.min(0.1, (now - derniere) / 1000);
    derniere = now;
    if (!$('titre').hidden) { rendu.dessiner(dt, decorPas(dt)); return; }      // l'écran titre : le décor
    if (!B) return;
    pad.poll();
    if (enJeu() && !document.querySelector('dialog[open]')) {
      const k = keys.axis(), m = pad.axis();
      const ax = k.x || m.x, ay = k.y || m.y;
      if (ax || ay) rendu.deplacerEcran(ax * dt * 260 / rendu.ppm, ay * dt * 260 / rendu.ppm);
      // tourner : A et E (Q et E en QWERTY), incliner : R et F — touches physiques, lues en continu
      const tour = (keys.held('KeyE') ? 1 : 0) - (keys.held('KeyQ') ? 1 : 0) + cadran.tour, incl = (keys.held('KeyF') ? 1 : 0) - (keys.held('KeyR') ? 1 : 0) + cadran.incl;
      if (tour || incl) {
        rendu.tourner(tour * dt * 0.9, incl * dt * 0.5);
        prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage };
        clearTimeout(zoomer.t); zoomer.t = setTimeout(() => store.save('prefs', prefs), 400);
      }
    }
    if (marque) marque.t -= dt;
    rendu.dessiner(dt, evenements.splice(0));
    majEtiquettes();
    majVisee();
    majBulle();
    if ((hudT -= dt) <= 0) { hudT = 0.25; majHud(); }
  },
});
const evenements = [];
let hudT = 0;
loop.start();
$('temps-pause').onclick = e => { basculerPause(); e.currentTarget.blur(); };
for (const b of document.querySelectorAll('[data-vitesse]')) b.onclick = () => {
  vitesse = +b.dataset.vitesse; b.blur();
  if (pauseActive) basculerPause(); else majHud();
};
$('meteo').onclick = e => {
  e.currentTarget.blur();
  const h = horloge(B);
  $('meteo-aujourdhui').textContent = `Aujourd'hui, jusqu'au soir : ${METEO[h.meteo].nom}.`;
  $('meteo-demain').textContent = h.prevision ? `Demain : ${METEO[h.prevision].prevision}.` : 'C\'est le dernier jour.';
  loop.pause(); $('dialogue-meteo').showModal();
};
$('dialogue-meteo').addEventListener('close', reprendre);
$('hud-reglages').onclick = e => { e.currentTarget.blur(); loop.pause(); $('dialogue-reglages').showModal(); };
autosave(sauvegarder, { everyMs: 10000 });

// ─── Mesure (comme pierreStats de Pierre) ──────────────────────────────────
window.cyclopStats = () => ({
  soldats: B?.armee.n ?? 0,
  ms: { simulation: +perf.sim.toFixed(2), ...rendu.stats.ms },
  pas: perf.pas, fps: loop.fps, ...(() => { const { ms, ...r } = rendu.stats; return r; })(),
  vue: { zoom: rendu.ppm, largeur: rendu.vue.vw, hauteur: rendu.vue.vh, facteur: rendu.vue.facteur },
});

// ─── Mise à jour automatique : jamais en pleine bataille (section 4) ───────
startUpdateCheck({
  isBusy: () => enJeu() && !loop.paused,
  beforeReload: sauvegarder,
  onUpdated: v => toast(`Mis à jour en v${v}`),
});

// ─── Mode debug (section 18) : chargé seulement avec ?debug=1 ──────────────
if (DEBUG) {
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.22.0');
  window.__seed = seedFromUrl() ?? undefined;
  installDebug({
    state: () => B && { ...horloge(B), effectifs: effectifs(B), pertes: B.etat.pertes, impacts: B.etat.impacts.length, enJeu: enJeu(), pause: loop.paused },
    places: { centre: { x: 200, y: 150 }, nous: { x: 200, y: 230 }, eux: { x: 200, y: 70 } },
    // le mode debug parle en coordonnées du SECTEUR (0..400, 0..300) : les marges s'ajoutent ici
    teleport: ({ x, y }) => { rendu.vue.cx = x + B.etat.marges.x; rendu.vue.cz = y + B.etat.marges.y; },
    setTimeScale: s => loop.setTimeScale(s),
    setSeed: n => jouer(nouvelle(n)),
    reset: () => { store.clear('partie'); B = null; montrerTitre(); },
    extra: {
      stats: () => window.cyclopStats(),
      // avance de n pas tout de suite (les nuits passent d'elles-mêmes)
      avancer(n = 30, passerNuits = true) {
        for (let k = 0; k < n && B.etat.phase !== 'fin'; k++) {
          if (B.etat.phase === 'nuit') {
            if (!passerNuits) break;
            aube(B, nuitEtat === 'choix' ? corveesNuit : {}); fermerNuit();
          }
          const ev = avancer(B);
          evenements.push(...ev); raconter(ev);
        }
        majHud();
        return horloge(B);
      },
      barrage: (cal, x, y, camp = 0) => ordonnerBarrage(B, cal, x + B.etat.marges.x, y + B.etat.marges.y, camp),
      marche: (ids, x, y) => ordonnerMarche(B, ids, x + B.etat.marges.x, y + B.etat.marges.y),
      zoom: z => { rendu.vue.zoom = z; },
      fiche: () => laFiche.ouverte && { ...laFiche.ouverte, nom: $('fiche-nom').textContent, qui: $('fiche-qui').textContent, etat: $('fiche-etat').textContent, liste: $('fiche-liste').textContent },
      survol: (x, y) => { souris = { x, y }; majBulle(); return $('bulle').hidden ? null : $('bulle').textContent; },
      camera: (yaw, tangage) => rendu.placerCamera(yaw, tangage),
      nuit: () => montrerNuit(),
      fin: () => montrerFin(),
      bataille: () => B,
      rendu: () => rendu,
      CALIBRES,
    },
  });
}

montrerTitre();
