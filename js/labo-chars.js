// Les chars d'assaut du labo (Jérôme, v0.42.0 : « 5 variations du char d'assaut, des vérifications historiques (Renault, etc.), aussi des chars allemands ; caméra libre pour voir les détails »).
// Cinq engins de 1916-1918 dessinés en volumes (`THREE`, à l'échelle : 1 unité = 1 m, mêmes arêtes que le reste du jeu) et posés sur le moteur du jeu, qu'on regarde à la caméra libre
// (glisser : tourner et incliner ; Maj ou bouton droit : déplacer ; molette : zoomer ; « Suivre » garde l'engin au centre). Même scène pour tous : il avance vers l'autre ligne, l'infanterie le suit
// et s'abrite derrière, les balles ricochent, un 155 qui tombe près de lui le détruit, des cratères l'arrêtent (la profondeur qu'il franchit dépend de l'engin).
//
// Ce qui est vérifié (Wikipédia, Tank Museum ; les sources divergent d'une dizaine de pour cent, on a pris la valeur courante) :
//  · Mark IV (britannique, 1917) : 8,05 m, 4,12 m avec les sponsons, 28 t « mâle » (deux 6-livres) ou 27 t « femelle » (mitrailleuses), huit hommes, losange, poutre de décrochage sur le toit ;
//  · Renault FT (français, 1917) : 5,0 m avec la queue, 1,74 m, 2,14 m, 6,5 t, deux hommes, une tourelle tournante (ronde coulée, octogonale Berliet, ou Girod), un 37 mm Puteaux ou une Hotchkiss de 8 mm ;
//  · Schneider CA 1 (français, 1916) : 6 m, ~2 m, 2,4 m, 13,5 t, six hommes, un 75 « de tranchée » sur le flanc droit, deux Hotchkiss, un éperon coupe-fils à l'avant ;
//  · Saint-Chamond (français, 1917) : 8,9 m, 2,7 m, 2,4 m, 23 t, huit ou neuf hommes, un 75 de long tube à l'avant, quatre Hotchkiss, une caisse très en porte-à-faux ;
//  · A7V (allemand, 1918) : 7,34 m, 3,1 m, 3,3 m, 31,5 t, dix-huit hommes au moins (jusqu'à 25), un 57 mm Maxim-Nordenfelt à l'avant, six mitrailleuses de 7,92 mm, une vingtaine d'exemplaires seulement.
//    Les Allemands ont aussi retourné des Mark IV pris à Cambrai (1917) : la livrée « Beutepanzer » du Mark IV, croix sur les flancs.
// Les nombres de jeu (vitesse, profondeur de cratère franchie) sont des propositions, pas des mesures : le Saint-Chamond et l'A7V franchissaient mal (porte-à-faux, garde au sol), le Mark IV très bien.
import { PALETTE as P } from './palette.js?v=0.66.3';
import { loadThree } from './three-lib.js?v=0.66.3';
import { ordonnerMarche, mourir } from './bataille.js?v=0.66.3';
import { hash2 } from './lib/rng.js?v=0.66.3';
import { ZOOMS } from './rendu3d.js?v=0.66.3';
import { el, svgEl, bouton, scene, maquette, texteSvg } from './labo-arcade.js?v=0.66.3';
import { atelier, schneider } from './rendu/engins.js?v=0.66.3';
export { atelier };

// ─── Les cinq engins ────────────────────────────────────────────────────────
// Chacun : { groupe (l'avant à +x, le haut à +y, la droite à +z), longueur, maj(dt, v, ctx, cible) } ; `v` : la vitesse (m/s)

