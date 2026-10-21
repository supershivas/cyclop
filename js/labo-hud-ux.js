// Trois sujets du labo sur le HUD (Jérôme, v0.41.0) : le nom d'un régiment sur le champ, les toasts, la carte d'ordre de la rangée.
// Cinq variantes chacun : la A est ce que le jeu fait aujourd'hui, B à E sont des propositions (statut `a-trancher`), rien n'est dans le jeu.
// Le dessin seulement : des données d'exemple et la palette du jeu (js/palette.js), aucune couleur de plus ; les variantes qui changent
// de fond ne mélangent que des couleurs de palette (hachures de deux tons plutôt qu'un fondu).
//  · le nom d'un régiment : posé sur le moteur en direct, à la place de l'étiquette du jeu (`majEtiquettes` de main.js), cliquable (il choisit) ;
//  · les toasts : un HUD d'exemple (billet, pertes, carnet, rangée de cartes) sur le moteur en direct, trois messages à déclencher ;
//  · la carte d'ordre : la rangée de cartes en tous ses états ; une ligne mesure la hauteur des cartes et la place de la barre (elle dit « elle bouge » si elles diffèrent).
import { PALETTE as P, ALERTES } from './palette.js?v=0.45.1';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const txt = (s, css = '') => el('span', css, s);
const MONO = 'font:12px/1.3 ui-monospace,monospace;';
const reduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const jouer = (e, keyframes, duree, opts = {}) => reduit() ? null : e.animate(keyframes, { duration: duree, easing: 'cubic-bezier(.2,.8,.3,1)', ...opts });

// Les quatre tailles de texte du jeu (docs/design-system.md) et la hiérarchie demandée : le nom est le « h1 » de la carte, le statut son « h2 », le reste du corps de texte
const T = { petit: '12px', corps: '14px', h2: '12px', h1: '16px', grand: '20px' };
const SIGNE = '!';

// ─── des régiments d'exemple ─────────────────────────────────────────────────
// `statut` : '' (tient), « Au contact » (la nuit), « Ébranlé », « En déroute »
const STATUTS = ['', 'Au contact', 'Ébranlé', 'En déroute'];
const LONG = { 'Au contact': 'Au contact de l\'ennemi', 'Ébranlé': 'ébranlé', 'En déroute': 'en déroute', 'Repos': 'repos' };
const COULEUR_ETAT = { 'Ébranlé': ALERTES.orange, 'En déroute': ALERTES.rouge };   // le carré du numéro, quand le moral baisse
const regsDe = ctx => ctx.B.etat.regiments.filter(r => r.camp === 0 && r.effectif).slice(0, 4).map((r, k) => {
  const A = ctx.B.armee, m = ctx.B.etat.marges;
  let x = 0, ymin = 1e9, n = 0, bl = 0;
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.reg[i] === r.id) { x += A.x[i]; n++; ymin = Math.min(ymin, A.y[i]); if (A.blessure[i]) bl++; }
  const sec = 'ABCD'[Math.max(0, Math.min(3, Math.floor((x / Math.max(1, n) - m.x) / 100)))];
  return { id: r.id, n: k + 1, nom: r.nom, sec, debout: Math.max(0, r.effectif - bl), bles: bl, tombes: r.pertes || 0, initial: r.initial, statut: STATUTS[k], x: x / Math.max(1, n), ymin };
});

const chevrons = (n, enc) => el('span', 'display:inline-flex;gap:2px;height:8px', Array.from({ length: n }, () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 12 8'); s.setAttribute('width', '12'); s.setAttribute('height', '8');
  s.innerHTML = `<path d="M1 7 L6 2 L11 7" fill="none" stroke="${enc}" stroke-width="2" stroke-linecap="square"/>`;
  return s;
}));
// la barre debout / blessés / tombés : plein, hachuré, vide
const barre = (r, enc, css = '') => {
  const pc = v => `${(v / r.initial * 100).toFixed(1)}%`;
  return el('span', `display:flex;box-sizing:border-box;height:8px;border:1px solid ${enc};${css}`,
    el('i', `display:block;height:100%;width:${pc(r.debout)};background:${enc}`),
    el('i', `display:block;height:100%;width:${pc(r.bles)};background:repeating-linear-gradient(135deg,${enc} 0 2px,transparent 2px 4px)`));
};

