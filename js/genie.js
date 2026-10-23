/* Le génie militaire (Jérôme, v0.66.0) : la logique, pure. Une section vit dans `etat.genies` (sauvegardé) : { id, camp, pont, x, y, tx, ty, ar, n, etat, travail }.
   Elle naît hors du terrain derrière son camp, marche en droite ligne jusqu'à la rive du pont coupé (`pont` : l'indice dans `T.pontsListe`), puis le refait : `travail` va de 0 à 1,
   et gagne `n / hommes` fois plus vite que la section au complet (de 2 à 4 h de jeu avec 20 hommes : `PONTS_HEURES`). Un obus couche une part de ses hommes. `etat.sapeurs[camp]` :
   les sections au dépôt. Les ordres rendent { refus } comme les barrages. */
import { GENIE_DATA } from './data/genie.js?v=0.66.0';
import { CALIBRES } from './data/calibres.js?v=0.66.0';
import { CHAR_SORTIE } from './data/chars.js?v=0.66.0';
import { PONTS_HEURES } from './data/ponts.js?v=0.66.0';
import { reconstruirePont } from './eaux.js?v=0.66.0';
import { toucher } from './terrain.js?v=0.66.0';

export const sectionsDeDepart = () => [GENIE_DATA.sections, GENIE_DATA.sections];

// le pont coupé que vise (x, y) : son indice, ou -1 (à moins de sa demi-largeur + 3 m de son trait)
function pontVise(B, x, y) {
  const T = B.terrain, { x: ox, y: oy } = B.etat.marges;      // (les bouts d'un ouvrage sont dans le secteur : les marges s'ajoutent)
  let meilleur = -1, d0 = Infinity;
  T.pontsListe.forEach((P, k) => {
    if (!P.detruit) return;
    const ux = P.x2 - P.x, uy = P.y2 - P.y, l2 = ux * ux + uy * uy || 1, s = Math.max(0, Math.min(1, ((x - P.x - ox) * ux + (y - P.y - oy) * uy) / l2));
    const d = Math.hypot(x - ox - (P.x + ux * s), y - oy - (P.y + uy * s));
    if (d <= P.r + 3 && d < d0) { d0 = d; meilleur = k; }
  });
  return meilleur;
}

export function refusGenie(B, camp, x, y) {
  const { etat } = B;
  if (!etat.sapeurs[camp]) return { refus: 'Plus une section du génie : elles travaillent déjà, ou sont anéanties.' };
  const k = pontVise(B, x, y);
  if (k < 0) return { refus: 'Visez un pont coupé.' };
  if (etat.genies.some(g => g.pont === k)) return { refus: 'Le génie y travaille déjà.' };
  return { ok: true, pont: k };
}

export function lancerGenie(B, camp, pont) {
  const { etat, terrain: T } = B, P = T.pontsListe[pont];
  // la rive de son côté : le bout de l'ouvrage le plus proche de l'arrière de son camp (nous au sud, en face au nord)
  const nord = P.y < P.y2, bout = (camp === 0) === nord ? [P.x2 + etat.marges.x, P.y2 + etat.marges.y] : [P.x + etat.marges.x, P.y + etat.marges.y];
  etat.sapeurs[camp]--;
  etat.genies.push({ id: etat.genies.length ? etat.genies[etat.genies.length - 1].id + 1 : 0, camp, pont, x: bout[0], y: camp === 0 ? T.H + CHAR_SORTIE : -CHAR_SORTIE, tx: bout[0], ty: bout[1], n: GENIE_DATA.hommes, etat: 'marche', travail: 0 });
}

/* Un obus tombé en (x, y) : les hommes du génie à portée tombent, au prorata. */
export function degatsGenies(B, x, y, cal) {
  const rayon = (CALIBRES[cal]?.rayon ?? 4) * GENIE_DATA.zone, part = GENIE_DATA.obus[cal] ?? 0;
  for (const g of B.etat.genies) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d >= rayon || g.n <= 0) continue;
    g.n = Math.max(0, g.n - Math.ceil(g.n * part * (1 - d / rayon)));
    if (!g.n) { g.etat = 'detruit'; B.evenements.push({ type: 'genie-detruit', x: g.x, y: g.y, camp: g.camp }); }
  }
}

/* Un pas de chaque section. `ctx` : celui de `avancer`. */
export function avancerGenies(B, ctx) {
  const { etat, terrain: T, R } = B, dt = ctx.dt, secParHeure = R.jour.duree / (R.jour.heureFin - R.jour.heureDebut);
  for (const g of etat.genies) {
    if (g.etat === 'detruit') continue;
    const P = T.pontsListe[g.pont];
    if (!P.detruit) { g.etat = 'fini'; continue; }        // l'autre camp l'a déjà refait
    const d = Math.hypot(g.tx - g.x, g.ty - g.y);
    if (g.etat === 'marche') {
      if (d < GENIE_DATA.rive) { g.etat = 'travaille'; B.evenements.push({ type: 'genie-arrive', x: g.x, y: g.y, camp: g.camp }); continue; }
      const route = g.camp === 0 ? g.y > T.H : g.y < 0, v = (route ? GENIE_DATA.route : GENIE_DATA.vitesse) * dt;
      g.x += (g.tx - g.x) / d * Math.min(v, d); g.y += (g.ty - g.y) / d * Math.min(v, d);
    } else {
      g.travail += (g.n / GENIE_DATA.hommes) * dt / ((PONTS_HEURES[P.type] ?? 3) * secParHeure);
      if (g.travail >= 1) {
        reconstruirePont(T, P);
        for (const k of P.cases) toucher(T, k % T.W, (k / T.W) | 0);
        etat.pontsRepares.push([g.pont, etat.jour, etat.tickJour]);
        B.evenements.push({ type: 'pont-repare', x: g.tx, y: g.ty, camp: g.camp });
        g.etat = 'fini';
      }
    }
  }
  if (etat.genies.some(g => g.etat === 'fini' || g.etat === 'detruit')) {
    for (const g of etat.genies) if (g.etat === 'fini') etat.sapeurs[g.camp]++;      // la section rentre au dépôt, ce qu'il en reste en tout cas
    etat.genies = etat.genies.filter(g => g.etat !== 'fini' && g.etat !== 'detruit');
  }
}
