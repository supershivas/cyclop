/* Le tir du joueur dans la vue d'un soldat (Jérôme, v0.147.0) : la logique, pure. La demande vient de l'écran (`B.pilotes[camp].tir = { d: [dx, dy], el }`, un vecteur unitaire dans le plan du sol et l'angle de la visée
   au-dessus de l'horizon), jamais sauvegardée ; un pas la consomme ici, après `pasArmee`. **Un pilote par camp** (v0.148.0, le jeu à deux : chaque commandant peut prendre la place d'un de ses hommes) : `B.pilotes[camp]`,
   que seules les commandes `pilote` et `tir` posent (`commanderPilote`), au même cadre chez les deux joueurs. Le rayon part de l'œil du tireur (1,6 m) ; le relief l'arrête (une case plus haute que le rayon) ; le premier homme d'en face
   qu'il traverse est touché là où la balle passe (la tête, le tronc, un bras, les jambes : v0.151.0, plus de jet de dés pour toucher, la balle part où est le guidon, `balancement`), et frappé comme par
   n'importe quel tir (`frapper` : un blessé ou un mort selon l'endroit, crédité au tireur). Un magasin par pilote (Lebel 8 + 1, Mauser 5), rechargé à la demande. Rend dans `B.pilotes[camp].dernier`
   ce que l'écran doit montrer : { n (le coup), touche, mort, zone }, et dans `B.pilotes[camp].refus` pourquoi un coup n'est pas parti. */
import { hauteurQ } from './terrain.js?v=0.151.0';
import { gagner } from './army.js?v=0.151.0';
import { hash2 } from './lib/rng.js?v=0.151.0';
import { TIR_JOUEUR as TJ } from './data/tir-joueur.js?v=0.151.0';

/* La hauteur de l'œil de l'homme debout en (x, y) au-dessus de ses pieds : 1,6 m, et la banquette de tir dans une tranchée (`T.diff` ≤ −2 quarts : creusée) */
export function hauteurOeil(T, x, y) { const c = (y | 0) * T.W + (x | 0); return TJ.oeil + (T.diff[c] <= -2 ? TJ.banquette : 0); }

/* Le balancement du guidon (v0.151.0, la vraie visée) : [écart du cap, écart de l'élévation] en radians, pour l'homme `i` au temps de jeu `temps`. Une fonction pure, sans hasard ni trigonométrie
   (deux ondes lissées tirées par hachage du numéro de l'homme) : l'écran y pose la caméra, la simulation y fait partir la balle ; seul ou au même cadre à deux, c'est le même nombre. */
const onde = (id, t, f, s) => { const u = t * f, k = Math.floor(u), w = u - k, a = hash2(id, k, s) * 2 - 1, b = hash2(id, k + 1, s) * 2 - 1; return a + (b - a) * w * w * (3 - 2 * w); };
export function amplitude(A, i, epaule = false) {
  const G = TJ.balance;
  return G.base * (1 + G.peur * A.peur[i] + G.fatigue * A.fatB[i] + (A.blessure[i] === 1 ? G.bras : 0)) * (G.adresse0 - G.adresse * A.adresse[i] / 100) * (epaule ? G.epaule : 1);
}
export function balancement(A, i, temps, epaule = false) {
  const G = TJ.balance, a = amplitude(A, i, epaule), id = A.id[i], v = G.partVif;
  return [a * ((1 - v) * onde(id, temps, G.lent, 11) + v * onde(id, temps, G.vif, 12)), a * 0.8 * ((1 - v) * onde(id, temps, G.lent * 0.9, 13) + v * onde(id, temps, G.vif * 1.1, 14))];
}
/* L'arme du camp et ce qu'il reste dans le magasin d'un pilote (un pilote neuf a le magasin plein) */
export const armeDe = camp => TJ.armes[camp] ?? TJ.armes[0];