// ─── 1 · Le nom d'un régiment sur le champ ───────────────────────────────────
// Chaque fabrique rend le contenu d'une étiquette ; le gestionnaire la pose au-dessus des hommes (comme `majEtiquettes`) et la rend cliquable.
// `c` : le régiment (voir regsDe), `choisi` : s'il est choisi.

// A · l'actuelle : une ligne « 2 · Protogyne · B · Au contact de l'ennemi », sur papier ; depuis la v0.40.2, un clic la choisit
const etiqA = (c, choisi) => el('div', `padding:1px 4px;white-space:nowrap;${MONO}background:${choisi ? P.t : P.o};color:${choisi ? P.o : P.n}`,
  `${c.n} · ${c.nom} · ${c.sec}${c.statut ? ` · ${LONG[c.statut]}` : ''}`);

// B · trois étages : le nom (h1), le statut (h2), le détail (corps) ; une cible de 44 px au moins, le statut toujours court
const etiqB = (c, choisi) => {
  const fg = choisi ? P.t : P.o, bg = choisi ? P.o : P.t;
  return el('div', `min-width:112px;min-height:44px;padding:6px 12px 7px;box-sizing:border-box;background:${bg};color:${fg};border-top:3px solid ${P.n};box-shadow:2px 2px 0 ${P.t};${MONO}cursor:pointer`,
    el('div', `font-size:${T.h1};line-height:1.15;white-space:nowrap`, `${c.n} · ${c.nom}`),
    el('div', `font-size:${T.h2};line-height:1.2;color:${choisi ? P.t : c.statut ? P.o : P.g}`, c.statut || 'Tient'),
    el('div', `font-size:${T.petit};line-height:1.3;color:${choisi ? P.b : P.r}`, `${c.sec} · ${c.debout} debout${c.bles ? ` · ${c.bles} blessés` : ''}`));
};

// C · le cartouche : un carré à numéro (le repère qu'on retrouve sur la carte et la rangée), le nom et le statut à sa droite, la barre en pied
const etiqC = (c, choisi) => {
  const fg = choisi ? P.t : P.o, bg = choisi ? P.o : P.t;
  return el('div', `display:grid;grid-template-columns:34px 1fr;min-height:44px;background:${bg};color:${fg};box-shadow:2px 2px 0 ${P.t};${MONO}cursor:pointer`,
    el('div', `display:grid;place-items:center;background:${COULEUR_ETAT[c.statut] || P.n};color:${P.t};font-size:${T.grand}`, String(c.n)),
    el('div', 'padding:4px 8px 4px;display:grid;gap:1px;min-width:96px',
      el('div', `font-size:${T.h1};line-height:1.15;white-space:nowrap`, c.nom),
      el('div', `font-size:${T.h2};line-height:1.2;color:${c.statut ? fg : P.g};${COULEUR_ETAT[c.statut] ? 'letter-spacing:.08em;text-transform:uppercase' : ''}`, c.statut || 'Tient'),
      barre(c, fg, 'margin-top:3px;height:5px')));
};

// D · la pastille : un rond numéroté de 36 px (la cible), qui ne dit son nom que choisi, ou quand le statut compte (sinon le champ reste net)
const etiqD = (c, choisi) => {
  const ouvert = choisi || c.statut;
  const rond = el('div', `flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;box-sizing:border-box;background:${choisi ? P.o : P.n};color:${P.t};border:3px solid ${P.t};font-size:${T.grand};cursor:pointer`, String(c.n));
  const mot = ouvert ? el('div', `padding:3px 8px 4px;background:${P.t};color:${P.o};${MONO}box-shadow:2px 2px 0 ${P.t}`,
    el('div', `font-size:${T.h1};line-height:1.15;white-space:nowrap`, c.nom),
    el('div', `font-size:${T.h2};line-height:1.2;color:${c.statut ? P.o : P.g}`, c.statut || `${c.debout} debout`)) : null;
  return el('div', `display:flex;align-items:center;gap:4px;${MONO}`, rond, mot);
};

