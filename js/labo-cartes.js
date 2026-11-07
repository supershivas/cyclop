// Le sujet « Les cartes de secteur » du labo (Jérôme, retour du 2 nov. : « les cartes de secteur qui glissent sur une table : une liste des secteurs à gauche ; au clic, la carte du secteur, son titre,
// ses options, sa description glisse sur le dessus de la pile » ; puis « on ne voit pas la vraie map », « un rendu plus papier, carte usée, texturée »). Une maquette, rien n'est dans le jeu : les vrais
// secteurs, niveaux et durées (`data/`), la palette du jeu seulement (le papier est de l'os, la tache de la glaise, le grain de la terre, en transparence : aucune couleur de plus).
// La vraie carte : le moteur du jeu (`apercu-3d.js`) rend chaque secteur UNE fois, vu de haut, hors de l'écran ; l'image est collée sur la carte (un moteur WebGL pour six cartes, pas six).
// Le papier : bords irréguliers (un filtre de déplacement), grain, taches, deux plis, coins sombres, adhésif ; la table est une toile. Le geste : la carte choisie glisse et se pose en travers, de biais,
// sur celles déjà là (les autres ne montrent que leur onglet). `prefers-reduced-motion` : la carte est posée d'un coup, rien ne glisse.
import { PALETTE as P } from './palette.js?v=0.119.0';
import { SECTEURS } from './data/secteur.js?v=0.119.0';
import { DIFFICULTES, DIFFICULTE_DEFAUT, DUREES, DUREE_DEFAUT } from './data/difficulte.js?v=0.119.0';
import { SAISONS, SAISON_DEFAUT } from './data/meteo.js?v=0.119.0';
import { preparerAleatoire, ID_ALEATOIRE } from './generateur.js?v=0.119.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;';
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const hash = id => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const graineFixe = id => hash(id) % 99999 + 1;          // la même formule que l'écran de choix : une carte du jeu est la même partout
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
const [TERRE, GLAISE, OS, BRUME] = [P.t, P.g, P.o, P.r].map(rgb);

// les textures : du bruit de papier (SVG), en transparence, aux couleurs de la palette
const bruit = (freq, octaves, couleur, alpha, taille = 240) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${taille}' height='${taille}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${couleur[0]} 0 0 0 0 ${couleur[1]} 0 0 0 0 ${couleur[2]} 0 0 0 ${alpha[0]} ${alpha[1]}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
const GRAIN_LEGER = bruit(0.85, 3, [0.086, 0.075, 0.059], [0.55, -0.1]);       // le même, deux fois plus léger (les boutons)
const GRAIN = bruit(0.85, 3, [0.086, 0.075, 0.059], [1.1, -0.3]);               // le grain fin (terre)
const TACHES = bruit(0.011, 3, [0.455, 0.4, 0.31], [2.2, -0.75], 520);           // les rousseurs, grandes taches (glaise)
const FIBRES = bruit('0.02 0.6', 2, [0.455, 0.4, 0.31], [1.2, -0.45], 300);      // les fibres du papier : étirées
const TOILE = `repeating-linear-gradient(0deg,rgba(${GLAISE},.10) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(${GLAISE},.08) 0 1px,transparent 1px 4px)`;

const SAISONS_CHOIX = ['ete', 'automne', 'hiver'];
const SUJET = id => SECTEURS[id];

