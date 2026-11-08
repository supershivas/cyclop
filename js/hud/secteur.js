// Le gros plan d'un secteur (Jérôme, v0.76.0 : « en cliquant sur un secteur de la carte, le détail de ce qui s'y passe » ; v0.100.0 : « un clic sur C2 cadre la vue 3D sur ce seul secteur ET la carte
// n'affiche plus que ce secteur en gros plan, avec un retour clair à la vue d'ensemble » ; v0.108.0 : « un secteur est UNE CASE de la carte, B1 par exemple : le plan de cette case seulement, en gros
// plan, avec le placement des soldats ; on peut cliquer sur les cases voisines pour avoir le même aperçu »). Un papier à la place de la carte : un plan vu de dessus de la SEULE case choisie (100 m de
// large sur ~57 m de profondeur, à l'échelle : un mètre fait autant en x qu'en y), les hommes de chaque camp (un point par homme), les tombés (un point d'os pâle), les tranchées par tronçon à la
// couleur de celui qui les tient (en pointillé quand l'autre camp y est entré), les régiments en cercles numérotés ; dessous, les effectifs, les pertes et la liste des régiments présents. Quatre
// boutons mènent aux cases voisines (la grille de la carte : gauche, droite, haut, bas). On en sort par « Vue d'ensemble » ou par Échap ; la vue 3D revient où elle était (main.js).
// Lecture seule de l'état ; le dessin d'un canvas 2D, palette du jeu. Comme la carte, tourné d'un demi-tour pour l'invité d'une partie à deux.
import { NOUS, EUX, zone, largeurZone, lettreZone, tronconsDeLigne, codeLigne } from '../bataille.js?v=0.124.0';
import { ligneY } from '../tranchees.js?v=0.124.0';
import { PALETTE as P } from '../palette.js?v=0.124.0';
import { numeroDe } from './lecture.js?v=0.124.0';
import { rangees } from './carte.js?v=0.124.0';

const L = 336, H = 192;                  // le canvas, en pixels

// la case (colonne s de 1 à n, ligne idx de `B.lignes`) en mètres : l'étendue en x, en y, et le nom
export function caseDe(B, s, idx, M = NOUS) {
  const Z = zone(B), w = largeurZone(B), x0 = Z.x0 + (s - 1) * w, x1 = x0 + w, ligne = B.lignes[idx];
  const yc = (ligneY(ligne, x0) + ligneY(ligne, (x0 + x1) / 2) + ligneY(ligne, x1)) / 3, demi = (H / (L / w)) / 2;
  return { s, idx, x0, x1, y0: yc - demi, y1: yc + demi, yc, nom: `${lettreZone(s)}${codeLigne(ligne, M)}`, ligne };
}

