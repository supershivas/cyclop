/* Le tir du joueur dans la vue d'un soldat (Jérôme, v0.147.0) : la logique, pure. La demande vient de l'écran (`B.pilotes[camp].tir = { d: [dx, dy], el }`, un vecteur unitaire dans le plan du sol et l'angle de la visée
   au-dessus de l'horizon), jamais sauvegardée ; un pas la consomme ici, après `pasArmee`. **Un pilote par camp** (v0.148.0, le jeu à deux : chaque commandant peut prendre la place d'un de ses hommes) : `B.pilotes[camp]`,
   que seules les commandes `pilote` et `tir` posent (`commanderPilote`), au même cadre chez les deux joueurs. Le rayon part de l'œil du tireur (1,6 m) ; le relief l'arrête (une case plus haute que le rayon) ; le premier homme d'en face
   qu'il traverse est touché là où la balle passe (la tête, le tronc, un bras, les jambes : v0.151.0, plus de jet de dés pour toucher, la balle part où est le guidon, `balancement`), et frappé comme par
   n'importe quel tir (`frapper` : un blessé ou un mort selon l'endroit, crédité au tireur). Un magasin par pilote (Lebel 8 + 1, Mauser 5), rechargé à la demande. Rend dans `B.pilotes[camp].dernier`
   ce que l'écran doit montrer : { n (le coup), touche, mort, zone }, et dans `B.pilotes[camp].refus` pourquoi un coup n'est pas parti. */
import { hauteurQ } from './terrain.js?v=0.170.1';
import { gagner, tuerDans } from './army.js?v=0.170.1';
import { hash2 } from './lib/rng.js?v=0.170.1';
import { TIR_JOUEUR as TJ } from './data/tir-joueur.js?v=0.170.1';

/* La hauteur de l'œil de l'homme debout en (x, y) au-dessus de ses pieds : 1,6 m, et la banquette de tir dans une tranchée (`T.diff` ≤ −2 quarts : creusée) */
export function hauteurOeil(T, x, y, posture = 0) { const c = (y | 0) * T.W + (x | 0); return posture ? TJ.postures[posture].oeil : TJ.oeil + (T.diff[c] <= -2 ? TJ.banquette : 0); }      // (accroupi ou couché : la banquette ne sert plus)
/* La taille qu'un homme offre aux balles : couché, accroupi (le joueur), tapi par la peur, debout */
export function tailleDe(A, k, R, P = null) { return P?.posture ? TJ.postures[P.posture].taille : A.peur[k] >= R.soldat.terreur ? TJ.tapi : TJ.haut; }

/* Le balancement du guidon (v0.151.0, la vraie visée) : [écart du cap, écart de l'élévation] en radians, pour l'homme `i` au temps de jeu `temps`. Une fonction pure, sans hasard ni trigonométrie
   (deux ondes lissées tirées par hachage du numéro de l'homme) : l'écran y pose la caméra, la simulation y fait partir la balle ; seul ou au même cadre à deux, c'est le même nombre. */
const onde = (id, t, f, s) => { const u = t * f, k = Math.floor(u), w = u - k, a = hash2(id, k, s) * 2 - 1, b = hash2(id, k + 1, s) * 2 - 1; return a + (b - a) * w * w * (3 - 2 * w); };
/* `o` : { epaule, souffle (0 à 1, l'essoufflement de la course), posture } (ou un booléen : épaulé) */
export function amplitude(A, i, o = {}) {
  const G = TJ.balance, { epaule = false, souffle = 0, posture = 0 } = typeof o === 'object' ? o : { epaule: !!o };
  return G.base * (1 + G.peur * A.peur[i] + G.fatigue * A.fatB[i] + (A.blessure[i] === 1 ? G.bras : 0)) * (G.adresse0 - G.adresse * A.adresse[i] / 100) * (epaule ? G.epaule : 1)
    * (1 + TJ.course.balance * souffle) * TJ.postures[posture].balance;
}
export function balancement(A, i, temps, o = {}) {
  const G = TJ.balance, a = amplitude(A, i, o), id = A.id[i], v = G.partVif;
  return [a * ((1 - v) * onde(id, temps, G.lent, 11) + v * onde(id, temps, G.vif, 12)), a * 0.8 * ((1 - v) * onde(id, temps, G.lent * 0.9, 13) + v * onde(id, temps, G.vif * 1.1, 14))];
}
/* L'arme du camp et ce qu'il reste dans le magasin d'un pilote (un pilote neuf a le magasin plein) */
export const armeDe = camp => TJ.armes[camp] ?? TJ.armes[0];

