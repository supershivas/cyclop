// Le générateur de carte (v0.49.0) : une carte aléatoire pour la nouvelle partie. Logique pure : tout vient de la graine (un générateur dérivé, `fork('carte')`, qui ne touche pas à ceux de la bataille).
// Une carte est un secteur de `data/secteur.js` (mêmes lignes de tranchées, mêmes 400 × 300 m) dont on tire le sol : bosses et nappe, des montagnes et des chaînes, des collines et des plateaux (`retouches`, `formes.js`),
// un fleuve en travers du no man's land avec ses ponts, un fleuve ou des lacs derrière les lignes, une côte (un grand disque d'eau d'un des quatre côtés), et ce qui pousse. Chaque tirage est contrôlé par `validerSecteur` :
// l'eau ne touche jamais une tranchée (la même règle que l'atelier) ; sans accord après `essais` tirages, la carte n'a pas d'eau. `genererCarte(graine)` rend toujours la même carte.
import { createRng } from './lib/rng.js?v=0.52.1';
import { SECTEURS } from './data/secteur.js?v=0.52.1';
import { validerSecteur } from './tranchees.js?v=0.52.1';
import { GENERATEUR as G, ID_ALEATOIRE } from './data/generateur.js?v=0.52.1';
import { PONTS_JEU } from './data/ponts.js?v=0.52.1';
import { fleuveEn, VARIATION } from './eaux.js?v=0.52.1';

const dans = (rng, [a, b]) => a + rng() * (b - a);
const entier = (rng, [a, b]) => Math.floor(dans(rng, [a, b + 1]));
const arrondi = (v, pas = 1) => Math.round(v / pas) * pas;