export function creerSecteur({ $, bataille, moi = () => NOUS, surSecteur = () => {}, surFermer = () => {} }) {
  let ouvert = null, cle = '';          // la case montrée { s, idx }, la signature du dernier dessin
  const cv = $('secteur-plan'), g = cv.getContext('2d');
  cv.width = L; cv.height = H;
  const dedans = (c, x, y) => x >= c.x0 && x < c.x1 && y >= c.y0 && y <= c.y1;

  function dessiner(B, c) {
    const w = c.x1 - c.x0, M = moi(), tourne = M === EUX, A = B.armee, k = L / w;
    const px = x => { const u = (x - c.x0) * k; return tourne ? L - u : u; };
    const py = y => { const u = (y - c.y0) * k; return tourne ? H - u : u; };
    g.fillStyle = P.s; g.fillRect(0, 0, L, H);
    // les tombés de la case : un point d'os pâle (la brume), les plus anciens sous les hommes
    g.fillStyle = P.g;
    let dessines = 0;
    for (const [cx, cy] of B.etat.corps) {
      const x = cx / 10, y = cy / 10;
      if (!dedans(c, x, y) || dessines++ > 1500) continue;
      g.fillRect(Math.round(px(x)) - 1, Math.round(py(y)), 3, 1);
    }
    // les tranchées qui passent dans la case, par tronçon : une bande de terre, le trait de la couleur de qui la tient
    g.lineCap = 'butt'; g.lineJoin = 'round';
    B.troncons.forEach((t, i) => {
      if (t.x1 <= c.x0 || t.x0 >= c.x1) return;
      const tient = B.etat.troncons[i], ligne = B.lignes[t.ligne];
      if (ligneY(ligne, (c.x0 + c.x1) / 2) < c.y0 - 6 || ligneY(ligne, (c.x0 + c.x1) / 2) > c.y1 + 6) return;
      g.beginPath();
      const a = Math.max(t.x0, c.x0), b = Math.min(t.x1, c.x1);
      for (let x = a; x <= b + 0.5; x += 4) { const xx = Math.min(x, b), X = px(xx), Y = py(ligneY(ligne, xx)); if (x === a) g.moveTo(X, Y); else g.lineTo(X, Y); }
      g.strokeStyle = P.t; g.lineWidth = 9; g.stroke();
      g.strokeStyle = tient === NOUS ? P.n : P.x; g.lineWidth = 3; g.setLineDash(B.disputes[i] ? [6, 4] : []); g.stroke(); g.setLineDash([]);
    });
    // le nom de chaque ligne visible, à gauche
    g.font = 'bold 12px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const ecrire = (texte, X, Y, col = P.o) => { g.lineWidth = 3; g.strokeStyle = P.t; g.strokeText(texte, X, Y); g.fillStyle = col; g.fillText(texte, X, Y); };
    for (const l of B.lignes) {
      const yl = ligneY(l, (c.x0 + c.x1) / 2);
      if (yl < c.y0 + 4 || yl > c.y1 - 4) continue;
      ecrire(`${lettreZone(c.s)}${codeLigne(l, M)}`, 4, py(yl) + (tourne ? 20 : -8), l.camp === M ? P.n : P.x);
    }
    // les hommes : un point par homme, nous en bleu horizon, en face en kaki clair ; un blessé en os au centre
    for (let i = 0; i < A.n; i++) {
      const x = A.x[i], y = A.y[i];
      if (!dedans(c, x, y)) continue;
      g.fillStyle = A.camp[i] === NOUS ? P.n : P.x;
      g.fillRect(Math.round(px(x)) - 1, Math.round(py(y)) - 1, 3, 3);
      if (A.blessure[i]) { g.fillStyle = P.o; g.fillRect(Math.round(px(x)), Math.round(py(y)), 1, 1); }
    }
    // les régiments : un cercle numéroté au centre de ses hommes présents dans la case
    const C = new Map();
    for (let i = 0; i < A.n; i++) { if (!dedans(c, A.x[i], A.y[i])) continue; const q = C.get(A.reg[i]) || C.set(A.reg[i], { x: 0, y: 0, n: 0 }).get(A.reg[i]); q.x += A.x[i]; q.y += A.y[i]; q.n++; }
    g.font = '11px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [id, q] of C) {
      if (q.n < 3) continue;
      const r = B.etat.regiments[id], X = px(q.x / q.n), Y = py(q.y / q.n);
      g.beginPath(); g.arc(X, Y, 10, 0, 7); g.fillStyle = P.t; g.fill(); g.lineWidth = 2; g.strokeStyle = r.camp === NOUS ? P.n : P.x; g.stroke();
      g.fillStyle = P.o; g.fillText(r.camp === NOUS ? String(numeroDe(B, r)) : '·', X, Y + 0.5);
    }
    g.fillStyle = P.g; g.font = '10px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(tourne ? 'en face au sud' : 'en face au nord', 4, H - 6);
    g.textAlign = 'right'; g.fillText(`${Math.round(w)} m × ${Math.round(c.y1 - c.y0)} m`, L - 4, H - 6);
  }

  // les chiffres de la case : les hommes de chaque camp, le tronçon, les pertes
  function resume(B, c) {
    const A = B.armee, M = moi(), n = [0, 0], t = [0, 0, 0, 0], j = B.etat.jour;
    for (let i = 0; i < A.n; i++) if (dedans(c, A.x[i], A.y[i])) n[A.camp[i]]++;
    for (const [cx, cy, camp, jour] of B.etat.corps) if (dedans(c, cx / 10, cy / 10)) { t[camp]++; if (jour === j) t[2 + camp]++; }
    const ks = tronconsDeLigne(B, c.idx, c.x0, c.x1);
    const tenus = ks.filter(k => B.etat.troncons[k] === M).length, disputes = ks.filter(k => B.disputes[k]).length;
    const [miens, leurs] = M === NOUS ? n : [n[1], n[0]], [m, l, jm, jl] = M === NOUS ? t : [t[1], t[0], t[3], t[2]];
    return [
      `Hommes ici : ${miens} à nous, ${leurs} en face.`,
      `Tranchée ${c.nom} : ${tenus} tronçon${tenus > 1 ? 's' : ''} à nous, ${ks.length - tenus} à eux${disputes ? `, ${disputes} disputé${disputes > 1 ? 's' : ''}` : ''}.`,
      `Tombés ici : ${m} des nôtres, ${l} en face (aujourd'hui : ${jm} et ${jl}).`,
    ];
  }
  // les régiments dans la case : leur numéro, leur nom, combien d'hommes y sont (et combien en tout)
  function regiments(B, c) {
    const A = B.armee, M = moi(), ici = new Map(), tous = new Map();
    for (let i = 0; i < A.n; i++) {
      if (A.mort[i]) continue;
      tous.set(A.reg[i], (tous.get(A.reg[i]) || 0) + 1);
      if (dedans(c, A.x[i], A.y[i])) ici.set(A.reg[i], (ici.get(A.reg[i]) || 0) + 1);
    }
    return [...ici].sort((a, b) => b[1] - a[1]).map(([id, n]) => {
      const r = B.etat.regiments[id], nous = r.camp === M;
      return { nous, texte: `${nous ? `${numeroDe(B, r)} · ${r.nom}` : `En face : régiment ${numeroDe(B, r)}`} : ${n} homme${n > 1 ? 's' : ''} ici${n < tous.get(id) ? ` (${tous.get(id)} en tout)` : ''}${r.deroute ? ' · EN DÉROUTE' : ''}` };
    });
  }
  // les quatre cases voisines, dans la grille de la carte (gauche, droite, haut, bas) : un bouton chacune, grisé s'il n'y en a pas
  function voisines(B, c) {
    const M = moi(), { lignes, colonnes } = rangees(B, M), a = colonnes.indexOf(c.s), b = lignes.indexOf(c.idx);
    const vers = [['←', 'à gauche', colonnes[a - 1], c.idx], ['→', 'à droite', colonnes[a + 1], c.idx], ['↑', 'en haut', c.s, lignes[b - 1]], ['↓', 'en bas', c.s, lignes[b + 1]]];
    $('secteur-nav').replaceChildren(...vers.map(([fl, dir, s, idx]) => {
      const ok = s !== undefined && idx !== undefined, nom = ok ? `${lettreZone(s)}${codeLigne(B.lignes[idx], M)}` : '';
      const bt = document.createElement('button');
      bt.type = 'button'; bt.className = 'sect'; bt.textContent = ok ? `${fl} ${nom}` : fl; bt.disabled = !ok;
      bt.setAttribute('aria-label', ok ? `Voisine ${dir} : ${nom}` : `Pas de case ${dir}`);
      if (ok) { bt.dataset.info = `Voir ${nom}`; bt.onclick = () => surSecteur(s, idx); }
      return bt;
    }));
  }
  function maj() {
    const B = bataille();
    if (ouvert === null || !B) return;
    const k = `${ouvert.s}:${ouvert.idx}|${B.etat.ticks}|${B.etat.jour}`;
    if (k === cle) return;
    cle = k;
    const M = moi(), c = caseDe(B, ouvert.s, ouvert.idx, M);
    dessiner(B, c);
    $('secteur-titre').textContent = `Secteur ${c.nom}`;
    $('secteur-sous').textContent = `${c.ligne.camp === M ? 'Notre' : 'Leur'} ${c.ligne.rang === 0 ? '1re' : `${c.ligne.rang + 1}e`} ligne, colonne ${lettreZone(c.s)}`;
    voisines(B, c);
    $('secteur-lignes').replaceChildren(...resume(B, c).map(t => Object.assign(document.createElement('p'), { textContent: t })));
    $('secteur-regs').replaceChildren(...regiments(B, c).map(r => Object.assign(document.createElement('li'), { className: r.nous ? 'nous' : 'eux', textContent: r.texte })));
  }
  // le gros plan prend la place de la carte (Jérôme, v0.76.0) : elle revient quand on le ferme, et la vue 3D avec elle (`surFermer`)
  function montrer(s, idx) { ouvert = { s, idx }; cle = ''; $('secteur').hidden = false; $('carte').classList.add('remplacee'); maj(); }
  function fermer(rendre = true) {
    const etait = ouvert !== null;
    ouvert = null; cle = ''; $('secteur').hidden = true; $('carte').classList.remove('remplacee');
    if (etait && rendre) surFermer();
  }
  $('secteur-fermer').onclick = () => fermer();
  return { montrer, fermer, maj, get ouvert() { return ouvert; } };
}
