/* Les bruitages (Jérôme, v0.99.6 : « le son synthétisé est très mauvais ») : des mp3 libres de droits (CC0) dans `assets/sons/`, un par variante, mono.
   Chaque famille a ses candidates (`variantes`) et celles que le jeu joue (`choisi` : une seule, ou plusieurs tirées au sort par le générateur local du son).
   Le choix se fait à l'écoute, au labo (sujet « Le son », maquette « Les bruitages ») : le changer ici, c'est changer `choisi`. Une famille dont le fichier manque retombe
   sur la synthèse de `audio.js`. Licences, auteurs et adresses : `assets/sons/LICENCES.md` (les mêmes champs sont ici pour que le labo les affiche).
   `gain` : le niveau de la variante (les fichiers sont normalisés, certains restent plus forts que d'autres) ; `taux` : de combien le sort fait varier la hauteur. */
const OGA = 'https://opengameart.org/content/';
const v = (nom, auteur, page, extra = {}) => ({ nom, auteur, url: OGA + page, licence: 'CC0', ...extra });

export const SONS = {
  obus75: {
    nom: 'Obus de 75', genre: 'coup', taux: 0.08, gain: 0.9, choisi: ['b'],
    variantes: {
      a: v('Explosion', 'tinyworlds', 'explosion-0', { fichier: 'obus75-a.mp3' }),
      b: v('Synthesized explosion', 'qubodup', 'synthesized-explosion', { fichier: 'obus75-b.mp3' }),
      c: v('Dull explosion (court)', 'qubodup', 'dull-explosion', { fichier: 'obus75-c.mp3' }),
    },
  },
  obus155: {
    nom: 'Obus de 155', genre: 'coup', taux: 0.06, gain: 1, choisi: ['a'],
    variantes: {
      a: v('Explosion somewhere far', 'pauliuw', 'explosion-somewhere-far', { fichier: 'obus155-a.mp3' }),
      b: v('Chunky Explosion (3,5 s)', 'joth', 'chunky-explosion', { fichier: 'obus155-b.mp3' }),
    },
  },
  obus220: {
    nom: 'Obus de 220', genre: 'coup', taux: 0.05, gain: 1, choisi: ['b'],
    variantes: {
      a: v('Muffled Distant Explosion', 'NenadSimic', 'muffled-distant-explosion', { fichier: 'obus220-a.mp3' }),
      b: v('Chunky Explosion (ralentie, plus grave)', 'joth', 'chunky-explosion', { fichier: 'obus220-b.mp3' }),
    },
  },
  fusil: {
    nom: 'Tir de fusil', genre: 'coup', taux: 0.12, gain: 0.55, choisi: ['a'],
    variantes: {
      a: v('Gunshot sound effect', 'HingyDunyas', 'gunshot-sound-effect', { fichier: 'fusil-a.mp3' }),
      b: v('Black Powder (poudre noire)', 'Kurt', 'gunshots', { fichier: 'fusil-b.mp3' }),
      c: v('22 Magnum', 'Kurt', 'gunshots', { fichier: 'fusil-c.mp3' }),
    },
  },
  mitrailleuse: {
    nom: 'Mitrailleuse (un coup, répété)', genre: 'coup', taux: 0.1, gain: 0.45, cadence: 9, choisi: ['b'],
    variantes: {
      a: v('gun3Machinegun', 'yd', 'war-on-water-sndfx', { fichier: 'mg-a.mp3' }),
      b: v('gun1Light', 'yd', 'war-on-water-sndfx', { fichier: 'mg-b.mp3' }),
      c: v('gun2Heavy', 'yd', 'war-on-water-sndfx', { fichier: 'mg-c.mp3' }),
    },
  },
  mitraillage: {
    nom: 'Mitraillage aérien (un coup, répété)', genre: 'coup', taux: 0.08, gain: 0.6, cadence: 14, choisi: ['c'],
    variantes: {
      a: v('gun3Machinegun', 'yd', 'war-on-water-sndfx', { fichier: 'mg-a.mp3' }),
      b: v('gun1Light', 'yd', 'war-on-water-sndfx', { fichier: 'mg-b.mp3' }),
      c: v('gun2Heavy', 'yd', 'war-on-water-sndfx', { fichier: 'mg-c.mp3' }),
    },
  },
  avion: {
    nom: 'Vol d\'avion (boucle)', genre: 'boucle', gain: 0.7, choisi: ['a'],
    variantes: {
      a: v('airplane1', 'yd', 'war-on-water-sndfx', { fichier: 'avion-a.mp3' }),
      b: v('airplane2', 'yd', 'war-on-water-sndfx', { fichier: 'avion-b.mp3' }),
      c: v('airplane3', 'yd', 'war-on-water-sndfx', { fichier: 'avion-c.mp3' }),
    },
  },
  pluie: {
    nom: 'Pluie (boucle)', genre: 'boucle', gain: 0.55, choisi: ['b'],
    variantes: {
      a: v('Rain (loopable) 1', 'ylmir', 'rain-loopable', { fichier: 'pluie-a.mp3' }),
      b: v('Rain (loopable) 2', 'ylmir', 'rain-loopable', { fichier: 'pluie-b.mp3' }),
      c: v('AMB Rain Loop 1', 'Kresiek the furry', 'amb-rain-loop-1', { fichier: 'pluie-c.mp3' }),
    },
  },
  vent: {
    nom: 'Vent (boucle)', genre: 'boucle', gain: 0.6, choisi: ['a'],
    variantes: {
      a: v('Wind', 'ignasd', 'wind', { fichier: 'vent-a.mp3' }),
      b: v('wind1', 'lukerustltd', 'wind1', { fichier: 'vent-b.mp3' }),
      c: v('Mild Wind Background Noise', 'bashar3a', 'mild-wind-background-noise', { fichier: 'vent-c.mp3', gain: 0.45 }),
    },
  },
};
export const DOSSIER_SONS = 'assets/sons/';
/* Les voix qu'une famille peut jouer en même temps (au-delà, le plus ancien se tait : la salve de 24 obus ne fait pas 24 explosions) et le total */
export const VOIX = { obus75: 5, obus155: 4, obus220: 3, fusil: 10, mitrailleuse: 6, mitraillage: 6, total: 28 };
