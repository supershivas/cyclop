// Le détail d'un secteur (Jérôme, v0.76.0 : « en cliquant sur un secteur de la carte, on a le détail de ce qui s'y passe : une vue précise d'où sont les soldats de quelles armées, un aperçu des secteurs voisins »).
// Un papier sous la carte : un plan vu de dessus du secteur choisi et d'une demi-largeur de chaque voisin (assombris), les hommes de chaque camp (un point par homme), les tranchées
// à la couleur de celui qui les tient (en pointillé quand l'autre camp y est entré), les régiments en cercles numérotés ; dessous, une ligne par secteur (celui-ci et ses voisins) avec les effectifs.
// Lecture seule de l'état ; le dessin d'un canvas 2D, palette du jeu. Comme la carte, tourné d'un demi-tour pour l'invité d'une partie à deux.
import { NOUS, EUX, zone, largeurZone, nombreZones, lettreZone, forcesTroncons } from '../bataille.js?v=0.78.1';
import { ligneY } from '../tranchees.js?v=0.78.1';
import { PALETTE as P } from '../palette.js?v=0.78.1';
import { numeroDe } from './lecture.js?v=0.78.1';

const L = 320, H = 200;                  // le canvas, en pixels

export function creerSecteur({ $, bataille, moi = () => NOUS, surSecteur = () => {} }) {
  let ouvert = null, cle = '';          // le secteur montré (1 à n), la signature du dernier dessin
  const cv = $('secteur-plan'), g = cv.getContext('2d');
  cv.width = L; cv.height = H;

  // les hommes et les régiments dans une bande de x [a, b]
  function compte(B, a, b) {
    const A = B.armee, n = [0, 0];
    for (let i = 0; i < A.n; i++) if (A.x[i] >= a && A.x[i] < b) n[A.camp[i]]++;
    return n;
  }
  function dessiner(B) {
    const Z = zone(B), w = largeurZone(B), s = ouvert, M = moi(), tourne = M === EUX;
    const sx0 = Z.x0 + (s - 1) * w, sx1 = sx0 + w, A = B.armee;
    // la hauteur montrée : du fond de la 2e ligne d'un camp à celle de l'autre (là où sont les hommes) ; la largeur en découle, le secteur au centre et ses voisins de part et d'autre
    const ys = B.lignes.filter(l => l.rang <= 1).map(l => l.y0), y0 = Math.min(...ys) - 14, y1 = Math.max(...ys) + 14, cy = (y0 + y1) / 2;
    const ppm = H / (y1 - y0), demi = (y1 - y0) / 2, large = L / ppm, fx0 = (sx0 + sx1) / 2 - large / 2, fx1 = fx0 + large;
    const px = x => { const u = (x - fx0) * ppm; return tourne ? L - u : u; };
    const py = y => { const u = (y - (cy - demi)) * ppm; return tourne ? H - u : u; };
    g.fillStyle = P.s; g.fillRect(0, 0, L, H);
    // les tranchées, par tronçon
    g.lineCap = 'butt';
    B.troncons.forEach((t, i) => {
      if (t.x1 < fx0 || t.x0 > fx1) return;
      const tient = B.etat.troncons[i], ligne = B.lignes[t.ligne];
      g.beginPath();
      for (let x = Math.max(t.x0, fx0); x <= Math.min(t.x1, fx1) + 0.5; x += 4) { const X = px(x), Y = py(ligneY(ligne, x)); if (x === Math.max(t.x0, fx0)) g.moveTo(X, Y); else g.lineTo(X, Y); }
      g.strokeStyle = P.t; g.lineWidth = 5; g.stroke();
      g.strokeStyle = tient === NOUS ? P.n : P.x; g.lineWidth = 1; g.setLineDash(B.disputes[i] ? [5, 4] : []); g.stroke(); g.setLineDash([]);
    });
    // le nom de chaque ligne, à gauche, et la largeur du no man's land entre les deux premières
    g.font = 'bold 11px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const ecrire = (texte, X, Y, c = P.o) => { g.lineWidth = 3; g.strokeStyle = P.t; g.strokeText(texte, X, Y); g.fillStyle = c; g.fillText(texte, X, Y); };
    const premieres = [];
    for (const l of B.lignes) {
      if (l.rang > 1) continue;
      const ok = l.camp === M, yl = ligneY(l, (sx0 + sx1) / 2);
      ecrire(`${ok ? 'Nos' : 'Leurs'} ${l.rang === 0 ? '1res' : '2es'} tranchées`, 4, py(yl) + (tourne === ok ? 12 : -5), ok ? P.n : P.x);
      if (l.rang === 0) premieres.push(yl);
    }
    if (premieres.length === 2) { g.textAlign = 'center'; ecrire(`no man's land : ${Math.round(Math.abs(premieres[0] - premieres[1]))} m`, L / 2, (py(premieres[0]) + py(premieres[1])) / 2 + 3, P.r); g.textAlign = 'left'; }
    // les hommes : un point par homme, nous en bleu horizon, en face en kaki clair ; un blessé en os au centre
    const taille = Math.max(2, Math.round(ppm * 1.6));
    for (let i = 0; i < A.n; i++) {
      const x = A.x[i], y = A.y[i];
      if (x < fx0 || x >= fx1 || y < cy - demi || y > cy + demi) continue;
      g.fillStyle = A.camp[i] === NOUS ? P.n : P.x;
      g.fillRect(Math.round(px(x)) - taille / 2, Math.round(py(y)) - taille / 2, taille, taille);
      if (A.blessure[i]) { g.fillStyle = P.o; g.fillRect(Math.round(px(x)), Math.round(py(y)), 1, 1); }
    }
    // les régiments : un cercle numéroté au centre de ses hommes visibles
    const C = new Map();
    for (let i = 0; i < A.n; i++) { const x = A.x[i]; if (x < fx0 || x >= fx1) continue; const c = C.get(A.reg[i]) || C.set(A.reg[i], { x: 0, y: 0, n: 0 }).get(A.reg[i]); c.x += x; c.y += A.y[i]; c.n++; }
    g.font = '10px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [id, c] of C) {
      if (c.n < 3) continue;
      const r = B.etat.regiments[id], X = px(c.x / c.n), Y = py(c.y / c.n);
      g.beginPath(); g.arc(X, Y, 8, 0, 7); g.fillStyle = P.t; g.fill(); g.lineWidth = 2; g.strokeStyle = r.camp === NOUS ? P.n : P.x; g.stroke();
      g.fillStyle = P.o; g.fillText(r.camp === NOUS ? String(numeroDe(B, r)) : '·', X, Y + 0.5);
    }
    // les voisins assombris et les limites du secteur
    g.fillStyle = 'rgba(22,19,15,0.55)';
    const a = Math.min(px(sx0), px(sx1)), b = Math.max(px(sx0), px(sx1));
    g.fillRect(0, 0, a, H); g.fillRect(b, 0, L - b, H);
    g.strokeStyle = P.o; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(a + 0.5, 0); g.lineTo(a + 0.5, H); g.moveTo(b - 0.5, 0); g.lineTo(b - 0.5, H); g.stroke(); g.setLineDash([]);
    // les lettres des secteurs montrés
    g.fillStyle = P.o; g.textAlign = 'center'; g.font = '12px ui-monospace,monospace';
    const lettre = (sec, x0, x1) => { if (sec >= 1 && sec <= nombreZones(B)) g.fillText(lettreZone(sec), (px(x0) + px(x1)) / 2, 11); };
    lettre(s - 1, sx0 - w, sx0); lettre(s, sx0, sx1); lettre(s + 1, sx1, sx1 + w);
    g.fillStyle = P.g; g.font = '10px ui-monospace,monospace'; g.textAlign = 'left'; g.fillText(tourne ? 'en face au sud' : 'en face au nord', 4, H - 8);
  }

  function lignes(B) {
    const w = largeurZone(B), Z = zone(B), M = moi(), n = nombreZones(B);
    const f = forcesTroncons(B);
    const out = [];
    for (let s = Math.max(1, ouvert - 1); s <= Math.min(n, ouvert + 1); s++) {
      const x0 = Z.x0 + (s - 1) * w, [nous, eux] = compte(B, x0, x0 + w), miens = M === NOUS ? nous : eux, leurs = M === NOUS ? eux : nous;
      let tenus = 0, total = 0, disputes = 0;
      B.troncons.forEach((t, i) => { if ((t.x0 + t.x1) / 2 >= x0 && (t.x0 + t.x1) / 2 < x0 + w) { total++; if (B.etat.troncons[i] === M) tenus++; if (B.disputes[i]) disputes++; } });
      void f;
      out.push({ s, texte: `Secteur ${lettreZone(s)}${s === ouvert ? ' (affiché)' : ''} : ${miens} à nous, ${leurs} en face · tranchées : ${tenus} tronçons à nous, ${total - tenus} à eux${disputes ? `, ${disputes} disputé${disputes > 1 ? 's' : ''}` : ''}`, ici: s === ouvert });
    }
    return out;
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
  function maj() {
    const B = bataille();
    if (ouvert === null || !B) return;
    const c = `${ouvert}|${B.etat.ticks}|${B.etat.jour}`;
    if (c === cle) return;
    cle = c;
    dessiner(B);
    $('secteur-titre').textContent = `Secteur ${lettreZone(ouvert)}`;
    $('secteur-regs').replaceChildren(...regiments(B).map(r => Object.assign(document.createElement('li'), { className: r.nous ? 'nous' : 'eux', textContent: r.texte })));
    $('secteur-lignes').replaceChildren(...lignes(B).map(l => {
      const b = document.createElement('button');
      b.className = `secteur-ligne${l.ici ? ' ici' : ''}`; b.textContent = l.texte; b.onclick = () => surSecteur(l.s);
      return b;
    }));
  }
  // le détail prend la place de la carte (Jérôme, v0.76.0) : elle revient quand on le ferme
  function montrer(s) { ouvert = s; cle = ''; $('secteur').hidden = false; $('carte').classList.add('remplacee'); maj(); }
  function fermer() { ouvert = null; cle = ''; $('secteur').hidden = true; $('carte').classList.remove('remplacee'); }
  $('secteur-fermer').onclick = fermer;
  return { montrer, fermer, maj, get ouvert() { return ouvert; } };
}
