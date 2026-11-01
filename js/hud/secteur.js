// Le gros plan d'un secteur (Jérôme, v0.76.0 : « en cliquant sur un secteur de la carte, le détail de ce qui s'y passe » ; v0.100.0 : « un clic sur C2 cadre la vue 3D sur ce seul secteur ET la carte
// n'affiche plus que ce secteur en gros plan, avec un retour clair à la vue d'ensemble »). Un papier à la place de la carte : un plan vu de dessus du SEUL secteur choisi (plus de voisins :
// ils ont leur lettre au-dessus), les hommes de chaque camp (un point par homme), les tombés (un point d'os pâle), les tranchées par tronçon à la couleur de celui qui les tient (en pointillé quand
// l'autre camp y est entré), les régiments en cercles numérotés ; dessous, les effectifs, les pertes et la liste des régiments présents. On en sort par « Vue d'ensemble », par Échap, ou en
// recliquant la lettre du secteur ; la vue 3D revient où elle était (main.js).
// Lecture seule de l'état ; le dessin d'un canvas 2D, palette du jeu. Comme la carte, tourné d'un demi-tour pour l'invité d'une partie à deux.
// L'échelle n'est pas la même en x et en y (un secteur fait 100 m de large pour ~220 m de profondeur : à l'échelle, il serait un ruban) : le plan est un schéma, pas une carte au mètre.
import { NOUS, EUX, zone, largeurZone, nombreZones, lettreZone } from '../bataille.js?v=0.104.1';
import { ligneY } from '../tranchees.js?v=0.104.1';
import { PALETTE as P } from '../palette.js?v=0.104.1';
import { numeroDe } from './lecture.js?v=0.104.1';

const L = 336, H = 192;                  // le canvas, en pixels