/* Les commandes du joueur dans la vue d'un soldat, les mêmes seul ou à deux (`executerCmd` de main.js les passe au lockstep) :
   { id, cap, av, la } : marcher (le cap du regard en radians, av : −1 reculer / 1 avancer, la : −1 gauche / 1 droite) ; { fin: true } : rendre l'homme ; { tir: true, cap, el } : un coup ;
   { epaule: true | false } : épauler ou baisser le fusil ; { recharge: true } : recharger.
   Un homme qui n'est pas de ce camp, ou qui ne vit plus, ne se pilote pas. Rend '' ou la raison du refus. */
const pas = P => { const f = P.epaule ? TJ.epaule.marche : 1, c = Math.cos(P.cap), s = Math.sin(P.cap); P.ax = f * (P.av * c - P.la * s); P.ay = f * (P.av * s + P.la * c); };
export function commanderPilote(B, camp, c) {
  B.pilotes ??= [null, null];
  if (c.fin) { B.pilotes[camp] = null; return ''; }
  const P = B.pilotes[camp];
  if (c.tir) { if (!P) return 'Personne à piloter.'; P.tir = { cap: c.cap, el: c.el }; return ''; }
  if (c.epaule !== undefined) { if (!P) return 'Personne à piloter.'; P.epaule = !!c.epaule; pas(P); return ''; }
  if (c.recharge) {
    if (!P) return 'Personne à piloter.';
    if ((P.balles ?? armeDe(camp).balles) >= armeDe(camp).balles) return 'Le magasin est plein.';
    if (!P.recharge) { P.recharge = true; P.rt = 0; }
    return '';
  }
  const A = B.armee; let i = -1;
  if (P && P.id === c.id) i = 0; else for (let k = 0; k < A.n; k++) if (A.id[k] === c.id) { i = k; break; }
  if (i < 0 || (P?.id !== c.id && (A.camp[i] !== camp || A.mort[i]))) return 'Cet homme n\'est plus à vous.';
  const nv = P?.id === c.id ? P : (B.pilotes[camp] = { id: c.id, ax: 0, ay: 0, cap: 0, av: 0, la: 0, tir: null, dernier: null, refus: null, epaule: false, balles: armeDe(camp).balles, recharge: false, rt: 0 });
  nv.cap = c.cap; nv.av = Math.max(-1, Math.min(1, c.av || 0)); nv.la = Math.max(-1, Math.min(1, c.la || 0));
  pas(nv);
  return '';
}

