/* Le tir du joueur dans la vue d'un soldat (Jérôme, v0.147.0) : la logique, pure. La demande vient de l'écran (`B.pilotes[camp].tir = { d: [dx, dy], el }`, un vecteur unitaire dans le plan du sol et l'angle de la visée
   au-dessus de l'horizon), jamais sauvegardée ; un pas la consomme ici, après `pasArmee`. **Un pilote par camp** (v0.148.0, le jeu à deux : chaque commandant peut prendre la place d'un de ses hommes) : `B.pilotes[camp]`,
   que seules les commandes `pilote` et `tir` posent (`commanderPilote`), au même cadre chez les deux joueurs. Le rayon part de l'œil du tireur (1,6 m) ; le relief l'arrête (une case plus haute que le rayon) ; le premier homme d'en face
   qu'il traverse (largeur d'un corps, de ses pieds à sa tête) est touché avec une chance, et frappé comme par n'importe quel tir (`frapper` : un blessé ou un mort, crédité au tireur). Rend dans `B.pilotes[camp].dernier`
   ce que l'écran doit montrer : { n (le coup), touche, mort }, et dans `B.pilotes[camp].refus` pourquoi un coup n'est pas parti. Sans le hasard de la graine hors d'un coup tiré. */
import { hauteurQ } from './terrain.js?v=0.149.3';
import { gagner } from './army.js?v=0.149.3';
import { TIR_JOUEUR as TJ } from './data/tir-joueur.js?v=0.149.3';

/* La hauteur de l'œil de l'homme debout en (x, y) au-dessus de ses pieds : 1,6 m, et la banquette de tir dans une tranchée (`T.diff` ≤ −2 quarts : creusée) */
export function hauteurOeil(T, x, y) { const c = (y | 0) * T.W + (x | 0); return TJ.oeil + (T.diff[c] <= -2 ? TJ.banquette : 0); }

/* Les commandes du joueur dans la vue d'un soldat, les mêmes seul ou à deux (`executerCmd` de main.js les passe au lockstep) :
   { id, cap, av, la } : marcher (le cap du regard en radians, av : −1 reculer / 1 avancer, la : −1 gauche / 1 droite) ; { fin: true } : rendre l'homme ; { tir: true, cap, el } : un coup.
   Un homme qui n'est pas de ce camp, ou qui ne vit plus, ne se pilote pas. Rend '' ou la raison du refus. */
export function commanderPilote(B, camp, c) {
  B.pilotes ??= [null, null];
  if (c.fin) { B.pilotes[camp] = null; return ''; }
  const P = B.pilotes[camp];
  if (c.tir) { if (!P) return 'Personne à piloter.'; P.tir = { d: [Math.cos(c.cap), Math.sin(c.cap)], el: c.el }; return ''; }
  const A = B.armee; let i = -1;
  if (P && P.id === c.id) i = 0; else for (let k = 0; k < A.n; k++) if (A.id[k] === c.id) { i = k; break; }
  if (i < 0 || (P?.id !== c.id && (A.camp[i] !== camp || A.mort[i]))) return 'Cet homme n\'est plus à vous.';
  const nv = P?.id === c.id ? P : (B.pilotes[camp] = { id: c.id, ax: 0, ay: 0, tir: null, dernier: null, refus: null });
  const av = Math.max(-1, Math.min(1, c.av || 0)), la = Math.max(-1, Math.min(1, c.la || 0));
  nv.ax = av * Math.cos(c.cap) - la * Math.sin(c.cap); nv.ay = av * Math.sin(c.cap) + la * Math.cos(c.cap);
  return '';
}

export function tirerJoueur(B, ctx, rng) {
  for (const P of B.pilotes ?? []) if (P && P.tir) tirDe(B, ctx, rng, P);
}
function tirDe(B, ctx, rng, P) {
  const demande = P.tir; P.tir = null;
  const A = B.armee, { T, R } = ctx, W = T.W, H = T.H;
  let i = -1; for (let k = 0; k < A.n; k++) if (A.id[k] === P.id) { i = k; break; }
  if (i < 0 || A.mort[i]) return;
  if (A.blessure[i] === 1) { P.refus = 'Son bras est blessé : il ne peut plus épauler.'; return; }
  if (A.tirT[i] > 0) { P.refus = 'Le fusil n\'est pas rechargé.'; return; }
  A.tirT[i] = TJ.periode;
  A.fatB[i] = Math.min(1, A.fatB[i] + R.soldat.fatigueTir);
  A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
  gagner(A, i, 'adresse', R.progression.tir, R.progression);
  const [dx, dy] = demande.d, tg = Math.tan(demande.el), x0 = A.x[i], y0 = A.y[i];
  const caseDe = (x, y) => ((y | 0) * W + (x | 0)), oeil = hauteurOeil(T, x0, y0);
  const hq0 = hauteurQ(T, caseDe(x0, y0));
  // le relief : la première case plus haute que le rayon
  let tFin = TJ.portee;
  for (let s = 1; s <= TJ.portee; s++) {
    const x = x0 + dx * s, y = y0 + dy * s;
    if (x < 0 || y < 0 || x >= W || y >= H) { tFin = s; break; }
    if ((hauteurQ(T, caseDe(x, y)) - hq0) * 0.25 > oeil + s * tg) { tFin = s; break; }
  }
  // le premier homme d'en face dans le rayon
  let j = -1, tj = Infinity;
  for (let k = 0; k < A.n; k++) {
    if (A.camp[k] === A.camp[i] || A.mort[k]) continue;
    const rx = A.x[k] - x0, ry = A.y[k] - y0, t = rx * dx + ry * dy;
    if (t < 1 || t > tFin || t >= tj || Math.abs(rx * dy - ry * dx) > TJ.rayon) continue;
    const sol = (hauteurQ(T, caseDe(A.x[k], A.y[k])) - hq0) * 0.25, h = oeil + t * tg, taille = A.peur[k] >= R.soldat.terreur ? TJ.tapi : TJ.haut;
    if (h < sol || h > sol + taille) continue;
    j = k; tj = t;
  }
  const dernier = { n: (P.dernier?.n ?? 0) + 1, touche: false, mort: false, vise: j >= 0, t: Math.round((j >= 0 ? tj : tFin) * 10) / 10 };
  if (j >= 0) {
    const chance = TJ.base * (1 - TJ.perte * tj / TJ.portee) * (0.7 + 0.6 * A.adresse[i] / 100) * (1 - TJ.peur * A.peur[i]) * (1 - TJ.fatigue * A.fatB[i]);
    if (rng() < chance) {
      gagner(A, i, 'adresse', R.progression.toucheTir, R.progression);
      ctx.frapper(j, 'tir', R.soldat.mortelTir, null, i);
      dernier.touche = true; dernier.mort = !!A.mort[j];
    } else A.peur[j] = Math.max(A.peur[j], TJ.frayeur);
  }
  const t = j >= 0 ? tj : tFin;
  if (ctx.tir) ctx.tir(i, x0 + dx * t, y0 + dy * t);      // pour le dessin : le trait de la balle, le bruit (jamais l'état)
  P.dernier = dernier;
}
