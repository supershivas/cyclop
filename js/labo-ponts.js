// Les ponts du labo (Jérôme, v0.47.1 : « dans l'onglet terrain, dix versions de ponts (simple, arches, bois, métal, etc.), l'eau doit passer dessous »).
// A : le pont du jeu (un tablier de planches posé sur l'eau par l'éditeur de carte, `pont` de objets, v0.44.0). B à K : dix ouvrages de 1914-18 dessinés en volumes (`THREE`, 1 unité = 1 m, mêmes arêtes
// que les chars), posés sur le moteur du jeu au-dessus d'un fleuve de 16 m de large : l'eau n'est pas touchée, elle passe sous chaque pont (les piles, les arches, les pontons, rien). La caméra est libre
// (glisser : tourner et incliner ; Maj ou bouton droit : déplacer ; molette : zoomer). Rien n'est dans le jeu : le tablier du jeu reste celui d'aujourd'hui tant que Jérôme n'a pas tranché ;
// le régiment au bord de l'eau donne l'échelle (un homme : 1,7 m).
// Chaque ouvrage est construit autour de son tablier : l'origine est le milieu du pont, au niveau du dessus du tablier (y = 0), x le long de la portée, z en travers. `d` donne la portée entre les rives
// (`L`, 16 m + les appuis), la largeur utile (`W`) et la hauteur de la rive sur l'eau (`H`). Les nombres sont des proportions plausibles de l'époque, pas des plans.
import { PALETTE as P } from './palette.js?v=0.52.2';
import { loadThree } from './three-lib.js?v=0.52.2';
import { SECTEURS } from './data/secteur.js?v=0.52.2';
import { el, scene, maquette, bouton } from './labo-arcade.js?v=0.52.2';
import { outils, OUVRAGES } from './rendu/ponts-modeles.js?v=0.52.2';

const RIVIERE = { o: 'fleuve', x: -100, y: 150, x2: 500, y2: 150, r: 8 };
const PONT_JEU = { o: 'pont', x: 150, y: 162, x2: 150, y2: 138, r: 3 };

// ─── Les fiches (nom, note) : lues par le labo ───
export const PONTS = {
  planches: 'Une passerelle de planches sur trois paires de piles de bois, deux garde-corps de poteaux et de cordes. Le plus vite posé, le plus fragile : un obus tombé à moins de trois mètres la coupe d\'un coup.',
  arches: 'Un pont de pierre à trois arches en plein cintre, des parapets de 80 cm, des piles de 1,1 m dans l\'eau. L\'ouvrage qui dure : la rivière passe par les trois arches, le tablier est large et dur, aucun obus de 75 ne l\'abîme.',
  dosdane: 'Une seule arche de pierre, le tablier monte de 1,3 m au milieu (un dos d\'âne). L\'eau passe par l\'arche sans rien rencontrer dans le lit. On voit loin du haut : un point d\'observation, et un point de mire.',
  chevalets: 'Un pont de chevalets de bois : un portique de deux poteaux contreventés tous les quatre mètres, des longerons, un tablier plat. Celui que le génie jette en quelques heures ; l\'eau traverse la forêt des poteaux.',
  warren: 'Une poutre métallique à treillis Warren : deux poutres de 3,4 m, des diagonales alternées, le tablier entre elles, des culées de pierre. Rien dans l\'eau : tout se joue au-dessus. Un obus qui touche une diagonale la fait plier.',
  suspendu: 'Un pont suspendu : deux pylônes de pierre, deux câbles en chaînette, des suspentes, un tablier léger. La portée est libre sous lui, mais il balance, et un câble coupé le fait pencher.',
  pontons: 'Un pont de bateaux (équipage du génie) : cinq bateaux plats alignés sur l\'eau, un tablier bas, des rampes à chaque rive. Il suit le niveau de l\'eau, se jette et se replie en une nuit ; l\'eau l\'entoure plutôt qu\'elle ne passe dessous.',
  poutres: 'Des poutres pleines rivées posées sur deux piles de pierre à avant-becs : le pont de chemin de fer de 1900, le plus répandu en Europe. Sobre, solide, lourd : le seul où un char passe.',
  bascule: 'Un pont à bascule à contrepoids : une volée baissée, l\'autre relevée à 55°, des chaînes, un portique. Levé, il coupe le passage (mais laisse passer les bateaux) ; l\'ordre de le baisser prendrait quelques secondes.',
  cordes: 'Une passerelle de cordes et de planches, qui s\'affaisse de 1,6 m au milieu : un homme de front, en balançant. La nuit, un coup de coupe-fil la détruit sans bruit.',
};
export const NOMS_PONTS = { planches: 'La passerelle de planches', arches: 'Le pont de pierre à trois arches', dosdane: 'Le dos d\'âne', chevalets: 'Les chevalets de bois', warren: 'La poutre Warren', suspendu: 'Le pont suspendu', pontons: 'Le pont de bateaux', poutres: 'Les poutres sur piles', bascule: 'Le pont à bascule', cordes: 'La passerelle de cordes' };