// E · le fanion sur sa hampe : un papier de carte (le nom en h1, le détail), le statut en tampon penché, et une hampe qui descend vers les hommes
const etiqE = (c, choisi) => {
  const fg = choisi ? P.o : P.t, bg = choisi ? P.t : P.o;
  return el('div', `display:grid;justify-items:center;${MONO}cursor:pointer`,
    el('div', `position:relative;min-width:112px;min-height:44px;padding:6px 12px 7px;box-sizing:border-box;background:${bg};color:${fg};border-top:3px solid ${P.n};box-shadow:2px 2px 0 ${P.t}`,
      el('div', `font-size:${T.h1};line-height:1.15;white-space:nowrap`, `${c.n} · ${c.nom}`),
      el('div', `font-size:${T.petit};line-height:1.3;color:${choisi ? P.r : P.s}`, `Secteur ${c.sec} · ${c.debout} debout`),
      c.statut ? el('span', `position:absolute;right:-8px;top:-12px;padding:0 6px;background:${P.o};color:${P.t};border:3px double ${P.t};transform:rotate(-5deg);font-size:${T.petit};letter-spacing:.1em;text-transform:uppercase`, c.statut) : null),
    el('i', `display:block;width:2px;height:16px;background:${P.o};box-shadow:1px 0 0 ${P.t}`));
};

const ETIQUETTES = { actuelle: etiqA, bord: etiqB, cartouche: etiqC, pastille: etiqD, fanion: etiqE };

export function calqueEtiquette(nom) {
  const fab = ETIQUETTES[nom];
  return (boite, ctx) => {
    const couche = el('div', 'position:absolute;inset:0;pointer-events:none;overflow:hidden');
    const aide = el('div', `position:absolute;left:8px;bottom:8px;padding:3px 8px;background:${P.t};color:${P.r};${MONO}`, 'Cliquez un nom : il choisit le régiment (Maj : en ajouter)');
    boite.append(couche, aide);
    const choisis = new Set(), noeuds = new Map();
    let raf = 0, partie = true, vus = '';
    const bascule = (id, ajout) => {
      if (ajout) { if (choisis.has(id)) choisis.delete(id); else choisis.add(id); }
      else if (choisis.size === 1 && choisis.has(id)) choisis.clear(); else { choisis.clear(); choisis.add(id); }
      vus = '';
    };
    const boucle = () => {
      if (ctx.rendu && ctx.B) {
        const regs = regsDe(ctx);
        const cle = regs.map(c => `${c.id}:${c.statut}:${c.debout}:${choisis.has(c.id)}`).join('|');
        if (cle !== vus) {                                          // refait quand le contenu change (comme `etiquettes` du jeu)
          vus = cle; couche.replaceChildren(); noeuds.clear();
          for (const c of regs) {
            const hote = el('div', 'position:absolute;left:0;top:0;pointer-events:auto;will-change:transform', fab(c, choisis.has(c.id)));
            hote.addEventListener('click', e => { e.stopPropagation(); bascule(c.id, e.shiftKey); });
            hote.addEventListener('pointerdown', e => e.stopPropagation());
            couche.append(hote); noeuds.set(c.id, hote);
          }
        }
        for (const c of regs) {
          const h = noeuds.get(c.id); if (!h) continue;
          const [sx, sy] = ctx.rendu.versEcran(c.x, c.ymin - 2);
          h.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
        }
      }
      if (partie) raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); };
  };
}

