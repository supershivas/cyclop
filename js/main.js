// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.1.0';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.1.0';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.1.0';
import { createGamepad } from './lib/gamepad.js?v=0.1.0';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.1.0';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.1.0';
import { ROLES } from './palette.js?v=0.1.0';
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, horloge, effectifs, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.1.0';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.1.0';
import { METEO } from './data/meteo.js?v=0.1.0';
import { creerRendu } from './rendu3d.js?v=0.1.0';
import { chargerContenu } from './design-store.js?v=0.1.0';

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
    prefs: { version: 1, debugWrites: false, defaults: { zoom: 2 } },
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
  choisis = new Set(); rendu.choisis = choisis;
  modeBarrage = null; pauseActive = false;
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
  const m = $('repere');
  if (marque && marque.t > 0) {
    const [sx, sy] = rendu.versEcran(marque.x, marque.y);
    m.hidden = false; m.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
  } else m.hidden = true;
}
let marque = null;

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
    if (nom === 'menu') { if (modeBarrage) { modeBarrage = null; majHud(); } else pause(); }
    else if (nom === 'pause') { pauseActive = !pauseActive; if (pauseActive) loop.pause(); else reprendre(); majHud(); }
    else if (nom === 'tout') choisirTout();
    else if (nom === 'plus') zoomer(1);
    else if (nom === 'moins') zoomer(-1);
    else if (nom[0] === 'b') viser(NOMS_CALIBRES[Number(nom[1]) - 1]);
  },
});
const pad = createGamepad({ actions: { menu: 'start', pause: 'select' }, onAction: nom => { if (nom === 'menu') pause(); } });
function zoomer(d, ancre) { rendu.zoomer(d, ancre); prefs.zoom = rendu.vue.zoom; store.save('prefs', prefs); }

// Le régiment le plus proche du point (les nôtres), à moins de 4 m
function regimentSous(x, y) {
  const A = B.armee;
  let best = -1, bd = 16;
  for (let i = 0; i < A.n; i++) {
    if (A.camp[i] !== NOUS) continue;
    const d = (A.x[i] - x) ** 2 + (A.y[i] - y) ** 2;
    if (d < bd) { bd = d; best = A.reg[i]; }
  }
  return best;
}
const cadre = $('cadre');
let glisse = null;
createPointer($('canvas'), {
  threshold: 6,
  onTap: p => {
    if (!enJeu() || B.etat.phase !== 'jour') return;
    const [x, y] = rendu.versTerrain(p.x, p.y);
    if (p.button === 2) {
      if (modeBarrage) { modeBarrage = null; majHud(); return; }
      if (!choisis.size) return toast('Aucun régiment choisi.');
      if (dire(ordonnerMarche(B, [...choisis], x, y)).ok) { marque = { x, y, t: 2 }; sauvegarder(); }
    } else if (p.button === 0) {
      if (modeBarrage) {
        if (dire(ordonnerBarrage(B, modeBarrage, x, y)).ok) { marque = { x, y, t: 2 }; modeBarrage = null; sauvegarder(); }
      } else {
        const r = regimentSous(x, y);
        if (!p.event.shiftKey) choisis = new Set();
        if (r >= 0) { if (choisis.has(r) && p.event.shiftKey) choisis.delete(r); else choisis.add(r); }
        rendu.choisis = choisis;
      }
    }
    majHud();
  },
  onDragStart: p => { glisse = { bouton: p.button, x0: p.startX, y0: p.startY, cx: rendu.vue.cx, cz: rendu.vue.cz }; },
  onDrag: p => {
    if (!glisse) return;
    if (glisse.bouton === 1 || glisse.bouton === 2) {
      // glisser avec la molette (ou le bouton droit) : déplacer la vue
      const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;
      rendu.vue.cx = glisse.cx - p.dx * k; rendu.vue.cz = glisse.cz - p.dy * k;
      return;
    }
    const x = Math.min(p.startX, p.x), y = Math.min(p.startY, p.y);
    Object.assign(cadre.style, { left: `${x}px`, top: `${y}px`, width: `${Math.abs(p.dx)}px`, height: `${Math.abs(p.dy)}px` });
    cadre.hidden = false;
  },
  onDragEnd: p => {
    cadre.hidden = true;
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
      if (ax || ay) rendu.deplacer(ax * dt * 260 / rendu.ppm, ay * dt * 260 / rendu.ppm);
    }
    if (marque) marque.t -= dt;
    rendu.dessiner(dt, evenements.splice(0));
    majEtiquettes();
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
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.1.0');
  window.__seed = seedFromUrl() ?? undefined;
  installDebug({
    state: () => B && { ...horloge(B), effectifs: effectifs(B), pertes: B.etat.pertes, impacts: B.etat.impacts.length, enJeu: enJeu(), pause: loop.paused },
    places: { centre: { x: 200, y: 150 }, nous: { x: 200, y: 230 }, eux: { x: 200, y: 70 } },
    teleport: ({ x, y }) => { rendu.vue.cx = x; rendu.vue.cz = y; },
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
      barrage: (cal, x, y, camp = 0) => ordonnerBarrage(B, cal, x, y, camp),
      marche: (ids, x, y) => ordonnerMarche(B, ids, x, y),
      zoom: z => { rendu.vue.zoom = z; },
      bataille: () => B,
      rendu: () => rendu,
      CALIBRES,
    },
  });
}

montrerTitre();
