// Le fusil qu'on voit devant soi dans la vue d'un soldat (Jérôme, v0.147.0 : « ajouter le fusil visible devant nous, puis le tir possible »). Un petit monde à part (une scène, une caméra à 60°, deux lumières) dessiné
// par-dessus l'image du jeu après avoir vidé la profondeur : le fusil ne traverse jamais un mur ni un arbre, et ne dépend ni du zoom ni de l'articulé. Des boîtes aux tons de la palette (un fusil Lebel : le bois `g` et `b`,
// l'acier `s`, la manche bleu horizon `n`, les mains `r`) ; le recul et l'éclair viennent de `tir()` ; le dessin seulement (l'horloge du dessin, rien de sauvegardé).
export function creerFusilVue({ THREE, renderer, PALETTE }) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1.6, 0.02, 10);
  sc.add(new THREE.AmbientLight(0xffffff, 1.0));
  const soleil = new THREE.DirectionalLight(0xffffff, 0.9); soleil.position.set(-1, 2, 1); sc.add(soleil);
  const mats = {};
  const mat = k => mats[k] ??= new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE[k]) });
  const boite = (parent, k, l, h, p, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat(k)); m.position.set(x, y, z); parent.add(m); return m; };
  // le fusil : -z est devant ; le pied de la crosse contre l'épaule (en bas à droite), le canon vers le centre de l'image
  const arme = new THREE.Group();
  boite(arme, 'b', 0.022, 0.022, 0.92, 0, 0.032, -0.58);                 // le canon
  boite(arme, 'g', 0.05, 0.04, 0.4, 0, 0.0, -0.42);                      // le garde-main
  boite(arme, 'b', 0.042, 0.05, 0.16, 0, 0.02, -0.14);                   // la boîte de culasse
  boite(arme, 's', 0.014, 0.014, 0.05, 0.036, 0.02, -0.12);              // la poignée de culasse
  boite(arme, 'h', 0.048, 0.07, 0.34, 0, -0.012, 0.12);                  // la crosse
  boite(arme, 'h', 0.05, 0.1, 0.1, 0, -0.04, 0.3);                       // le talon
  boite(arme, 's', 0.008, 0.022, 0.008, 0, 0.056, -1.02);                // le guidon
  boite(arme, 's', 0.03, 0.006, 0.12, 0, 0.012, -0.8);                   // la baguette sous le canon
  // les mains et les manches (bleu horizon : nous), accrochées à l'arme
  boite(arme, 'r', 0.07, 0.065, 0.12, -0.002, -0.05, -0.4);              // la main gauche sous le garde-main
  boite(arme, 'n', 0.085, 0.085, 0.42, -0.07, -0.13, -0.12).rotation.x = -0.35;      // l'avant-bras gauche : de la main vers le bas de l'image
  boite(arme, 'r', 0.06, 0.07, 0.09, 0, -0.045, 0.0);                    // la main droite à la poignée
  boite(arme, 'n', 0.08, 0.09, 0.4, 0.05, -0.15, 0.2).rotation.x = -0.15;            // l'avant-bras droit
  const eclair = boite(arme, 'o', 0.07, 0.07, 0.05, 0, 0.032, -1.07); eclair.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.o) }); eclair.visible = false;
  const repos = { x: 0.11, y: -0.16, z: -0.3 };
  arme.position.set(repos.x, repos.y, repos.z); arme.rotation.set(0.1, 0.1, 0);
  sc.add(arme);
  let recul = 0, flash = 0, t = 0;
  return {
    tir() { recul = 1; flash = 0.07; },
    /* un pas du dessin : le recul retombe, le fusil respire un peu */
    maj(dt) {
      t += dt; recul *= Math.exp(-dt * 11); flash = Math.max(0, flash - dt);
      arme.position.set(repos.x, repos.y + Math.sin(t * 1.3) * 0.003, repos.z + 0.08 * recul);
      arme.rotation.set(0.1 + 0.12 * recul, 0.1, 0);
      eclair.visible = flash > 0;
    },
    /* par-dessus l'image déjà dessinée (la profondeur est vidée : rien du monde ne le cache) */
    rendre(aspect) {
      cam.aspect = aspect; cam.updateProjectionMatrix();
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth();
      renderer.render(sc, cam);
      renderer.autoClear = ac;
    },
  };
}