/* Un pas : le rechargement en cours, puis le coup demandé */
export function tirerJoueur(B, ctx, rng) {
  for (const P of B.pilotes ?? []) {
    if (!P) continue;
    if (P.recharge) recharger(B, ctx, P);
    if (P.tir) tirDe(B, ctx, rng, P);
  }
}
function indice(A, id) { for (let k = 0; k < A.n; k++) if (A.id[k] === id) return k; return -1; }
function recharger(B, ctx, P) {
  const A = B.armee, i = indice(A, P.id); if (i < 0) return;
  const W = armeDe(A.camp[i]); P.balles ??= W.balles; P.rt = (P.rt ?? 0) + ctx.dt;
  if (W.lame) { if (P.rt >= W.lame) { P.balles = W.balles; P.recharge = false; } }
  else while (P.rt >= W.cartouche && P.balles < W.balles) { P.balles++; P.rt -= W.cartouche; }
  if (P.balles >= W.balles) { P.recharge = false; P.rt = 0; }
}
/* Où le rayon traverse l'homme : `q` la hauteur en part de sa taille (0 les pieds, 1 le haut du casque), `lat` l'écart au milieu de son corps (m). Rend la zone, ou null (à côté de lui) */
export function zoneTouchee(q, lat) {
  if (q < 0 || q > 1) return null;
  const z = TJ.zones.find(z => q <= z.jusqua);
  if (lat <= z.large) return z;
  if (z.nom === 'tronc' && lat <= TJ.bras.large) return { nom: 'bras', ...TJ.bras };
  return null;
}
function tirDe(B, ctx, rng, P) {
  const demande = P.tir; P.tir = null;
  const A = B.armee, { T, R } = ctx, W = T.W, H = T.H;
  const i = indice(A, P.id);
  if (i < 0 || A.mort[i]) return;
  if (A.blessure[i] === 1) { P.refus = 'Son bras est blessé : il ne peut plus épauler.'; return; }
  const arme = armeDe(A.camp[i]); P.balles ??= arme.balles;
  if (P.balles <= 0) { P.refus = 'Le magasin est vide : il recharge.'; if (!P.recharge) { P.recharge = true; P.rt = 0; } return; }
  if (A.tirT[i] > 0) { P.refus = 'Le fusil n\'est pas rechargé.'; return; }
  A.tirT[i] = TJ.periode; P.balles--; P.recharge = false; P.rt = 0;
  A.fatB[i] = Math.min(1, A.fatB[i] + R.soldat.fatigueTir);
  A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
  gagner(A, i, 'adresse', R.progression.tir, R.progression);
  // la balle part où est le guidon : le regard, le balancement de l'homme à cet instant, la dispersion de l'arme
  const [bc, be] = balancement(A, i, B.etat.temps, P.epaule);
  const cap0 = demande.cap ?? Math.atan2(demande.d[1], demande.d[0]);
  const cap = cap0 + bc + (rng() * 2 - 1) * TJ.dispersion, el = demande.el + be + (rng() * 2 - 1) * TJ.dispersion;
  const dx = Math.cos(cap), dy = Math.sin(cap), tg = Math.tan(el), x0 = A.x[i], y0 = A.y[i];
  const caseDe = (x, y) => ((y | 0) * W + (x | 0)), oeil = hauteurOeil(T, x0, y0);
  const hq0 = hauteurQ(T, caseDe(x0, y0));
  // le relief : la première case plus haute que le rayon
  let tFin = TJ.portee;
  for (let s = 1; s <= TJ.portee; s++) {
    const x = x0 + dx * s, y = y0 + dy * s;
    if (x < 0 || y < 0 || x >= W || y >= H) { tFin = s; break; }
    if ((hauteurQ(T, caseDe(x, y)) - hq0) * 0.25 > oeil + s * tg) { tFin = s; break; }
  }
  // le premier homme d'en face que le rayon traverse, et où ; le plus proche du rayon qu'elle frôle (sa peur)
  let j = -1, tj = Infinity, zj = null, fr = -1, frl = TJ.frole;
  for (let k = 0; k < A.n; k++) {
    if (A.camp[k] === A.camp[i] || A.mort[k]) continue;
    const rx = A.x[k] - x0, ry = A.y[k] - y0, t = rx * dx + ry * dy;
    if (t < 1 || t > tFin || t >= tj) continue;
    const lat = Math.abs(rx * dy - ry * dx); if (lat > TJ.frole) continue;
    const sol = (hauteurQ(T, caseDe(A.x[k], A.y[k])) - hq0) * 0.25, h = oeil + t * tg, taille = A.peur[k] >= R.soldat.terreur ? TJ.tapi : TJ.haut;
    const z = lat <= TJ.rayon ? zoneTouchee((h - sol) / taille, lat) : null;
    if (z) { j = k; tj = t; zj = z; }
    else if (lat < frl && h > sol - 0.5 && h < sol + taille + 1) { fr = k; frl = lat; }
  }
  const dernier = { n: (P.dernier?.n ?? 0) + 1, touche: false, mort: false, vise: j >= 0, zone: zj?.nom ?? '', t: Math.round((j >= 0 ? tj : tFin) * 10) / 10 };
  if (j >= 0) {
    gagner(A, i, 'adresse', R.progression.toucheTir, R.progression);
    ctx.frapper(j, 'tir', zj.mortel, null, i, -1, { zone: zj.nom, blessure: zj.blessure });
    dernier.touche = true; dernier.mort = !!A.mort[j];
  } else if (fr >= 0) A.peur[fr] = Math.max(A.peur[fr], TJ.frayeur);
  const t = j >= 0 ? tj : tFin;
  if (ctx.tir) ctx.tir(i, x0 + dx * t, y0 + dy * t);      // pour le dessin : le trait de la balle, le bruit (jamais l'état)
  P.dernier = dernier;
}
