// Le sujet « Le son » du labo (Jérôme, v0.76.0 : « ajoute la section Son au labo », conventions section 14 : le labo fait entendre chaque son).
// Ce que le jeu fait entendre (js/audio.js, `creerSon`), joué ici par le même module : un bouton par effet, un mélangeur de l'ambiance, un auditeur qu'on déplace.
// Le dessin n'y est pour rien : de simples boutons de papier. Le son se déverrouille au premier clic (les navigateurs refusent avant).
import { creerSon, TRACKS } from './audio.js?v=0.93.0';
import { PALETTE as P } from './palette.js?v=0.93.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:12px/1.4 ui-monospace,monospace;';
const CADRE = `${MONO}color:${P.o};padding:12px;display:grid;gap:12px;align-content:start;max-width:720px;`;
const BOUTON = `${MONO}padding:8px 12px;min-height:44px;background:${P.b};color:${P.o};border:1px solid ${P.g};cursor:pointer;`;

function base(stage, titre) {
  const son = creerSon({});
  const racine = el('div', CADRE);
  racine.append(el('div', `${MONO}color:${P.g};`, titre));
  stage.replaceChildren(racine);
  racine.addEventListener('pointerdown', () => son.debloquer(), true);
  const bouton = (texte, f, actif = null) => { const b = el('button', BOUTON, texte); b.type = 'button'; b.onclick = () => { son.debloquer(); f(b); if (actif) b.style.background = actif() ? P.g : P.b; }; return b; };
  const curseur = (nom, min, max, v, f, pas = 1) => {
    const lab = el('label', `${MONO}display:grid;grid-template-columns:16ch 1fr 6ch;gap:8px;align-items:center;`);
    const sortie = el('span', '', String(v)), c = el('input'); Object.assign(c, { type: 'range', min, max, step: pas, value: v });
    c.oninput = () => { sortie.textContent = c.value; f(+c.value); };
    lab.append(nom, c, sortie); return lab;
  };
  const grille = (...b) => el('div', 'display:flex;flex-wrap:wrap;gap:8px;', ...b);
  return { son, racine, bouton, curseur, grille, ecoute: { x: 0, y: 0, rayon: 100 }, fin: [] };
}
const fermer = m => () => { m.fin.forEach(f => f()); m.son.fermer(); };

// A · les effets : un bouton par son d'événement, à trois distances
export function maquetteEffets(stage) {
  const m = base(stage, 'Chaque effet que le jeu joue, tel quel. « Loin » le place à 300 m à gauche de l\'auditeur (plus faible, côté gauche).');
  let loin = false;
  const ev = e => () => m.son.evenement({ x: loin ? -300 : 0, y: 0, ...e }, m.ecoute);
  m.racine.append(
    el('div', `${MONO}color:${P.g};`, 'Obus'),
    m.grille(m.bouton('75', ev({ type: 'impact', cal: '75' })), m.bouton('155', ev({ type: 'impact', cal: '155' })), m.bouton('220', ev({ type: 'impact', cal: '220' })),
      m.bouton('Salve de 24 × 75', () => { for (let k = 0; k < 24; k++) setTimeout(ev({ type: 'impact', cal: '75', x: (k % 6) * 6 - 15 }), k * 120); })),
    el('div', `${MONO}color:${P.g};`, 'Engins et ouvrages'),
    m.grille(m.bouton('Avion abattu', ev({ type: 'avion-abattu' })), m.bouton('Avion écrasé', ev({ type: 'avion-ecrase' })), m.bouton('Char détruit', ev({ type: 'char-detruit' })),
      m.bouton('Pont coupé', ev({ type: 'pont-coupe' })), m.bouton('Pont rompu', ev({ type: 'pont-rompu' }))),
    el('div', `${MONO}color:${P.g};`, 'La bataille et l\'interface'),
    m.grille(m.bouton('Tronçon pris (le cor)', ev({ type: 'prise' })), m.bouton('Nuit', ev({ type: 'nuit' })),
      m.bouton('Ordre refusé', () => m.son.interface_('refus')), m.bouton('Ordre donné', () => m.son.interface_('ordre')), m.bouton('Prêt', () => m.son.interface_('pret'))),
    m.grille(m.bouton('Loin : non', b => { loin = !loin; b.textContent = `Loin : ${loin ? 'oui' : 'non'}`; }, () => loin)),
    m.curseur('Effets', 0, 100, 70, v => m.son.volume('effets', v / 100)),
  );
  return fermer(m);
}

