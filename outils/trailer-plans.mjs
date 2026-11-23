// Les plans du trailer (outils/trailer.mjs) : de la donnée. Coordonnées du secteur (0..400 × 0..300 ; notre 1re ligne à y = 215, la leur à y = 85).
// Une clé de caméra : x, y (le point visé), dist (m), yaw, tangage (rad), fov (°), zoom (indice de ZOOMS : il choisit le niveau de détail des soldats), haut (m).
// `avant` est joué une fois au début du plan, `pendant({ i, n, t, ips })` avant chaque image : ce sont des fonctions envoyées au navigateur (rien d'extérieur n'y est lu).

export const BATAILLE = { graine: 7, meteo: 'sec' };
export const MUSIQUE = { fichier: 'assets/music/The wolves.mp3', debut: 0 };

export const PLANS = [
  {
    nom: 'aube', duree: 6,
    camera: [
      { x: 150, y: 140, dist: 260, yaw: -0.45, tangage: 0.1, fov: 32, zoom: 3 },
      { x: 210, y: 140, dist: 220, yaw: 0.1, tangage: 0.12, fov: 32, zoom: 3 },
    ],
  },
  {
    nom: 'attente', duree: 4,
    camera: [
      { x: 232, y: 217, dist: 26, yaw: 0.35, tangage: 0.62, fov: 32, zoom: 8 },
      { x: 244, y: 217, dist: 16, yaw: 0.5, tangage: 0.5, fov: 32, zoom: 8 },
    ],
  },
  {
    nom: 'preparation', duree: 10,
    // nos batteries sur leur 1re ligne : un coup toutes les 0,4 s, 220 et 155, le long de la ligne (positions fixes, pas de hasard)
    pendant: ({ i, ips }) => {
      const pas = Math.round(ips * 0.4);
      if (i % pas) return;
      const k = i / pas, x = 130 + ((k * 37) % 140), y = 82 + ((k * 13) % 9), cal = k % 3 ? '155' : '220';
      __jeu.barrage(cal, x, y, 1);
    },
    camera: [
      { x: 190, y: 90, dist: 240, yaw: 0.25, tangage: 0.42, fov: 30, zoom: 4 },
      { x: 200, y: 88, dist: 170, yaw: 0.05, tangage: 0.36, fov: 30, zoom: 4 },
      { x: 205, y: 86, dist: 120, yaw: -0.08, tangage: 0.3, fov: 30, zoom: 5 },
    ],
  },
];