// ─── la carte d'ordre de la rangée (utilisée aussi par la maquette des toasts) ──
// Dans le jeu, une carte est un papier d'os à texte de terre ; choisie, elle s'inverse (terre, texte d'os). Ce que le jeu posait avant la v0.41.3 (main.js `majRegiments`) :
// numéro et nom, un « ! » flottant quand le régiment est ébranlé, les chevrons (ou le mot de la corvée), la barre. Le « ! » flotte dans la ligne du nom.
function carteAvant(c, { choisi = false, donne = false } = {}) {
  const enc = choisi ? P.o : donne ? P.g : P.t, pap = choisi ? P.t : P.o, ebranle = c.statut === 'Ébranlé' || c.statut === 'En déroute';
  const l1 = el('span', 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
    el('b', `font-weight:normal;font-size:${T.grand};line-height:1;margin-right:2px`, String(c.n)), ` ${c.nom}`,
    ebranle ? el('i', `float:right;font-style:normal;font-size:${T.petit};line-height:1;padding:1px 4px;border:1px double ${P.o};color:${P.o};background:${P.t};transform:rotate(-5deg)`, SIGNE) : null);
  const l2 = el('span', 'display:flex;gap:2px;height:8px;line-height:8px', c.statut && !ebranle ? txt(c.statut, `font-size:${T.petit};color:${enc}`) : chevrons(c.n % 3 + 1, enc));
  return el('div', `display:grid;gap:2px;align-content:start;width:112px;min-height:62px;box-sizing:border-box;padding:2px 8px 8px;background:${pap};color:${enc};border-top:3px solid ${donne ? P.g : P.n};box-shadow:2px 2px 0 ${P.t};font:${T.petit}/1.2 ui-monospace,monospace;${choisi ? `outline:2px solid ${P.o};outline-offset:-5px` : ''}`, l1, l2, barre(c, enc));
}

// Les cartes à hauteur fixe (76 px) : le nom (h1), le statut (h2, « Tient » quand rien ne va mal), les chevrons, la barre collée au pied, le « ! » (« !! » en déroute) sur le coin, hors du flux :
// rien ne bouge d'un état à l'autre, ni d'une carte à l'autre. Seul le fond dit « ébranlé » : quatre façons, la hachure est celle qu'a retenue Jérôme (v0.41.3).
const FONDS = {
  // C · hachuré : des diagonales d'os et de brume (choisi : terre et boue sombre, plus légères) ; la forme porte l'information, lisible en gris, sans couleur nouvelle
  hachure: { fond: `repeating-linear-gradient(135deg,${P.o} 0 4px,${P.r} 4px 8px)`, enc: P.t, fondChoisi: `repeating-linear-gradient(135deg,${P.t} 0 4px,${P.s} 4px 8px)` },
  // B · fond de boue : le papier passe au brun
  boue: { fond: P.b, enc: P.o },
  // D · fond de glaise : le papier passe à la glaise, texte de terre
  glaise: { fond: P.g, enc: P.t },
  // E · papier mouillé : brume, liseré du haut en pointillé glaise
  abime: { fond: P.r, enc: P.t, liseré: `3px dashed ${P.g}` },
};
function carteFixe(variante) {
  const F = FONDS[variante];
  return (c, { choisi = false, donne = false } = {}) => {
    const niveau = c.statut === 'En déroute' ? 2 : c.statut === 'Ébranlé' ? 1 : 0, ebranle = niveau > 0;
    const enc = choisi ? P.o : ebranle ? F.enc : donne ? P.g : P.t;
    const fond = choisi ? (ebranle && F.fondChoisi ? F.fondChoisi : P.t) : ebranle ? F.fond : P.o;
    const mot = ebranle ? (niveau === 2 ? 'En déroute' : 'Ébranlé') : (c.statut || 'Tient');
    const marque = ebranle ? el('i', `position:absolute;right:8px;top:4px;display:grid;place-items:center;min-width:16px;height:16px;box-sizing:border-box;padding:0 2px;border:1px solid ${P.t};background:${niveau === 2 ? ALERTES.rouge : ALERTES.orange};color:${P.t};font-style:normal;font-size:${T.petit};line-height:1`, niveau === 2 ? '!!' : SIGNE) : null;
    return el('div', `position:relative;width:112px;height:76px;box-sizing:border-box;padding:4px 8px 8px;background:${fond};color:${enc};border-top:${ebranle && F.liseré ? F.liseré : `3px solid ${donne ? P.g : P.n}`};box-shadow:2px 2px 0 ${P.t};${MONO}overflow:hidden;${choisi ? `outline:2px solid ${P.o};outline-offset:-5px` : ''}`,
      el('div', `font-size:${T.h1};line-height:18px;height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${ebranle ? 'padding-right:20px' : ''}`, `${c.n} ${c.nom}`),
      el('div', `margin-top:4px;font-size:${T.h2};line-height:14px;height:14px;white-space:nowrap;overflow:hidden;color:${enc};${ebranle ? 'letter-spacing:.08em;text-transform:uppercase' : ''}`, donne && !ebranle ? `${mot} ✓` : mot),
      marque,
      el('div', 'position:absolute;left:8px;right:8px;bottom:8px;display:grid;gap:4px;grid-template-rows:8px 8px', el('span', 'display:flex;height:8px;align-items:center', chevrons(c.n % 3 + 1, enc)), barre(c, enc)));
  };
}
const CARTES = { avant: carteAvant, hachure: carteFixe('hachure'), boue: carteFixe('boue'), glaise: carteFixe('glaise'), abime: carteFixe('abime') };