/* Les commandes du joueur dans la vue d'un soldat, les mêmes seul ou à deux (`executerCmd` de main.js les passe au lockstep) :
   { id, cap, av, la } : marcher (le cap du regard en radians, av : −1 reculer / 1 avancer, la : −1 gauche / 1 droite) ; { fin: true } : rendre l'homme ; { tir: true, cap, el } : un coup ;
   { epaule: true | false } : épauler ou baisser le fusil ; { recharge: true } : recharger ; { course: true | false } : courir ; { posture: 0 | 1 | 2 } : debout, accroupi, couché ;
   { saut: true } : franchir le rebord devant lui (le pas suivant le dit, ou dit pourquoi non) ; { coup: true, cap } : un coup de baïonnette (ou de crosse) ; { parade: true | false } : parer ;
   { amoi: true | false } : appeler les hommes de son régiment.
   Un homme qui n'est pas de ce camp, ou qui ne vit plus, ne se pilote pas. Rend '' ou la raison du refus. */
// la direction de la marche (ax, ay : au plus 1) et le facteur de vitesse (`vit`, lu par army.js) : courir, épaulé, accroupi, couché
const pas = P => {
  const c = Math.cos(P.cap), s = Math.sin(P.cap); P.ax = P.av * c - P.la * s; P.ay = P.av * s + P.la * c;
  P.vit = P.course ? TJ.course.vitesse : (P.epaule ? TJ.epaule.marche : 1) * TJ.postures[P.posture ?? 0].marche;
};
export function commanderPilote(B, camp, c) {
  B.pilotes ??= [null, null];
  if (c.fin) { B.pilotes[camp] = null; return ''; }
  const P = B.pilotes[camp];
  if (c.tir) { if (!P) return 'Personne à piloter.'; P.tir = { cap: c.cap, el: c.el }; return ''; }
  if (c.epaule !== undefined) { if (!P) return 'Personne à piloter.'; P.epaule = !!c.epaule; pas(P); return ''; }
  if (c.course !== undefined) { if (!P) return 'Personne à piloter.'; P.course = !!c.course; if (P.course) P.posture = 0; pas(P); return ''; }      // courir le relève
  if (c.posture !== undefined) {
    if (!P) return 'Personne à piloter.';
    const q = Math.max(0, Math.min(2, c.posture | 0)); if (q && P.course) return 'Il court : il ne peut pas se baisser.';
    P.posture = q; pas(P); return '';
  }
  if (c.saut) { if (!P) return 'Personne à piloter.'; if (!P.saut) P.sautDemande = true; return ''; }
  if (c.coup) { if (!P) return 'Personne à piloter.'; P.coupDemande = { cap: c.cap }; return ''; }
  if (c.grenade) { if (!P) return 'Personne à piloter.'; P.grenadeDemande = { cap: c.cap, el: c.el }; return ''; }
  if (c.parade !== undefined) { if (!P) return 'Personne à piloter.'; P.parade = !!c.parade; return ''; }
  if (c.amoi !== undefined) { if (!P) return 'Personne à piloter.'; P.amoi = !!c.amoi; return ''; }
  if (c.recharge) {
    if (!P) return 'Personne à piloter.';
    if ((P.balles ?? armeDe(camp).balles) >= armeDe(camp).balles) return 'Le magasin est plein.';
    if (!P.recharge) { P.recharge = true; P.rt = 0; }
    return '';
  }
  const A = B.armee; let i = -1;
  if (P && P.id === c.id) i = 0; else for (let k = 0; k < A.n; k++) if (A.id[k] === c.id) { i = k; break; }
  if (i < 0 || (P?.id !== c.id && (A.camp[i] !== camp || A.mort[i]))) return 'Cet homme n\'est plus à vous.';
  const nv = P?.id === c.id ? P : (B.pilotes[camp] = { id: c.id, ax: 0, ay: 0, cap: 0, av: 0, la: 0, tir: null, dernier: null, refus: null, epaule: false, balles: armeDe(camp).balles, recharge: false, rt: 0, course: false, posture: 0, souffle: 0, vit: 1, saut: null, sautDemande: false, coup: null, coupN: 0, coupDemande: null, coupT: 0, parade: false, amoi: false, frappe: null });
  nv.cap = c.cap; nv.av = Math.max(-1, Math.min(1, c.av || 0)); nv.la = Math.max(-1, Math.min(1, c.la || 0));
  pas(nv);
  return '';
}

