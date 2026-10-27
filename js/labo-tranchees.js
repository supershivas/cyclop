// Les tranchées du labo (Jérôme, v0.84.0 : « propose des tranchées détaillées, trois niveaux de détails, et calcule leur impact sur les performances ; pour chaque version, des tranchées intactes,
// légèrement détruites, complètement détruites »). Le moteur du jeu en direct, caméra libre (glisser : tourner et incliner ; Maj ou bouton droit : déplacer ; molette : zoomer), sur la première ligne de chez nous :
// trois tronçons de 25 m côte à côte, le premier intact, le deuxième abîmé (des 75 et un 155), le troisième bouleversé (des 155, des 75) ; les obus sont de vrais impacts du terrain (`impact`), donc l'état de chaque
// bout de tranchée est lu du sol, comme dans la bataille. A : le dessin du jeu (niveau 0). B, C, D : les niveaux 1, 2, 3 de `rendu/tranchee-modeles.js` (`rendu.niveauTranchees`), E : le niveau choisi selon le zoom.
// Le coût : un tableau de la géométrie seule (triangles par tronçon et pour un secteur de 128 tronçons, temps de construction : `mesurerNiveau`, le même calcul que `outils/mesure-tranchees.mjs`) et un bouton
// « Mesurer dans la scène » qui relève le dessin entier (triangles dessinés, temps jusqu'au bout) pour chaque niveau. Dans le jeu, `niveauTranchees` vaut 'auto'.
import { impact } from './terrain.js?v=0.87.1';
import { ligneY } from './tranchees.js?v=0.87.1';
import { tronconSolidite } from './bataille.js?v=0.87.1';
import { etatTranchee } from './tranchees.js?v=0.87.1';
import { el, scene, texteSvg, maquette, bouton } from './labo-arcade.js?v=0.87.1';
import { NIVEAUX_TRANCHEES, mesurerNiveau } from './rendu/tranchee-modeles.js?v=0.87.1';

export const NOTES_TRANCHEES = {
  A: 'En jeu (v0.87.1) : le niveau suit le zoom : la silhouette en dessous de 4 pixels par mètre, l\'ouvrage de 4 à 6, le détaillé à partir de 8. De loin presque rien, de près tout ; les échelles pour sortir sont là à tous les niveaux.',
  B: NIVEAUX_TRANCHEES[0].note,
  C: NIVEAUX_TRANCHEES[1].note,
  D: NIVEAUX_TRANCHEES[2].note,
  E: 'Jusqu\'à la v0.84.0 : des sacs, des traverses, du bois et du fil de fer à partir de 4 pixels par mètre (le bois se brise avec le comblement), un dessin plus simple en dessous, ni banquette, ni cadres, ni échelles. C\'est le niveau 0.',
};
export const NOMS_TRANCHEES = { A: 'Selon le zoom', B: 'Niveau 1 · Silhouette', C: 'Niveau 2 · Ouvrage', D: 'Niveau 3 · Détaillé', E: 'Le dessin d\'avant' };
const NIVEAU_DE = { A: 'auto', B: 1, C: 2, D: 3, E: 0 };
const ETATS = [['Intacte', 2], ['Légèrement détruite', 1], ['Complètement détruite', 0]];
// les obus de chaque tronçon abîmé : [calibre, nombre] ; ils tombent le long du tracé, en quinconce
const OBUS = [[], [['75', 6], ['155', 2]], [['155', 14], ['75', 6]]];
const TRONCONS = 25, PREMIER = 5, SECTEUR = 128;

const attendre = n => new Promise(ok => { const f = () => (--n > 0 ? requestAnimationFrame(f) : ok()); requestAnimationFrame(f); });
const mediane = v => { const s = [...v].sort((a, b) => a - b); return s[s.length >> 1] ?? 0; };

