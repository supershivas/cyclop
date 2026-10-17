// Les formes du rendu, construites à la main : un soldat (de la boîte à la silhouette), un arbre, un buisson. Pas d'état :
// `THREE` et `col` (une couleur de la palette) viennent de creerRendu ; les soldats prennent aussi leurs attributs d'instance.
export function creerGeometries(THREE, col) {
  // les faces d'une boîte qu'on voit d'ici : le dessus, le sud, l'est et l'ouest (jamais le nord ni le dessous)
  function boiteVue(out, x0, x1, y0, y1, z0, z1, part, jambe = 0, dessusPart = part, bras = 0) {
    const q = (a, b, c, d, k) => { out.p.push(...a, ...b, ...c, ...a, ...c, ...d); for (let n = 0; n < 6; n++) { out.k.push(k); out.j.push(jambe); out.b.push(bras); } };
    q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], dessusPart);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], part);
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], part);
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], part);
  }
  function geometrieSoldat(style, attrsI) {   // attrsI : les attributs d'instance (position, camp, vitesse, tir) du rendu
    const g = { p: [], k: [], j: [], b: [] };
    // l'ombre au sol vers le sud-est (la lumière vient du nord-ouest)
    // (y = 1 : le bout de l'ombre, déplacé par le shader selon le soleil)
    g.p.push(-0.22, 0, 0, 0.22, 0, 0, 0.22, 1, 0, -0.22, 0, 0, 0.22, 1, 0, -0.22, 1, 0); for (let n = 0; n < 6; n++) { g.k.push(1); g.j.push(0); g.b.push(0); }
    const membres = style === 'detail' || style === 'silhouette' || style === 'marche';
    if (style === 'legere') {
      boiteVue(g, -0.2, 0.2, 0, 0.82, -0.12, 0.12, 3);                                // les jambes, d'un bloc (elles ne marchent pas)
      boiteVue(g, -0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0);                           // la vareuse
      boiteVue(g, -0.35, -0.24, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, -1);                // les bras
      boiteVue(g, 0.24, 0.35, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, 1);
      boiteVue(g, -0.16, 0.16, 1.4, 1.7, -0.14, 0.14, 6, 0, 2);                      // la tête, son dessus est le casque
      boiteVue(g, 0.37, 0.42, 0.55, 1.95, -0.03, 0.03, 4, 0, 4, 2);                  // le fusil
    } else if (!membres) boiteVue(g, -0.25, 0.25, 0, 1.7, -0.175, 0.175, 0, 0, 2);          // la boîte ; son dessus, le casque
    else if (style !== 'legere') {
      boiteVue(g, -0.2, -0.03, 0, 0.82, -0.09, 0.09, 3, 1);                          // les jambes
      boiteVue(g, 0.03, 0.2, 0, 0.82, -0.09, 0.09, 3, -1);
      boiteVue(g, -0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0);                           // la vareuse
      if (style === 'silhouette') {                                                  // les bras : le long du corps, ils se lèvent pour tirer
        boiteVue(g, -0.35, -0.24, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, -1);
        boiteVue(g, 0.24, 0.35, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, 1);
      }
      boiteVue(g, -0.1, 0.1, 1.4, 1.6, -0.1, 0.1, 6);                                // le visage
      boiteVue(g, -0.16, 0.16, 1.57, 1.7, -0.16, 0.16, 2);                           // le casque, plus large que la tête
    }
    if (style !== 'legere' && (style === 'fusil' || style === 'silhouette' || style === 'marche')) boiteVue(g, style === 'silhouette' ? 0.37 : 0.26, style === 'silhouette' ? 0.42 : 0.31, 0.55, 1.95, -0.03, 0.03, 4, 0, 4, style === 'silhouette' ? 2 : 0);   // le fusil, en bandoulière ; à l'épaule quand il tire
    if (style === 'silhouette' || style === 'marche') boiteVue(g, -0.19, 0.19, 0.95, 1.38, -0.32, -0.15, 5);                       // le sac, dans le dos
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(g.k, 1));
    gi.setAttribute('aJambe', new THREE.Float32BufferAttribute(g.j, 1));
    gi.setAttribute('aBras', new THREE.Float32BufferAttribute(g.b, 1));
    gi.setAttribute('aPos', attrsI[0]); gi.setAttribute('aCamp', attrsI[1]); gi.setAttribute('aVit', attrsI[2]);
    if (style === 'silhouette' || style === 'legere') gi.setAttribute('aTir', attrsI[3]);   // (la boîte ne tire pas : l'attribut absent vaut 0)
    gi.instanceCount = 0;
    return gi;
  }
  function geometrieArbre(v, abattu, loin = false) {
    const parts = [];
    const boite = (w, h, d, x, y, z, rz = 0, rx = 0) => {
      const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      g.translate(0, h / 2, 0); g.rotateZ(rz); g.rotateX(rx); g.translate(x, y, z);
      parts.push(g);
    };
    if (abattu) { boite(0.6, 1.1, 0.6, 0, 0, 0); boite(0.25, 1.6, 0.25, 0.1, 0.6, 0, 1.1); }
    else {
      const H = 6 + v;
      boite(0.55, H, 0.55, 0, 0, 0);
      // de loin (le sol à plat), le tronc seul : un arbre y fait quelques pixels (tout le champ : ~40 000 triangles de branches)
      for (let k = 0; k < (loin ? 0 : 4); k++) {
        const y = H * (0.45 + k * 0.13), s = k % 2 ? 1 : -1, l = 2.2 - k * 0.35;
        boite(0.22, l, 0.22, 0, y, 0, s * (0.7 + v * 0.1), (k - 1.5) * 0.3);
      }
    }
    const pos = parts.flatMap(g => [...g.attributes.position.array]);
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return out;
  }
  function geometrieBuisson(v) {
    const parts = [];
    const boite = (w, h, d, x, z) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, h / 2, z); parts.push(g); };
    boite(1.3 + v * 0.25, 1 + v * 0.2, 1.1, 0, 0);
    boite(0.9, 0.7, 0.8, 0.9, 0.35 - v * 0.25);
    if (v > 0) boite(0.8, 0.6, 0.7, -0.85, -0.3);
    const pos = parts.flatMap(g => [...g.attributes.position.array]);
    const nor = parts.flatMap(g => [...g.attributes.normal.array]);
    const dessus = col('g'), flanc = col('b'), couleurs = [];
    for (let k = 0; k < nor.length; k += 3) { const c = nor[k + 1] > 0.5 ? dessus : flanc; couleurs.push(c.r, c.g, c.b); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
    return out;
  }
  return { boiteVue, geometrieSoldat, geometrieArbre, geometrieBuisson };
}
