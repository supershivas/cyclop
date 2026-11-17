// Le feu (Jérôme, v0.139.0 ; data/effets.js, FEU ; une exception de palette) : des langues de flamme en lumière additive, dont la couleur va du cœur
// presque blanc au rouge sombre selon leur chaleur (le centre de la langue, la jeunesse de la flamme), qui montent en se balançant et rétrécissent,
// et des braises qui s'élèvent en zigzag. Une taille en mètres, à l'échelle de la vue (perspective). Le dessin seulement.
import { FEU } from '../data/effets.js?v=0.145.0';

const V = `
  attribute float aF; attribute float aTaille; attribute float aGraine; uniform float uEchelle; varying float vF; varying float vG; varying float vBraise;
  void main() {
    vF = aF; vG = aGraine; vBraise = aTaille < 0.0 ? 1.0 : 0.0;
    vec4 mv = viewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float t = abs(aTaille), pousse = vBraise > 0.5 ? 1.0 : (aF < 0.2 ? mix(0.55, 1.0, aF / 0.2) : mix(1.0, 0.3, (aF - 0.2) / 0.8));
    gl_PointSize = max(vBraise > 0.5 ? 1.0 : 2.0, t * pousse * uEchelle / max(0.5, -mv.z));
    if (aF < 0.0 || aF > 1.0) gl_Position = vec4(2.0);
  }`;
const F = `
  uniform vec3 uCoeur, uJaune, uOrange, uRouge; varying float vF; varying float vG; varying float vBraise;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y;
    if (vBraise > 0.5) { if (dot(p, p) > 1.0) discard; float c = 1.0 - vF; gl_FragColor = vec4(mix(uRouge, uJaune, c * 0.8), 0.9 * c); return; }
    // une langue : large en bas, effilée en haut, qui ondule (vG) ; la chaleur est au centre et au début de sa vie
    float haut = clamp(p.y, 0.0, 1.0);
    p.x += sin(p.y * 3.0 + vG * 6.28) * 0.18 * haut;
    float w = 1.0 - haut * 0.62, d = length(vec2(p.x / w, p.y * (p.y > 0.0 ? 0.85 : 1.35)));
    if (d > 1.0) discard;
    float chaleur = (1.0 - d) * (1.25 - vF * 1.1);
    vec3 c = mix(uRouge, uOrange, smoothstep(0.08, 0.35, chaleur));
    c = mix(c, uJaune, smoothstep(0.35, 0.6, chaleur));
    c = mix(c, uCoeur, smoothstep(0.62, 0.85, chaleur));
    gl_FragColor = vec4(c, smoothstep(0.0, 0.3, 1.0 - d) * (1.0 - vF * vF) * 0.85);
  }`;

export function creerFlammes({ THREE, scene, alea, echelle }) {
  const N = FEU.max, x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const age = new Float32Array(N).fill(99), vie = new Float32Array(N).fill(1), ph = new Float32Array(N);
  const pos = new Float32Array(N * 3), aF = new Float32Array(N).fill(-1), aT = new Float32Array(N), aG = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aTaille', new THREE.BufferAttribute(aT, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aGraine', new THREE.BufferAttribute(aG, 1).setUsage(THREE.DynamicDrawUsage));
  const C = FEU.couleurs, coul = h => new THREE.Color(h);
  const mat = new THREE.ShaderMaterial({ uniforms: { uEchelle: { value: 400 }, uCoeur: { value: coul(C.coeur) }, uJaune: { value: coul(C.jaune) }, uOrange: { value: coul(C.orange) }, uRouge: { value: coul(C.rouge) } },
    vertexShader: V, fragmentShader: F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts);
  let tete = 0, ventX = 0, ventZ = 0, t = 0;
  // une flamme (taille en m) ; `braise` : un petit point qui monte en zigzag
  function lancer(px, py, pz, pvx, pvy, pvz, taille, braise = false) {
    const k = tete; tete = (tete + 1) % N;
    x[k] = px; y[k] = py; z[k] = pz; vx[k] = pvx; vy[k] = pvy; vz[k] = pvz; age[k] = 0; ph[k] = alea();
    vie[k] = braise ? FEU.braises.vie[0] + alea() * (FEU.braises.vie[1] - FEU.braises.vie[0]) : FEU.vie[0] + alea() * (FEU.vie[1] - FEU.vie[0]);
    aT[k] = braise ? -FEU.braises.taille : taille; aG[k] = ph[k];
    if (!braise && alea() < FEU.braises.part) lancer(px, py + taille * 0.3, pz, (alea() - 0.5) * 1.5, 1.5 + alea() * 2, (alea() - 0.5) * 1.5, 0, true);
  }
  function maj(dt, cache = false) {
    t += dt;
    mat.uniforms.uEchelle.value = echelle();
    let n = 0;
    for (let k = 0; k < N; k++) {
      if (age[k] > vie[k]) { aF[k] = -1; continue; }
      age[k] += dt; n++;
      const braise = aT[k] < 0, fr = Math.exp(-FEU.freinage * dt);
      vy[k] = vy[k] * fr + (braise ? 1.2 : FEU.monte) * dt;
      vx[k] = vx[k] * fr + (Math.sin(t * (braise ? 9 : 5) + ph[k] * 6.28) * FEU.remous + ventX * 0.6) * dt;
      vz[k] = vz[k] * fr + (Math.cos(t * (braise ? 8 : 4.3) + ph[k] * 6.28) * FEU.remous * 0.7 + ventZ * 0.6) * dt;
      x[k] += vx[k] * dt; y[k] += vy[k] * dt; z[k] += vz[k] * dt;
      pos[k * 3] = x[k]; pos[k * 3 + 1] = y[k]; pos[k * 3 + 2] = z[k]; aF[k] = age[k] / vie[k];
    }
    for (const a of ['position', 'aF', 'aTaille', 'aGraine']) geo.attributes[a].needsUpdate = true;
    pts.visible = n > 0 && !cache;
  }
  return {
    lancer, maj,
    setVent(vxv, vzv) { ventX = vxv; ventZ = vzv; },
    reinitialiser() { age.fill(99); aF.fill(-1); },
  };
}
