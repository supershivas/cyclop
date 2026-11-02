// Le sujet « Les cartes de secteur » du labo (Jérôme, retour du 2 nov. : « les cartes de secteur qui glissent sur une table : une liste des secteurs à gauche ; au clic, la carte du secteur, son titre,
// ses options, sa description glisse sur le dessus de la pile »). Une maquette, rien n'est dans le jeu : les vrais secteurs, niveaux et durées (`data/`), la palette du jeu seulement, aucune couleur de plus.
// Le geste est celui du papier posé sur une table (DESIGN.md : la catastrophe peinte avec calme) : la carte choisie glisse et se pose en travers, un peu de biais, sur celles déjà là ; celles du dessous
// ne montrent plus que leur onglet. `prefers-reduced-motion` : la carte est posée d'un coup, rien ne glisse.
import { PALETTE as P } from './palette.js?v=0.105.1';
import { SECTEURS } from './data/secteur.js?v=0.105.1';
import { DIFFICULTES, DIFFICULTE_DEFAUT, DUREES, DUREE_DEFAUT } from './data/difficulte.js?v=0.105.1';
import { SAISONS, SAISON_DEFAUT } from './data/meteo.js?v=0.105.1';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;';
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const COUPE = (profil, w, h) => {      // la coupe nord-sud du sol, en aplat (0 bas, 1 haut)
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.style.cssText = `display:block;width:100%;height:${h}px`;
  const pas = w / (profil.length - 1), pts = profil.map((v, i) => `${(i * pas).toFixed(1)},${(h - 6 - v * (h - 16)).toFixed(1)}`);
  s.innerHTML = `<rect width="${w}" height="${h}" fill="${P.r}"/><polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="${P.g}"/><polyline points="${pts.join(' ')}" fill="none" stroke="${P.t}" stroke-width="2"/>`;
  return s;
};
const hash = id => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

const SAISONS_CHOIX = ['ete', 'automne', 'hiver'];
// la liste : les secteurs du jeu, puis le hasard (comme l'écran de choix)
const SECTEURS_LISTE = () => [...Object.entries(SECTEURS).map(([id, S]) => ({ id, nom: S.nom, resume: S.resume, profil: S.profil, saison: S.saison ?? SAISON_DEFAUT })),
  { id: 'hasard', nom: 'Au hasard', resume: 'Un secteur tiré de la graine : il change à chaque clic, le terrain, la saison, les noms.', profil: [0.4, 0.55, 0.3, 0.7, 0.45, 0.5, 0.35, 0.6, 0.4, 0.5, 0.3, 0.45], saison: SAISON_DEFAUT, hasard: true }];