// Des régiments d'exemple, sans moteur, pour la maquette des cartes
const EXEMPLES = [
  { n: 1, nom: 'Porphyre', statut: 'Au contact', initial: 94, debout: 58, bles: 12, tombes: 24 },
  { n: 2, nom: 'Protogyne', statut: 'Ébranlé', initial: 94, debout: 40, bles: 21, tombes: 33 },
  { n: 3, nom: 'Céruléen', statut: 'Repos', initial: 94, debout: 80, bles: 6, tombes: 8 },
  { n: 4, nom: 'Viride', statut: '', initial: 94, debout: 90, bles: 2, tombes: 2 },
  { n: 5, nom: 'Murmuration', statut: '', initial: 94, debout: 70, bles: 10, tombes: 14 },
  { n: 6, nom: 'Sinople', statut: 'En déroute', initial: 94, debout: 22, bles: 30, tombes: 42 },
];

// ─── 3 · La carte d'ordre de la rangée ───────────────────────────────────────
export function maquetteCartes(stage, nom) {
  const fab = CARTES[nom];
  const cas = [
    ['Tient', { ...EXEMPLES[3] }, {}],
    ['Au contact', { ...EXEMPLES[0] }, {}],
    ['Ébranlé', { ...EXEMPLES[1] }, {}],
    ['Ébranlé et choisi', { ...EXEMPLES[1] }, { choisi: true }],
    ['En déroute', { ...EXEMPLES[5] }, {}],
    ['Nuit : repos donné', { ...EXEMPLES[2] }, { donne: true }],
    ['Nom long', { ...EXEMPLES[4] }, {}],
  ];
  const rang = el('div', 'position:relative;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap');
  for (const [, c, o] of cas) rang.append(fab(c, o));
  const legende = el('div', `display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;${MONO}color:${P.r}`, cas.map(([t]) => el('span', 'width:112px', t)));
  const champ = el('div', `padding:48px 16px 16px;background:${P.s};border-radius:4px`, rang, legende);
  const aide = el('p', 'font:13px/1.4 ui-monospace,monospace;margin:8px 0 12px', nom === 'avant'
    ? 'Les sept états de la rangée. Regardez la barre et le « ! » (sur la capture de Jérôme, la barre de la carte ébranlée n\'est pas à la hauteur des autres ; ici, la mesure du bas dit ce que la maquette donne), et « Au contact » prend la place des chevrons.'
    : 'Les sept états de la rangée, la même hauteur pour toutes : le nom, le statut, la barre au pied. Le seul changement d\'un état à l\'autre est le fond (ou le mot).');
  // le repère de la barre : mesuré à la volée sur chaque carte
  const mesure = el('p', 'font:13px/1.4 ui-monospace,monospace;margin:12px 0 0');
  stage.append(aide, champ, mesure);
  requestAnimationFrame(() => {
    const ys = [...rang.children].map(c => { const r = c.getBoundingClientRect(), b = c.querySelector('span[style*="border"]'); return b ? Math.round(b.getBoundingClientRect().top - r.top) : null; });
    const hs = [...rang.children].map(c => Math.round(c.getBoundingClientRect().height));
    mesure.textContent = `Hauteur de la carte : ${hs.join(' · ')} px — place de la barre depuis le haut : ${ys.join(' · ')} px${new Set(ys).size === 1 && new Set(hs).size === 1 ? ' (identique)' : ' (elle bouge)'}`;
  });
}