/* Un pas : le rechargement en cours, puis le coup demandé */
export function tirerJoueur(B, ctx, rng) {
  for (const P of B.pilotes ?? []) {
    if (!P) continue;
    corpsDe(B, ctx, P);
    if (P.recharge) recharger(B, ctx, P);
    if (P.coupDemande) frapperDe(B, ctx, rng, P);
    if (P.grenadeDemande) lancerGrenade(B, ctx, P);
    if (P.tir) tirDe(B, ctx, rng, P);
  }
}
function indice(A, id) { for (let k = 0; k < A.n; k++) if (A.id[k] === id) return k; return -1; }
/* Le corps (v0.152.0, lot 2) : l'essoufflement et la fatigue de la course ; le franchissement d'un rebord (demandé, puis joué en `saut.duree` s : sa place glisse du pied du rebord à son dessus) */
function corpsDe(B, ctx, P) {
  const A = B.armee, i = indice(A, P.id); if (i < 0 || A.mort[i]) return;
  const C = TJ.course, dt = ctx.dt, court = P.course && (P.ax || P.ay) && Math.hypot(A.vx[i], A.vy[i]) > 0.3;
  P.souffle = Math.max(0, Math.min(1, (P.souffle ?? 0) + (court ? dt / C.monte : -dt / C.retombe)));
  P.coupT = Math.max(0, (P.coupT ?? 0) - dt);
  if (court) A.fatJ[i] = Math.min(1, A.fatJ[i] + C.fatigue * dt);
  if (P.sautDemande) { P.sautDemande = false; const r = franchir(B, ctx, P, i); if (r) P.refus = r; }
  if (P.saut) {
    const S = P.saut; S.t += dt; const f = Math.min(1, S.t / TJ.saut.duree), g = f * f * (3 - 2 * f);
    A.x[i] = S.x0 + (S.x1 - S.x0) * g; A.y[i] = S.y0 + (S.y1 - S.y0) * g; A.vx[i] = 0; A.vy[i] = 0;
    if (f >= 1) P.saut = null;
  }
}
/* Le rebord devant lui (dans le sens du regard, `P.cap`) : de 0,5 à 2,5 m plus haut que ses pieds, à moins de `portee` m ; rend '' (le saut commence) ou la raison du refus */
function franchir(B, ctx, P, i) {
  const A = B.armee, T = ctx.T, S = TJ.saut, W = T.W, H = T.H;
  if (P.saut) return '';
  if (A.blessure[i] === 2) return 'Sa jambe est blessée : il ne peut pas franchir.';
  const dx = Math.cos(P.cap), dy = Math.sin(P.cap), x0 = A.x[i], y0 = A.y[i], hq0 = hauteurQ(T, (y0 | 0) * W + (x0 | 0));
  for (let s = 0.3; s <= S.portee + 1e-9; s += 0.1) {
    const x = x0 + dx * s, y = y0 + dy * s; if (x < 0 || y < 0 || x >= W || y >= H) break;
    const dq = hauteurQ(T, (y | 0) * W + (x | 0)) - hq0;
    if (dq < S.marche) continue;
    if (dq > S.max) return 'Trop haut à franchir sans échelle.';
    const x1 = Math.max(0.1, Math.min(W - 0.1, x + dx * S.pose)), y1 = Math.max(0.1, Math.min(H - 0.1, y + dy * S.pose)), c1 = (y1 | 0) * W + (x1 | 0);
    if (T.profond && T.profond[c1]) return 'De l\'eau profonde de l\'autre côté.';
    P.saut = { t: 0, x0, y0, x1, y1 }; P.posture = 0; P.course = false; pas(P);
    A.fatJ[i] = Math.min(1, A.fatJ[i] + S.fatigue);
    return '';
  }
  return 'Rien à franchir devant lui.';
}
function recharger(B, ctx, P) {
  const A = B.armee, i = indice(A, P.id); if (i < 0) return;
  const W = armeDe(A.camp[i]); P.balles ??= W.balles; P.rt = (P.rt ?? 0) + ctx.dt;
  if (W.lame) { if (P.rt >= W.lame) { P.balles = W.balles; P.recharge = false; } }
  else while (P.rt >= W.cartouche && P.balles < W.balles) { P.balles++; P.rt -= W.cartouche; }
  if (P.balles >= W.balles) { P.recharge = false; P.rt = 0; }
}
/* L'ennemi le plus juste à portée de baïonnette dans le sens `cap` (logique pure, lue aussi par l'écran pour savoir si le clic frappe) : { j, d, justesse } ou null */
export function aPortee(A, i, cap, portee = TJ.melee.portee) {
  const M = TJ.melee, dx = Math.cos(cap), dy = Math.sin(cap);
  let best = null;
  for (let k = 0; k < A.n; k++) {
    if (A.camp[k] === A.camp[i] || A.mort[k]) continue;
    const rx = A.x[k] - A.x[i], ry = A.y[k] - A.y[i], d = Math.hypot(rx, ry);
    if (d > portee || d < 0.05) continue;
    const a = Math.acos(Math.max(-1, Math.min(1, (rx * dx + ry * dy) / d)));
    if (a > M.cone) continue;
    const justesse = M.centre + (M.bord - M.centre) * a / M.cone;
    if (!best || justesse - d * 0.1 > best.justesse - best.d * 0.1) best = { j: k, d, justesse };
  }
  return best;
}
/* Un coup de baïonnette (v0.154.0) ; la crosse sans cartouche ; la charge en courant. Rend dans `P.frappe` : { n, touche, mort, crosse } ; un refus dans `P.refus` */
function frapperDe(B, ctx, rng, P) {
  const demande = P.coupDemande; P.coupDemande = null;
  const A = B.armee, { R } = ctx, M = TJ.melee, MF = R.melee, PG = R.progression, i = indice(A, P.id);
  if (i < 0 || A.mort[i]) return;
  if (A.blessure[i] === 1) { P.refus = 'Son bras est blessé : il ne peut plus frapper.'; return; }
  if (P.saut) { P.refus = 'Il franchit le parapet.'; return; }
  if (P.parade) { P.refus = 'Il pare : relâchez pour frapper.'; return; }
  if (P.coupT > 0) { P.refus = 'Il reprend son arme.'; return; }
  const cible = aPortee(A, i, demande.cap ?? P.cap);
  if (!cible) { P.refus = 'Personne à portée de baïonnette.'; return; }
  P.coupT = M.periode;
  const j = cible.j, crosse = (P.balles ?? armeDe(A.camp[i]).balles) <= 0, charge = P.course && Math.hypot(A.vx[i], A.vy[i]) > 2;
  A.fatB[i] = Math.min(1, A.fatB[i] + MF.fatigue); A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
  gagner(A, i, 'force', PG.coup, PG);
  const chance = (ctx.infanterie?.[A.camp[i]].melee ?? 1) * M.touche * (0.55 + MF.force * A.force[i] / 100) * (1.3 - MF.endurance * A.endurance[j] / 100) * (1 - 0.4 * A.fatB[i]) * cible.justesse * (charge ? M.charge : 1);
  const f = { n: (P.frappe?.n ?? 0) + 1, touche: false, mort: false, crosse };
  if (rng() < chance) {
    gagner(A, i, 'force', PG.toucheCoup, PG);
    if (crosse) ctx.frapper(j, 'crosse', M.crosse, null, i, -1, { zone: 'tete', blessure: 3 });
    else ctx.frapper(j, 'mêlée', MF.mortel * (1.2 - 0.4 * A.endurance[j] / 100), null, i, -1, { zone: 'tronc' });
    if (A.mort[j]) gagner(A, i, 'force', PG.tue, PG);
    f.touche = true; f.mort = !!A.mort[j];
  }
  P.frappe = f;
}
/* La grenade (v0.158.0) : lancée dans le sens du regard, elle tombe à la distance que donne l'angle du lancer ; elle éclate à `meche` s (`B.grenades`, jamais sauvegardé : une partie relue les oublie) */
function lancerGrenade(B, ctx, P) {
  const demande = P.grenadeDemande; P.grenadeDemande = null;
  const A = B.armee, G = TJ.grenade, i = indice(A, P.id), T = ctx.T;
  if (i < 0 || A.mort[i]) return;
  if (A.blessure[i] === 1) { P.refus = 'Son bras est blessé : il ne peut plus lancer.'; return; }
  if (P.saut) { P.refus = 'Il franchit le parapet.'; return; }
  P.grenades ??= G.nombre;
  if (P.grenades <= 0) { P.refus = 'Plus de grenade.'; return; }
  P.grenades--;
  const th = Math.max(G.min, Math.min(G.max, demande.el + G.angle)), d = Math.min(G.loin, G.vitesse * G.vitesse * Math.sin(2 * th) / 9.81);
  const x = Math.max(0.5, Math.min(T.W - 0.5, A.x[i] + Math.cos(demande.cap) * d)), y = Math.max(0.5, Math.min(T.H - 0.5, A.y[i] + Math.sin(demande.cap) * d));
  (B.grenades ??= []).push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, t: B.etat.temps + G.meche, camp: A.camp[i] });
  P.lance = { n: (P.lance?.n ?? 0) + 1, x, y };
}
/* Les grenades dont la mèche a brûlé éclatent (appelé à chaque pas par `avancer`) */
export function exploserGrenades(B, ctx) {
  if (!B.grenades?.length) return;
  const G = TJ.grenade, reste = [];
  for (const g of B.grenades) {
    if (B.etat.temps < g.t - 1e-9) { reste.push(g); continue; }
    ctx.cal = 'grenade'; tuerDans(B.armee, g.x, g.y, G.rayon, ctx, G.letal); ctx.cal = null;
    B.evenements.push({ type: 'impact', x: g.x, y: g.y, cal: '75', grenade: true });      // (le dessin et le son : l'éclair et le bruit d'un 75)
  }
  B.grenades = reste;
}
/* La balle tombe (v0.158.0) : sa hauteur à `t` m devant le tireur, au-dessus de ses pieds (`oeil` : la hauteur de l'œil, `tg` : la pente de la visée) ;
   la hausse du fusil la fait monter un peu au-dessus de la ligne de visée et la repasser à `balle.hausse` m */
