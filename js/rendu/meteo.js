// La pluie (des traits qui tombent autour du centre de la vue) et le brouillard (un voile de brume continu qui s'épaissit vers le haut
// de l'écran, le lointain ; plus de trame depuis la v0.12.1). Le dessin seulement : `afficher` lit la météo, `maj` règle les nuanceurs.
import * as SH from './shaders.js?v=0.88.0';
import { METEO } from '../data/meteo.js?v=0.88.0';

const PLUIE = 1600, NEIGE = 1100;

// `THREE`, `scene` et `col` (une couleur de la palette) viennent de creerRendu ; l'ordre d'ajout à la scène et des tirages de `Math.random` est celui d'avant la découpe
export function creerMeteo({ THREE, scene, col }) {
  // ─── La pluie : des traits qui tombent, autour du centre de la vue ───
  const plPos = new Float32Array(PLUIE * 3), plVit = new Float32Array(PLUIE);
  for (let k = 0; k < PLUIE; k++) { plPos[k * 3] = Math.random() * 400; plPos[k * 3 + 1] = Math.random() * 40; plPos[k * 3 + 2] = Math.random() * 300; plVit[k] = 18 + Math.random() * 10; }
  const plGeo = new THREE.BufferGeometry();
  plGeo.setAttribute('position', new THREE.BufferAttribute(plPos, 3));
  plGeo.setAttribute('aVit', new THREE.BufferAttribute(plVit, 1));
  const plMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector2() }, uE: { value: new THREE.Vector2(400, 300) }, uCol: { value: col('r') }, uTaille: { value: 1 }, uDer: { value: new THREE.Vector2() } },
    vertexShader: SH.plMat.v,
    fragmentShader: SH.plMat.f,
    depthTest: false, depthWrite: false,
  });
  const pluie = new THREE.Points(plGeo, plMat); pluie.frustumCulled = false; pluie.renderOrder = 4;
  scene.add(pluie);
  // la neige (v0.51.0) : des flocons ronds, lents, que le vent pousse de côté ; créée à la première neige (un objet de plus dans la scène tire des identifiants avec `Math.random` : l'ordre de ces tirages fait l'empreinte du dessin)
  let neige = null, neigeMatT = null, fort = false;      // fort : la tempête, des flocons plus gros et un voile de brume
  function creerNeige() {
    const neigePos = new Float32Array(NEIGE * 3), neigeVit = new Float32Array(NEIGE);
    let germe = 12345; const hasard = () => ((germe = (Math.imul(germe, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < NEIGE; k++) { neigePos[k * 3] = hasard() * 400; neigePos[k * 3 + 1] = hasard() * 40; neigePos[k * 3 + 2] = hasard() * 300; neigeVit[k] = 2.5 + hasard() * 3; }
    const neigeGeo = new THREE.BufferGeometry();
    neigeGeo.setAttribute('position', new THREE.BufferAttribute(neigePos, 3));
    neigeGeo.setAttribute('aVit', new THREE.BufferAttribute(neigeVit, 1));
    neigeMatT = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector2() }, uE: { value: new THREE.Vector2(400, 300) }, uCol: { value: col('o') }, uTaille: { value: 2 }, uDer: { value: new THREE.Vector2() } },
      vertexShader: SH.neigeMat.v, fragmentShader: SH.neigeMat.f, depthTest: false, depthWrite: false,
    });
    neige = new THREE.Points(neigeGeo, neigeMatT); neige.frustumCulled = false; neige.renderOrder = 4; neige.visible = false;
    scene.add(neige);
  }
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
    afficher(h, vide) { if (!vide) { pluie.visible = h.meteo === 'pluie' && h.phase === 'jour'; { const nv = METEO[h.meteo]?.neige && h.phase === 'jour'; if (nv && !neige) creerNeige(); if (neige) neige.visible = !!nv; fort = !!h.tempete; } brume.visible = h.meteo === 'brouillard' || h.tempete; } },
    // `tAnim` : le temps du dessin ; `cx`, `cz` : le centre de la vue ; `p` : les pixels par mètre ; `vue` : la taille de l'écran
    // `vx`, `vz` : le vent en m/s ; la pluie en prend un peu (elle tombe en biais), la neige davantage (des flocons que le vent roule)
    maj(tAnim, cx, cz, p, vue, vx = 0, vz = 0, dt = 0) {
      plMat.uniforms.uDer.value.x += vx * 0.6 * dt; plMat.uniforms.uDer.value.y += vz * 0.6 * dt;
      if (neigeMatT) { neigeMatT.uniforms.uDer.value.x += (2 + vx * 1.1) * dt; neigeMatT.uniforms.uDer.value.y += vz * 1.1 * dt; }
      plMat.uniforms.uT.value = tAnim; plMat.uniforms.uC.value.set(cx, cz);
      { const e = Math.hypot(vue.vw, vue.vh) / p + 40; plMat.uniforms.uE.value.set(e, e); }
      plMat.uniforms.uTaille.value = p >= 4 ? 2 : 1;
      if (neigeMatT) neigeMatT.uniforms.uT.value = tAnim; if (neigeMatT) { neigeMatT.uniforms.uC.value.set(cx, cz); neigeMatT.uniforms.uE.value.copy(plMat.uniforms.uE.value); neigeMatT.uniforms.uTaille.value = (p >= 4 ? 3 : 2) + (fort ? 1 : 0); }
      brumeMat.uniforms.uH.value = vue.vh;
    },
  };
}
