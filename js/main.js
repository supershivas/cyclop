// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.3.3';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.3.3';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.3.3';
import { createGamepad } from './lib/gamepad.js?v=0.3.3';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.3.3';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.3.3';
import { ROLES } from './palette.js?v=0.3.3';
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, horloge, effectifs, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.3.3';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.3.3';
import { METEO } from './data/meteo.js?v=0.3.3';
import { creerRendu } from './rendu3d.js?v=0.3.3';
import { identite, etatEnMots } from './identite.js?v=0.3.3';
import { chargerContenu } from './design-store.js?v=0.3.3';

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
function montrerTitre() {
  loop.pause();
  $('titre').hidden = false;
  $('hud').hidden = true;
  $('continuer').hidden = !store.has('partie');
  ($('continuer').hidden ? $('nouvelle') : $('continuer')).focus();
}
function jouer(bataille) {
  B = bataille;
  rendu.attacher(B);
  rendu.vue.zoom = prefs.zoom ?? 2;
  if (prefs.camera?.tangage) rendu.placerCamera(prefs.camera.yaw, prefs.camera.tangage);   // (un réglage de la v0.2, sans tangage, est ignoré)
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
$('nouvelle').onclick = () => {
  const graine = window.__seed ?? Date.now() % 100000;      // la graine elle-même peut venir de l'horloge
  if (!store.has('partie')) return jouer(nouvelle(graine));
  const d = $('dialogue-confirmer');
  d.onclose = () => { if (d.returnValue === 'oui') jouer(nouvelle(graine)); };
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
function montrerNuit() {
  loop.pause(); sauvegarder();
  const e = B.etat, j = e.jour, [nous, eux] = e.pertesJour[j - 1];
  $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
  $('nuit-pertes').textContent = `Morts du jour : ${nous} des nôtres, ${eux} en face.`;
  $('nuit-demain').textContent = `Demain : ${METEO[e.previsions[j - 1]]?.prevision || '—'}.`;
  $('dialogue-nuit').showModal();
}
$('aube').onclick = () => { $('dialogue-nuit').close(); };
$('dialogue-nuit').addEventListener('close', () => { if (B?.etat.phase === 'nuit') { aube(B); sauvegarder(); majHud(); } reprendre(); });
function montrerFin() {
  loop.pause(); sauvegarder();
  const e = B.etat, [vNous, vEux] = effectifs(B);
  $('fin-titre').textContent = `${e.meteo.length} jours.`;
  $('fin-pertes').textContent = `${e.pertes[0]} des nôtres sont morts, ${e.pertes[1]} en face. Il en reste ${vNous} et ${vEux}.`;
  $('dialogue-fin').showModal();
}
$('fin-nouvelle').onclick = () => { $('dialogue-fin').close(); store.clear('partie'); jouer(nouvelle(window.__seed ?? Date.now() % 100000)); };
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
  $('morts-nous').textContent = e.pertes[0];
  $('morts-eux').textContent = e.pertes[1];
  $('blesses-nous').textContent = e.blesses[0];
  $('blesses-eux').textContent = e.blesses[1];
  majFiche();
  $('pause-active').hidden = !pauseActive;
  for (const b of $('batteries').children) {
    const cal = b.dataset.cal, reste = Math.ceil(e.batteries[cal] - e.temps);
    b.querySelector('span').textContent = reste > 0 ? `${reste} s` : 'prête';
    b.classList.toggle('vise', modeBarrage === cal);
    b.classList.toggle('recharge', reste > 0);
  }
  const regs = [...choisis].map(id => e.regiments[id]).filter(Boolean);
  $('choix').textContent = regs.length ? regs.map(r => `${r.nom} ${r.effectif}`).join(' · ') : '';
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
    if (id < p + r.initial) return { reg: r, qui: identite(B.etat.graine, r.camp, id, id - p, r.initial) };
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
const tombe = id => { const c = B.etat.corps.find(c => c[4] === id); return c ? `Tombé le jour ${c[3]}.` : 'Mort.'; };
// ce que compte un régiment : vivants, blessés, morts
function bilan(reg) {
  const A = B.armee;
  let blesses = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && A.blessure[i]) blesses++;
  return { vivants: reg.effectif, initial: reg.initial, blesses, morts: reg.pertes };
}
const enMots = b => `${b.vivants} hommes sur ${b.initial} · ${b.blesses} blessés · ${b.morts} morts`;

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
  const mots = i < 0 ? [tombe(fiche.id)] : etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]);
  $('fiche-etat').replaceChildren(...mots.map(t => Object.assign(document.createElement('li'), { textContent: t })));
}
function majFicheRegiment() {
  const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(reg);
  $('fiche-nom').textContent = nomDe(reg);
  $('fiche-qui').textContent = enMots(b);
  $('fiche-regiment').hidden = true;
  $('fiche-etat').replaceChildren();
  const sig = `${reg.id}:${b.vivants}:${b.blesses}:${b.morts}`;
  if (sig === listeVue) return;
  listeVue = sig;
  // les officiers vivants, les blessés, les morts : chaque nom ouvre la fiche de l'homme
  const p0 = premierDe(reg.id), vivants = new Map();
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) vivants.set(A.id[i], i);
  const groupes = [['Officiers', []], ['Blessés', []], ['Morts', []]];
  for (let id = p0; id < p0 + reg.initial; id++) {
    const i = vivants.get(id), k = id - p0;
    if (i === undefined) groupes[2][1].push(id);
    else if (A.blessure[i]) groupes[1][1].push(id);
    else if (k <= 3) groupes[0][1].push(id);
  }
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
function majBulle() {
  const bulle = $('bulle');
  if (!souris || !enJeu() || glisse || document.querySelector('dialog[open]')) { bulle.hidden = true; return; }
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  let lignes = null;
  if (dePres()) {
    const i = soldatSous(x, y, Math.max(0.8, prise(12)));
    if (i >= 0) {
      const A = B.armee, { reg, qui } = quiEst(A.id[i]);
      lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`,
        etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]).join(', ')];
    } else {
      const mort = corpsSous(x, y, Math.max(0.8, prise(10)));
      if (mort >= 0) {
        const { reg, qui } = quiEst(mort);
        lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`, tombe(mort)];
      }
    }
  } else {
    const r = regimentSous(x, y, Math.max(4, prise(16)));
    if (r >= 0) { const reg = B.etat.regiments[r]; lignes = [nomDe(reg), enMots(bilan(reg))]; }
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
    if (ev.some(e => e.type === 'nuit')) { montrerNuit(); }
    if (ev.some(e => e.type === 'fin')) { montrerFin(); }
  },
  render() {
    const now = performance.now(), dt = Math.min(0.1, (now - derniere) / 1000);
    derniere = now;
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
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.3.3');
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
      bataille: () => B,
      rendu: () => rendu,
      CALIBRES,
    },
  });
}

montrerTitre();