// le tableau de la géométrie seule : triangles par tronçon dans les trois états, pour un secteur entier, et le temps de construire un secteur
function tableauGeometrie() {
  const t = el('table', { className: 'contraste' });
  t.append(el('tr', {}, ...['Niveau', 'Intacte', 'Abîmée', 'Détruite', 'Un secteur (128 tronçons) intact', 'Construire 128 tronçons'].map(h => el('th', { textContent: h }))));
  for (const N of NIVEAUX_TRANCHEES) {
    mesurerNiveau(N.n, 2, SECTEUR, () => performance.now());                                  // un tour pour chauffer
    const r = [2, 1, 0].map(e => mesurerNiveau(N.n, e, SECTEUR, () => performance.now()));
    t.append(el('tr', {}, el('th', { textContent: `${N.n} · ${N.nom}` }), ...r.map(m => el('td', { textContent: `${Math.round(m.triangles / SECTEUR)} tri` })),
      el('td', { textContent: `${Math.round(r[0].triangles / 1000)} 000 tri · ${(r[0].traits / 1000).toFixed(1)} k traits` }), el('td', { textContent: `${r[0].ms.toFixed(1)} ms` })));
  }
  return t;
}

export function maquetteTranchees(stage, R, cle) {
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, ks = [];
    const mesures = el('div');
    const niveauBoutons = [['Selon le zoom', 'auto'], ['1', 1], ['2', 2], ['3', 3], ['Avant (0)', 0]].map(([t, n]) => bouton(t, () => { if (ctx0) ctx0.rendu.niveauTranchees = n; }));
    ui.haut.append(
      bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)),
      bouton('De dessus', () => { if (ctx0) ctx0.rendu.placerCamera(ctx0.vue0.yaw, 1.2); }),
      bouton('De profil', () => { if (ctx0) ctx0.rendu.placerCamera(0.0, 0.2); }),
      bouton('Trois quarts', () => { if (ctx0) ctx0.rendu.placerCamera(ctx0.vue0.yaw, ctx0.vue0.tangage); }),
      bouton('Rejouer', ui.rejouer));
    ui.haut.append(el('br'), el('span', { textContent: 'Niveau dessiné : ' }), ...niveauBoutons);
    // aller voir un tronçon de près (le point visé se pose au milieu du tronçon)
    const voir = q => { if (!ctx0) return; const t = ctx0.B.troncons[ks[q]], L = ctx0.B.lignes[t.ligne], x = (t.x0 + t.x1) / 2; ctx0.rendu.vue.cx = x; ctx0.rendu.vue.cz = ligneY(L, x) - 2; };
    ui.haut.append(el('br'), el('span', { textContent: 'Voir : ' }), ...ETATS.map(([nom], q) => bouton(nom, () => voir(q))), bouton('Les trois', () => voir(1)));
    const arret = scene(ui.stage, R, {
      ennemi: false, yNous: 300, zoom: 5, cz: 213, libre: { yaw: 0.32, tangage: 0.7 }, bloc: true,
      avant: ctx => {
        const { B, A } = ctx, M = B.etat.marges;
        // la première ligne de chez nous : trois tronçons de suite
        const ligne = B.troncons.map((t, i) => i).filter(i => { const L = B.lignes[B.troncons[i].ligne]; return L.camp === 0 && L.rang === 0; });
        ks = ligne.slice(PREMIER, PREMIER + 3);
        const L = B.lignes[B.troncons[ks[0]].ligne];
        // les obus : de vrais impacts du terrain, posés avant le premier dessin ; l'état de chaque bout de tranchée se lira du sol
        let n = 0;
        ks.forEach((k, q) => {
          const t = B.troncons[k], total = OBUS[q].reduce((s, [, c]) => s + c, 0);
          let m = 0;
          for (const [cal, c] of OBUS[q]) for (let u = 0; u < c; u++, m++) {
            const x = t.x0 + (m + 0.5) / total * TRONCONS, z = ligneY(L, x) + ((m % 2) - 0.5) * 1.2;
            impact(B.terrain, x, z, cal, R, n++);
          }
        });
        // seul notre régiment 1 reste (les autres tiennent la même tranchée et la cacheraient)
        for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.reg[i] !== 1) A.mort[i] = 1;
        for (const r of B.etat.regiments) if (r.camp === 0 && r.id !== 1) r.effectif = 0;
        ctx.reperer();
        // quelques hommes dans la tranchée, pour l'échelle (1,7 m) : six dans l'intacte, trois dans l'abîmée ; les autres, loin derrière
        const place = [[0, 6], [1, 3]].flatMap(([q, c]) => Array.from({ length: c }, (_, u) => { const t = B.troncons[ks[q]], x = t.x0 + 3 + u * (TRONCONS - 6) / Math.max(1, c - 1); return [x, ligneY(L, x)]; }));
        ctx.mien.forEach((i, u) => {
          if (u < place.length) { A.x[i] = place[u][0]; A.y[i] = place[u][1]; } else { A.x[i] = M.x + 20 + (u % 20) * 2; A.y[i] = M.y + 295 + Math.floor(u / 20) * 2; }
          A.vx[i] = 0; A.vy[i] = 0;
        });
      },
      apres: async ctx => {
        ctx0 = ctx;
        const { B, rendu } = ctx, L = B.lignes[B.troncons[ks[0]].ligne];
        const xm = B.troncons[ks[1]].x0 + TRONCONS / 2;
        rendu.vue.cx = xm; rendu.vue.cz = ligneY(L, xm) - 3;
        rendu.niveauTranchees = NIVEAU_DE[cle];
        ui.stage.append(el('p', { textContent: 'Le coût de la géométrie seule (un tronçon droit et plat, sans le sol ni les soldats) :' }), tableauGeometrie(),
          el('p', {}, bouton('Mesurer dans la scène', () => mesurerScene(ctx, mesures))), mesures);
      },
      image(dt, ctx) {
        if (!ctx0) return;
        const r = ctx.rendu, st = r.stats;
        // les trois étiquettes au-dessus des tronçons : l'état, et la solidité que dirait le coin de l'écran
        ks.forEach((k, q) => {
          const t = ctx.B.troncons[k], L = ctx.B.lignes[t.ligne], xm = (t.x0 + t.x1) / 2, s = tronconSolidite(ctx.B, k), [sx, sy] = ctx.proj(xm, ligneY(L, xm) - 6, 4);
          texteSvg(ctx.svg, sx, sy, `${ETATS[q][0]} · ${etatTranchee(s)} ${Math.round(s * 100)} %`, 12);
        });
        const niv = r.niveauTranchees;
        ctx.dire([`${NOMS_TRANCHEES[cle]} — niveau dessiné : ${niv === 0 ? '0 (le dessin d\'avant)' : niv}`, NOTES_TRANCHEES[cle], `Dessin : ${st.ms.renduFini} ms (rendu logiciel ici, attendu jusqu'au bout) · ${st.trianglesDessines} triangles`, 'Glissez pour tourner, Maj ou clic droit pour déplacer, molette pour zoomer.']);
      },
    });
    return arret;
  });
  return () => nettoyer();
}

