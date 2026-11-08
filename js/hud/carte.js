// La carte du secteur (Jérôme, v0.14.0 ; v0.19.0 : toujours visible, en proportions) : les quatre secteurs A à D, les
// quatre lignes de chaque camp (en face au nord, en haut), chaque case en tronçons de 25 m à la couleur de celui qui les
// tient. Une lettre choisit les régiments du secteur ; une case envoie les régiments choisis dans cette tranchée ; les
// régiments y sont des cercles numérotés, à leur place. Le dessin seulement : les actions (choisir, ordonner) viennent de main.js.
import { NOUS, EUX, nombreZones, lettreZone, zone, largeurZone, etendueZones, tronconsDeLigne, forcesTroncons, codeLigne } from '../bataille.js?v=0.121.0';
import { amasDe, isoles } from '../amas.js?v=0.121.0';
import { ligneY } from '../tranchees.js?v=0.121.0';
import { numeroDe as numeroDeB } from './lecture.js?v=0.121.0';

// `bataille()` : la bataille en cours ; `choisis()` : les régiments choisis (ids) ; `surSecteur`, `surCase`, `surRonde` : les clics
// `moi()` : le camp qu'on joue (à deux sur le réseau, l'invité est en face : sa carte est tournée d'un demi-tour, ses lignes en bas, A à D de droite à gauche ; v0.30.0)
// Les lignes de la carte, de haut en bas (l'autre camp en haut, le sien en bas) et ses colonnes (A à D, de droite à gauche pour l'invité) : des index de `B.lignes` et des numéros de secteur.
// Le gros plan d'une case (hud/secteur.js) en tire ses voisines.
export function rangees(B, M) {
  const tourne = M === EUX, n = nombreZones(B), A_ = tourne ? NOUS : EUX, B_ = tourne ? EUX : NOUS;
  const lignes = [[A_, 3], [A_, 2], [A_, 1], [A_, 0], [B_, 0], [B_, 1], [B_, 2], [B_, 3]].map(([camp, rang]) => B.lignes.findIndex(L => L.camp === camp && L.rang === rang)).filter(i => i >= 0);
  const colonnes = tourne ? Array.from({ length: n }, (_, k) => n - k) : Array.from({ length: n }, (_, k) => k + 1);
  return { lignes, colonnes };
}