// Le Mark IV : un losange, des sponsons, une poutre de décrochage
function mark4(A, livree) {
  const { THREE } = A, g = new THREE.Group(), all = livree === 'allemand';
  const coque = all ? P.r : P.h, toit = all ? P.e : P.g;
  const chemin = [[-3.9, 0.35], [-3.1, 0], [2.2, 0], [3.9, 0.85], [4.15, 1.35], [3.1, 2.43], [-2.4, 2.43]];
  const majG = A.chenille(g, chemin, 0.55, 1.28, { trou: 0.78 }), majD = A.chenille(g, chemin, 0.55, -1.28, { trou: 0.78 });
  A.prisme(g, [[-3.2, 0.7], [-2.1, 0.5], [2.7, 0.5], [3.5, 1.2], [2.7, 2.25], [-2.3, 2.25]], 2.0, coque);
  A.b(g, [2.0, 0.38, 1.5], toit, [1.2, 2.44, 0]);                       // la cabine du pilote et du chef de char
  A.cyl(g, 0.3, 0.22, coque, [1.8, 2.74, 0], 'y', 8);
  for (const s of [1, -1]) {
    A.b(g, [1.5, 1.2, 1.0], coque, [0.7, 1.15, s * 1.62]);              // le sponson (mâle : un 6-livres)
    A.cyl(g, 0.06, 1.7, P.t, [2.2, 1.3, s * 1.7], 'x', 6);              // son canon court
    A.b(g, [0.12, 0.5, 0.5], toit, [1.5, 1.3, s * 1.7]);                // le masque du canon
    A.b(g, [3.4, 0.1, 0.14], P.s, [-1.2, 2.5, s * 1.28]);               // les rails de la poutre
    if (all) A.croix(g, [-0.9, 1.5, s * 1.45], 0.85);
  }
  A.b(g, [0.32, 0.32, 3.4], P.g, [-1.2, 2.72, 0]);                      // la poutre de décrochage, en travers du toit
  A.cyl(g, 0.1, 0.9, P.s, [-2.3, 2.6, 0.55], 'x', 6);                   // l'échappement
  A.cyl(g, 0.16, 0.5, P.s, [-2.9, 2.6, 0.55], 'x', 6);
  if (all) A.croix(g, [-0.9, 1.5, 1.45], 0.85);
  return { groupe: g, longueur: 8.05, maj: (dt, v) => { majG.d = (majG.d || 0) + v * dt; majG(majG.d); majD(majG.d); } };
}

// Le Renault FT : petit, une tourelle tournante, la queue
function ft(A) {
  const { THREE } = A, g = new THREE.Group();
  const coque = P.w, tache = P.h;
  const chemin = [[-2.0, 0.35], [-1.65, 0], [1.4, 0], [2.1, 0.5], [2.05, 1.0], [1.4, 1.2], [-1.4, 1.2], [-2.0, 0.8]];
  const maj1 = A.chenille(g, chemin, 0.3, 0.72, { trou: 0.7, pas: 0.26 }), maj2 = A.chenille(g, chemin, 0.3, -0.72, { trou: 0.7, pas: 0.26 });
  A.prisme(g, [[-1.9, 0.55], [1.95, 0.55], [2.0, 0.85], [1.55, 1.45], [-1.6, 1.45], [-1.9, 1.1]], 1.1, coque);
  A.b(g, [1.2, 0.2, 1.0], tache, [1.1, 1.55, 0], [0, 0, -0.18]);        // le capot du conducteur, incliné
  A.b(g, [0.5, 0.08, 0.6], P.t, [1.4, 1.67, 0], [0, 0, -0.18]);         // sa trappe
  A.b(g, [0.05, 0.07, 0.34], P.t, [1.9, 1.15, 0]);                       // la fente de vision
  A.b(g, [1.3, 0.16, 1.0], P.s, [-1.1, 1.53, 0]);                        // le pont moteur
  for (let k = 0; k < 3; k++) A.b(g, [0.07, 0.04, 0.8], P.t, [-0.8 - k * 0.3, 1.63, 0], [0, 0, 0], false);
  for (const s of [1, -1]) A.b(g, [1.0, 0.12, 0.5], tache, [0, 0.9, s * 0.2], [0, 0, 0], false);
  // la queue : deux poutres qui descendent derrière, pour franchir les tranchées
  for (const s of [1, -1]) A.b(g, [1.35, 0.13, 0.12], P.s, [-2.5, 0.55, s * 0.35], [0, 0, 0.6]);
  A.b(g, [0.12, 0.12, 0.82], P.s, [-2.98, 0.2, 0]);
  // la tourelle octogonale (Berliet), qui tourne sur son anneau
  const tour = new THREE.Group(); tour.position.set(0.1, 1.45, 0); g.add(tour);
  A.cyl(tour, 0.55, 0.5, coque, [0, 0.35, 0], 'y', 8);
  A.cyl(tour, 0.25, 0.14, tache, [0, 0.67, 0], 'y', 8, 0.18);          // le chapeau de tourelle
  A.cyl(tour, 0.035, 0.95, P.t, [0.85, 0.4, 0], 'x', 6);                // le 37 mm Puteaux
  A.b(tour, [0.12, 0.2, 0.2], P.s, [0.4, 0.4, 0]);
  const flash = A.b(tour, [0.2, 0.2, 0.2], P.x, [1.4, 0.4, 0], [0, 0, 0], false); flash.visible = false;
  return {
    groupe: g, longueur: 5.0, tour, flash,
    maj: (dt, v, ctx, cible) => { maj1.d = (maj1.d || 0) + v * dt; maj1(maj1.d); maj2(maj1.d); if (cible !== null) { let d = cible - tour.rotation.y; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; tour.rotation.y += d * Math.min(1, dt * 2.5); } },
  };
}

