// Le fusil qu'on voit devant soi dans la vue d'un soldat (Jérôme, v0.147.0 : « ajouter le fusil visible devant nous, puis le tir possible »). Un petit monde à part (une scène, une caméra à 60°, deux lumières) dessiné
// par-dessus l'image du jeu après avoir vidé la profondeur : le fusil ne traverse jamais un mur ni un arbre, et ne dépend ni du zoom ni de l'articulé. Le recul et l'éclair viennent de `tir()` ; le dessin seulement
// (l'horloge du dessin, rien de sauvegardé).
// v0.154.0 (Jérôme, 20 nov. : « le bras qui tient le fusil est étrange en vue FPS, revois le visuel ») : avant, deux pavés de manche posés à côté de l'arme (un bleu flottait seul en bas de l'image), une crosse
// d'herbe morte (un pavé vert olive) et des mains de brume (grises). Maintenant un Lebel en bois de noyer (boue, glaise) et acier sombre, des mains au ton de peau hâlé du jeu (`g`, PEAUX) et DEUX BRAS QUI PARTENT
// DES MAINS : l'avant-bras va de la main au coude, le haut du bras du coude à l'épaule (hors de l'image), recalculés à chaque image (au repos, épaulé, au recul) ; la manche est celle du camp (`manches`).
export function creerFusilVue({ THREE, renderer, PALETTE }) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1.6, 0.02, 10);
  sc.add(new THREE.AmbientLight(0xffffff, 0.85));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.0); soleil.position.set(-1, 2, 1.2); sc.add(soleil);
  const mats = {};
  const mat = k => mats[k] ??= new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE[k]) });
  const boite = (parent, k, l, h, p, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat(k)); m.position.set(x, y, z); parent.add(m); return m; };
  // ─── le fusil (un Lebel : 1,3 m) : -z est devant ; l'origine est au poignet de la crosse, là où se pose la main droite ───
  const arme = new THREE.Group();
  boite(arme, 's', 0.02, 0.02, 0.62, 0, 0.034, -0.86);                   // le canon, qui dépasse du bois
  boite(arme, 'g', 0.046, 0.042, 0.56, 0, 0.012, -0.5);                  // le fût, sous le canon
  boite(arme, 'b', 0.03, 0.012, 0.5, 0, 0.038, -0.48);                   // le garde-main (le bois sur le canon, plus sombre)
  boite(arme, 's', 0.044, 0.05, 0.17, 0, 0.022, -0.13);                  // la boîte de culasse
  boite(arme, 'o', 0.012, 0.012, 0.045, 0.038, 0.03, -0.1);              // le levier de culasse (sa boule d'acier poli)
  boite(arme, 's', 0.03, 0.02, 0.07, 0, -0.022, -0.1);                   // le pontet
  boite(arme, 'g', 0.04, 0.05, 0.16, 0, -0.008, 0.04);                   // le poignet de la crosse
  boite(arme, 'g', 0.046, 0.085, 0.24, 0, -0.03, 0.22);                  // la crosse, qui s'élargit
  boite(arme, 's', 0.048, 0.09, 0.012, 0, -0.03, 0.345);                 // la plaque de couche
  boite(arme, 's', 0.008, 0.024, 0.01, 0, 0.056, -1.15);                 // le guidon
  boite(arme, 's', 0.03, 0.03, 0.03, 0, 0.03, -1.17);                    // la bouche (le bout du tube)
  boite(arme, 's', 0.012, 0.01, 0.2, 0, -0.004, -0.92);                  // la baguette sous le canon
  boite(arme, 's', 0.05, 0.012, 0.022, 0, 0.012, -0.72);                 // la grenadière (l'anneau de la bretelle)
  const eclair = boite(arme, 'o', 0.08, 0.08, 0.06, 0, 0.034, -1.22); eclair.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.o) }); eclair.visible = false;
  // les mains (la peau pâle, `o` de PEAUX : sur le bois de glaise elles se lisent) : la droite serre le poignet de la crosse, l'index au pontet, le pouce par-dessus ;
  // la gauche porte le fût par-dessous, ses doigts remontent sur le côté droit, le pouce sur le côté gauche
  const main = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); arme.add(g); return g; };
  const mainD = main(0.004, -0.014, 0.05);
  boite(mainD, 'o', 0.058, 0.07, 0.08, 0, 0, 0);                        // le poing autour du poignet de la crosse (le bois le traverse : on n'en voit que le dos et les phalanges)
  const mainG = main(0.0, -0.022, -0.46);
  boite(mainG, 'o', 0.058, 0.03, 0.095, 0, -0.008, 0); boite(mainG, 'o', 0.014, 0.034, 0.085, 0.027, 0.016, 0);      // la paume sous le fût, les doigts sur son flanc droit
  sc.add(arme);
  // ─── les bras : un avant-bras (la manche, son parement) de la main au coude, le haut du bras du coude à l'épaule ───
  const AXE = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  const membre = (r0, r1) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 7), mat('n')); m.position.y = 0.5; g.add(m); sc.add(g); return { g, m }; };
  const bras = { D: { avant: membre(0.04, 0.05), haut: membre(0.052, 0.06) }, G: { avant: membre(0.038, 0.05), haut: membre(0.05, 0.058) } };
  for (const c of ['D', 'G']) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.035, 7), mat('b')); p.position.y = 0.06; bras[c].avant.g.add(p); bras[c].parement = p; }     // le parement de la manche, au poignet
  const poser = (m, a, b) => { tmp.subVectors(b, a); const l = tmp.length(); m.g.position.copy(a); q.setFromUnitVectors(AXE, tmp.normalize()); m.g.quaternion.copy(q); m.m.scale.y = l; m.m.position.y = l / 2; };
  // les coudes et les épaules, dans le repère de la caméra : au repos le coude droit est bas et en dehors, le gauche sous le fût ; épaulé, le coude droit se lève, le gauche rentre sous l'arme
  const COUDES = { repos: { D: [0.3, -0.56, -0.3], G: [-0.02, -0.62, -0.5] }, vise: { D: [0.3, -0.24, -0.04], G: [-0.2, -0.4, -0.26] } };      // (au repos sous les mains : les avant-bras descendent vers le bas de l'image)
  const EPAULES = { D: [0.2, -0.24, 0.24], G: [-0.2, -0.26, 0.2] };
  const coude = new THREE.Vector3(), epaule = new THREE.Vector3(), poignet = new THREE.Vector3();
  const repos = { x: 0.12, y: -0.17, z: -0.42 };      // au repos : l'arme en travers, la main droite dans l'image en bas à droite
  arme.position.set(repos.x, repos.y, repos.z); arme.rotation.set(0.14, 0.16, 0);
  const vise = { x: 0, y: -0.088, z: -0.2 };      // épaulé (v0.151.0) : la crosse à l'épaule, le guidon au milieu de l'image
  let recul = 0, flash = 0, t = 0, ep = 0, epVoulu = 0;
  return {
    tir() { recul = 1; flash = 0.07; },
    epaule(v) { epVoulu = v ? 1 : 0; },
    /* la manche : 'n' bleu horizon (nous), 'x' kaki (en face) */
    manches(lettre) { for (const c of ['D', 'G']) for (const k of ['avant', 'haut']) bras[c][k].m.material = mat(lettre); },
    /* un pas du dessin : le recul retombe, le fusil respire un peu, les bras suivent les mains */
    maj(dt) {
      t += dt; recul *= Math.exp(-dt * 11); flash = Math.max(0, flash - dt);
      ep += (epVoulu - ep) * Math.min(1, dt * 12); const m = (a, b) => a + (b - a) * ep;
      arme.position.set(m(repos.x, vise.x), m(repos.y, vise.y) + Math.sin(t * 1.3) * 0.003 * (1 - ep), m(repos.z, vise.z) + 0.08 * recul);
      arme.rotation.set(m(0.14, 0.045) + 0.12 * recul, m(0.16, 0), 0);
      eclair.visible = flash > 0;
      arme.updateMatrixWorld(true);
      mainD.position.set(0.004 + 0.03 * ep, -0.014 - 0.022 * ep, 0.05 + 0.03 * ep);      // épaulé, le poing droit (tout près de l'œil) glisse un peu à droite et sous le poignet : il ne barre plus le bas de l'image
      arme.updateMatrixWorld(true);
      for (const [c, h] of [['D', mainD], ['G', mainG]]) {
        h.getWorldPosition(poignet); poignet.y -= 0.02; poignet.z += 0.03;      // le poignet : sous la main, juste derrière
        const a = COUDES.repos[c], b = COUDES.vise[c];
        coude.set(m(a[0], b[0]), m(a[1], b[1]), m(a[2], b[2]) + 0.05 * recul);
        epaule.set(...EPAULES[c]); epaule.z += 0.05 * recul;
        poser(bras[c].avant, poignet, coude); poser(bras[c].haut, coude, epaule);
      }
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
