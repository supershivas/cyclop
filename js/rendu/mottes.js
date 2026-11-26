// Les mottes de terre jetées par un obus (Jérôme, v0.139.0 ; data/effets.js, MOTTES) : de petits blocs en volume, aux couleurs de la terre (le dessus
// d'une lettre, les flancs de sa lettre d'ombre), qui tournent en l'air, rebondissent une fois, restent un moment au sol puis s'y enfoncent.
// Un maillage instancié par lettre ; tout dézoomé (sous MOTTES.ppmMin), on ne les lance pas : les points d'avant suffisent. Le dessin seulement.
import { MOTTES } from '../data/effets.js?v=0.170.1';

export function creerMottes({ THREE, scene, col, ombre, surface, alea }) {
  const M = MOTTES, N = M.max, L = M.terres.length;
  // une motte : un icosaèdre aplati et cabossé (20 triangles), le dessus clair et les flancs sombres
  function geometrie(lettre) {
    const g = new THREE.IcosahedronGeometry(0.5, 0).toNonIndexed();
    const p = g.attributes.position.array, cle = (x, y, z) => `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`, bosses = new Map();
    let n = 0;
    for (let k = 0; k < p.length; k += 3) {
      const c = cle(p[k], p[k + 1], p[k + 2]);
      if (!bosses.has(c)) bosses.set(c, 0.75 + ((n++ * 0.618) % 1) * 0.5);       // un sommet partagé reste partagé : la motte reste fermée
      const f = bosses.get(c); p[k] *= f; p[k + 1] *= f * 0.7; p[k + 2] *= f;
    }
    g.computeVertexNormals();
    const nor = g.attributes.normal.array, dessus = col(lettre), flanc = col(ombre[lettre] ?? lettre), c = [];
    for (let k = 0; k < nor.length; k += 9) { const haut = nor[k + 1] + nor[k + 4] + nor[k + 7] > 0.9; const t = haut ? dessus : flanc; for (let v = 0; v < 3; v++) c.push(t.r, t.g, t.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return g;
  }
  const mesh = M.terres.map(l => { const m = new THREE.InstancedMesh(geometrie(l), new THREE.MeshBasicMaterial({ vertexColors: true }), N); m.count = 0; m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m; });
  // l'état : par lettre, N mottes (x, y, z, vx, vy, vz, axe de rotation, angle, vitesse de rotation, taille, rebonds, temps au sol)
  const S = mesh.map(() => ({ x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
    ax: new Float32Array(N * 3), ang: new Float32Array(N), w: new Float32Array(N), t: new Float32Array(N), reb: new Uint8Array(N), sol: new Float32Array(N).fill(-1), reste: new Float32Array(N), vie: new Uint8Array(N), tete: 0 }));
  function lancer(x, y, z, vx, vy, vz, taille) {
    const l = Math.floor(alea() * L), s = S[l], k = s.tete; s.tete = (k + 1) % N;
    s.x[k] = x; s.y[k] = y; s.z[k] = z; s.vx[k] = vx; s.vy[k] = vy; s.vz[k] = vz;
    const a = alea() * Math.PI * 2, b = alea() * 2 - 1, r = Math.sqrt(1 - b * b);
    s.ax[k * 3] = r * Math.cos(a); s.ax[k * 3 + 1] = b; s.ax[k * 3 + 2] = r * Math.sin(a);
    s.ang[k] = alea() * 6.28; s.w[k] = (4 + alea() * 10) * (alea() < 0.5 ? -1 : 1); s.t[k] = taille; s.reb[k] = 0; s.sol[k] = -1; s.vie[k] = 1;
    s.reste[k] = M.reste[0] + alea() * (M.reste[1] - M.reste[0]);
  }
  const q = new THREE.Quaternion(), ax = new THREE.Vector3(), pos = new THREE.Vector3(), ech = new THREE.Vector3(), m4 = new THREE.Matrix4();
  function maj(dt) {
    mesh.forEach((m, l) => {
      const s = S[l]; let n = 0;
      for (let k = 0; k < N; k++) {
        if (!s.vie[k]) continue;
        let e = s.t[k];
        if (s.sol[k] < 0) {
          s.vy[k] -= 18 * dt;
          s.x[k] += s.vx[k] * dt; s.y[k] += s.vy[k] * dt; s.z[k] += s.vz[k] * dt; s.ang[k] += s.w[k] * dt;
          const h = surface(s.x[k], s.z[k]) + e * 0.25;
          if (s.y[k] < h) {
            s.y[k] = h;
            if (!s.reb[k] && s.vy[k] < -3) { s.reb[k] = 1; s.vy[k] *= -M.rebond; s.vx[k] *= 0.45; s.vz[k] *= 0.45; s.w[k] *= 0.4; }      // un rebond, mou
            else s.sol[k] = 0;                                                                                                          // elle s'arrête
          }
        } else {
          s.sol[k] += dt;
          const f = (s.sol[k] - s.reste[k]) / M.enfonce;
          if (f >= 1) { s.vie[k] = 0; continue; }
          if (f > 0) { e *= 1 - f; s.y[k] -= dt * 0.08; }                    // elle s'enfonce, et rapetisse
        }
        ax.set(s.ax[k * 3], s.ax[k * 3 + 1], s.ax[k * 3 + 2]); q.setFromAxisAngle(ax, s.ang[k]);
        pos.set(s.x[k], s.y[k], s.z[k]); ech.set(e, e, e);
        m.setMatrixAt(n++, m4.compose(pos, q, ech));
      }
      m.count = n;
      if (n) { const im = m.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(0, n * 16); im.needsUpdate = true; }
    });
  }
  return {
    lancer, maj,
    reinitialiser() { for (const s of S) s.vie.fill(0); for (const m of mesh) m.count = 0; },
    set visible(v) { for (const m of mesh) m.visible = v; },
  };
}