// Le dessin entier pour chaque niveau : on change le niveau, on attend que les ouvrages soient refaits, puis la médiane de dix images (triangles dessinés et temps jusqu'au bout)
async function mesurerScene(ctx, boite) {
  const r = ctx.rendu, avant = r.niveauTranchees, t = el('table', { className: 'contraste' });
  boite.replaceChildren(el('p', { textContent: 'Mesure en cours…' }));
  t.append(el('tr', {}, ...['Niveau', 'Triangles dessinés', 'Dessin (ms)'].map(h => el('th', { textContent: h }))));
  for (const n of ['auto', 1, 2, 3, 0]) {
    r.niveauTranchees = n; await attendre(8);
    const tri = [], ms = [];
    for (let k = 0; k < 10; k++) { await attendre(1); tri.push(r.stats.trianglesDessines); ms.push(r.stats.ms.renduFini); }
    t.append(el('tr', {}, el('th', { textContent: n === 0 ? '0 · le dessin d\'avant' : n === 'auto' ? 'selon le zoom (le jeu)' : `${n} · ${NIVEAUX_TRANCHEES[n - 1].nom}` }), el('td', { textContent: String(mediane(tri)) }), el('td', { textContent: mediane(ms).toFixed(1) })));
  }
  r.niveauTranchees = avant;
  boite.replaceChildren(el('p', { textContent: 'Le dessin entier, par niveau, à ce zoom et sur cette vue (médiane de dix images ; le temps est celui du rendu logiciel, à comparer d\'un niveau à l\'autre, jamais en absolu) :' }), t);
}
