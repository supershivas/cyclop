// Les formes du rendu, construites à la main : un soldat (de la boîte à la silhouette), un arbre, un buisson. Pas d'état :
// `THREE` et `col` (une couleur de la palette) viennent de creerRendu ; les soldats prennent aussi leurs attributs d'instance.
import { ARBRES_FEUILLES } from '../data/arbres.js?v=0.58.0';

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
    // (v0.27.0, au labo) `equipe` : la silhouette et son équipement (bottes, capote, ceinturon, cartouchières, gourde, mains, couverture roulée, baïonnette ; un casque et une moustache
    // par camp) ; `equipe-marche` : la même, dont les bras balancent à la marche (le nuanceur, `uBalance`). Les parties 7 (le cuir), 8 (les bottes) et 9 (les mains) sont nouvelles ;
    // une partie de 10 à 19 n'est dessinée que pour nous, de 20 à 29 que pour en face (le nuanceur la retire à l'autre camp).
    const eq = style === 'equipe' || style === 'equipe-marche', sil = style === 'silhouette' || eq;
    const membres = style === 'detail' || sil || style === 'marche';
    if (style === 'legere') {
      boiteVue(g, -0.2, 0.2, 0, 0.82, -0.12, 0.12, 3);                                // les jambes, d'un bloc (elles ne marchent pas)
      boiteVue(g, -0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0);                           // la vareuse
      boiteVue(g, -0.35, -0.24, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, -1);                // les bras
      boiteVue(g, 0.24, 0.35, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, 1);
      boiteVue(g, -0.16, 0.16, 1.4, 1.7, -0.14, 0.14, 6, 0, 2);                      // la tête, son dessus est le casque
      boiteVue(g, 0.37, 0.42, 0.55, 1.95, -0.03, 0.03, 4, 0, 4, 2);                  // le fusil
    } else if (!membres) boiteVue(g, -0.25, 0.25, 0, 1.7, -0.175, 0.175, 0, 0, 2);          // la boîte ; son dessus, le casque
    else if (style !== 'legere') {
      if (eq) {
        boiteVue(g, -0.2, -0.03, 0.12, 0.82, -0.09, 0.09, 3, 1);                     // les bandes molletières
        boiteVue(g, 0.03, 0.2, 0.12, 0.82, -0.09, 0.09, 3, -1);
        boiteVue(g, -0.21, -0.02, 0, 0.12, -0.1, 0.2, 8, 1);                         // les bottes, longues vers l'avant
        boiteVue(g, 0.02, 0.21, 0, 0.12, -0.1, 0.2, 8, -1);
        boiteVue(g, -0.27, 0.27, 0.56, 0.84, -0.17, 0.17, 0);                        // la capote, ses basques rabattues
      } else {
        boiteVue(g, -0.2, -0.03, 0, 0.82, -0.09, 0.09, 3, 1);                        // les jambes
        boiteVue(g, 0.03, 0.2, 0, 0.82, -0.09, 0.09, 3, -1);
      }
      boiteVue(g, -0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0);                           // la vareuse
      if (eq) {
        boiteVue(g, -0.255, 0.255, 0.77, 0.86, -0.16, 0.16, 7);                      // le ceinturon
        for (const x of [-0.17, -0.02, 0.13]) boiteVue(g, x, x + 0.1, 0.84, 0.97, 0.15, 0.2, 7);   // les cartouchières
        boiteVue(g, -0.3, -0.2, 0.55, 0.82, -0.2, -0.06, 5);                         // la gourde, à la hanche
        boiteVue(g, -0.22, 0.22, 1.35, 1.46, -0.2, 0.2, 5);                          // la couverture roulée, sur l'épaule
        boiteVue(g, -0.09, 0.09, 1.38, 1.43, 0.1, 0.16, 7);                          // le col
      }
      if (sil) {                                                  // les bras : le long du corps, ils se lèvent pour tirer
        boiteVue(g, -0.35, -0.24, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, -1);
        boiteVue(g, 0.24, 0.35, 0.82, 1.4, -0.07, 0.07, 0, 0, 0, 1);
        if (eq) { boiteVue(g, -0.35, -0.24, 0.74, 0.84, -0.06, 0.06, 9, 0, 9, -1); boiteVue(g, 0.24, 0.35, 0.74, 0.84, -0.06, 0.06, 9, 0, 9, 1); }   // les mains, au bout des bras
      }
      boiteVue(g, -0.1, 0.1, 1.4, 1.6, -0.1, 0.1, 6);                                // le visage
      boiteVue(g, -0.16, 0.16, 1.57, 1.7, -0.16, 0.16, 2);                           // le casque, plus large que la tête
      if (eq) {
        boiteVue(g, -0.02, 0.02, 1.7, 1.79, -0.14, 0.14, 12, 0, 12);                 // nous : le cimier du casque Adrian
        boiteVue(g, -0.15, 0.15, 1.6, 1.64, 0.15, 0.22, 12, 0, 12);                  // … et sa visière
        boiteVue(g, -0.07, 0.07, 1.47, 1.51, 0.1, 0.14, 13);                         // … la moustache du poilu
        boiteVue(g, -0.015, 0.015, 1.7, 1.84, -0.015, 0.015, 22, 0, 22);             // en face : la pointe du casque à pointe
        boiteVue(g, -0.15, 0.15, 1.6, 1.64, -0.22, -0.15, 22, 0, 22);                // … et son couvre-nuque
      }
    }
    if (style !== 'legere' && (style === 'fusil' || sil || style === 'marche')) boiteVue(g, sil ? 0.37 : 0.26, sil ? 0.42 : 0.31, 0.55, 1.95, -0.03, 0.03, 4, 0, 4, sil ? 2 : 0);   // le fusil, en bandoulière ; à l'épaule quand il tire
    if (eq) boiteVue(g, 0.385, 0.405, 1.95, 2.2, -0.012, 0.012, 4, 0, 4, 2);       // la baïonnette
    if (sil || style === 'marche') boiteVue(g, -0.19, 0.19, 0.95, 1.38, -0.32, -0.15, 5);                       // le sac, dans le dos
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(g.k, 1));
    gi.setAttribute('aJambe', new THREE.Float32BufferAttribute(g.j, 1));
    gi.setAttribute('aBras', new THREE.Float32BufferAttribute(g.b, 1));
    gi.setAttribute('aPos', attrsI[0]); gi.setAttribute('aCamp', attrsI[1]); gi.setAttribute('aVit', attrsI[2]);
    if ((sil || style === 'legere') && attrsI[3]) gi.setAttribute('aTir', attrsI[3]);   // (la boîte ne tire pas : l'attribut absent vaut 0)
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

  // ─── Les arbres variés (labo « Des arbres plus variés », v0.52.6) ───
  // Une famille = un tronc (ou deux), des branches, et les points où poussent les touffes de feuilles. Tout est dessiné à la hauteur de base `h` de la famille ;
  // l'instance l'allonge (échelle) selon `v` et le hachage de la position.
  // (un bout de branche, comme `boite` plus bas la tourne : rotateZ puis rotateX, à partir de sa base)
  const bout = (x, y, z, l, rz, rx) => { const c = l * Math.cos(rz); return [x - l * Math.sin(rz), y + c * Math.cos(rx), z + c * Math.sin(rx)]; };
  function formeArbre(id) {
    const troncs = [], pointes = [], neige = [];
    const tronc = (w, h, x, y, z, rz = 0, rx = 0) => { troncs.push({ w, h, x, y, z, rz, rx }); return bout(x, y, z, h, rz, rx); };
    // une branche sur un tronc incliné de `rzT` : sa base est sur le tronc, à la hauteur `y` ; elle part du côté `s` (±1)
    const branche = (w, y, l, rz, rx, rzT = 0) => { const bx = -y * Math.sin(rzT), by = y * Math.cos(rzT); const t = tronc(w, l, bx, by, 0, rz, rx); return t; };
    if (id === 'droit') {
      const H = 6; tronc(0.55, H, 0, 0, 0);
      for (let k = 0; k < 4; k++) { const t = branche(0.22, H * (0.45 + k * 0.13), 2.2 - k * 0.35, (k % 2 ? 1 : -1) * 0.85, (k - 1.5) * 0.3); pointes.push([t[0], t[1], t[2], 2.1 - k * 0.15]); }
      pointes.push([0, H + 0.4, 0, 2.9], [0, H * 0.82, 0, 2.5]);
      neige.push(...pointes.map(p => [p[0], p[1], p[2], 1]));
    } else if (id === 'penche') {
      const H = 5.5, r = 0.28; const top = tronc(0.5, H, 0, 0, 0, r);
      for (let k = 0; k < 3; k++) { const t = branche(0.2, H * (0.5 + k * 0.13), 2 - k * 0.4, r + (k % 2 ? 0.8 : -0.8), (k - 1) * 0.35, r); pointes.push([t[0], t[1], t[2], 2 - k * 0.2]); }
      pointes.push([top[0], top[1] + 0.3, top[2], 2.7]);
      neige.push(...pointes.map(p => [p[0], p[1], p[2], 1]));
    } else if (id === 'double') {
      const a = tronc(0.45, 6, 0, 0, 0, 0.14), b = tronc(0.4, 5, 0.1, 0, 0, -0.22);
      for (const [rzT, ys, sg] of [[0.14, [0.5, 0.72], 1], [-0.22, [0.55, 0.75], -1]]) for (const [k, f] of ys.entries()) {
        const H = rzT > 0 ? 6 : 5, t = branche(0.18, H * f, 1.7 - k * 0.3, rzT + sg * (0.75 + k * 0.1), k * 0.3 - 0.15, rzT); pointes.push([t[0] + (sg < 0 ? 0.1 : 0), t[1], t[2], 1.7]);
      }
      pointes.push([a[0], a[1] + 0.3, a[2], 2.6], [b[0] + 0.1, b[1] + 0.3, b[2], 2.4]);
      neige.push(...pointes.map(p => [p[0], p[1], p[2], 1]));
    } else if (id === 'mort') {                                                  // brisé par les obus : le sommet cassé, des branches qui pendent
      tronc(0.5, 5, 0, 0, 0); tronc(0.3, 1.4, 0.05, 5, 0, 0.9);                  // l'éclat du sommet
      tronc(0.22, 2.2, 0.2, 4.4, 0, 2.6); tronc(0.18, 1.8, -0.2, 3.2, 0, -2.4, 0.3); tronc(0.2, 1, 0.2, 2.5, 0, 1.2);
      neige.push([0.05, 5.1, 0, 1], [0.6, 4.4, 0, 0.8]);
    } else if (id === 'jeune') {
      const top = tronc(0.28, 3.4, 0, 0, 0);
      for (const [k, [f, l, rz]] of [[0.5, 1, 0.8], [0.7, 0.8, -0.8]].entries()) { const t = branche(0.14, 3.4 * f, l, rz, k * 0.3); pointes.push([t[0], t[1], t[2], 1.3]); }
      pointes.push([top[0], top[1] + 0.2, top[2], 1.9]);
      neige.push(...pointes.map(p => [p[0], p[1], p[2], 0.8]));
    } else {                                                                    // grand
      const H = 9; tronc(0.85, H, 0, 0, 0);
      for (let k = 0; k < 5; k++) { const t = branche(0.32, H * (0.35 + k * 0.1), 3.4 - k * 0.45, (k % 2 ? 1 : -1) * (0.8 + k * 0.03), (k - 2) * 0.3); pointes.push([t[0], t[1], t[2], 2.9 - k * 0.2]); }
      pointes.push([0, H + 0.5, 0, 4], [0, H * 0.84, 0, 3.6]);
      neige.push(...pointes.map(p => [p[0], p[1], p[2], 1.2]));
    }
    return { troncs, pointes, neige };
  }
  const boiteHaute = (parts, w, h, d, x, y, z, rz = 0, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(0, h / 2, 0); g.rotateZ(rz); g.rotateX(rx); g.translate(x, y, z);
    parts.push(g);
  };
  const positions = parts => new THREE.Float32BufferAttribute(parts.flatMap(g => [...g.attributes.position.array]), 3);
  // les troncs et les branches de la famille (la couleur de `arbreMat`) ; `forme.longs` : les parties dessinées
  function geometrieTroncs(id) {
    const parts = [];
    for (const t of formeArbre(id).troncs) boiteHaute(parts, t.w, t.h, t.w, t.x, t.y, t.z, t.rz, t.rx);
    const out = new THREE.BufferGeometry(); out.setAttribute('position', positions(parts)); return out;
  }
  // de loin, un tronc d'une hauteur d'un mètre, que l'instance allonge (la même pour toutes les familles : un tronc de quelques pixels)
  function geometrieTroncLoin() {
    const parts = []; boiteHaute(parts, 0.55, 1, 0.55, 0, 0, 0);
    const out = new THREE.BufferGeometry(); out.setAttribute('position', positions(parts)); return out;
  }
  // les feuilles d'une famille pour une saison (`mode` de ARBRES_FEUILLES) : des touffes en couleurs de sommets, ou des coiffes de neige ; `degarni` : seulement une part des touffes.
  // Rend null quand la famille n'a rien à montrer. Le dessous des boîtes n'est jamais dessiné.
  function geometrieFeuilles(id, mode, degarni) {
    const P = ARBRES_FEUILLES[mode];
    if (!P) return null;
    const F = formeArbre(id), pts = P.neige ? F.neige : F.pointes;
    if (!pts.length) return null;
    const garde = degarni ? P.degarni : P.garde, pos = [], coul = [];
    let n = 0;
    pts.forEach((p, k) => {
      if (Math.floor((k + 1) * garde) <= Math.floor(k * garde)) return;
      const s = p[3] * P.taille, w = P.neige ? s * 0.8 : s, h = P.neige ? 0.22 : s * 0.75;
      const g = new THREE.BoxGeometry(w, h, w).toNonIndexed(); g.translate(p[0], p[1], p[2]);
      const dessus = col(P.dessus[n % P.dessus.length]), flanc = col(P.flanc[n % P.flanc.length]);
      const a = g.attributes.position.array, nor = g.attributes.normal.array;
      for (let t = 0; t < a.length; t += 9) {
        if (nor[t + 1] < -0.5) continue;                                    // le dessous
        const c = nor[t + 1] > 0.5 ? dessus : flanc;
        for (let v = 0; v < 3; v++) { pos.push(a[t + v * 3], a[t + v * 3 + 1], a[t + v * 3 + 2]); coul.push(c.r, c.g, c.b); }
      }
      n++;
    });
    if (!pos.length) return null;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(coul, 3));
    return out;
  }
  // un arbre abattu : `longs` (labo) une souche éclatée et un tronc couché, long, au ras du sol, dont l'instance choisit le sens ; sinon celui d'avant
  function geometrieAbattuLong() {
    const parts = [];
    boiteHaute(parts, 0.6, 0.9, 0.6, 0, 0, 0);                                    // la souche
    boiteHaute(parts, 0.18, 0.5, 0.18, 0.14, 0.85, 0, 0.3); boiteHaute(parts, 0.15, 0.36, 0.15, -0.14, 0.85, 0.1, -0.4);        // ses éclats
    parts.push(new THREE.BoxGeometry(0.42, 0.42, 4.6).toNonIndexed().translate(0.05, 0.21, 2.9));                                // le tronc couché
    boiteHaute(parts, 0.14, 0.7, 0.14, 0.05, 0.4, 2.1, 0.5); boiteHaute(parts, 0.12, 0.6, 0.12, 0.05, 0.4, 3.7, -0.6);         // deux branches cassées
    const out = new THREE.BufferGeometry(); out.setAttribute('position', positions(parts)); return out;
  }
  return { boiteVue, geometrieSoldat, geometrieArbre, geometrieBuisson, geometrieTroncs, geometrieTroncLoin, geometrieFeuilles, geometrieAbattuLong };
}