export function hauteurBalle(oeil, tg, t) {
  const Bl = TJ.balle, hausse = 0.5 * Bl.g * Bl.hausse / (Bl.vitesse * Bl.vitesse);
  return oeil + t * (tg + hausse) - 0.5 * Bl.g * (t / Bl.vitesse) ** 2;
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
  if (P.course) { P.refus = 'Il court : il ne peut pas épauler.'; return; }
  if (P.saut) { P.refus = 'Il franchit le parapet.'; return; }
  if (P.parade) { P.refus = 'Il pare : il ne peut pas tirer.'; return; }
  if (A.tirT[i] > 0) { P.refus = 'Le fusil n\'est pas rechargé.'; return; }
  const bo = ctx.boosts?.get(A.id[i]);      // un objet parachuté (largages.js) : le tir rapide, les balles sans fin, l'obus, la balle sûre
  A.tirT[i] = TJ.periode / (bo?.tir ?? 1); if (!bo?.infini) P.balles--; P.recharge = false; P.rt = 0;
  A.fatB[i] = Math.min(1, A.fatB[i] + R.soldat.fatigueTir);
  A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
  gagner(A, i, 'adresse', R.progression.tir, R.progression);
  // la balle part où est le guidon : le regard, le balancement de l'homme à cet instant, la dispersion de l'arme
  const [bc, be] = balancement(A, i, B.etat.temps, { epaule: P.epaule, souffle: P.souffle ?? 0, posture: P.posture ?? 0 });
  const cap0 = demande.cap ?? Math.atan2(demande.d[1], demande.d[0]);
  const dp = P.epaule ? TJ.dispersion : TJ.hanche;      // à la hanche (v0.165.0) : sans viseur, la balle part large
  const cap = cap0 + bc + (rng() * 2 - 1) * dp, el = demande.el + be + (rng() * 2 - 1) * dp;
  const dx = Math.cos(cap), dy = Math.sin(cap), tg = Math.tan(el), x0 = A.x[i], y0 = A.y[i];
  const caseDe = (x, y) => ((y | 0) * W + (x | 0)), oeil = hauteurOeil(T, x0, y0, P.posture ?? 0);
  const hq0 = hauteurQ(T, caseDe(x0, y0)), hA = t => hauteurBalle(oeil, tg, t);
  // le relief : la première case plus haute que la balle
  let tFin = TJ.portee, obstacle = '';
  for (let s = 1; s <= TJ.portee; s++) {
    const x = x0 + dx * s, y = y0 + dy * s;
    if (x < 0 || y < 0 || x >= W || y >= H) { tFin = s; break; }
    if ((hauteurQ(T, caseDe(x, y)) - hq0) * 0.25 > hA(s)) { tFin = s; obstacle = 'relief'; break; }
  }
  // un arbre debout (son tronc, jusqu'à `arbre.haut` m) ou un char (sa caisse) arrête la balle (v0.158.0)
  const devant = (px, py, r) => { const rx = px - x0, ry = py - y0, t = rx * dx + ry * dy; return t > 0.5 && t < tFin && Math.abs(rx * dy - ry * dx) <= r ? t : -1; };
  for (const a of T.arbres ?? []) {
    if (a.abattu) continue;
    const t = devant(a.i + 0.5, a.j + 0.5, TJ.arbre.rayon);
    if (t > 0) { const sol = (hauteurQ(T, caseDe(a.i, a.j)) - hq0) * 0.25, h = hA(t); if (h >= sol && h <= sol + TJ.arbre.haut) { tFin = t; obstacle = 'arbre'; } }
  }
  for (const c of B.etat.chars) {
    if (c.etat === 'rentre') continue;
    const t = devant(c.x, c.y, TJ.char.rayon);
    if (t > 0) { const sol = (hauteurQ(T, caseDe(c.x, c.y)) - hq0) * 0.25, h = hA(t); if (h >= sol && h <= sol + TJ.char.haut) { tFin = t; obstacle = 'char'; } }
  }
  // le premier homme que la balle traverse (d'en face, ou des nôtres : elle ne choisit pas), et où ; le plus proche d'en face qu'elle frôle (sa peur)
  let j = -1, tj = Infinity, zj = null, fr = -1, frl = TJ.frole;
  for (let k = 0; k < A.n; k++) {
    if (k === i || A.mort[k]) continue;
    const rx = A.x[k] - x0, ry = A.y[k] - y0, t = rx * dx + ry * dy;
    if (t < 1 || t > tFin || t >= tj) continue;
    const lat = Math.abs(rx * dy - ry * dx); if (lat > TJ.frole) continue;
    const sol = (hauteurQ(T, caseDe(A.x[k], A.y[k])) - hq0) * 0.25, h = hA(t), taille = tailleDe(A, k, R, ctx.pilotes?.get(A.id[k]));
    const z = lat <= TJ.rayon ? zoneTouchee((h - sol) / taille, lat) : null;
    if (z) { j = k; tj = t; zj = z; }
    else if (A.camp[k] !== A.camp[i] && lat < frl && h > sol - 0.5 && h < sol + taille + 1) { fr = k; frl = lat; }
  }
  const ami = j >= 0 && A.camp[j] === A.camp[i];
  const dernier = { n: (P.dernier?.n ?? 0) + 1, touche: false, mort: false, vise: j >= 0 && !ami, ami, zone: zj?.nom ?? '', obstacle: j >= 0 ? '' : obstacle, t: Math.round((j >= 0 ? tj : tFin) * 10) / 10 };
  if (j >= 0 && ami) {      // un des nôtres : touché comme un autre, sans crédit au tireur ; son régiment le paie (le moral)
    ctx.frapper(j, 'tir', zj.mortel, null, -1, -1, { zone: zj.nom, blessure: zj.blessure, arme: 'une balle de chez nous' });
    const reg = ctx.regiments[A.reg[j]]; if (reg) reg.moral = Math.max(0, reg.moral - TJ.ami.moral);
    dernier.mort = !!A.mort[j]; dernier.cible = A.id[j];
  } else if (j >= 0) {
    gagner(A, i, 'adresse', R.progression.toucheTir, R.progression);
    ctx.frapper(j, 'tir', bo?.sur ? 1 : zj.mortel, null, i, -1, { zone: zj.nom, blessure: zj.blessure });
    if (bo?.sur && !bo.obus) ctx.boostTir?.(i, bo);
    dernier.touche = true; dernier.mort = !!A.mort[j]; dernier.cible = A.id[j];      // (son numéro : le tampon dit son nom, v0.154.0)
  } else if (fr >= 0) A.peur[fr] = Math.max(A.peur[fr], TJ.frayeur);
  const t = j >= 0 ? tj : tFin;
  if (bo?.obus) ctx.boostTir?.(i, bo, x0 + dx * t, y0 + dy * t);
  if (ctx.tir) ctx.tir(i, x0 + dx * t, y0 + dy * t);      // pour le dessin : le trait de la balle, le bruit (jamais l'état)
  P.dernier = dernier;
}
