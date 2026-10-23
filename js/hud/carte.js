// La carte du secteur (Jérôme, v0.14.0 ; v0.19.0 : toujours visible, en proportions) : les quatre secteurs A à D, les
// quatre lignes de chaque camp (en face au nord, en haut), chaque case en tronçons de 25 m à la couleur de celui qui les
// tient. Une lettre choisit les régiments du secteur ; une case envoie les régiments choisis dans cette tranchée ; les
// régiments y sont des cercles numérotés, à leur place. Le dessin seulement : les actions (choisir, ordonner) viennent de main.js.
import { NOUS, EUX, nombreZones, lettreZone, zone, largeurZone, etendueZones, tronconsDeLigne, forcesTroncons, codeLigne } from '../bataille.js?v=0.61.0';
import { ligneY } from '../tranchees.js?v=0.61.0';
import { numeroDe as numeroDeB } from './lecture.js?v=0.61.0';

// `bataille()` : la bataille en cours ; `choisis()` : les régiments choisis (ids) ; `surSecteur`, `surCase`, `surRonde` : les clics
// `moi()` : le camp qu'on joue (à deux sur le réseau, l'invité est en face : sa carte est tournée d'un demi-tour, ses lignes en bas, A à D de droite à gauche ; v0.30.0)
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
      b.className = 'sect'; b.textContent = lettreZone(s); b.title = `Choisir les régiments du secteur ${lettreZone(s)}`; b.setAttribute('aria-label', `Choisir les régiments du secteur ${lettreZone(s)}`);
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
      const lib = document.createElement('span'); lib.className = `lib${camp !== M ? ' eux' : ''}`; lib.textContent = codeLigne(B.lignes[idx]);
      kids.push(lib);
      for (const s of colonnes) {
        const c = document.createElement('button'), nom = `${lettreZone(s)}${codeLigne(B.lignes[idx])}${camp !== M ? ' en face' : ''}`;
        c.className = 'cel'; c.innerHTML = `${'<i></i>'.repeat(Math.max(1, tronconsDeLigne(B, idx, Z.x0 + (s - 1) * largeurZone(B), Z.x0 + s * largeurZone(B)).length))}<b></b>`;
        c.title = `Envoyer les régiments choisis dans ${nom}`; c.setAttribute('aria-label', `Envoyer les régiments choisis dans ${nom}`);
        c.onclick = () => surCase(idx, s);
        kids.push(c); carteCases.push({ idx, s, nom, el: c, moities: c.querySelectorAll('i'), marque: c.querySelector('b') });
      }
    });
    const regs = document.createElement('div'); regs.className = 'carte-regs'; regs.id = 'carte-regs';
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
    const A = B.armee, Z = zone(B), L = Z.x1 - Z.x0, centres = new Map(), cont = $('carte-regs'), M = moi(), tourne = M === EUX;
    if (!cont) return;
    for (let i = 0; i < A.n; i++) {
      let c = centres.get(A.reg[i]);
      if (!c) centres.set(A.reg[i], c = { x: 0, y: 0, n: 0 });
      c.x += A.x[i]; c.y += A.y[i]; c.n++;
    }
    for (const r of B.etat.regiments) {
      let el = rondes.get(r.id);
      const c = centres.get(r.id);
      if (!c || !r.effectif) { if (el) el.hidden = true; continue; }
      if (!el) {
        el = document.createElement('button');
        el.className = `carte-ronde${r.camp === M ? '' : ' eux'}`; el.dataset.reg = r.id; el.textContent = numeroDe(r);
        const nom = r.camp === M ? `${numeroDe(r)} · ${r.nom}` : `Régiment ${numeroDe(r)} d'en face`;
        el.title = nom; el.setAttribute('aria-label', r.camp === M ? `Choisir le régiment ${nom}` : `Voir le ${nom}`);
        el.onclick = e => surRonde(r, e.shiftKey);
        cont.append(el); rondes.set(r.id, el);
      }
      el.hidden = false;
      const f0 = Math.max(0, Math.min(1, (c.x / c.n - Z.x0) / L)), f = tourne ? 1 - f0 : f0, top = Math.round(carteY(tourne ? Z.y0 + Z.y1 - c.y / c.n : c.y / c.n));
      const left = `calc(2.4em + (100% - 2.4em) * ${f.toFixed(3)})`;
      if (el.style.left !== left) el.style.left = left;
      el.style.top = `${top}px`;
      el.classList.toggle('choisi', choisis().has(r.id));
    }
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
      c.el.title = `Envoyer les régiments choisis dans ${c.nom}${att ? ` : ${att} attaquants contre ${def} défenseurs` : ''}`;
      c.el.classList.toggle('choisi', rs.some(r => choisis().has(r.id)));
    }
  }
  return {
    construire: construireCarte, maj: majCarte,
    get cases() { return carteCases; },        // { idx, s, nom, el, ... } : une case par ligne et par secteur
  };
}