// Le Saint-Chamond : une caisse très longue en porte-à-faux, un 75 à l'avant
function stChamond(A) {
  const { THREE } = A, g = new THREE.Group(), coque = P.e;
  const chemin = [[-1.6, 0.2], [-1.2, 0], [1.2, 0], [1.7, 0.4], [1.4, 0.85], [-1.2, 0.85], [-1.7, 0.5]];
  const m1 = A.chenille(g, chemin, 0.45, 1.05, { trou: 0, pas: 0.3 }), m2 = A.chenille(g, chemin, 0.45, -1.05, { trou: 0, pas: 0.3 });
  A.b(g, [6.2, 0.9, 2.4], coque, [-0.2, 1.3, 0]);                         // la caisse, bien plus longue que les chenilles
  A.prisme(g, [[2.9, 0.85], [4.4, 1.15], [4.4, 1.6], [2.9, 1.75]], 2.2, coque);                       // l'avant, long
  A.b(g, [3.6, 0.6, 2.2], coque, [0.5, 2.05, 0]);                         // le dessus
  A.prisme(g, [[-3.1, 0.9], [-4.4, 1.2], [-4.4, 1.6], [-3.1, 1.75]], 2.2, coque);                      // l'arrière
  A.cyl(g, 0.06, 1.5, P.t, [4.9, 1.45, 0.0], 'x', 6);                     // le 75 de long tube, dans la proue
  A.cyl(g, 0.1, 0.35, P.s, [4.35, 1.45, 0], 'x', 6);
  for (const s of [1, -1]) for (const x of [-1.8, 1.0]) A.b(g, [0.4, 0.24, 0.1], P.t, [x, 1.5, s * 1.23]);        // les quatre Hotchkiss : un créneau à chaque coin
  A.cyl(g, 0.34, 0.4, P.g, [1.3, 2.55, 0.5], 'y', 8, 0.14);               // la coupole
  A.b(g, [1.0, 0.1, 0.9], P.s, [-2.3, 1.78, 0]);
  for (const s of [1, -1]) A.b(g, [3.6, 0.5, 0.02], P.g, [-0.3, 1.3, s * 1.21], [0, 0, 0], false);
  return { groupe: g, longueur: 8.9, maj: (dt, v) => { m1.d = (m1.d || 0) + v * dt; m1(m1.d); m2(m1.d); } };
}