/* Les traits d'une carte : { eaux, formes, ... } tirés de la graine ; `essai` : le numéro du tirage (le dernier, 0 eau). */
function tirer(rng, S, sansEau) {
  const L = S.largeur, Ht = S.hauteur, T = S.tranchees.lignes, retouches = [], objets = [], traits = [];
  const bandeEux = T.eux.at(-1) - 8, bandeEux2 = T.eux[0] + 8, bandeNous = T.nous[0] - 8, bandeNous2 = T.nous.at(-1) + 8;
  // un fleuve en travers du no man's land, avec ses ponts
  if (!sansEau && rng() < G.chances.fleuve) {
    const f = G.fleuve, r = arrondi(dans(rng, f.r), 0.5), yc = dans(rng, f.yMilieu), d = dans(rng, [-f.pente, f.pente]);
    const x0 = -f.debord, x1 = L + f.debord, y0 = yc + d, y1 = yc - d;
    objets.push({ o: 'fleuve', x: x0, y: arrondi(y0), x2: x1, y2: arrondi(y1), r });
    const n = entier(rng, f.ponts), types = Object.keys(PONTS_JEU), porteurs = types.filter(t => PONTS_JEU[t].char);
    const fleuve = objets[0];
    for (let k = 0; k < n; k++) {
      const x = arrondi(((k + 0.5 + (rng() - 0.5) * 0.5) / n) * L), { y, demi } = fleuveEn(fleuve, x), type = k === 0 ? porteurs[Math.floor(rng() * porteurs.length)] : types[Math.floor(rng() * types.length)];
      objets.push({ o: 'pont', x, y: arrondi(y - demi - f.pontMarge), x2: x, y2: arrondi(y + demi + f.pontMarge), r: f.pontLargeur, type });
    }
    traits.push('fleuve');
  }
  // un fleuve derrière les lignes (d'un des deux camps) : dans la marge, hors des tranchées
  if (!sansEau && rng() < G.chances.fleuveArriere) {
    const r = arrondi(dans(rng, G.fleuve.r), 0.5), derriereNous = rng() < 0.5, c = r * 2.8, y = derriereNous ? bandeNous2 + c + 20 + rng() * 60 : bandeEux - c - 20 - rng() * 60;
    objets.push({ o: 'fleuve', x: -G.fleuve.debord, y: arrondi(y + dans(rng, [-12, 12])), x2: L + G.fleuve.debord, y2: arrondi(y + dans(rng, [-12, 12])), r });
    traits.push('fleuve');
  }
  // des lacs : dans les marges d'un des quatre côtés
  if (!sansEau && rng() < G.chances.lac) {
    const n = entier(rng, [1, 2]);
    for (let k = 0; k < n; k++) {
      const r0 = arrondi(dans(rng, G.lac.r)), r = r0, rv = r0 * (VARIATION.lac + VARIATION.lacRive), flanc = rng() < 0.5;
      const x = flanc ? (rng() < 0.5 ? -r - rv - 20 - rng() * 80 : L + r + rv + 20 + rng() * 80) : arrondi(dans(rng, [0, L])), y = flanc ? dans(rng, [20, Ht - 20]) : (rng() < 0.5 ? bandeEux - r - rv - G.arriere - rng() * 40 : bandeNous2 + r + rv + G.arriere + rng() * 40);
      objets.push({ o: 'lac', x: arrondi(x), y: arrondi(y), r });
    }
    traits.push('lac');
  }
  // une côte : un grand disque d'eau d'un des côtés, la rive en arc de cercle
  if (!sansEau && rng() < G.chances.cote) {
    const c = G.cote, r = arrondi(dans(rng, c.r)), rv = r * (VARIATION.lac + VARIATION.lacRive), cote = ['ouest', 'est', 'nord', 'sud'][Math.floor(rng() * 4)], dec = dans(rng, [-c.decalage, c.decalage]);
    if (cote === 'ouest') objets.push({ o: 'lac', x: arrondi(-c.marge - rv - r - rng() * 40), y: arrondi(Ht / 2 + dec), r });
    else if (cote === 'est') objets.push({ o: 'lac', x: arrondi(L + c.marge + rv + r + rng() * 40), y: arrondi(Ht / 2 + dec), r });
    else if (cote === 'nord') objets.push({ o: 'lac', x: arrondi(L / 2 + dec * 2), y: arrondi(bandeEux - G.arriere - rv - r - rng() * 30), r });
    else objets.push({ o: 'lac', x: arrondi(L / 2 + dec * 2), y: arrondi(bandeNous2 + G.arriere + rv + r + rng() * 30), r });
    traits.push('cote');
  }
  // des marécages : dans le no man's land (entre les bandes), derrière les lignes ou sur les flancs ; le bord est rongé de 35 %, donc 1,5 rayon de marge aux tranchées
  if (rng() < G.chances.marecage) {
    const n = entier(rng, G.marecage.n);
    for (let k = 0; k < n; k++) {
      const r = arrondi(dans(rng, G.marecage.r)), m = r * 1.5, zone = Math.floor(rng() * 3);
      let x, y;
      if (zone === 0) { x = dans(rng, [0, L]); y = dans(rng, [bandeEux2 + m, bandeNous - m]); }
      else if (zone === 1) { x = dans(rng, [-60, L + 60]); y = rng() < 0.5 ? bandeEux - G.arriere - m - rng() * 60 : bandeNous2 + G.arriere + m + rng() * 60; }
      else { x = rng() < 0.5 ? -m - rng() * 60 : L + m + rng() * 60; y = dans(rng, [0, Ht]); }
      if (y - m < bandeEux2 && y + m > bandeEux && x + m > -8 && x - m < L + 8) continue;       // (une tentative qui tomberait sur la bande d'en face ou la nôtre : on la saute)
      if (y - m < bandeNous2 && y + m > bandeNous && x + m > -8 && x - m < L + 8) continue;
      objets.push({ o: 'marecage', x: arrondi(x), y: arrondi(y), r });
      if (!traits.includes('marecage')) traits.push('marecage');
    }
  }
  // des montagnes : une bosse haute hors du secteur (un flanc ou un fond de marge), parfois une chaîne
  if (rng() < G.chances.montagne) {
    const n = entier(rng, [1, 2]);
    for (let k = 0; k < n; k++) {
      const m = G.montagne, r = arrondi(dans(rng, m.r)), h = arrondi(dans(rng, m.h), 0.5), cote = Math.floor(rng() * 4);
      const x = cote === 0 ? -r * 0.6 - rng() * 60 : cote === 1 ? L + r * 0.6 + rng() * 60 : arrondi(dans(rng, [-40, L + 40])), y = cote === 2 ? bandeEux - r * 0.5 - rng() * 40 : cote === 3 ? bandeNous2 + r * 0.5 + rng() * 40 : dans(rng, [20, Ht - 20]);
      retouches.push({ f: 'bosse', x: arrondi(x), y: arrondi(y), r, h });
    }
    traits.push('montagne');
  }
  if (rng() < G.chances.chaine) {
    const c = G.chaine, long = dans(rng, c.longueur), horizontal = rng() < 0.7, r = arrondi(dans(rng, c.r)), h = arrondi(dans(rng, c.h), 0.5);
    if (horizontal) { const y = rng() < 0.5 ? bandeEux - 20 - rng() * 70 : bandeNous2 + 20 + rng() * 70, x = dans(rng, [-60, L - long + 60]); retouches.push({ f: 'crete', x: arrondi(x), y: arrondi(y), x2: arrondi(x + long), y2: arrondi(y + dans(rng, [-30, 30])), r, h }); }
    else { const x = rng() < 0.5 ? -40 - rng() * 60 : L + 40 + rng() * 60, y = dans(rng, [-60, Ht - long + 60]); retouches.push({ f: 'crete', x: arrondi(x), y: arrondi(y), x2: arrondi(x + dans(rng, [-30, 30])), y2: arrondi(y + long), r, h }); }
    if (!traits.includes('montagne')) traits.push('montagne');
  }
  // des collines dans le secteur, des plateaux
  if (rng() < G.chances.collines) {
    const n = entier(rng, G.collines.n);
    for (let k = 0; k < n; k++) retouches.push({ f: 'bosse', x: arrondi(dans(rng, [20, L - 20])), y: arrondi(dans(rng, [10, Ht - 10])), r: arrondi(dans(rng, G.collines.r)), h: arrondi(dans(rng, G.collines.h), 0.5) });
    traits.push('collines');
  }
  if (rng() < G.chances.plateau) retouches.push({ f: 'plateau', x: arrondi(dans(rng, [40, L - 40])), y: arrondi(dans(rng, [20, Ht - 20])), r: arrondi(dans(rng, G.plateau.r)), h: arrondi(dans(rng, G.plateau.h), 0.5) });
  return { retouches, objets, traits };
}