export function creerSecteur({ $, bataille, moi = () => NOUS, surSecteur = () => {}, surFermer = () => {} }) {
  let ouvert = null, cle = '';          // le secteur montré (1 à n), la signature du dernier dessin
  const cv = $('secteur-plan'), g = cv.getContext('2d');
  cv.width = L; cv.height = H;

  // les hommes d'un secteur : [nous, eux] (vivants) et les tombés [nous, eux, aujourd'hui nous, aujourd'hui eux]
  function compte(B, a, b) {
    const A = B.armee, n = [0, 0];
    for (let i = 0; i < A.n; i++) if (A.x[i] >= a && A.x[i] < b) n[A.camp[i]]++;
    return n;
  }
  function tombes(B, a, b) {
    const t = [0, 0, 0, 0], j = B.etat.jour;
    for (const [cx, , camp, jour] of B.etat.corps) { const x = cx / 10; if (x >= a && x < b) { t[camp]++; if (jour === j) t[2 + camp]++; } }
    return t;
  }
  function dessiner(B) {
    const Z = zone(B), w = largeurZone(B), s = ouvert, M = moi(), tourne = M === EUX;
    const sx0 = Z.x0 + (s - 1) * w, sx1 = sx0 + w, A = B.armee;
    // la hauteur montrée : du fond de la 2e ligne d'un camp à celle de l'autre (là où sont les hommes) ; le secteur remplit toute la largeur
    const ys = B.lignes.filter(l => l.rang <= 1).map(l => l.y0), y0 = Math.min(...ys) - 14, y1 = Math.max(...ys) + 14;
    const kx = L / w, ky = H / (y1 - y0);
    const px = x => { const u = (x - sx0) * kx; return tourne ? L - u : u; };
    const py = y => { const u = (y - y0) * ky; return tourne ? H - u : u; };
    g.fillStyle = P.s; g.fillRect(0, 0, L, H);
    // les tombés de ce secteur : un point d'os pâle (la brume), les plus anciens sous les hommes
    g.fillStyle = P.g;
    let dessines = 0;
    for (const [cx, cy] of B.etat.corps) {
      const x = cx / 10, y = cy / 10;
      if (x < sx0 || x >= sx1 || y < y0 || y > y1 || dessines++ > 1500) continue;
      g.fillRect(Math.round(px(x)) - 1, Math.round(py(y)), 3, 1);
    }
    // les tranchées, par tronçon (et un repère à chaque limite de tronçon : 25 m)
    g.lineCap = 'butt';
    B.troncons.forEach((t, i) => {
      if (t.x1 <= sx0 || t.x0 >= sx1) return;
      const tient = B.etat.troncons[i], ligne = B.lignes[t.ligne];
      g.beginPath();
      const a = Math.max(t.x0, sx0), b = Math.min(t.x1, sx1);
      for (let x = a; x <= b + 0.5; x += 4) { const X = px(Math.min(x, b)), Y = py(ligneY(ligne, Math.min(x, b))); if (x === a) g.moveTo(X, Y); else g.lineTo(X, Y); }
      g.strokeStyle = P.t; g.lineWidth = 7; g.stroke();
      g.strokeStyle = tient === NOUS ? P.n : P.x; g.lineWidth = 3; g.setLineDash(B.disputes[i] ? [6, 4] : []); g.stroke(); g.setLineDash([]);
    });
    // le nom de chaque ligne, à gauche, et la largeur du no man's land entre les deux premières
    g.font = 'bold 11px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const ecrire = (texte, X, Y, c = P.o) => { g.lineWidth = 3; g.strokeStyle = P.t; g.strokeText(texte, X, Y); g.fillStyle = c; g.fillText(texte, X, Y); };
    const premieres = [];
    for (const l of B.lignes) {
      if (l.rang > 1) continue;
      const ok = l.camp === M, yl = ligneY(l, (sx0 + sx1) / 2);
      ecrire(`${ok ? 'Nos' : 'Leurs'} ${l.rang === 0 ? '1res' : '2es'} tranchées`, 4, py(yl) + (tourne === ok ? 17 : -8), ok ? P.n : P.x);
      if (l.rang === 0) premieres.push(yl);
    }
    if (premieres.length === 2) { g.textAlign = 'center'; ecrire(`no man's land : ${Math.round(Math.abs(premieres[0] - premieres[1]))} m`, L / 2, (py(premieres[0]) + py(premieres[1])) / 2 + 3, P.r); g.textAlign = 'left'; }
    // les hommes : un point par homme, nous en bleu horizon, en face en kaki clair ; un blessé en os au centre
    for (let i = 0; i < A.n; i++) {
      const x = A.x[i], y = A.y[i];
      if (x < sx0 || x >= sx1 || y < y0 || y > y1) continue;
      g.fillStyle = A.camp[i] === NOUS ? P.n : P.x;
      g.fillRect(Math.round(px(x)) - 1, Math.round(py(y)) - 1, 3, 3);
      if (A.blessure[i]) { g.fillStyle = P.o; g.fillRect(Math.round(px(x)), Math.round(py(y)), 1, 1); }
    }
    // les régiments : un cercle numéroté au centre de ses hommes présents dans le secteur
    const C = new Map();
    for (let i = 0; i < A.n; i++) { const x = A.x[i]; if (x < sx0 || x >= sx1) continue; const c = C.get(A.reg[i]) || C.set(A.reg[i], { x: 0, y: 0, n: 0 }).get(A.reg[i]); c.x += x; c.y += A.y[i]; c.n++; }
    g.font = '11px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [id, c] of C) {
      if (c.n < 3) continue;
      const r = B.etat.regiments[id], X = px(c.x / c.n), Y = py(c.y / c.n);
      g.beginPath(); g.arc(X, Y, 10, 0, 7); g.fillStyle = P.t; g.fill(); g.lineWidth = 2; g.strokeStyle = r.camp === NOUS ? P.n : P.x; g.stroke();
      g.fillStyle = P.o; g.fillText(r.camp === NOUS ? String(numeroDe(B, r)) : '·', X, Y + 0.5);
    }
    g.fillStyle = P.g; g.font = '10px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(tourne ? 'en face au sud' : 'en face au nord', 4, H - 8);
    g.textAlign = 'right'; g.fillText(`${Math.round(w)} m de large`, L - 4, H - 8);
  }

  // les chiffres du secteur : les hommes de chaque camp, les tranchées, les pertes
  function resume(B) {
    const w = largeurZone(B), Z = zone(B), M = moi(), x0 = Z.x0 + (ouvert - 1) * w, [nous, eux] = compte(B, x0, x0 + w), miens = M === NOUS ? nous : eux, leurs = M === NOUS ? eux : nous;
    let tenus = 0, total = 0, disputes = 0;
    B.troncons.forEach((t, i) => { if ((t.x0 + t.x1) / 2 >= x0 && (t.x0 + t.x1) / 2 < x0 + w) { total++; if (B.etat.troncons[i] === M) tenus++; if (B.disputes[i]) disputes++; } });
    const [tn, te, jn, je] = tombes(B, x0, x0 + w), [m, l, jm, jl] = M === NOUS ? [tn, te, jn, je] : [te, tn, je, jn];
    return [
      `Hommes ici : ${miens} à nous, ${leurs} en face.`,
      `Tranchées : ${tenus} tronçons à nous, ${total - tenus} à eux${disputes ? `, ${disputes} disputé${disputes > 1 ? 's' : ''}` : ''}.`,
      `Tombés ici : ${m} des nôtres, ${l} en face (aujourd'hui : ${jm} et ${jl}).`,
    ];
  }
  // les régiments dans le secteur : leur numéro, leur nom, combien d'hommes y sont (et combien en tout)
  function regiments(B) {
    const w = largeurZone(B), Z = zone(B), x0 = Z.x0 + (ouvert - 1) * w, A = B.armee, M = moi(), ici = new Map(), tous = new Map();
    for (let i = 0; i < A.n; i++) {
      if (A.mort[i]) continue;
      tous.set(A.reg[i], (tous.get(A.reg[i]) || 0) + 1);
      if (A.x[i] >= x0 && A.x[i] < x0 + w) ici.set(A.reg[i], (ici.get(A.reg[i]) || 0) + 1);
    }
    return [...ici].sort((a, b) => b[1] - a[1]).map(([id, n]) => {
      const r = B.etat.regiments[id], nous = r.camp === M;
      return { nous, texte: `${nous ? `${numeroDe(B, r)} · ${r.nom}` : `En face : régiment ${numeroDe(B, r)}`} : ${n} homme${n > 1 ? 's' : ''} ici${n < tous.get(id) ? ` (${tous.get(id)} en tout)` : ''}${r.deroute ? ' · EN DÉROUTE' : ''}` };
    });
  }
  // les lettres des secteurs : celle du secteur montré est enfoncée ; la recliquer ferme le gros plan, une autre y passe
  function lettres(B) {
    const n = nombreZones(B), M = moi(), ordre = Array.from({ length: n }, (_, k) => (M === EUX ? n - k : k + 1));
    $('secteur-lettres').replaceChildren(...ordre.map(s => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `sect${s === ouvert ? ' ici' : ''}`; b.textContent = lettreZone(s); b.setAttribute('aria-pressed', String(s === ouvert));
      b.dataset.info = s === ouvert ? `Revenir à la vue d'ensemble` : `Passer au secteur ${lettreZone(s)}`;
      b.onclick = () => (s === ouvert ? fermer() : surSecteur(s));
      return b;
    }));
  }
  function maj() {
    const B = bataille();
    if (ouvert === null || !B) return;
    const c = `${ouvert}|${B.etat.ticks}|${B.etat.jour}`;
    if (c === cle) return;
    cle = c;
    dessiner(B);
    $('secteur-titre').textContent = `Secteur ${lettreZone(ouvert)}`;
    $('secteur-lignes').replaceChildren(...resume(B).map(t => Object.assign(document.createElement('p'), { textContent: t })));
    $('secteur-regs').replaceChildren(...regiments(B).map(r => Object.assign(document.createElement('li'), { className: r.nous ? 'nous' : 'eux', textContent: r.texte })));
  }
  // le gros plan prend la place de la carte (Jérôme, v0.76.0) : elle revient quand on le ferme, et la vue 3D avec elle (`surFermer`)
  function montrer(s) { ouvert = s; cle = ''; $('secteur').hidden = false; $('carte').classList.add('remplacee'); lettres(bataille()); maj(); }
  function fermer(rendre = true) {
    const etait = ouvert !== null;
    ouvert = null; cle = ''; $('secteur').hidden = true; $('carte').classList.remove('remplacee');
    if (etait && rendre) surFermer();
  }
  $('secteur-fermer').onclick = () => fermer();
  return { montrer, fermer, maj, get ouvert() { return ouvert; } };
}