// L'A7V : une haute caisse allemande, un canon à l'avant, des mitrailleuses sur les flancs
function a7v(A) {
  const { THREE } = A, g = new THREE.Group(), coque = P.r;
  const chemin = [[-3.6, 0.5], [-3.1, 0.05], [3.1, 0.05], [3.65, 0.6], [3.5, 1.1], [-3.4, 1.1]];
  const m1 = A.chenille(g, chemin, 0.5, 1.45, { trou: 0, pas: 0.34 }), m2 = A.chenille(g, chemin, 0.5, -1.45, { trou: 0, pas: 0.34 });
  for (let k = 0; k < 7; k++) for (const s of [1, -1]) A.cyl(g, 0.22, 0.12, P.s, [-2.7 + k * 0.9, 0.35, s * 1.68], 'z', 8);     // les galets, qu'on voit sur le flanc
  A.b(g, [6.6, 1.2, 2.5], coque, [0, 0.95, 0]);                           // la coque basse
  A.prisme(g, [[-2.6, 1.55], [2.2, 1.55], [3.4, 1.3], [3.4, 1.0], [-3.4, 1.0], [-3.4, 1.3]], 3.0, coque);               // le tour de caisse qui déborde sur les chenilles
  A.b(g, [4.6, 1.6, 2.5], coque, [-0.5, 2.3, 0]);                         // la haute superstructure
  A.prisme(g, [[2.0, 1.55], [3.3, 1.55], [3.3, 2.3], [2.0, 3.1]], 2.4, coque, [0, 0, 0]);                              // le front incliné
  A.b(g, [1.4, 0.7, 1.3], P.g, [2.7, 2.1, 0.35]);                         // le Geschützstand : le logement du canon
  A.cyl(g, 0.045, 1.7, P.t, [3.6, 2.15, 0.35], 'x', 6);                   // le 57 mm Maxim-Nordenfelt
  A.cyl(g, 0.08, 0.3, P.s, [3.0, 2.15, 0.35], 'x', 6);
  A.b(g, [1.6, 0.8, 1.7], P.g, [-0.9, 3.45, 0]);                          // le poste de commandement, tout en haut
  A.b(g, [0.5, 0.18, 0.8], P.s, [-0.9, 3.9, 0]);
  A.cyl(g, 0.2, 0.3, P.g, [-0.2, 3.35, 0.4], 'y', 8, 0.12);
  for (const s of [1, -1]) {
    for (const x of [-2.0, -0.2]) { A.b(g, [0.28, 0.28, 0.3], P.t, [x, 2.55, s * 1.3]); A.cyl(g, 0.025, 0.6, P.t, [x, 2.55, s * 1.62], 'z', 6); }   // deux mitrailleuses par flanc
    A.croix(g, [-1.1, 1.75, s * 1.27], 0.95);
  }
  for (const s of [1, -1]) { A.b(g, [0.28, 0.28, 0.3], P.t, [-2.75, 2.3, s * 0.6]); }                  // et deux à l'arrière
  for (const [x, z, w, c] of [[1.2, 1.45, 1.6, P.h], [-2.4, -1.3, 1.1, P.g], [0.6, 1.27, 1.4, P.h], [-1.6, -1.27, 1.2, P.h]]) A.b(g, [w, 0.5, 0.02], c, [x, 2.4, z * 1.0], [0, 0, 0], false);        // des taches de camouflage
  return { groupe: g, longueur: 7.34, maj: (dt, v) => { m1.d = (m1.d || 0) + v * dt; m1(m1.d); m2(m1.d); } };
}

// ─── Les fiches : ce que le jeu en fait ─────────────────────────────────────
// vitesse (m/s de jeu, proposée), franchit (profondeur de cratère, en quarts de mètre, au-delà de laquelle il reste couché), camp (d'où il vient)
const ENGINS = {
  mark4: { nom: 'Mark IV', fab: (A, livree) => mark4(A, livree), vitesse: 0.9, franchit: 9, camp: 'nous', hauteur: 2.7, zoom: 9 },
  ft: { nom: 'Renault FT', fab: A => ft(A), vitesse: 1.4, franchit: 5, camp: 'nous', hauteur: 2.2, zoom: 10 },
  schneider: { nom: 'Schneider CA 1', fab: A => schneider(A), vitesse: 1.0, franchit: 6, camp: 'nous', hauteur: 2.4, zoom: 9 },
  stchamond: { nom: 'Saint-Chamond', fab: A => stChamond(A), vitesse: 1.0, franchit: 4, camp: 'nous', hauteur: 2.7, zoom: 9 },
  a7v: { nom: 'A7V', fab: A => a7v(A), vitesse: 0.9, franchit: 4, camp: 'eux', hauteur: 4.0, zoom: 9 },
};
const VUES = { 'Derrière': [0.15, 0.62], 'De côté': [Math.PI / 2, 0.3], 'De face': [Math.PI + 0.35, 0.3], 'De dessus': [0.15, 1.5] };
let crateres = false, livreeMark4 = 'nous';                   // gardés d'un « Rejouer » à l'autre