/* La phrase qui dit la carte au joueur (le résumé de la liste des parties) */
function decrire(traits, S) {
  const eau = [];
  const a = (t, texte) => { if (traits.includes(t)) eau.push(texte); };
  a('fleuve', S.objets.some(o => o.o === 'fleuve' && o.y > 90 && o.y < 210) ? 'un fleuve coupe le no man\'s land (des ponts le passent)' : 'un fleuve coule derrière les lignes');
  a('cote', 'la mer ou un grand lac borde un côté');
  a('lac', 'des étangs dans les marges');
  a('marecage', 'des marécages où l\'on s\'enlise');
  a('montagne', 'des hauteurs dominent le front');
  a('collines', 'des collines dans le secteur');
  const saison = S.saison === 'hiver' ? 'en hiver : neige et gel' : S.saison === 'ete' ? 'en été : un sol sec, des jours de forte chaleur' : '';
  if (saison) eau.push(saison);
  const sol = S.relief.nappe < -0.6 ? 'la nappe affleure : la boue vient vite' : S.relief.bosses > 1.2 ? 'le sol est très accidenté' : 'un sol assez doux';
  const phrase = [...eau, sol].join(' ; ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1) + '. Tirée de la graine : elle change à chaque fois.';
}

/* La carte de cette graine : un secteur complet (sans `profil` calculé : voir `profilCarte`). */
export function genererCarte(graine) {
  const rng = createRng(graine | 0).fork('carte'), base = SECTEURS.essai;
  let S = null, traits = [];
  for (let essai = 0; essai <= G.essais; essai++) {
    const sansEau = essai === G.essais, r = createRng((graine | 0) + essai * 7919).fork('carte');
    const t = tirer(r, base, sansEau);
    S = {
      ...structuredClone(base), retouches: t.retouches, objets: t.objets,
    };
    delete S.perso;
    if (!validerSecteur(S).length) { traits = t.traits; break; }
  }
  const v = G.vegetation, reg = G.relief;
  S.relief = { bosses: +dans(rng, reg.bosses).toFixed(2), ondulation: +dans(rng, reg.ondulation).toFixed(2), nappe: +dans(rng, reg.nappe).toFixed(2) };
  S.arbres = entier(rng, v.arbres); S.bois = entier(rng, v.bois); S.haies = entier(rng, v.haies); S.buissons = entier(rng, v.buissons);
  S.pluieAuMoins = entier(rng, G.pluieAuMoins);
  { const u = rng(); let a = 0; for (const [id, p] of Object.entries(G.saisons)) { a += p; if (u < a) { S.saison = id; break; } } S.saison ??= 'automne'; }      // la saison, tirée en dernier : les autres tirages sont ceux d'avant
  const n = G.noms, dominant = traits.includes('cote') ? 'cote' : traits.includes('fleuve') ? 'fleuve' : traits.includes('marecage') ? 'marecage' : traits.includes('montagne') ? 'montagne' : traits.includes('lac') ? 'lac' : 'plaine';
  S.nom = `${n[dominant][Math.floor(rng() * n[dominant].length)]} ${n.lieux[Math.floor(rng() * n.lieux.length)]}`;
  S.resume = decrire(traits, S);
  S.profil = SECTEURS.essai.profil;
  S.genere = { graine: graine | 0, traits };
  return S;
}

/* Pose la carte de la graine sous l'id `aleatoire` de SECTEURS (les règles et le moteur lisent SECTEURS) et la rend */
export function preparerAleatoire(graine) {
  const S = genererCarte(graine);
  SECTEURS[ID_ALEATOIRE] = S;
  return S;
}
export { ID_ALEATOIRE };
