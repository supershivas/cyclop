// Les épaves du labo (Jérôme, 1er novembre : « fais un atelier de crash dans le labo dans lequel on voit l'aléatoire de la destruction ; je veux du réalisme ») : douze carcasses d'un coup, chacune d'une graine
// différente (`dispositionAvion` / `dispositionChar` de js/epaves.js), posées sur le sol du moteur du jeu, vues de dessus par défaut (la caméra est libre : glisser, Maj ou bouton droit, molette). « Rejouer la chute »
// refait l'instant où la carcasse touche le sol et ses pièces partent ; « Autres tirages » prend douze autres graines ; une graine se rejoue (le numéro sous chaque épave). Dessin seulement : rien n'est sauvegardé.
import { loadThree } from './three-lib.js?v=0.108.1';
import { ZOOMS, ZOOMS_JEU } from './rendu3d.js?v=0.108.1';
import { el, svgEl, bouton, scene, maquette, texteSvg } from './labo-arcade.js?v=0.108.1';
import { atelier } from './rendu/engins.js?v=0.108.1';
import { monterEpaveAvion, monterEpaveChar } from './rendu/epaves.js?v=0.108.1';

const COLONNES = 4, LIGNES = 3;
const GABARIT = { spad: { pas: [34, 30], nom: 'SPAD XIII (nous)' }, albatros: { pas: [34, 30], nom: 'Albatros D.V (en face)' }, char: { pas: [22, 22], nom: 'Schneider CA 1' } };
let tirage = 0;                                   // gardé d'un « Rejouer » à l'autre

const DIT = {
  chenille: { intacte: 'intacte', cassee: 'cassée', deroulee: 'déroulée' }, eventre: { non: 'caisse entière', flanc: 'éventré par le flanc', ventre: 'ventre crevé' },
  coupole: { place: 'coupole en place', ouverte: 'coupole ouverte', arrachee: 'coupole arrachée' }, canon: { droit: 'canon droit', plie: 'canon plié', arrache: 'canon arraché' },
  brule: { non: 'sans suie', taches: 'taches de suie', noirci: 'noirci' },
};
const resume = (cle, e) => {
  if (cle === 'char') { const D = e.D; return `chenilles ${DIT.chenille[D.chenilles[0]]} / ${DIT.chenille[D.chenilles[1]]} · ${DIT.eventre[D.eventre]} · ${DIT.coupole[D.coupole]} · ${DIT.canon[D.canon]} · ${DIT.brule[D.brule]}`; }
  const libres = e.items.filter(i => i.libre).map(i => i.nom), brules = e.items.filter(i => i.d.brule).length;
  const f = e.D.pieces.fuselage, pos = Math.abs(f.roulis) > 2.6 ? 'sur le dos' : Math.abs(f.roulis) > 0.9 ? 'sur le flanc' : 'à plat';
  return `fuselage ${pos} · ${libres.length} pièce${libres.length > 1 ? 's' : ''} détachée${libres.length > 1 ? 's' : ''} sur 8 (${libres.join(', ') || 'aucune'}) · ${brules} brûlée${brules > 1 ? 's' : ''}`;
};

export function maquetteEpaves(stage, R, cle) {
  const G = GABARIT[cle];
  if (ZOOMS.length === ZOOMS_JEU) ZOOMS.push(32, 48, 64);
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, lot = [], t0 = 0;
    ui.haut.append(
      bouton('Autres tirages', () => { tirage += COLONNES * LIGNES; ui.rejouer(); }),
      bouton('Mêmes tirages', () => { tirage = 0; ui.rejouer(); }),
      bouton('Rejouer la chute', () => { t0 = ctx0 ? ctx0.t : 0; }),
      bouton('De dessus', () => { if (ctx0) { ctx0.rendu.placerCamera(0.0, 1.5); } }),
      bouton('De près, de côté', () => { if (ctx0) { ctx0.rendu.placerCamera(0.5, 0.6); ctx0.rendu.vue.zoom = 4; } }),
      bouton('Vue d\'ensemble', () => { if (ctx0) { ctx0.rendu.placerCamera(ctx0.vue0.yaw, ctx0.vue0.tangage); Object.assign(ctx0.rendu.vue, { zoom: ctx0.vue0.zoom, cx: ctx0.vue0.cx, cz: ctx0.vue0.cz }); } }),
      bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)), bouton('Rejouer', ui.rejouer));
    return scene(ui.stage, R, {
      bloc: false, zoom: cle === 'char' ? 3 : 2, cz: 130, libre: { yaw: 0.0, tangage: 1.5 },
      apres: async ctx => {
        ctx0 = ctx;
        const THREE = await loadThree(), A = atelier(THREE);
        const lumiere = new THREE.Group(); lumiere.add(new THREE.AmbientLight(0xffffff, 1.6)); const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
        ctx.rendu.scene.add(lumiere);
        const x0 = ctx.X - (COLONNES - 1) * G.pas[0] / 2, z0 = ctx.M.y + 130 - (LIGNES - 1) * G.pas[1] / 2;
        for (let k = 0; k < COLONNES * LIGNES; k++) {
          const graine = tirage + k + 1, x = x0 + (k % COLONNES) * G.pas[0], z = z0 + Math.floor(k / COLONNES) * G.pas[1], sol = ctx.rendu.hauteurSol(x, z);
          const e = cle === 'char' ? monterEpaveChar(THREE, A, graine) : monterEpaveAvion(THREE, A, cle, graine);
          const pivot = new THREE.Group(); pivot.position.set(x, sol, z); pivot.add(e.racine); ctx.rendu.scene.add(pivot);
          pivot.updateMatrixWorld(true);
          e.poser((px, pz) => ctx.rendu.hauteurSol(px, pz) - sol);
          lot.push({ e, graine, x, z, sol });
        }
        t0 = ctx.t;
      },
      image(dt, ctx) {
        const { svg } = ctx;
        const u = (ctx.t - t0) / 1.8;
        for (const w of lot) {
          if (cle !== 'char') w.e.animer(u);
          const [sx, sy] = ctx.proj(w.x - G.pas[0] / 2 + 3, w.z + G.pas[1] / 2 - 3);
          texteSvg(svg, sx, sy, `n° ${w.graine}`, 11);
        }
        ctx.dire([
          `${G.nom} : ${lot.length} ${cle === 'char' ? 'chars détruits' : 'avions écrasés'}, douze graines (${tirage + 1} à ${tirage + lot.length}).`,
          'Rien n\'est pareil d\'une épave à l\'autre : la graine tire les pièces détachées, leur distance, leur attitude, ce qui a brûlé.',
          ...lot.slice(0, 4).map(w => `n° ${w.graine} : ${resume(cle, w.e)}`),
        ]);
      },
    });
  });
  return () => { nettoyer(); ZOOMS.length = ZOOMS_JEU; };
}
void el; void svgEl;
