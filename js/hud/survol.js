// Le survol du champ (sorti de main.js, lot de dette du 24 nov.) : l'homme sous le pointeur, le terrain sous la souris (le coin du bas),
// le cône d'un nid de mitrailleuse. Du dessin et de la lecture seulement. `creerSurvol(ctx)` rend { hommeSous, majTerrain, majViseeNid }.
import { terrainResume, forcesTroncons } from '../bataille.js?v=0.170.1';
import { etatTranchee } from '../tranchees.js?v=0.170.1';
import { NIDS } from '../data/nids.js?v=0.170.1';

let $, rendu, bataille, moi, nidChoisiDe;
export function creerSurvol(ctx) {
  ({ $, rendu, bataille, moi, nidChoisi: nidChoisiDe } = ctx);
  return { hommeSous, majTerrain, majViseeNid };
}
/* L'homme sous le pointeur (Jérôme, v0.35.0) : son corps entier, des pieds au casque, et non le point de sol sous la souris (la tête, vue de biais, tombait
   derrière lui). Les hommes proches du point visé sont projetés à l'écran (pieds et casque) et le pointeur doit tomber dans leur boîte ; le plus près de
   la ligne pieds-casque gagne, à égalité le plus proche de nous. Rend l'indice dans la foule, ou -1. */
