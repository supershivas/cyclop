// Le ciel du jeu : un dégradé et des nuages selon la météo (Jérôme, v0.36.8 : « léger dégradé, nuages » ; v0.36.7 : le ciel suit la météo). Un plan plein écran
// peint avant tout le reste, que le sol et le faux terrain recouvrent ; la nuit, le voile de `temps.js` le noircit. Des mélanges continus de la palette (des fondus) :
// `[lettre, part]`. `hor` est aussi la couleur du fond et du bout du champ. Le dessin seulement : aucun hasard, le temps est celui du dessin.
import * as SH from './shaders.js?v=0.41.1';
import { lune, couvertureNuit, clairDeLune } from '../data/lune.js?v=0.41.1';

const CIELS = {
  sec: { hor: [['e', 1]], haut: [['e', 0.75], ['t', 0.25]], nuage: [['o', 0.8], ['r', 0.2]], couv: 0.45 },
  pluie: { hor: [['e', 0.4], ['s', 0.6]], haut: [['e', 0.28], ['s', 0.52], ['t', 0.2]], nuage: [['e', 0.7], ['s', 0.3]], couv: 0.6 },
  brouillard: { hor: [['r', 1]], haut: [['r', 0.7], ['e', 0.3]], nuage: [['r', 0.7], ['o', 0.3]], couv: 0.3 },
  gel: { hor: [['e', 0.6], ['o', 0.4]], haut: [['e', 0.8], ['t', 0.2]], nuage: [['o', 0.85], ['r', 0.15]], couv: 0.35 },
};

// `THREE`, `scene`, `col` (une couleur de la palette) et `camera` viennent de creerRendu
export function creerCiel({ THREE, scene, col, camera }) {
  const u = {
    uInvProj: { value: camera.projectionMatrixInverse }, uMonde: { value: camera.matrixWorld },
    uHor: { value: new THREE.Color() }, uHaut: { value: new THREE.Color() }, uNuage: { value: new THREE.Color() }, uCouv: { value: 0.4 }, uT: { value: 0 },
  };
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SH.cielMat.v, fragmentShader: SH.cielMat.f, depthTest: false, depthWrite: false }));
  plan.frustumCulled = false; plan.renderOrder = -10; plan.visible = false;
  scene.add(plan);
  // le ciel de nuit (v0.40.0) : un second plan, peint après le voile, à la profondeur du fond (le sol le cache : seul le ciel le reçoit)
  const n = {
    uInvProj: u.uInvProj, uMonde: u.uMonde, uOs: { value: col('o') }, uBrume: { value: col('r') }, uTerre: { value: col('t') },
    uVis: { value: 0 }, uT: { value: 0 }, uCouv: { value: 0.3 }, uLune: { value: new THREE.Vector3(0, 0.5, 0.5) }, uClair: { value: 0 }, uVue: { value: new THREE.Vector2() },
  };
  const nuitPlan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: n, vertexShader: SH.nuitCiel.v, fragmentShader: SH.nuitCiel.f, depthTest: true, depthWrite: false, transparent: true }));
  nuitPlan.frustumCulled = false; nuitPlan.renderOrder = 5.6; nuitPlan.visible = false;
  scene.add(nuitPlan);
  const devant = new THREE.Vector3();
  const melange = (c, liste) => { c.setRGB(0, 0, 0); for (const [k, p] of liste) { const v = col(k); c.r += v.r * p; c.g += v.g * p; c.b += v.b * p; } return c; };
  return {
    // la couleur de l'horizon du temps qu'il fait (le fond, et le bout du champ)
    horizon(nom, c) { return melange(c, (CIELS[nom] || CIELS.sec).hor); },
    montrer(oui) { plan.visible = oui; if (!oui) nuitPlan.visible = false; },
    // d : l'obscurité (0 le jour, 0,74 la nuit) ; les étoiles, la lune et les nuages de nuit paraissent avec elle
    nuit(d, t, jour, graine, meteo) {
      const vis = Math.max(0, Math.min(1, (d - 0.3) / 0.4));
      nuitPlan.visible = vis > 0 && plan.visible;
      if (!nuitPlan.visible) return;
      camera.getWorldDirection(devant);
      // le haut de l'écran ne regarde pas au-dessus de l'horizon : pas de ciel à peindre (le nuanceur plein écran coûte cher en rendu logiciel)
      if (Math.asin(Math.max(-1, Math.min(1, devant.y))) + THREE.MathUtils.degToRad(camera.fov) / 2 < 0.01) { nuitPlan.visible = false; return; }
      const L = lune(jour, graine);
      n.uVis.value = vis; n.uT.value = t; n.uCouv.value = couvertureNuit(jour, graine, meteo);
      n.uLune.value.set(L.az, L.el, L.p); n.uClair.value = clairDeLune(jour, graine, meteo); n.uVue.value.set(Math.atan2(devant.x, devant.z), 0);
    },
    maj(nom, t) {
      const C = CIELS[nom] || CIELS.sec;
      melange(u.uHor.value, C.hor); melange(u.uHaut.value, C.haut); melange(u.uNuage.value, C.nuage); u.uCouv.value = C.couv; u.uT.value = t;
    },
  };
}