export function creerCarte({ $, bataille, choisis, surSecteur, surCase, surRonde, moi = () => NOUS }) {
  const numeroDe = r => numeroDeB(bataille(), r);
  let carteCases = [], carteVue = '', carteReperes = [], rondes = new Map();
  const CASE_H = 22, CASE_ECART = 2, TROU = 64;
  const hautLigne = k => 2 * CASE_H + CASE_ECART + (k < 4 ? k * (CASE_H + CASE_ECART) : 4 * (CASE_H + CASE_ECART) + TROU + CASE_ECART + (k - 4) * (CASE_H + CASE_ECART)) - CASE_H;
  function construireCarte() {
    const B = bataille(), M = moi(), tourne = M === EUX;
    const g = $('carte-grille'), n = nombreZones(B);
    const colonnes = tourne ? Array.from({ length: n }, (_, k) => n - k) : Array.from({ length: n }, (_, k) => k + 1);
    carteCases = []; carteVue = ''; carteReperes = []; rondes = new Map();
    if (!B.etat.tranchees) { g.replaceChildren(); $('carte').hidden = true; return; }
    g.style.gridTemplateColumns = `2.4em repeat(${n}, minmax(0, 1fr))`;
    g.style.gridTemplateRows = `${CASE_H}px repeat(4, ${CASE_H}px) ${TROU}px repeat(4, ${CASE_H}px)`;
    const kids = [document.createElement('span')];
    for (const s of colonnes) {
      const b = document.createElement('button');
      b.className = 'sect'; b.textContent = lettreZone(s); b.title = `Choisir les régiments de la colonne ${lettreZone(s)}`; b.setAttribute('aria-label', `Choisir les régiments de la colonne ${lettreZone(s)}`);
      b.onclick = e => surSecteur(s, e.shiftKey);
      kids.push(b);
    }
    const Z = zone(B), xc = (Z.x0 + Z.x1) / 2;
    const A_ = tourne ? NOUS : EUX, B_ = tourne ? EUX : NOUS;       // l'autre camp en haut, le sien en bas
    [[A_, 3], [A_, 2], [A_, 1], [A_, 0], [B_, 0], [B_, 1], [B_, 2], [B_, 3]].forEach(([camp, rang], k) => {
      const idx = B.lignes.findIndex(L => L.camp === camp && L.rang === rang);
      if (idx < 0) return;
      if (k === 4) {
        const t = document.createElement('span'); t.className = 'trou';
        t.textContent = `${Math.round(Math.abs(ligneY(B.lignes[idx], xc) - carteReperes[3].yr))} m`;
        kids.push(t);
      }
      carteReperes.push({ yr: ligneY(B.lignes[idx], xc), y: tourne ? Z.y0 + Z.y1 - ligneY(B.lignes[idx], xc) : ligneY(B.lignes[idx], xc), c: hautLigne(k) + CASE_H / 2 });
      const lib = document.createElement('span'); lib.className = `lib${camp !== M ? ' eux' : ''}`; lib.textContent = codeLigne(B.lignes[idx], M);
      kids.push(lib);
      for (const s of colonnes) {
        const c = document.createElement('button'), nom = `${lettreZone(s)}${codeLigne(B.lignes[idx], M)}`;
        c.className = 'cel'; c.innerHTML = `${'<i></i>'.repeat(Math.max(1, tronconsDeLigne(B, idx, Z.x0 + (s - 1) * largeurZone(B), Z.x0 + s * largeurZone(B)).length))}<b></b>`;
        c.title = `${nom} : le gros plan, ou l'ordre de s'y rendre si des régiments sont choisis (Alt + clic : toujours le gros plan)`; c.setAttribute('aria-label', `Secteur ${nom}`);
        c.onclick = e => surCase(idx, s, e.altKey);
        kids.push(c); carteCases.push({ idx, s, nom, el: c, moities: c.querySelectorAll('i'), marque: c.querySelector('b') });
      }
    });
    const regs = document.createElement('div'); regs.className = 'carte-regs'; regs.id = 'carte-regs';
    const ordres = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ordres.setAttribute('class', 'carte-ordres'); ordres.setAttribute('aria-hidden', 'true'); regs.append(ordres);
    kids.push(regs);
    g.replaceChildren(...kids);
    $('carte').hidden = false;
  }
  // la rangée de la carte (en pixels) d'une ordonnée du secteur : entre les lignes, proportionnelle
  function carteY(y) {
    const P = carteReperes, m = P.length - 1;
    if (m < 1) return 0;
    if (y <= P[0].y) return P[0].c - Math.min(10, (P[0].y - y) * 0.5);
    if (y >= P[m].y) return P[m].c + Math.min(10, (y - P[m].y) * 0.5);
    let k = 0;
    while (y > P[k + 1].y) k++;
    return P[k].c + (y - P[k].y) / (P[k + 1].y - P[k].y) * (P[k + 1].c - P[k].c);
  }
  // Les cercles : un par régiment qui a encore des hommes, au centre de ses hommes ; un clic choisit le régiment (Maj : en ajouter)
  function majRondes() {
    const B = bataille();
    const Z = zone(B), L = Z.x1 - Z.x0, cont = $('carte-regs'), M = moi(), tourne = M === EUX;
    if (!cont || !cont.offsetParent) return;      // (la carte est cachée par le gros plan d'un secteur : rien à placer, et la mesure donnerait 0 selon l'instant)
    // les lignes d'ordre : un SVG en pixels (la rangée des cercles est en calc() : 2,4 em de libellés puis la largeur des secteurs)
    const svgOrdres = cont.querySelector('.carte-ordres'), larg = cont.clientWidth, lab = 2.4 * parseFloat(getComputedStyle(cont).fontSize), lignes = [];
    svgOrdres.setAttribute('width', larg); svgOrdres.setAttribute('height', cont.clientHeight);
    // l'endroit d'un régiment, c'est son plus gros amas (amas.js, v0.116.1 ; la médiane de v0.76.2 tombait dans le gros d'un régiment scindé, la moyenne entre ses morceaux) ;
    // chaque amas isolé (une poche chez l'ennemi, des égarés) a sa propre pastille, plus petite, et sa propre ligne d'ordre : l'ordre part de là où sont les hommes
    const groupes = amasDe(B), vues = new Set();
    const placer = (cle, r, a, texte, titre, isole) => {
      let el = rondes.get(cle);
      if (!el) {
        el = document.createElement('button');
        el.className = `carte-ronde${r.camp === M ? '' : ' eux'}${isole ? ' isole' : ''}`; el.dataset.reg = r.id; el.textContent = texte;
        el.title = titre; el.setAttribute('aria-label', r.camp === M ? `Choisir le régiment ${titre}` : `Voir le ${titre}`);
        el.onclick = e => surRonde(r, e.shiftKey);
        const alerte = document.createElement('i'); alerte.className = 'alerte'; alerte.textContent = '!'; alerte.hidden = true; el.append(alerte); el.alerte = alerte;
        cont.append(el); rondes.set(cle, el);
      }
      vues.add(cle);
      el.hidden = false;
      if (isole && el.dataset.titre !== titre) { el.dataset.titre = titre; el.title = titre; el.setAttribute('aria-label', `Choisir le régiment ${titre}`); }      // (le nombre d'hommes change : le titre suit ; `title` se lit '' une fois adopté par l'infobulle)
      const f0 = Math.max(0, Math.min(1, (a.x - Z.x0) / L)), f = tourne ? 1 - f0 : f0, top = Math.round(carteY(tourne ? Z.y0 + Z.y1 - a.y : a.y));
      const left = `calc(2.4em + (100% - 2.4em) * ${f.toFixed(3)})`;
      if (el.style.left !== left) el.style.left = left;
      el.style.top = `${top}px`;
      el.classList.toggle('choisi', choisis().has(r.id));
      // un « ! » rouge sur le cercle d'un régiment en déroute (v0.77.1, Jérôme) ; sa place vue en `titre`
      if (el.alerte) { el.alerte.hidden = !r.deroute || isole; if (!isole) el.title = `${(el.title || el.dataset.info || '').split(' : ')[0]}${r.deroute ? ' : en déroute' : ''}`; }
      // son ordre : une ligne pointillée de son cercle à sa destination, tant qu'il n'y est pas (les nôtres seulement : on ne lit pas les ordres d'en face)
      if (r.camp === M && r.ordre && Math.hypot(r.ordre.x - a.x, r.ordre.y - a.y) > 10) {
        const fd0 = Math.max(0, Math.min(1, (r.ordre.x - Z.x0) / L)), fd = tourne ? 1 - fd0 : fd0, yd = Math.round(carteY(tourne ? Z.y0 + Z.y1 - r.ordre.y : r.ordre.y));
        lignes.push({ x1: lab + (larg - lab) * f, y1: top, x2: lab + (larg - lab) * fd, y2: yd, choisi: choisis().has(r.id) });
      }
    };
    for (const r of B.etat.regiments) {
      const g = groupes.get(r.id);
      if (!g || !r.effectif) continue;
      placer(r.id, r, g.amas[0], numeroDe(r), r.camp === M ? `${numeroDe(r)} · ${r.nom}` : `Régiment ${numeroDe(r)} d'en face`, false);
      isoles(g).forEach((a, k) => placer(`${r.id}#${k}`, r, a, numeroDe(r), `${numeroDe(r)} · ${r.nom} : ${a.n} hommes isolés`, true));
    }
    for (const [cle, el] of rondes) if (!vues.has(cle)) el.hidden = true;
    svgOrdres.replaceChildren(...lignes.map(l => {
      const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'g'), pt = document.createElementNS(ns, 'circle');
      // deux traits superposés : un liseré clair dessous, le pointillé foncé dessus (il se lit sur le papier, sur les cases bleues comme sur les kaki ; v0.116.1)
      const trait = classe => { const ln = document.createElementNS(ns, 'line'); ln.setAttribute('class', classe); ln.setAttribute('x1', l.x1.toFixed(1)); ln.setAttribute('y1', l.y1); ln.setAttribute('x2', l.x2.toFixed(1)); ln.setAttribute('y2', l.y2); return ln; };
      pt.setAttribute('cx', l.x2.toFixed(1)); pt.setAttribute('cy', l.y2); pt.setAttribute('r', 4);
      g.setAttribute('class', l.choisi ? 'choisi' : ''); g.append(trait('halo'), trait('fil'), pt);
      return g;
    }));
  }
  function majCarte() {
    const B = bataille();
    if (!B.etat.tranchees) return;
    majRondes();
    const e = B.etat, Z = zone(B), w = largeurZone(B), marques = new Map();
    for (const r of e.regiments) {
      const t = r.ordre.trace;
      if (!r.effectif || !t) continue;
      const idx = B.lignes.findIndex(L => L.camp * 10 + L.rang === t.ligne), [a, b] = etendueZones(B, r.ordre);
      for (let sct = a; sct <= b; sct++) { const k = `${idx}:${sct}`; (marques.get(k) || marques.set(k, []).get(k)).push(r); }
    }
    const f = forcesTroncons(B);
    const cle = [e.troncons.join(''), f.join(','), [...B.disputes].join(''), [...choisis()].join(','), [...marques].map(([k, v]) => `${k}=${v.map(r => r.id)}`).join(';')].join('|');
    if (cle === carteVue) return;
    carteVue = cle;
    for (const c of carteCases) {
      const ks = tronconsDeLigne(B, c.idx, Z.x0 + (c.s - 1) * w, Z.x0 + c.s * w), rs = marques.get(`${c.idx}:${c.s}`) || [];
      c.moities.forEach((m, k) => { const t = ks[k]; m.className = t === undefined ? '' : `${e.troncons[t] === moi() ? 'nous' : 'eux'}${B.disputes[t] ? ' dispute' : ''}`; });
      // des attaquants dans la case : ce qu'ils sont contre les défenseurs (la mêlée) ; sinon les régiments qui y sont
      let att = 0, def = 0;
      for (const k of ks) { const h = e.troncons[k]; att += f[k * 2 + 1 - h]; def += f[k * 2 + h]; }
      c.marque.textContent = att ? `${att}·${def}` : '';
      c.el.title = `${c.nom} : le gros plan, ou l'ordre de s'y rendre si des régiments sont choisis (Alt + clic : toujours le gros plan)${att ? ` : ${att} attaquants contre ${def} défenseurs` : ''}`;
      c.el.classList.toggle('choisi', rs.some(r => choisis().has(r.id)));
    }
  }
  return {
    construire: construireCarte, maj: majCarte,
    get cases() { return carteCases; },        // { idx, s, nom, el, ... } : une case par ligne et par secteur
  };
}