export function maquettePonts(stage, R, cle) {
  const secteur0 = SECTEURS.essai;
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, pivot = null;
    ui.haut.append(
      bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)),
      bouton('De dessus', () => { if (ctx0) ctx0.rendu.placerCamera(ctx0.vue0.yaw, 1.2); }),
      bouton('De profil', () => { if (ctx0) ctx0.rendu.placerCamera(0.0, 0.05); }),
      bouton('Trois quarts', () => { if (ctx0) ctx0.rendu.placerCamera(ctx0.vue0.yaw, ctx0.vue0.tangage); }),
      bouton('Rejouer', ui.rejouer));
    // le fleuve (et, pour A, le pont du jeu) : posés sur « Les labours » le temps de monter la bataille de la maquette, puis rendus
    SECTEURS.essai = { ...secteur0, objets: cle === 'A' ? [RIVIERE, PONT_JEU] : [RIVIERE] };
    let arret;
    try {
      arret = scene(ui.stage, R, {
        ennemi: false, yNous: 172, zoom: 7, cz: 150, libre: { yaw: 0.75, tangage: 0.62 }, bloc: true,
        apres: async ctx => {
          ctx0 = ctx; ctx.suivre = false;
          if (cle === 'A') return;
          const THREE = await loadThree(), O = outils(THREE);
          const x = ctx.X, z = ctx.M.y + 150, eau = ctx.rendu.hauteurSol(x, z), rive = Math.max(ctx.rendu.hauteurSol(x, z - 10), ctx.rendu.hauteurSol(x, z + 10));
          const H = Math.max(1.1, rive - eau), d = { L: 22, W: 6, H };
          const ouvrage = OUVRAGES[cle](O, d);
          pivot = new THREE.Group(); pivot.add(ouvrage.g); pivot.position.set(x, rive, z); pivot.rotation.y = Math.PI / 2;
          const lumiere = new THREE.Group(); lumiere.add(new THREE.AmbientLight(0xffffff, 1.6)); const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
          ctx.rendu.scene.add(pivot, lumiere);
          ctx.info = `${NOMS_PONTS[cle]} · rive à ${H.toFixed(1)} m au-dessus de l'eau · 22 m de long, 6 m de large`;
        },
        image(dt, ctx) { ctx.dire([cle === 'A' ? 'Le pont du jeu : un tablier de planches posé sur l\'eau (éditeur de carte, v0.44.0).' : ctx.info || '', 'Le fleuve : 16 m de large, l\'eau passe sous l\'ouvrage.', 'Glissez pour tourner, Maj ou clic droit pour déplacer, molette pour zoomer.']); },
      });
    } finally { SECTEURS.essai = secteur0; }
    return arret;
  });
  return () => { nettoyer(); SECTEURS.essai = secteur0; };
}
void el;