// `geste` : 'glisse' (la carte vient de la liste, de la gauche) ou 'tire' (elle est tirée de la pile, sort de côté, revient dessus)
export function cartesSecteur(stage, { geste = 'glisse' } = {}) {
  const secteurs = SECTEURS_LISTE();
  const L = 430, H = 436, DECALAGE = 25, VISIBLES = 4;           // la carte (px), la hauteur d'un onglet, le nombre d'onglets montrés
  const etat = {};                                               // ce que le joueur a réglé sur chaque carte
  for (const S of secteurs) etat[S.id] = { saison: S.saison, niveau: DIFFICULTE_DEFAUT, duree: DUREE_DEFAUT };
  let pile = secteurs.map(S => S.id).reverse();                 // du dessous au dessus : le premier de la liste est dessus au départ
  const racine = el('div', `display:flex;gap:16px;align-items:stretch;flex-wrap:wrap;${MONO}color:${P.o}`);
  const liste = el('div', 'display:grid;gap:8px;align-content:start;width:230px;flex:none');
  const table = el('div', `position:relative;flex:1 1 ${L + 60}px;min-width:${L + 40}px;height:${H + DECALAGE * VISIBLES + 70}px;overflow:hidden;background:${P.s};border:1px solid ${P.b};background-image:repeating-linear-gradient(0deg,transparent 0 23px,${P.b} 23px 24px)`);
  racine.append(liste, table);

  const cartes = {}, boutons = {};
  const pose = id => {                                           // où repose une carte, selon sa place dans la pile : [dx, dy, degrés]
    const k = pile.length - 1 - pile.indexOf(id), h = hash(id);
    const biais = ((h % 1000) / 1000 - 0.5) * 5, glisse = (((h >> 10) % 1000) / 1000 - 0.5) * 22;
    return k === 0 ? [glisse * 0.3, 0, biais * 0.25] : [glisse, -Math.min(k, VISIBLES) * DECALAGE, biais];
  };
  const transform = id => { const [x, y, r] = pose(id); return `translate(${x.toFixed(1)}px,${y}px) rotate(${r.toFixed(2)}deg)`; };

  const pastilles = (groupe, valeurs, actuel, f) => {
    const rang = el('div', 'display:flex;gap:6px;flex-wrap:wrap');
    const marquer = v => { for (const b of rang.children) { const oui = b.dataset.v === v; b.setAttribute('aria-pressed', String(oui)); b.style.cssText = pastilleCss(oui); } };
    for (const [v, nom] of valeurs) { const b = Object.assign(el('button', pastilleCss(v === actuel)), { type: 'button', textContent: nom, onclick: () => { marquer(v); f(v); } }); b.dataset.v = v; b.setAttribute('aria-pressed', String(v === actuel)); rang.append(b); }
    return el('div', 'display:grid;grid-template-columns:62px 1fr;align-items:center;gap:8px', el('span', `color:${P.g};font-size:12px;letter-spacing:.08em;text-transform:uppercase`, groupe), rang);
  };
  const pastilleCss = oui => `${MONO}font-size:12px;letter-spacing:.06em;text-transform:uppercase;height:26px;padding:0 9px;cursor:pointer;border:2px solid ${oui ? P.t : P.g};background:${oui ? P.t : 'transparent'};color:${oui ? P.o : P.t}`;

  const fabriquer = S => {
    const carte = el('div', `position:absolute;left:50%;top:${DECALAGE * VISIBLES + 24}px;width:${L}px;height:${H}px;margin-left:${-L / 2}px;background:${P.o};color:${P.t};box-shadow:3px 3px 0 ${P.t};transition:transform .4s cubic-bezier(.2,.8,.2,1);will-change:transform;overflow:hidden`);
    const e = etat[S.id];
    const desc = el('div', `margin-left:70px;padding-left:10px;border-left:2px solid ${P.g};font-size:12px;line-height:1.4;height:2.8em;overflow:hidden`, DIFFICULTES[e.niveau].desc);
    carte.append(
      el('div', `background:${P.b};color:${P.o};padding:5px 14px 8px;font-size:15px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:baseline`, S.nom, S.hasard ? '' : el('span', `font-size:11px;color:${P.r}`, (() => { const m = Math.round((Math.max(...S.profil) - Math.min(...S.profil)) * 16); return m < 2 ? 'terrain plat' : `${m} m de relief`; })())),
      COUPE(S.profil, L, 56),
      el('div', 'padding:10px 14px 0;display:grid;gap:8px',
        el('p', 'margin:0;height:5.6em;overflow:hidden;line-height:1.4;font-size:12px', S.resume),
        pastilles('Saison', [...SAISONS_CHOIX.map(id => [id, SAISONS[id].nom]), ['hasard', 'Hasard']], e.saison, v => { e.saison = v; }),
        pastilles('Niveau', Object.entries(DIFFICULTES).map(([id, D]) => [id, D.nom.split(' ').pop()]), e.niveau, v => { e.niveau = v; desc.textContent = DIFFICULTES[v].desc; }),
        desc,
        pastilles('Durée', Object.entries(DUREES).map(([id, D]) => [id, D.nom]), e.duree, v => { e.duree = v; }),
        el('div', 'justify-self:end;margin-top:4px', Object.assign(el('button', `${MONO}height:34px;padding:0 16px;cursor:pointer;color:${P.o};background:${P.t};border:0;box-shadow:0 3px 0 ${P.b}`), { type: 'button', textContent: 'Jouer ce secteur' }))));
    return carte;
  };

  const ranger = () => {                                         // la pile telle qu'elle est : z, pose, onglets lisibles
    pile.forEach((id, i) => { const c = cartes[id]; c.style.zIndex = String(i + 1); c.style.transform = transform(id); c.style.filter = i === pile.length - 1 ? '' : 'brightness(.82)'; c.style.pointerEvents = i === pile.length - 1 ? '' : 'none'; });
    for (const S of secteurs) boutons[S.id].setAttribute('aria-pressed', String(S.id === pile[pile.length - 1]));
  };

  const choisir = id => {
    const c = cartes[id], haut = pile[pile.length - 1];
    if (id === haut && !secteurs.find(S => S.id === id).hasard) return;
    const depart = id === haut ? [0, 0, 0] : pose(id);          // la carte part d'où elle repose (le hasard rejoue le geste sur place)
    pile = pile.filter(x => x !== id); pile.push(id);
    ranger();
    if (reduit()) return;
    const arrivee = pose(id), tf = (x, y, r) => `translate(${x}px,${y}px) rotate(${r}deg)`;
    c.style.transition = 'none';
    const images = geste === 'glisse'
      ? [{ transform: tf(-L - 120, 30, -9), opacity: 0.2 }, { transform: tf(arrivee[0] + 14, arrivee[1] + 2, arrivee[2] + 1.4), opacity: 1, offset: 0.8 }, { transform: tf(arrivee[0], arrivee[1], arrivee[2]), opacity: 1 }]
      : [{ transform: tf(depart[0], depart[1], depart[2]) }, { transform: tf(L * 0.62, depart[1] + 10, 7), offset: 0.38, easing: 'cubic-bezier(.4,0,.2,1)' }, { transform: tf(arrivee[0] - 6, arrivee[1] + 3, arrivee[2] - 1.2), offset: 0.82 }, { transform: tf(arrivee[0], arrivee[1], arrivee[2]) }];
    const a = c.animate(images, { duration: geste === 'glisse' ? 560 : 780, easing: geste === 'glisse' ? 'cubic-bezier(.16,.84,.3,1)' : 'ease-out', fill: 'none' });
    a.finished.catch(() => {}).finally(() => { c.style.transition = ''; });
  };

  for (const S of secteurs) {
    cartes[S.id] = fabriquer(S); table.append(cartes[S.id]);
    boutons[S.id] = Object.assign(el('button', `${MONO}font-size:15px;letter-spacing:.06em;text-transform:uppercase;text-align:left;padding:10px 12px;cursor:pointer;color:${P.t};background:${S.hasard ? P.g : P.o};border:2px solid ${P.o}`), { type: 'button', textContent: S.nom, onclick: () => choisir(S.id) });
    boutons[S.id].dataset.id = S.id;
    liste.append(boutons[S.id]);
  }
  // l'aria-pressed se lit sur la bordure (bleu horizon : « nous »)
  new MutationObserver(() => { for (const S of secteurs) boutons[S.id].style.borderColor = boutons[S.id].getAttribute('aria-pressed') === 'true' ? P.n : P.o; }).observe(liste, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  ranger();
  stage.append(racine);
}