// `geste` : 'glisse' (la carte vient de la liste, de la gauche) ou 'tire' (elle est tirée de la pile, sort de côté, revient dessus) ; `R` : les réglages du jeu (le moteur de l'aperçu en a besoin)
export function cartesSecteur(stage, { geste = 'glisse', R } = {}) {
  let grainesHasard = Math.floor(Math.random() * 99999) + 1;
  preparerAleatoire(grainesHasard);
  const ids = Object.keys(SECTEURS).sort((a, b) => (a === ID_ALEATOIRE) - (b === ID_ALEATOIRE));
  const L = 430, IMG = 196, H = 604, DECALAGE = 25, VISIBLES = 4;      // la carte (px), la hauteur de l'image, la hauteur d'un onglet, le nombre d'onglets montrés
  const etat = {};                                                      // ce que le joueur a réglé sur chaque carte
  for (const id of ids) etat[id] = { saison: SUJET(id).saison ?? SAISON_DEFAUT, niveau: DIFFICULTE_DEFAUT, duree: DUREE_DEFAUT };
  let pile = [...ids].reverse();                                       // du dessous au dessus : le premier de la liste est dessus au départ
  const racine = el('div', `display:flex;gap:16px;align-items:stretch;flex-wrap:wrap;${MONO}color:${P.o}`);
  const liste = el('div', 'display:grid;gap:8px;align-content:start;width:230px;flex:none');
  const table = el('div', `position:relative;flex:1 1 ${L + 60}px;min-width:${L + 40}px;height:${H + DECALAGE * VISIBLES + 60}px;overflow:hidden;background:${P.s};border:1px solid ${P.b};background-image:${TOILE},${GRAIN},radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(${TERRE},.55))`);
  // le filtre des bords : un papier ne coupe pas droit
  const defs = document.createElementNS(NS, 'svg'); defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.style.cssText = 'position:absolute';
  defs.innerHTML = `<filter id="cy-usure" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="3" seed="5" result="b"/><feDisplacementMap in="SourceGraphic" in2="b" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="9" result="f"/><feDisplacementMap in="d" in2="f" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  racine.append(defs, liste, table);

  // ─ la vraie carte : le moteur du jeu, une fois, hors de l'écran ; une file, pour ne rendre qu'un secteur à la fois ─
  let vue = null, file = Promise.resolve();
  const instantane = (id, S, graine, saison) => { const p = file.then(async () => {
    if (!vue) {
      const { creerVue3D } = await import('./apercu-3d.js?v=0.119.0');
      const hote = el('div', `position:fixed;left:-9999px;top:0;width:${L - 28}px;height:${IMG}px;overflow:hidden`); document.body.append(hote);
      vue = { api: await creerVue3D({ R, hote }), hote };
    }
    vue.api.monter(id, S, graine, { soldats: false, cadrer: true, saison });
    return vue.hote.querySelector('canvas').toDataURL('image/png');
  }); file = p.catch(() => {}); return p; };

  const cartes = {}, boutons = {}, images = {};
  const graineDe = id => id === ID_ALEATOIRE ? grainesHasard : graineFixe(id);
  const peindre = id => {                                               // l'image de la carte : la vraie, quand elle est prête (la coupe du sol d'ici là n'existe plus : un aplat de papier)
    const img = images[id], e = etat[id];
    img.style.opacity = '.55';
    instantane(id, SUJET(id), graineDe(id), e.saison === 'hasard' ? SAISONS_CHOIX[Math.floor(Math.random() * 3)] : e.saison)
      .then(url => { img.src = url; img.style.opacity = ''; }).catch(err => { console.warn('Aperçu 3D indisponible', err); });
  };

  const pose = id => {                                                  // où repose une carte, selon sa place dans la pile : [dx, dy, degrés]
    const k = pile.length - 1 - pile.indexOf(id), h = hash(id);
    const biais = ((h % 1000) / 1000 - 0.5) * 5, glisse = (((h >> 10) % 1000) / 1000 - 0.5) * 22;
    return k === 0 ? [glisse * 0.3, 0, biais * 0.25] : [glisse, -Math.min(k, VISIBLES) * DECALAGE, biais];
  };
  const transform = id => { const [x, y, r] = pose(id); return `translate(${x.toFixed(1)}px,${y}px) rotate(${r.toFixed(2)}deg)`; };

  const pastilleCss = oui => `${MONO}font-size:12px;letter-spacing:.06em;text-transform:uppercase;height:26px;padding:0 9px;cursor:pointer;border:2px solid ${oui ? P.t : P.g};background:${oui ? P.t : 'transparent'};color:${oui ? P.o : P.t}`;
  const pastilles = (groupe, valeurs, actuel, f) => {
    const rang = el('div', 'display:flex;gap:6px;flex-wrap:wrap');
    const marquer = v => { for (const b of rang.children) { const oui = b.dataset.v === v; b.setAttribute('aria-pressed', String(oui)); b.style.cssText = pastilleCss(oui); } };
    for (const [v, nom] of valeurs) { const b = Object.assign(el('button', pastilleCss(v === actuel)), { type: 'button', textContent: nom, onclick: () => { marquer(v); f(v); } }); b.dataset.v = v; b.setAttribute('aria-pressed', String(v === actuel)); rang.append(b); }
    return el('div', 'display:grid;grid-template-columns:62px 1fr;align-items:center;gap:8px', el('span', `color:${P.g};font-size:12px;letter-spacing:.08em;text-transform:uppercase`, groupe), rang);
  };

  const fabriquer = id => {
    const S = SUJET(id), e = etat[id], hasard = id === ID_ALEATOIRE;
    const carte = el('div', `position:absolute;left:50%;top:${DECALAGE * VISIBLES + 20}px;width:${L}px;height:${H}px;margin-left:${-L / 2}px;color:${P.t};transition:transform .4s cubic-bezier(.2,.8,.2,1);will-change:transform`);
    // le papier : le fond aux bords rongés (et son ombre), puis le grain, les taches, les fibres, les plis, les coins sombres (au-dessus du texte : l'encre est imprimée dans le papier)
    const fond = el('div', `position:absolute;inset:0;background:${P.o};filter:url(#cy-usure) drop-shadow(3px 4px 0 rgba(${TERRE},.9))`);
    const couche = (css, z = 3) => el('div', `position:absolute;inset:4px;pointer-events:none;z-index:${z};${css}`);
    const grain = couche(`background-image:${GRAIN};mix-blend-mode:multiply;opacity:.3`);
    const taches = couche(`background-image:${TACHES};mix-blend-mode:multiply;opacity:.42`);
    const fibres = couche(`background-image:${FIBRES};mix-blend-mode:multiply;opacity:.2`);
    const plis = couche(`background:
      radial-gradient(circle at 0 100%,rgba(${GLAISE},.4),transparent 20%),radial-gradient(circle at 100% 0,rgba(${GLAISE},.3),transparent 16%),
      radial-gradient(ellipse at 50% 50%,transparent 62%,rgba(${GLAISE},.3))`);
    // l'image : la vraie carte du secteur, collée avec deux bouts d'adhésif
    const img = Object.assign(el('img', `display:block;width:100%;height:${IMG}px;object-fit:cover;image-rendering:pixelated;background:${P.s};box-shadow:0 0 0 1px ${P.t},1px 2px 0 1px rgba(${TERRE},.35);transition:opacity .3s`), { alt: `Le secteur ${S.nom}, vu de haut`, draggable: false });
    images[id] = img;
    const adhesif = (css) => el('div', `position:absolute;width:52px;height:15px;background:rgba(${BRUME},.85);box-shadow:0 0 0 1px rgba(${GLAISE},.5);${css}`);
    const cadre = el('div', 'position:relative;margin:10px 14px 0', img, adhesif('top:-7px;left:-16px;transform:rotate(-38deg)'), adhesif('top:-7px;right:-16px;transform:rotate(36deg)'));
    const desc = el('div', `margin-left:70px;padding-left:10px;border-left:2px solid ${P.g};font-size:12px;line-height:1.4;height:2.8em;overflow:hidden`, DIFFICULTES[e.niveau].desc);
    const relief = (() => { const m = Math.round((Math.max(...S.profil) - Math.min(...S.profil)) * 16); return m < 2 ? 'terrain plat' : `${m} m de relief`; })();
    const contenu = el('div', 'position:relative;z-index:2',
      el('div', `background:${P.b};color:${P.o};margin:4px 4px 0;padding:5px 12px 8px;font-size:15px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:baseline`, S.nom, el('span', `font-size:11px;color:${P.r}`, relief)),
      cadre,
      el('div', 'padding:12px 14px 0;display:grid;gap:8px',
        el('p', 'margin:0;height:5.6em;overflow:hidden;line-height:1.4;font-size:12px', S.resume),
        pastilles('Saison', [...SAISONS_CHOIX.map(s => [s, SAISONS[s].nom]), ['hasard', 'Hasard']], e.saison, v => { e.saison = v; peindre(id); }),
        pastilles('Niveau', Object.entries(DIFFICULTES).map(([k, D]) => [k, D.nom.split(' ').pop()]), e.niveau, v => { e.niveau = v; desc.textContent = DIFFICULTES[v].desc; }),
        desc,
        pastilles('Durée', Object.entries(DUREES).map(([k, D]) => [k, D.nom]), e.duree, v => { e.duree = v; }),
        el('div', 'justify-self:end;margin-top:4px', Object.assign(el('button', `${MONO}height:34px;padding:0 16px;cursor:pointer;color:${P.o};background:${P.t};border:0;box-shadow:0 3px 0 ${P.b}`), { type: 'button', textContent: 'Jouer ce secteur' }))));
    carte.append(fond, contenu, grain, taches, fibres, plis);
    return carte;
  };

  const ranger = () => {                                                // la pile telle qu'elle est : z, pose, onglets lisibles
    pile.forEach((id, i) => { const c = cartes[id]; c.style.zIndex = String(i + 1); c.style.transform = transform(id); c.style.filter = i === pile.length - 1 ? '' : 'brightness(.8)'; c.style.pointerEvents = i === pile.length - 1 ? '' : 'none'; });
    for (const id of ids) boutons[id].setAttribute('aria-pressed', String(id === pile[pile.length - 1]));
  };

  const choisir = id => {
    const haut = pile[pile.length - 1];
    if (id === haut && id !== ID_ALEATOIRE) return;
    if (id === ID_ALEATOIRE) {                                          // le hasard : un autre secteur à chaque clic (la carte est refaite, son nom aussi)
      grainesHasard = Math.floor(Math.random() * 99999) + 1; preparerAleatoire(grainesHasard);
      const neuve = fabriquer(id); neuve.style.zIndex = cartes[id].style.zIndex; cartes[id].replaceWith(neuve); cartes[id] = neuve; peindre(id);
    }
    const c = cartes[id], depart = id === haut ? [0, 0, 0] : pose(id);   // la carte part d'où elle repose (le hasard rejoue le geste sur place)
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

  for (const id of ids) {
    cartes[id] = fabriquer(id); table.append(cartes[id]);
    const hasard = id === ID_ALEATOIRE;
    boutons[id] = Object.assign(el('button', `${MONO}font-size:15px;letter-spacing:.06em;text-transform:uppercase;text-align:left;padding:10px 12px;cursor:pointer;color:${P.t};background:${hasard ? P.g : P.o};border:2px solid ${P.o};background-image:${GRAIN_LEGER}`), { type: 'button', textContent: hasard ? 'Au hasard' : SUJET(id).nom, onclick: () => choisir(id) });
    boutons[id].dataset.id = id === ID_ALEATOIRE ? 'hasard' : id;
    liste.append(boutons[id]);
  }
  // l'aria-pressed se lit sur la bordure (bleu horizon : « nous »)
  new MutationObserver(() => { for (const id of ids) boutons[id].style.borderColor = boutons[id].getAttribute('aria-pressed') === 'true' ? P.n : P.o; }).observe(liste, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  ranger();
  stage.append(racine);
  for (const id of ids) peindre(id);                     // la carte du dessus d'abord (la file rend dans l'ordre)
}
