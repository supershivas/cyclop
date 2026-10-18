// La pluie (des traits qui tombent autour du centre de la vue) et le brouillard (un voile de brume continu qui s'épaissit vers le haut
// de l'écran, le lointain ; plus de trame depuis la v0.12.1). Le dessin seulement : `afficher` lit la météo, `maj` règle les nuanceurs.
import * as SH from './shaders.js?v=0.31.4';

const PLUIE = 1600;

// `THREE`, `scene` et `col` (une couleur de la palette) viennent de creerRendu ; l'ordre d'ajout à la scène et des tirages de `Math.random` est celui d'avant la découpe
export function creerMeteo({ THREE, scene, col }) {
  // ─── La pluie : des traits qui tombent, autour du centre de la vue ───
  const plPos = new Float32Array(PLUIE * 3), plVit = new Float32Array(PLUIE);
  for (let k = 0; k < PLUIE; k++) { plPos[k * 3] = Math.random() * 400; plPos[k * 3 + 1] = Math.random() * 40; plPos[k * 3 + 2] = Math.random() * 300; plVit[k] = 18 + Math.random() * 10; }
  const plGeo = new THREE.BufferGeometry();
  plGeo.setAttribute('position', new THREE.BufferAttribute(plPos, 3));
  plGeo.setAttribute('aVit', new THREE.BufferAttribute(plVit, 1));
  const plMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector2() }, uE: { value: new THREE.Vector2(400, 300) }, uCol: { value: col('r') }, uTaille: { value: 1 } },
    vertexShader: SH.plMat.v,
    fragmentShader: SH.plMat.f,
    depthTest: false, depthWrite: false,
  });
  const pluie = new THREE.Points(plGeo, plMat); pluie.frustumCulled = false; pluie.renderOrder = 4;
  scene.add(pluie);
  // le brouillard : un voile de brume continu qui s'épaissit vers le haut de l'écran (le lointain) ; plus de trame (Jérôme, v0.12.1)
  const brumeMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('r') }, uH: { value: 400 } },
    vertexShader: SH.brumeMat.v,
    fragmentShader: SH.brumeMat.f,
    transparent: true,
    depthTest: false, depthWrite: false,
  });
  const brume = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brumeMat); brume.frustumCulled = false; brume.renderOrder = 5;
  scene.add(brume);

  return {
    // la pluie le jour seulement, le brouillard quand il y en a ; `vide` : rien (la vue sans bataille)
    afficher(h, vide) { if (!vide) { pluie.visible = h.meteo === 'pluie' && h.phase === 'jour'; brume.visible = h.meteo === 'brouillard'; } },
    // `tAnim` : le temps du dessin ; `cx`, `cz` : le centre de la vue ; `p` : les pixels par mètre ; `vue` : la taille de l'écran
    maj(tAnim, cx, cz, p, vue) {
      plMat.uniforms.uT.value = tAnim; plMat.uniforms.uC.value.set(cx, cz);
      { const e = Math.hypot(vue.vw, vue.vh) / p + 40; plMat.uniforms.uE.value.set(e, e); }
      plMat.uniforms.uTaille.value = p >= 4 ? 2 : 1;
      brumeMat.uniforms.uH.value = vue.vh;
    },
  };
}