const HAUTEUR_HOMME = 1.8, LARGEUR_HOMME = 0.5;
function hommeSous(px, py) {
  const B = bataille();
  const [gx, gy] = rendu.versTerrain(px, py), A = B.armee;
  if (gx < -1e4) return -1;
  const cssParM = rendu.ppm * rendu.vue.facteur / (window.devicePixelRatio || 1);          // pixels CSS par mètre à l'écran
  const demi = Math.max(5, LARGEUR_HOMME / 2 * cssParM), marge = 4;
  const portee = 3 + HAUTEUR_HOMME / Math.max(0.15, Math.tan(Math.min(1.4, rendu.vue.tangage)));     // le sol que le corps recouvre, vu de biais
  const p2 = portee * portee;
  let best = -1, bd = Infinity, bs = -Infinity;
  for (let i = 0; i < A.n; i++) {
    const dx = A.x[i] - gx, dy = A.y[i] - gy;
    if (dx * dx + dy * dy > p2) continue;
    const h = rendu.hauteurSol(A.x[i], A.y[i]);
    const haut = rendu.versEcran(A.x[i], A.y[i], h + HAUTEUR_HOMME);
    const [fx, fy] = rendu.versEcran(A.x[i], A.y[i], h);
    // la capsule autour du segment pieds-casque (demi-largeur du corps, plus une marge) ; entre deux hommes, celui qui est devant (le plus bas à l'écran)
    const sx = haut[0] - fx, sy = haut[1] - fy, l2 = sx * sx + sy * sy || 1;
    const t = Math.max(0, Math.min(1, ((px - fx) * sx + (py - fy) * sy) / l2));
    const d = Math.hypot(px - (fx + sx * t), py - (fy + sy * t));
    if (d > demi + marge) continue;
    if (fy > bs || (fy === bs && d < bd)) { bd = d; bs = fy; best = i; }
  }
  return best;
}
// le terrain sous la souris, dans un coin (refait seulement quand la case ou ce qu'elle est change)
function majTerrain(x, y) {
  const B = bataille(), MOI = moi();
  const p = $('terrain'), r = x === null ? null : terrainResume(B, x, y);
  if (!r) { p.hidden = true; return; }
  // deux lignes, toujours (Jérôme, v0.100.0 : « les lignes longues sont coupées », « boue 35 % : de quoi ? ») : la première dit ce qu'est le lieu, la seconde son état ; chaque pourcentage porte son libellé
  // (« Marche 35 % » : la vitesse de marche, 100 % sur sol sec ; « Solidité » : ce qui reste de la tranchée) ; sur une tranchée, la première ligne a le nom et « Hommes » (la ligne de vie : nous, en face)
  const el = (classe, html, texte) => { const e = document.createElement('span'); e.className = classe; if (texte !== undefined) e.textContent = texte; else e.innerHTML = html; return e; };
  const rang = (...fils) => { const d = document.createElement('div'); d.className = 'l'; d.append(...fils); return d; };
  let cle, rendu;
  if (r.troncon >= 0) {
    const f = forcesTroncons(B), a = f[r.troncon * 2 + MOI], b = f[r.troncon * 2 + 1 - MOI], tot = a + b;
    // sa solidité (Jérôme, v0.84.0 : une barre de vie pour la tranchée) : ce qui reste de sa forme creusée, en trois mots (Intacte, Abîmée, Bouleversée) ; l'orange et le rouge confirment seulement
    const sol = Math.round(r.solidite * 100), mot = etatTranchee(r.solidite), niveau = mot === 'Intacte' ? '' : mot === 'Abîmée' ? ' abimee' : ' bouleversee';
    cle = `T|${r.tranchee}|${a}|${b}|${sol}`;
    rendu = () => p.replaceChildren(
      rang(el('nom', '', `Tranchée ${r.tranchee}`), el('vit vie', `<span class="lib">Hommes</span><span>${a}</span><i class="plein"><b style="width:${tot ? a / tot * 100 : 0}%;background:var(--jeu-nous)"></b><b style="width:${tot ? b / tot * 100 : 0}%;background:var(--jeu-eux)"></b></i><span>${b}</span>`)),
      rang(el('nom', '', `Solidité : ${mot}`), el(`vit sol${niveau}`, `<i class="plein"><b style="width:${sol}%"></b></i><span>${sol} %</span>`)));
  } else {
    const type = r.relief.join(' · ') || r.objets.slice(0, 2).join(' · ') || 'Terrain ouvert', etat = [r.sol, ...(r.relief.length ? r.objets.slice(0, 1) : r.objets.slice(2, 3))].filter(Boolean).join(' · ');
    cle = `${type}|${etat}|${r.vitesse}`;
    rendu = () => {
      const pc = Math.round(r.vitesse * 100);
      p.replaceChildren(rang(el('nom', '', type)), rang(el('nom', '', etat), el('vit', `<span class="lib">Marche</span><i class="plein"><b style="width:${pc}%"></b></i><span>${pc} %</span>`)));
    };
  }
  if (p.dataset.cle !== cle) { p.dataset.cle = cle; rendu(); }
  p.hidden = false;
}
// La visée d'un nid (Jérôme, v0.83.1) : sous la souris, le cône où sa mitrailleuse tire (portée, ±demiCone rad en avant), posé sur le sol ; une croix sur les hommes d'en face qu'il tient sous son feu ;
// « se tait » quand son tronçon est pris. Le dessin seulement (le calcul est celui de `avancerNids`).
function majViseeNid(x, y) {
  const B = bataille(), nidChoisi = nidChoisiDe();
  const svg = $('visee-nid');
  const survole = x === null ? null : B.etat.nids.find(k => k.etat === 'actif' && Math.abs(k.x - x) < 3 && Math.abs(k.y - y) < 3);
  const n = survole ?? (nidChoisi !== null ? B.etat.nids.find(k => k.id === nidChoisi && k.etat === 'actif') : null);      // (lot E : le poste choisi garde son cône à l'écran)
  if (!n) { if (!svg.hasAttribute('hidden')) { svg.setAttribute('hidden', ''); svg.innerHTML = ''; } return null; }
  const E = (px, py) => rendu.versEcran(px, py), F = ([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`, pts = [E(n.x, n.y)], c2 = Math.cos(NIDS.demiCone), A = B.armee;
  const ax = n.ax ?? 0, ay = n.ay ?? n.face;       // l'axe du cône : face à l'ennemi, ou tourné par le joueur
  for (let k = 0; k <= 16; k++) { const a = (k / 8 - 1) * NIDS.demiCone, co = Math.cos(a), si = Math.sin(a); pts.push(E(n.x + (ax * co - ay * si) * NIDS.portee, n.y + (ax * si + ay * co) * NIDS.portee)); }
  let croix = '', sous = 0;
  for (let i = 0; i < A.n && sous < 400; i++) {
    if (A.mort[i] || A.camp[i] === n.camp) continue;
    const dx = A.x[i] - n.x, dy = A.y[i] - n.y, d = Math.hypot(dx, dy);
    if (d >= NIDS.portee || d < 2 || (dx * ax + dy * ay) / d < c2) continue;
    sous++; const [px, py] = E(A.x[i], A.y[i]); croix += `M${(px - 5).toFixed(1)} ${(py - 5).toFixed(1)}l10 10m0 -10l-10 10`;
  }
  const tait = B.etat.troncons[n.troncon] !== n.camp, [nx, ny] = E(n.x + ax * NIDS.portee, n.y + ay * NIDS.portee);
  svg.innerHTML = `<path class="ombre" d="M${pts.map(F).join('L')}Z"/><path class="zone" d="M${pts.map(F).join('L')}Z"/><g class="croix"><path class="fond" d="${croix}"/><path class="encre" d="${croix}"/></g>`
    + `<text x="${nx.toFixed(1)}" y="${(ny + (ay > 0 ? 16 : -8)).toFixed(1)}" text-anchor="middle">${tait ? 'Se tait : son tronçon est pris' : `${sous} d'en face sous son feu`}</text>`;
  svg.removeAttribute('hidden');
  return survole ?? null;
}