// ─── 2 · Les toasts ──────────────────────────────────────────────────────────
// Trois messages du jeu : une information (mise à jour), un refus à voix haute (il vise un régiment), une alerte
const MESSAGES = [
  { genre: 'info', texte: 'Mis à jour en v0.41.0', bouton: 'Information' },
  { genre: 'refus', texte: 'Protogyne : au contact de l\'ennemi, il se bat toute la nuit.', bouton: 'Refus d\'un ordre', reg: 1 },
  { genre: 'alerte', texte: 'Désynchronisation : les deux parties ont divergé.', bouton: 'Alerte' },
];
const BANDE = { info: P.n, refus: P.g, alerte: P.x };                 // le liseré : bleu (nous), glaise (refus), vert kaki clair (le danger : en face)
const papier = (m, css = '') => el('div', `box-sizing:border-box;max-width:44ch;padding:8px 12px;background:${P.o};color:${P.t};border-left:4px solid ${BANDE[m.genre]};box-shadow:2px 2px 0 ${P.t};${MONO}${css}`,
  m.genre === 'refus' ? el('div', `font-size:${T.petit};letter-spacing:.1em;text-transform:uppercase;color:${P.b}`, 'Ordre refusé') : m.genre === 'alerte' ? el('div', `font-size:${T.petit};letter-spacing:.1em;text-transform:uppercase;color:${P.b}`, 'Attention') : null,
  el('div', `font-size:${T.corps};line-height:1.3`, m.texte));

