// La mitrailleuse qu'on voit devant soi dans la vue d'un poste (Jérôme, 23 nov., v0.167.0 : « on doit voir la mitrailleuse en bas, comme un fusil épaulé mais plus grande, avec la bande de balles ;
// des tirs rapides, plusieurs par seconde ; l'animation de la bande, les douilles qui sautent au hasard »). Le même petit monde à part que le fusil (rendu/fusil-vue.js) : une scène, une caméra à 60°,
// dessinée par-dessus l'image du jeu après avoir vidé la profondeur. Une Hotchkiss sur son trépied : la boîte de culasse, le canon et ses ailettes de refroidissement, les deux poignées et les mains
// du tireur ; la bande entre par la gauche, avance d'une cartouche à chaque coup ; la douille sort à droite, saute, tourne et retombe. Le dessin seulement (l'horloge du dessin, rien de sauvegardé ;
// le hasard des douilles est un générateur local, jamais la graine de la bataille).
export function creerMitrailleuseVue({ THREE, renderer, PALETTE }) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1.6, 0.02, 10);
  sc.add(new THREE.AmbientLight(0xffffff, 0.85));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.0); soleil.position.set(-1, 2, 1.2); sc.add(soleil);
  const mats = {};
  const mat = k => mats[k] ??= new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE[k]) });
  const boite = (parent, k, l, h, p, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat(k)); m.position.set(x, y, z); parent.add(m); return m; };
  // ─── l'arme : -z est devant ; l'origine est au fond de la culasse ───
  const arme = new THREE.Group();
  boite(arme, 's', 0.13, 0.12, 0.42, 0, 0, -0.21);                       // la boîte de culasse
  boite(arme, 'b', 0.135, 0.02, 0.4, 0, 0.07, -0.21);                    // son couvercle
  boite(arme, 's', 0.045, 0.045, 1.0, 0, 0.02, -0.9);                    // le canon
  for (let k = 0; k < 7; k++) boite(arme, 'g', 0.1, 0.1, 0.022, 0, 0.02, -0.5 - k * 0.055);      // les ailettes de refroidissement (le laiton terni)
  boite(arme, 's', 0.07, 0.07, 0.06, 0, 0.02, -1.42);                    // le cache-flamme
  boite(arme, 's', 0.012, 0.04, 0.012, 0, 0.065, -1.38);                 // le guidon
  boite(arme, 's', 0.03, 0.05, 0.02, 0, 0.09, -0.08);                    // la hausse
  // les deux poignées, à l'arrière, et les mains du tireur
  for (const x of [-0.085, 0.085]) { boite(arme, 'g', 0.035, 0.11, 0.04, x, -0.05, 0.06); boite(arme, 's', 0.02, 0.02, 0.08, x * 0.7, -0.01, 0.02); }
  const mains = [-0.085, 0.085].map(x => boite(arme, 'o', 0.06, 0.07, 0.07, x, -0.04, 0.07));
  // le trépied : deux pieds qui partent vers l'avant et en bas, hors de l'image
  boite(arme, 's', 0.08, 0.05, 0.08, 0, -0.08, -0.45);
  for (const x of [-1, 1]) { const p = boite(arme, 's', 0.035, 0.6, 0.035, x * 0.16, -0.32, -0.55); p.rotation.set(0.5, 0, x * 0.35); }
  const eclair = boite(arme, 'o', 0.16, 0.16, 0.1, 0, 0.02, -1.5); eclair.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.o) }); eclair.visible = false;
  // ─── la bande : des cartouches couchées dans leur bande de toile, la balle devant ; elle entre par la gauche de la culasse et pend en arc hors de l'image ───
  const N = 16, PAS = 0.034, bande = new THREE.Group(); bande.position.set(-0.07, 0.0, -0.24); arme.add(bande);
  const cartouches = [];
  for (let k = 0; k < N; k++) {
    const c = new THREE.Group();
    boite(c, 'o', 0.02, 0.02, 0.07, 0, 0, 0);                             // l'étui (le laiton pâle)
    boite(c, 'b', 0.016, 0.016, 0.025, 0, 0, -0.045);                     // la balle
    boite(c, 'g', PAS * 0.95, 0.008, 0.05, 0, -0.012, 0.005);             // la toile de la bande
    bande.add(c); cartouches.push(c);
  }
  let decal = 0;      // de combien la bande a glissé vers la culasse (en cartouches, de 0 à 1)
  const poserBande = () => cartouches.forEach((c, k) => { const u = (k + decal) * PAS; c.position.set(-u, -2.2 * u * u, -0.4 * u * u); c.rotation.z = Math.atan(4.4 * u); });
  poserBande();
  // ─── les douilles : une réserve, chacune avec sa vitesse et sa rotation ───
  const douilles = [];
  for (let k = 0; k < 16; k++) { const d = boite(sc, 'o', 0.012, 0.012, 0.05, 0, 0, 0); d.visible = false; douilles.push({ m: d, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 0 }); }
  let graine = 12345; const alea = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 4294967296; };
  sc.add(arme);
  const repos = { x: 0.02, y: -0.24, z: -0.5 };
  arme.position.set(repos.x, repos.y, repos.z); arme.rotation.set(0.04, 0, 0);
  let recul = 0, flash = 0, t = 0, avance = 0, prochaine = 0, monte = 1;      // monte : 0 l'arme sous l'image, 1 en place (v0.168.0)
  const tmp = new THREE.Vector3();
  return {
    /* un coup : le recul, l'éclair, la bande avance d'une cartouche, une douille saute */
    tir() {
      recul = 1; flash = 0.04; avance += 1;
      const d = douilles[prochaine]; prochaine = (prochaine + 1) % douilles.length;
      arme.updateMatrixWorld(true); tmp.set(0.08, 0.02, -0.2).applyMatrix4(arme.matrixWorld);
      d.m.position.copy(tmp); d.m.visible = true; d.t = 0;
      d.v.set(0.6 + alea() * 0.8, 0.5 + alea() * 0.9, 0.1 + (alea() - 0.5) * 0.5); d.w.set((alea() - 0.5) * 30, (alea() - 0.5) * 30, (alea() - 0.5) * 30);
    },
    apparition(v) { monte = Math.max(0, Math.min(1, v)); },
    manches(lettre) { for (const m of mains) m.material = mat(lettre === 'x' ? 'o' : 'o'); },      // (les mains nues : le même ton pour les deux camps)
    maj(dt) {
      t += dt; recul *= Math.exp(-dt * 25); flash = Math.max(0, flash - dt);
      arme.position.set(repos.x + Math.sin(t * 60) * 0.002 * recul, repos.y + 0.004 * recul - 0.45 * (1 - monte), repos.z + 0.025 * recul);
      arme.rotation.x = 0.04 + 0.03 * recul;
      eclair.visible = flash > 0; eclair.rotation.z = t * 37;
      // la bande glisse vers la culasse : chaque coup l'avance d'un pas, en douceur ; la cartouche qui y entre disparaît et revient au bout (la bande défile)
      if (avance > 0) { const f = Math.min(avance, dt * 30); avance -= f; decal -= f; if (decal < 0) decal += 1; poserBande(); }      // (elle avance d'un pas, puis la suivante prend la place : la bande défile)
      for (const d of douilles) {
        if (!d.m.visible) continue;
        d.t += dt; d.v.y -= 4.5 * dt; d.m.position.addScaledVector(d.v, dt);
        d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
        if (d.t > 1.2 || d.m.position.y < -0.9) d.m.visible = false;
      }
    },
    rendre(aspect) {
      cam.aspect = aspect; cam.updateProjectionMatrix();
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth();
      renderer.render(sc, cam);
      renderer.autoClear = ac;
    },
  };
}
