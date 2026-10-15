// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.10.0';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.10.0';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.10.0';
import { createGamepad } from './lib/gamepad.js?v=0.10.0';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.10.0';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.10.0';
import { ROLES } from './palette.js?v=0.10.0';
import { MISSIONS, nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, horloge, effectifs, tronconsTenus, moralEnMots, terrainSous, rangDe, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.10.0';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.10.0';
import { METEO } from './data/meteo.js?v=0.10.0';
import { impact, hydroLignes } from './terrain.js?v=0.10.0';
import { hash2 } from './lib/rng.js?v=0.10.0';
import { creerRendu, CAMERA } from './rendu3d.js?v=0.10.0';
import { identite, etatEnMots, experienceEnMots } from './identite.js?v=0.10.0';
import { CORVEES } from './data/corvees.js?v=0.10.0';
import { refusCorvee } from './nuit.js?v=0.10.0';
import { chargerContenu } from './design-store.js?v=0.10.0';

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
    prefs: { version: 1, debugWrites: false, defaults: { zoom: 2, camera: null, gauche: false } },
  },
  secret: ['gh-token'],
});
const prefs = store.load('prefs');
const { reglages: R } = await chargerContenu();

let B = null;                 // la bataille en cours
let pauseActive = false;      // Espace : le temps s'arrête, les ordres restent possibles
let modeBarrage = null;       // un calibre : le prochain clic gauche vise
let choisis = new Set();      // les régiments choisis (ids)
const perf = { sim: 0, pas: 0 };

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
  modeBarrage = null; pauseActive = false; fermerFiche();
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
  if (!enJeu() || pauseActive || B.etat.phase !== 'jour' || document.querySelector('dialog[open]')) return;
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
// tout au bouton gauche : pour un navigateur dont le clic droit glissé fait des gestes (Firefox et ses extensions)
$('pref-gauche').checked = !!prefs.gauche;
$('pref-gauche').onchange = e => { prefs.gauche = e.target.checked; store.save('prefs', prefs); };
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
function montrerNuit() {
  loop.pause(); sauvegarder();
  const e = B.etat, j = e.jour, [nous, eux] = e.pertesJour[j - 1];
  $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
  $('nuit-pertes').textContent = `Morts du jour : ${nous} des nôtres, ${eux} en face.`;
  $('nuit-lignes').textContent = e.tranchees ? enLignes(e.prises[j - 1]) : '';
  $('nuit-demain').textContent = `Demain : ${METEO[e.previsions[j - 1]]?.prevision || '—'}.`;
  $('nuit-reserves').textContent = e.mission ? `En réserve : ${pluriel(e.reserves[NOUS], 'régiment frais', 'régiments frais')}.` : '';
  montrerCorvees();
  $('dialogue-nuit').showModal();
}
// Une corvée par régiment : la dernière donnée, si elle est encore possible, sinon le repos
function montrerCorvees() {
  const e = B.etat, A = B.armee, avant = e.nuits.at(-1)?.choix || {};
  const blesses = new Map();
  for (let i = 0; i < A.n; i++) if (A.blessure[i]) blesses.set(A.reg[i], (blesses.get(A.reg[i]) || 0) + 1);
  $('corvees').replaceChildren(...e.regiments.filter(r => r.camp === NOUS && r.effectif).map(reg => {
    const ligne = document.createElement('div'); ligne.className = 'corvee';
    const qui = document.createElement('p');
    qui.innerHTML = `<b></b> <span class="discret"></span>`;
    qui.firstChild.textContent = reg.nom;
    const v = reg.vivres ?? R.nuit.vivres;
    qui.lastChild.textContent = `${reg.effectif} hommes, ${blesses.get(reg.id) || 0} blessés · ${moralEnMots(reg, R)} · ${v > 1 ? `des vivres pour ${v} nuits` : v === 1 ? 'des vivres pour cette nuit' : 'plus de vivres'}`;
    const choix = document.createElement('select');
    choix.dataset.reg = reg.id; choix.setAttribute('aria-label', `La corvée de ${reg.nom}`);
    for (const c of CORVEES) {
      const refus = refusCorvee(B, reg, c.id);
      choix.append(Object.assign(document.createElement('option'), { value: c.id, textContent: c.nom, disabled: !!refus, title: refus || c.dit }));
    }
    choix.value = avant[reg.id] && !refusCorvee(B, reg, avant[reg.id]) ? avant[reg.id] : 'repos';
    const dit = document.createElement('p'); dit.className = 'discret corvee-dit';
    const majDit = () => { dit.textContent = CORVEES.find(c => c.id === choix.value).dit; };
    choix.onchange = majDit; majDit();
    ligne.append(qui, choix, dit);
    return ligne;
  }));
}
// le bilan de la nuit en quelques lignes (rien de ce qui n'a pas eu lieu)
function bilanEnMots(b) {
  const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
  const faits = [
    b.inhumes && `${pl(b.inhumes, 'mort inhumé', 'morts inhumés')}`,
    b.evacues && `${pl(b.evacues, 'blessé évacué', 'blessés évacués')}`,
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
  const choix = Object.fromEntries([...$('corvees').querySelectorAll('select')].map(s => [s.dataset.reg, s.value]));
  const r = aube(B, choix);
  if (!r.ok) return dire(r);
  sauvegarder(); majHud();
  $('aube-titre').textContent = `L'aube du ${nomJour(B.etat.jour)} jour`;
  $('aube-bilan').replaceChildren(...bilanEnMots(r.bilan[NOUS]).map(t => Object.assign(document.createElement('p'), { textContent: t })));
  $('dialogue-aube').showModal();
}
$('aube').onclick = () => { $('dialogue-nuit').close(); };
$('dialogue-nuit').addEventListener('close', () => { passerLaNuit(); if (!$('dialogue-aube').open) reprendre(); });
$('jour-se-leve').onclick = () => { $('dialogue-aube').close(); };
$('dialogue-aube').addEventListener('close', reprendre);
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
const deux = n => String(n).padStart(2, '0');
function majHud() {
  if (!B) return;
  const h = horloge(B), e = B.etat;
  $('horloge').textContent = `Jour ${h.jour} sur ${h.jours} · ${h.heure} h ${deux(h.minute)} · ${METEO[h.meteo].nom}`;
  $('demain').textContent = h.prevision ? `Demain : ${METEO[h.prevision].prevision}` : 'Dernier jour';
  $('mission').hidden = !e.mission;
  if (e.mission) $('mission').textContent = `${e.mission === 'tenir' ? 'Tenir le secteur' : 'Prendre leur première ligne'} · réserve : ${e.reserves[NOUS]}`;
  $('morts-nous').textContent = e.pertes[0];
  $('morts-eux').textContent = e.pertes[1];
  $('blesses-nous').textContent = e.blesses[0];
  $('blesses-eux').textContent = e.blesses[1];
  $('lignes').hidden = !e.tranchees;
  if (e.tranchees) { const [a, b] = tronconsTenus(B); $('troncons-nous').textContent = a; $('troncons-eux').textContent = b; }
  majFiche();
  $('pause-active').hidden = !pauseActive;
  for (const b of $('batteries').children) {
    const cal = b.dataset.cal, reste = Math.ceil(e.batteries[cal] - e.temps);
    b.querySelector('span').textContent = reste > 0 ? `${reste} s` : 'prête';
    b.classList.toggle('vise', modeBarrage === cal);
    b.classList.toggle('recharge', reste > 0);
  }
  const regs = [...choisis].map(id => e.regiments[id]).filter(Boolean);
  const humeur = r => { const m = moralEnMots(r, R); return m.startsWith('tient') ? '' : ` (${m})`; };
  $('choix').textContent = regs.length ? regs.map(r => `${r.nom} ${r.effectif}${humeur(r)}`).join(' · ') : '';
  $('ecran').classList.toggle('vise', !!modeBarrage);
}
$('batteries').append(...NOMS_CALIBRES.map((cal, k) => {
  const b = document.createElement('button');
  b.className = 'batterie'; b.dataset.cal = cal;
  b.setAttribute('aria-label', `Barrage de ${cal} (touche ${k + 1})`);
  b.innerHTML = `<b>${cal}</b><span>prête</span>`;
  b.onclick = () => viser(cal);
  return b;
}));
function viser(cal) {
  if (!B) return;
  modeBarrage = modeBarrage === cal ? null : cal;
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
    const reg = B.etat.regiments[id], m = moralEnMots(reg, R), texte = m.startsWith('tient') ? reg.nom : `${reg.nom} · ${m}`;
    if (d.textContent !== texte) d.textContent = texte;
  }
  const rs = $('repere-soldat'), is = fiche ? indiceDe(fiche.id) : -1;
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

// ─── Les fiches : un homme (son nom, son âge, son grade, ce qu'il endure) ou un
// régiment (ses hommes, ses blessés, ses morts, et leurs fiches). De près, on
// regarde des hommes ; de loin, des régiments (Jérôme, v0.3.2).
let fiche = null;                 // { id, camp } : un soldat ; { reg } : un régiment
const DE_PRES = 3;                // à partir de 3 pixels par mètre, on survole et clique des hommes
const dePres = () => rendu.ppm >= DE_PRES;
function indiceDe(id) {
  const A = B.armee;
  for (let i = 0; i < A.n; i++) if (A.id[i] === id) return i;
  return -1;
}
// les numéros se suivent, régiment après régiment : le premier numéro d'un régiment
function premierDe(regId) {
  let p = 0;
  for (const r of B.etat.regiments) { if (r.id === regId) return p; p += r.initial; }
  return p;
}
// qui est le soldat n° id (vivant ou mort) : son régiment, son identité
function quiEst(id) {
  let p = 0;
  for (const r of B.etat.regiments) {
    if (id < p + r.initial) return { reg: r, qui: identite(B.etat.graine, r.camp, id, id - p, r.initial, B.etat.grades[id]?.[0] ?? -1) };
    p += r.initial;
  }
  return { reg: null, qui: identite(B.etat.graine, NOUS, id) };
}
const majuscule = s => s[0].toUpperCase() + s.slice(1);
const nomDe = reg => reg?.nom ? `Régiment ${reg.nom}` : 'En face';
// le rayon de prise du pointeur, en mètres : une douzaine de pixels d'écran
const prise = px => px * (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;
// le soldat le plus proche du point, à moins de r mètres (les deux camps)
function soldatSous(x, y, r) {
  const A = B.armee;
  let best = -1, bd = r * r;
  for (let i = 0; i < A.n; i++) {
    const d = (A.x[i] - x) ** 2 + (A.y[i] - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
// le corps le plus proche du point, à moins de r mètres : le numéro de l'homme
function corpsSous(x, y, r) {
  let best = -1, bd = r * r;
  for (const c of B.etat.corps) {
    const d = (c[0] / 10 - x) ** 2 + (c[1] / 10 - y) ** 2;
    if (d < bd) { bd = d; best = c[4]; }
  }
  return best;
}
// un homme qui n'est plus dans la foule : tombé (et peut-être inhumé), ou évacué
const tombe = id => {
  const ev = B.etat.evacues.find(e => e[0] === id);
  if (ev) return `Évacué blessé le jour ${ev[1]}.`;
  const pr = B.etat.prisonniers?.find(e => e[0] === id);
  if (pr) return `Fait prisonnier la nuit du ${pr[1]}.`;
  const c = B.etat.corps.find(c => c[4] === id);
  if (c) return `Tombé le jour ${c[3]}.`;
  const t = B.etat.tombes.find(c => c[4] === id);
  if (t) return `Tombé le jour ${t[3]}, inhumé la nuit du ${t[5]}.`;
  const reg = quiEst(id).reg;
  return reg?.releve ? `Relevé avec son régiment, la nuit du ${reg.releve}.` : 'Mort.';
};
// ce que compte un régiment : vivants, blessés, morts
const refuseAujourdhui = reg => reg.refus === B.etat.jour && 'Refuse de monter aujourd\'hui';
function bilan(reg) {
  const A = B.armee;
  let blesses = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && A.blessure[i]) blesses++;
  const releves = reg.releves || 0, prisonniers = reg.prisonniers || 0, evacues = reg.initial - reg.effectif - reg.pertes - releves - prisonniers;
  return { vivants: reg.effectif, initial: reg.initial, blesses, morts: reg.pertes, evacues, releves, prisonniers };
}
const enMots = b => b.releves
  ? `relevé : ${b.releves} hommes sur ${b.initial} en sont revenus · ${b.morts} morts`
  : `${b.vivants} hommes sur ${b.initial} · ${b.blesses} blessés · ${b.morts} morts${b.evacues ? ` · ${b.evacues} évacués` : ''}${b.prisonniers ? ` · ${b.prisonniers} prisonniers` : ''}`;

function montrerFiche(i) {
  fiche = { id: B.armee.id[i], camp: B.armee.camp[i] };
  ouvrirFiche();
}
function montrerSoldat(id) { fiche = { id, camp: quiEst(id).reg?.camp ?? NOUS }; ouvrirFiche(); }
function montrerRegiment(regId) { fiche = { reg: regId }; ouvrirFiche(); }
function ouvrirFiche() { $('fiche').hidden = false; listeVue = ''; majFiche(); }
function fermerFiche() { fiche = null; $('fiche').hidden = true; $('repere-soldat').hidden = true; }

let listeVue = '';                // ce que montre la liste du régiment (refaite seulement quand ça change)
function majFiche() {
  if (!fiche || !B) return;
  if ('reg' in fiche) return majFicheRegiment();
  const A = B.armee, i = indiceDe(fiche.id), { reg: reg0, qui } = quiEst(fiche.id);
  $('fiche-nom').textContent = `${qui.prenom} ${qui.nom}`;
  $('fiche-qui').textContent = `${majuscule(qui.grade)}, ${qui.age} ans`;
  const lien = $('fiche-regiment');
  lien.hidden = !reg0; lien.textContent = nomDe(reg0); lien.onclick = () => montrerRegiment(reg0.id);
  $('fiche-liste').replaceChildren(); listeVue = '';
  const promu = B.etat.grades[fiche.id];
  const mots = [
    ...(i < 0 ? [tombe(fiche.id)] : [...etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]), experienceEnMots(A.exp[i])]),
    promu ? `promu ${qui.grade} le jour ${promu[1]}` : '',
  ].filter(Boolean);
  $('fiche-etat').replaceChildren(...mots.map(t => Object.assign(document.createElement('li'), { textContent: t })));
}
function majFicheRegiment() {
  const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(reg);
  $('fiche-nom').textContent = nomDe(reg);
  $('fiche-qui').textContent = enMots(b);
  $('fiche-regiment').hidden = true;
  $('fiche-etat').replaceChildren(...[majuscule(moralEnMots(reg, R)), refuseAujourdhui(reg)].filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  const sig = `${reg.id}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${Object.keys(B.etat.grades).length}`;
  if (sig === listeVue) return;
  listeVue = sig;
  // les officiers vivants, les blessés, les morts : chaque nom ouvre la fiche de l'homme
  const p0 = premierDe(reg.id), vivants = new Map();
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) vivants.set(A.id[i], i);
  const groupes = [['Officiers', []], ['Blessés', []], ['Morts', []], ['Évacués', []]];
  const evacues = new Set(B.etat.evacues.map(e => e[0]));
  for (let id = p0; id < p0 + reg.initial; id++) {
    const i = vivants.get(id);
    if (i === undefined) groupes[evacues.has(id) ? 3 : 2][1].push(id);
    else if (A.blessure[i]) groupes[1][1].push(id);
    else if (rangDe(B, id, reg.id) <= 3) groupes[0][1].push(id);   // les officiers et l'adjudant d'aujourd'hui (les promus compris)
  }
  groupes[0][1].sort((a, b) => rangDe(B, a, reg.id) - rangDe(B, b, reg.id));
  const els = [];
  for (const [titre, ids] of groupes) {
    if (!ids.length) continue;
    els.push(Object.assign(document.createElement('h3'), { textContent: `${titre} (${ids.length})` }));
    const ul = document.createElement('ul');
    for (const id of ids) {
      const { qui } = quiEst(id), li = document.createElement('li'), bt = document.createElement('button');
      bt.className = 'nom'; bt.textContent = `${qui.prenom} ${qui.nom}, ${qui.grade}`;
      bt.onclick = () => montrerSoldat(id);
      li.append(bt); ul.append(li);
    }
    els.push(ul);
  }
  $('fiche-liste').replaceChildren(...els);
}
$('fiche-fermer').onclick = fermerFiche;

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
  const p = $('terrain'), lignes = x === null ? null : terrainSous(B, x, y);
  if (!lignes) { p.hidden = true; return; }
  const cle = lignes.join('\n');
  if (p.dataset.cle !== cle) {
    p.dataset.cle = cle;
    p.replaceChildren(...lignes.map((t, k) => Object.assign(document.createElement('p'), { textContent: t, className: k ? 'discret' : '' })));
  }
  p.hidden = false;
}
function majBulle() {
  const bulle = $('bulle');
  if (!souris || !enJeu() || glisse || document.querySelector('dialog[open]')) { bulle.hidden = true; majTerrain(null); return; }
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  majTerrain(x, y);
  let lignes = null;
  if (dePres()) {
    const i = soldatSous(x, y, Math.max(0.8, prise(12)));
    if (i >= 0) {
      const A = B.armee, { reg, qui } = quiEst(A.id[i]);
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
    if (r >= 0) { const reg = B.etat.regiments[r]; lignes = [nomDe(reg), enMots(bilan(reg)), majuscule(moralEnMots(reg, R)), refuseAujourdhui(reg)].filter(Boolean); }
  }
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
      if (modeBarrage) { modeBarrage = null; majHud(); }
      else if (fiche) fermerFiche();
      else if (prefs.gauche && choisis.size) { choisis = new Set(); rendu.choisis = choisis; majHud(); }
      else pause();
    }
    else if (nom === 'pause') { pauseActive = !pauseActive; if (pauseActive) loop.pause(); else reprendre(); majHud(); }
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
createPointer($('canvas'), {
  threshold: 6,
  onTap: p => {
    if (!enJeu()) return;
    const [x, y] = rendu.versTerrain(p.x, p.y);
    // un clic sur un homme montre sa fiche (de jour comme de nuit, chez nous comme en face)
    // de près, sur un homme sa fiche ; de loin, sur un régiment la sienne
    if (p.button === 0 && !modeBarrage) {
      if (dePres()) {
        const i = soldatSous(x, y, Math.max(0.8, prise(12)));
        const mort = i < 0 ? corpsSous(x, y, Math.max(0.8, prise(10))) : -1;
        if (i >= 0) montrerFiche(i); else if (mort >= 0) montrerSoldat(mort); else fermerFiche();
      } else {
        const r = regimentSous(x, y, Math.max(4, prise(16)));
        if (r >= 0) montrerRegiment(r); else fermerFiche();
      }
    }
    if (B.etat.phase !== 'jour') return;
    if (p.button === 2) {
      if (modeBarrage) { modeBarrage = null; majHud(); return; }
      if (!choisis.size) return toast('Aucun régiment choisi.');
      if (dire(ordonnerMarche(B, [...choisis], x, y)).ok) { marque = { x, y, t: 2 }; sauvegarder(); }
    } else if (p.button === 0) {
      if (modeBarrage) {
        if (dire(ordonnerBarrage(B, modeBarrage, x, y)).ok) { marque = { x, y, t: 2 }; modeBarrage = null; sauvegarder(); }
      } else {
        const r = regimentSous(x, y, dePres() ? 4 : Math.max(4, prise(16)), NOUS);
        // tout au bouton gauche : un clic sur le sol (loin de nos régiments) fait marcher ceux qu'on a choisis
        if (prefs.gauche && r < 0 && choisis.size && !p.event.shiftKey) {
          fermerFiche();
          if (dire(ordonnerMarche(B, [...choisis], x, y)).ok) { marque = { x, y, t: 2 }; sauvegarder(); }
          return majHud();
        }
        if (!p.event.shiftKey) choisis = new Set();
        if (r >= 0) { if (choisis.has(r) && p.event.shiftKey) choisis.delete(r); else choisis.add(r); }
        rendu.choisis = choisis;
      }
    }
    majHud();
  },
  onDragStart: p => { glisse = { bouton: p.button, x0: p.startX, y0: p.startY, cx: rendu.vue.cx, cz: rendu.vue.cz, ddx: p.dx, ddy: p.dy }; },
  onDrag: p => {
    if (!glisse) return;
    if (glisse.bouton === 1) {
      // glisser avec la molette : déplacer la vue (le terrain suit la souris)
      const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;
      rendu.vue.cx = glisse.cx; rendu.vue.cz = glisse.cz;
      rendu.deplacerEcran(-p.dx * k, -p.dy * k);
      return;
    }
    if (glisse.bouton === 2) {
      // glisser avec le bouton droit : tourner (de gauche à droite) et incliner (de haut en bas) la caméra, un peu
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
    if (glisse?.bouton === 2) { prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage }; store.save('prefs', prefs); }
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
    for (const p of ev) {
      if (p.type === 'prise') toast(p.camp === NOUS ? 'Un tronçon pris.' : 'Un tronçon perdu.');
      else if (p.camp !== NOUS) continue;
      else if (p.type === 'deroute') toast(`${B.etat.regiments[p.reg].nom} est en déroute.`);
      else if (p.type === 'ralliement') toast(`${B.etat.regiments[p.reg].nom} se rallie.`);
      else if (p.type === 'poursuite') toast('En face poursuit : il monte sur la ligne suivante.');
      else if (p.type === 'promu' && p.rang === 0) { const { qui } = quiEst(p.id); toast(`${qui.prenom} ${qui.nom} prend le commandement de ${B.etat.regiments[p.reg].nom}.`); }
    }
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
      const tour = (keys.held('KeyE') ? 1 : 0) - (keys.held('KeyQ') ? 1 : 0), incl = (keys.held('KeyF') ? 1 : 0) - (keys.held('KeyR') ? 1 : 0);
      if (tour || incl) {
        rendu.tourner(tour * dt * 0.9, incl * dt * 0.5);
        prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage };
        clearTimeout(zoomer.t); zoomer.t = setTimeout(() => store.save('prefs', prefs), 400);
      }
    }
    if (marque) marque.t -= dt;
    rendu.dessiner(dt, evenements.splice(0));
    majEtiquettes();
    majBulle();
    if ((hudT -= dt) <= 0) { hudT = 0.25; majHud(); }
  },
});
const evenements = [];
let hudT = 0;
loop.start();
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
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.10.0');
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
            if ($('dialogue-nuit').open) $('dialogue-nuit').close(); else aube(B);
            if ($('dialogue-aube').open) $('dialogue-aube').close();
          }
          evenements.push(...avancer(B));
        }
        majHud();
        return horloge(B);
      },
      barrage: (cal, x, y, camp = 0) => ordonnerBarrage(B, cal, x + B.etat.marges.x, y + B.etat.marges.y, camp),
      marche: (ids, x, y) => ordonnerMarche(B, ids, x + B.etat.marges.x, y + B.etat.marges.y),
      zoom: z => { rendu.vue.zoom = z; },
      fiche: () => fiche && { ...fiche, nom: $('fiche-nom').textContent, qui: $('fiche-qui').textContent, etat: $('fiche-etat').textContent, liste: $('fiche-liste').textContent },
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