// Un HUD d'exemple, posé sur le moteur : le billet, les pertes, le carnet, la rangée de cartes (de vraies cartes `carteA`)
function hudExemple(boite, ctx) {
  const billet = el('div', `position:absolute;left:8px;top:8px;width:190px;padding:6px 10px;background:${P.o};color:${P.t};box-shadow:2px 2px 0 ${P.t};${MONO}`,
    el('div', `font-size:${T.h2}`, 'Jour 2 sur 11 · 9 h 30'), el('div', `color:${P.b};font-size:${T.petit}`, 'Prendre leur 1re ligne'), el('div', `color:${P.b};font-size:${T.petit}`, 'Herbe · marche facile'));
  const duel = el('div', `position:absolute;left:50%;top:8px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;padding:6px 10px;background:${P.o};box-shadow:2px 2px 0 ${P.t};${MONO}`,
    el('span', `display:block;width:150px;height:10px;border:1px solid ${P.t};background:linear-gradient(90deg,${P.t} 0 70%,transparent 70%)`), el('b', `font-weight:normal;color:${P.t}`, 'J2'),
    el('span', `display:block;width:150px;height:10px;border:1px solid ${P.t};background:linear-gradient(270deg,${P.b} 0 85%,transparent 85%)`));
  const lignes = [['9 h 02', 'Le 5e d\'en face prépare au 220.'], ['9 h 12', 'Le 5e sort de ses tranchées.'], ['9 h 20', 'Tronçon 3 : plus qu\'un défenseur.'], ['9 h 21', 'Tronçon 3 perdu.']];
  const carnet = el('div', `position:absolute;left:8px;top:84px;width:240px;padding:6px 10px;background:${P.t};color:${P.o};${MONO}opacity:.96`, lignes.map(([h, t], k) => el('div', `font-size:${T.petit};line-height:1.45;${k === lignes.length - 1 ? `background:${P.g};color:${P.t};` : ''}white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, `${h}  ${t}`)));
  const carteCoin = el('div', `position:absolute;right:8px;top:8px;width:110px;height:64px;background:${P.o};box-shadow:2px 2px 0 ${P.t};${MONO}padding:4px 8px;color:${P.t};font-size:${T.petit}`, 'Carte', el('div', `margin-top:6px;height:34px;border:1px solid ${P.t}`));
  const rang = el('div', 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:8px;align-items:flex-end');
  for (const c of EXEMPLES.slice(0, 5)) rang.append(CARTES.hachure(c, {}));
  boite.append(billet, duel, carnet, carteCoin, rang);
  return { carnet, lignes };
}

const OFFRES = {
  // A · l'actuelle : en bas au centre, sur la rangée des cartes (le papier du jeu : fond d'os, deux secondes et demie)
  actuelle: ({ boite, m }) => {
    const t = papier(m, 'position:absolute;left:50%;bottom:16px;transform:translateX(-50%);white-space:normal;padding:10px 16px;border-left:0;box-shadow:none');
    boite.append(t); return t;
  },
  // B · sous le duel : une languette qui descend du haut, au centre, entre les pertes et le champ (rien d'autre n'est là)
  bande: ({ boite, m }) => {
    const t = papier(m, 'position:absolute;left:50%;top:64px;transform:translateX(-50%)');
    boite.append(t); jouer(t, [{ transform: 'translate(-50%,-14px)', opacity: 0 }, { transform: 'translate(-50%,0)', opacity: 1 }], 260); return t;
  },
  // C · la pile du bord : au bord droit, sous la carte, jusqu'à trois messages empilés, le plus récent en haut
  pile: ({ boite, m }) => {
    let pile = boite.querySelector('[data-pile]');
    if (!pile) { pile = el('div', 'position:absolute;right:8px;top:84px;width:260px;display:grid;gap:6px;justify-items:end'); pile.dataset.pile = '1'; boite.append(pile); }
    const t = papier(m, 'width:260px;max-width:none'); pile.prepend(t);
    while (pile.children.length > 3) pile.lastElementChild.remove();
    jouer(t, [{ transform: 'translateX(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 240); return t;
  },
  // D · dans le carnet : rien ne flotte ; la ligne s'écrit en bas du carnet de bord, surlignée (le carnet est déjà l'endroit où le jeu raconte)
  carnet: ({ boite, m, hud }) => {
    const l = el('div', `font-size:${T.petit};line-height:1.45;background:${BANDE[m.genre]};color:${P.t};padding-left:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, `9 h 31  ${m.texte}`);
    const ancien = hud.carnet.querySelector('div:last-child'); if (ancien) { ancien.style.background = ''; ancien.style.color = P.o; }
    hud.carnet.firstElementChild?.remove(); hud.carnet.append(l);
    jouer(l, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 220);
    return { remove: () => { l.style.background = ''; l.style.color = P.o; } };
  },
  // E · à l'objet : un refus parle depuis le régiment qu'il vise (une bulle au-dessus de ses hommes) ; sinon la languette du haut
  objet: ({ boite, m, ctx }) => {
    const regs = ctx.rendu && ctx.B ? regsDe(ctx) : [];
    const c = m.reg != null ? regs[m.reg] : null;
    if (!c) return OFFRES.bande({ boite, m });
    const [sx, sy] = ctx.rendu.versEcran(c.x, c.ymin - 2);
    const t = el('div', `position:absolute;left:${Math.round(sx)}px;top:${Math.round(sy) - 62}px;transform:translate(-50%,-100%)`,
      papier(m, 'width:30ch'), el('i', `display:block;margin:0 auto;width:0;height:0;border:8px solid transparent;border-top-color:${P.o};border-bottom:0`));
    boite.append(t); jouer(t, [{ transform: 'translate(-50%,-90%)', opacity: 0 }, { transform: 'translate(-50%,-100%)', opacity: 1 }], 240); return t;
  },
};

export function calqueToast(nom) {
  const offre = OFFRES[nom];
  return (boite, ctx) => {
    const hud = hudExemple(boite, ctx);
    const boutons = el('div', `position:absolute;left:8px;top:210px;display:grid;gap:6px;${MONO}`,
      el('span', `padding:2px 8px;background:${P.t};color:${P.r}`, 'Déclencher :'),
      MESSAGES.map(m => {
        const b = el('button', `min-height:44px;padding:0 14px;background:${P.o};color:${P.t};border:2px solid ${P.t};box-shadow:2px 2px 0 ${P.t};font:inherit;cursor:pointer`, m.bouton);
        b.addEventListener('pointerdown', e => e.stopPropagation());
        b.addEventListener('click', () => {
          const t = offre({ boite, m, ctx, hud });
          clearTimeout(t?.fin); const fin = setTimeout(() => { t?.remove?.(); }, 2600);
          if (t) t.fin = fin;
        });
        return b;
      }));
    boite.append(boutons);
  };
}