export function maquetteChars(stage, R, cle) {
  const E = ENGINS[cle], allemand0 = cle === 'a7v';
  // pour voir les détails, la maquette ajoute trois crans de zoom au-delà de 16 pixels par mètre (24, 32, 48) ; le jeu garde les siens (rendus à la fermeture)
  if (ZOOMS.length === 8) ZOOMS.push(24, 32, 48);
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, char = null, THREE = null, pivot = null, modele = null, nBalles = 0, ordreT = 0, bilan = '', AT = null;
    const livree = allemand0 || (cle === 'mark4' && livreeMark4 === 'allemand') ? 'allemand' : 'nous';
    ui.haut.append(
      bouton('Tirer un 155 sur le char', () => { if (ctx0 && char && char.etat !== 'detruit') ctx0.tirer('155', char.x, char.y, 1.2); }),
      bouton(crateres ? 'Cratères : oui' : 'Cratères : non', () => { crateres = !crateres; ui.rejouer(); }));
    if (cle === 'mark4') ui.haut.append(bouton(livree === 'allemand' ? 'Livrée : allemande (Beutepanzer)' : 'Livrée : britannique', () => { livreeMark4 = livreeMark4 === 'allemand' ? 'nous' : 'allemand'; ui.rejouer(); }));
    for (const [nom, [yaw, tg]] of Object.entries(VUES)) ui.haut.append(bouton(nom, () => { if (!ctx0) return; ctx0.suivre = true; ctx0.rendu.placerCamera(yaw, tg); ctx0.rendu.vue.zoom = E.zoom; }));
    ui.haut.append(bouton('Vue d\'ensemble', () => { if (!ctx0) return; ctx0.suivre = false; ctx0.rendu.placerCamera(ctx0.vue0.yaw, ctx0.vue0.tangage); Object.assign(ctx0.rendu.vue, { zoom: ctx0.vue0.zoom, cx: ctx0.vue0.cx, cz: ctx0.vue0.cz }); }),
      bouton('Suivre', () => { if (ctx0) ctx0.suivre = !ctx0.suivre; }), bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)), bouton('Rejouer', ui.rejouer));
    const venantDuNord = E.camp === 'eux' || livree === 'allemand';         // un char allemand arrive du nord, vers nos lignes
    return scene(ui.stage, R, {
      ennemi: !venantDuNord, yNous: venantDuNord ? 205 : 178, zoom: E.zoom, cz: venantDuNord ? 160 : 140, libre: { yaw: 0.35, tangage: 0.7 },
      crateres: crateres ? [[1, 150, '155'], [-3, 138, '220'], [3, 126, '155'], [-1, 112, '220']] : [],
      apres: async ctx => {
        ctx0 = ctx; ctx.suivre = true;
        THREE = await loadThree(); AT = atelier(THREE);
        modele = E.fab(AT, livree === 'allemand' ? 'allemand' : 'britannique');
        pivot = new THREE.Group(); pivot.add(modele.groupe);
        const lumiere = new THREE.Group(); lumiere.add(new THREE.AmbientLight(0xffffff, 1.6)); const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
        ctx.rendu.scene.add(pivot, lumiere);
        char = venantDuNord ? { x: ctx.X, y: ctx.M.y + 108, v: 0, etat: 'avance', sens: 1 } : { x: ctx.X, y: ctx.M.y + 168, v: 0, etat: 'avance', sens: -1 };
        ctx.cible = char;
      },
      pas(dt, ctx, ev) {
        if (!char) return;
        const { A, B } = ctx, T = B.terrain;
        for (const e of ev) if (e.type === 'impact' && char.etat !== 'detruit' && Math.hypot(e.x - char.x, e.y - char.y) < 5) { char.etat = 'detruit'; bilan = 'Touché par un obus : il brûle.'; }
        if (char.etat === 'avance') {
          const cell = ((char.y + char.sens * 3) | 0) * T.W + (char.x | 0), prof = -T.diff[cell];
          let f = prof >= E.franchit ? 0 : prof >= E.franchit / 2 ? 0.35 : 1;
          if (f === 0) { char.etat = 'enlise'; bilan = `Ventre à terre dans un cratère de ${(prof / 4).toFixed(1)} m : il ne bouge plus.`; }
          char.v = E.vitesse * f;
          char.y += char.sens * char.v * dt;
          if (char.sens < 0 && char.y < ctx.M.y + 100) { char.etat = 'arrive'; bilan = 'Il a atteint leur tranchée.'; }
          if (char.sens > 0 && char.y > ctx.M.y + 190) { char.etat = 'arrive'; bilan = 'Il est sur notre tranchée.'; }
        } else char.v = 0;
        if (char.etat === 'detruit' && hash2(Math.floor(ctx.t * 4), ctx.run, 3) < 0.25) ctx.rendu.fumer(char.x, char.y);
        char.abrites = 0; char.terrifies = 0;
        if (char.sens < 0) {
          // nos hommes suivent à douze mètres, à son abri : la peur retombe
          if (ctx.t - ordreT > 2 && char.etat !== 'detruit') { ordreT = ctx.t; ordonnerMarche(B, [1], char.x, Math.min(char.y + 12, ctx.M.y + 190), 'ligne'); }
          for (const i of ctx.mien) if (Math.abs(A.x[i] - char.x) < 6 && A.y[i] > char.y && A.y[i] < char.y + 14) { A.peur[i] *= 0.92; char.abrites++; }
        } else if (char.etat !== 'detruit') {
          // un char d'en face : nos hommes à vingt-cinq mètres s'affolent ; ses mitrailleuses en couchent quelques-uns
          for (const i of ctx.mien) {
            const d = Math.hypot(A.x[i] - char.x, A.y[i] - char.y);
            if (d < 28) { A.peur[i] = Math.max(A.peur[i], 0.7); char.terrifies++; }
            if (d < 18 && hash2(i, Math.floor(ctx.t * 2), ctx.run) < 0.012) { mourir(B, i, 'tir'); char.tombes = (char.tombes || 0) + 1; }
          }
        }
      },
      image(dt, ctx) {
        const { svg, rendu } = ctx;
        if (!char || !pivot) return;
        const L = modele.longueur, f = char.sens < 0 ? -1 : 1;
        const hF = rendu.hauteurSol(char.x, char.y + f * L / 3), hB = rendu.hauteurSol(char.x, char.y - f * L / 3);
        pivot.position.set(char.x, (hF + hB) / 2 + 0.05, char.y);
        pivot.rotation.set(0, char.sens < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        modele.groupe.rotation.z = Math.atan2(hF - hB, 2 * L / 3);
        // la tourelle du FT cherche l'ennemi le plus proche
        let cap = 0;
        if (modele.tour) {
          let m = null, md = 1e9; for (const i of ctx.eux) { const d = Math.hypot(ctx.A.x[i] - char.x, ctx.A.y[i] - char.y); if (d < md) { md = d; m = i; } }
          const vise = m !== null && md < 120 && char.etat !== 'detruit';
          if (vise) cap = Math.atan2(-(ctx.A.y[m] - char.y), ctx.A.x[m] - char.x) - pivot.rotation.y;         // le cap du monde, moins celui de la caisse
          modele.flash.visible = vise && hash2(Math.floor(ctx.t * 9), ctx.run, 5) < 0.3;
        }
        modele.maj(dt, char.etat === 'avance' ? char.v : 0, ctx, cap);
        // des balles qui ricochent : de petits traits d'os sur la coque, tant que l'autre camp a des hommes à portée
        if (char.etat === 'avance' || char.etat === 'enlise') {
          const portee = (char.sens < 0 ? ctx.eux : ctx.mien).some(i => Math.hypot(ctx.A.x[i] - char.x, ctx.A.y[i] - char.y) < 70);
          if (portee) for (let k = 0; k < 3; k++) {
            const u = hash2(nBalles++, ctx.run, 7), [sx, sy] = ctx.proj(char.x + (u - 0.5) * 3, char.y + char.sens * (4 - hash2(nBalles, 2, 7) * 3), E.hauteur * 0.7), l = 4 + hash2(nBalles, 3, 7) * 6;
            svg.append(svgEl('line', { x1: sx, y1: sy, x2: sx + (u - 0.5) * l * 2, y2: sy - l, stroke: PALETTE_OS, 'stroke-width': 2 }));
          }
        }
        ctx.dire([
          `${E.nom}${livree === 'allemand' && cle === 'mark4' ? ' (pris, livrée allemande)' : ''} · ${modele.longueur.toLocaleString('fr-FR')} m de long`,
          { avance: `Il avance : ${(char.v * 3.6).toFixed(1)} km/h.`, enlise: bilan, detruit: bilan, arrive: bilan }[char.etat],
          char.sens < 0 ? `Hommes à son abri : ${char.abrites || 0} sur ${ctx.mien.length}` : `Hommes affolés : ${char.terrifies || 0} · tombés : ${char.tombes || 0}`,
          crateres ? `Cratères sur sa route : il en franchit jusqu'à ${(E.franchit / 4).toFixed(1)} m de profondeur.` : 'Sa route est dégagée.',
        ]);
      },
    });
  });
  return () => { nettoyer(); ZOOMS.length = 8; };
}
const PALETTE_OS = P.o;
void texteSvg; void el;