// B · l'ambiance : les sons en continu et la musique, mélangés à la main
export function maquetteAmbiance(stage) {
  const m = base(stage, 'Les sons qui ne s\'arrêtent pas : le vent, la pluie, la fusillade, les moteurs, la musique (les morceaux de Kingvi). Chaque case les allume comme le fait l\'état du jeu.');
  const e = { fusillade: 0, meteo: 'sec', nuit: false, char: false, avion: false, dist: 60 };
  const METEOS = { sec: {}, pluie: { pluie: 1 }, neige: { neige: 1 }, tempete: { neige: 1, tempete: 1 } };
  const tirs = n => { const t = new Float32Array(n * 6); for (let i = 0; i < n; i++) { t[i * 6] = (Math.random() - 0.5) * 160; t[i * 6 + 1] = (Math.random() - 0.5) * 60; } return t; };   // (le labo : le hasard n'y touche aucune partie)
  const t0 = performance.now();
  let der = t0;
  const boucle = setInterval(() => {
    const maintenant = performance.now(), dt = (maintenant - der) / 1000; der = maintenant;
    m.son.image(dt, {
      tirs: e.fusillade ? tirs(e.fusillade) : null, ecoute: m.ecoute, meteo: METEOS[e.meteo], nuit: e.nuit,
      chars: e.char ? [{ etat: 'avance', x: e.dist, y: 0 }] : [], avions: e.avion ? [{ etat: 'vol', x: -e.dist, y: 0, h: 12 }] : [],
    });
  }, 33);
  m.fin.push(() => clearInterval(boucle));
  const meteo = m.bouton('Temps : sec', b => { const k = Object.keys(METEOS); e.meteo = k[(k.indexOf(e.meteo) + 1) % k.length]; b.textContent = `Temps : ${e.meteo}`; });
  m.racine.append(
    m.grille(meteo, m.bouton('Nuit : non', b => { e.nuit = !e.nuit; b.textContent = `Nuit : ${e.nuit ? 'oui' : 'non'}`; }, () => e.nuit),
      m.bouton('Char : non', b => { e.char = !e.char; b.textContent = `Char : ${e.char ? 'oui' : 'non'}`; }, () => e.char),
      m.bouton('Avion : non', b => { e.avion = !e.avion; b.textContent = `Avion : ${e.avion ? 'oui' : 'non'}`; }, () => e.avion)),
    m.curseur('Fusillade (tirs/image)', 0, 80, 0, v => { e.fusillade = v; }),
    m.curseur('Distance des engins (m)', 0, 400, 60, v => { e.dist = v; }),
    m.curseur('Effets', 0, 100, 70, v => m.son.volume('effets', v / 100)),
    m.curseur('Musique', 0, 100, 50, v => m.son.volume('musique', v / 100)),
    el('div', `${MONO}color:${P.g};`, 'La musique de Kingvi (assets/music/) : un morceau choisi, ou la playlist qui suit l\'humeur du champ (calme, combat, nuit, aube)'),
    m.grille(...Object.entries(TRACKS).map(([id, t]) => m.bouton(`${t.nom} · ${t.humeur}`, () => m.son.piste(id))), m.bouton('Playlist', () => m.son.piste(null))),
  );
  return fermer(m);
}

// C · l'auditeur : un obus qu'on place autour de soi, pour entendre la distance et le côté
export function maquetteEspace(stage) {
  const m = base(stage, 'Où l\'on entend : un obus de 155 tombe à la distance et du côté qu\'on choisit ; l\'auditeur est au centre de la vue (largeur visible : le curseur « portée »).');
  const e = { x: 0, y: 0 };
  const carte = el('div', `position:relative;width:360px;height:240px;background:${P.s};border:1px solid ${P.g};`);
  const moi = el('div', `position:absolute;left:174px;top:114px;width:12px;height:12px;background:${P.n};`);
  const but = el('div', `position:absolute;width:12px;height:12px;background:${P.x};left:174px;top:114px;`);
  carte.append(moi, but);
  carte.onpointerdown = ev => {
    m.son.debloquer();
    const r = carte.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    e.x = (px - 180) / 180 * 400; e.y = (py - 120) / 120 * 300;     // 400 m de demi-largeur, 300 m de demi-hauteur
    but.style.left = `${px - 6}px`; but.style.top = `${py - 6}px`;
    m.son.evenement({ type: 'impact', cal: '155', x: e.x, y: e.y }, m.ecoute);
  };
  m.racine.append(carte, m.curseur('Portée (m)', 60, 640, 100, v => { m.ecoute.rayon = v; }), m.curseur('Effets', 0, 100, 70, v => m.son.volume('effets', v / 100)));
  return fermer(m);
}
