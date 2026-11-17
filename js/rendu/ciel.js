// Le ciel du jeu : un dégradé et des nuages selon la météo (Jérôme, v0.36.8 : « léger dégradé, nuages » ; v0.36.7 : le ciel suit la météo). Un plan plein écran
// peint avant tout le reste, que le sol et le faux terrain recouvrent ; la nuit, le voile de `temps.js` le noircit. Des mélanges continus de la palette (des fondus) :
// `[lettre, part]`. `hor` est aussi la couleur du fond et du bout du champ. Le dessin seulement : aucun hasard, le temps est celui du dessin.
import * as SH from './shaders.js?v=0.141.1';
import { lune, couvertureNuit, clairDeLune } from '../data/lune.js?v=0.141.1';
import { ALERTES } from '../palette.js?v=0.141.1';
import { NUAGES } from '../data/soleil.js?v=0.141.1';
const couvDe = nom => (NUAGES[nom] ?? NUAGES.sec).ciel;          // la part du ciel couverte : une seule valeur par temps (data/soleil.js), que les ombres au sol suivent aussi

// L'aube et le couchant (v0.134.5, « Éclairage : haut ») : de 0 (le jour) à 1 (le soleil au ras de l'horizon), d'après l'heure (le jour du jeu va de 6 h à 18 h).
// Avant, le ciel restait gris de 6 h à 18 h et rien ne disait l'heure à part la longueur des ombres (vu sur les captures du 15 novembre).
export const CREPUSCULE = { aube: [6.0, 8.6], soir: [15.2, 17.7], teinte: [1.0, 0.8, 0.58], force: 0.42 };      // teinte : la lumière chaude du soleil bas, multipliée sur toute l'image (un fondu), à `force` au plus
const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function crepuscule(heure) { return Math.max(1 - lisse(CREPUSCULE.aube[0], CREPUSCULE.aube[1], heure), lisse(CREPUSCULE.soir[0], CREPUSCULE.soir[1], heure)); }

// (v0.135.1, Jérôme : « d'autres couleurs de ciel, bleu notamment ; on peut sortir de la palette ») : un ciel à chaque temps, en teintes libres (`#rrggbb`, hors palette, mêlées comme les lettres) :
// le bleu franc du beau temps, le bleu pâle et dur du gel, le bleu laiteux de la chaleur, le bleu voilé du temps sec, le gris de plomb de la pluie, le blanc sale de la neige ; l'horizon toujours plus pâle
// que le zénith (l'épaisseur d'air). `hor` est aussi la couleur du fond et du bout du champ : elle reste pâle, pour que le lointain se perde dans l'air et pas dans le bleu.
const CIELS = {
  beau: { hor: [['#adc6e0', 1]], haut: [['#3f72b2', 1]], nuage: [['o', 0.95], ['#ffffff', 0.05]] },
  gel: { hor: [['#bed4e8', 1]], haut: [['#5a8bc4', 1]], nuage: [['o', 1]] },
  canicule: { hor: [['#d4d3c6', 1]], haut: [['#6d95c2', 1]], nuage: [['o', 1]] },
  sec: { hor: [['#b3c3cf', 1]], haut: [['#6489b0', 1]], nuage: [['o', 0.85], ['r', 0.15]] },
  couvert: { hor: [['#b4b6b2', 1]], haut: [['#8e949a', 1]], nuage: [['r', 0.7], ['o', 0.3]] },
  brouillard: { hor: [['r', 1]], haut: [['#a7aba6', 1]], nuage: [['r', 0.7], ['o', 0.3]] },
  pluie: { hor: [['#7d858a', 1]], haut: [['#4e565e', 1]], nuage: [['#6a7279', 0.7], ['s', 0.3]] },
  neige: { hor: [['#c8cacb', 1]], haut: [['#9ca3ab', 1]], nuage: [['#d2d4d4', 1]] },
  tempete: { hor: [['#c0c3c4', 1]], haut: [['#8a9097', 1]], nuage: [['#c9cbcb', 1]] },
};

// `THREE`, `scene`, `col` (une couleur de la palette) et `camera` viennent de creerRendu
export function creerCiel({ THREE, scene, col, camera }) {
  const u = {
    uInvProj: { value: camera.projectionMatrixInverse }, uMonde: { value: camera.matrixWorld },
    uSoleilDir: { value: new THREE.Vector3(0, 1, 0) }, uSoleilCoul: { value: new THREE.Color() }, uC2: { value: 0 }, uRouge: { value: 0 }, uVol: { value: 0 }, uVoile: { value: 0 }, uTerre: { value: col('t') }, uTeinteK: { value: new THREE.Vector3(1, 1, 1) }, uOrange: { value: new THREE.Color(ALERTES.orange) }, uHor: { value: new THREE.Color() }, uHaut: { value: new THREE.Color() }, uNuage: { value: new THREE.Color() }, uCouv: { value: 0.4 }, uT: { value: 0 }, uDer: { value: new THREE.Vector2() },
  };
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SH.cielMat.v, fragmentShader: SH.cielMat.f, depthTest: false, depthWrite: false }));
  plan.frustumCulled = false; plan.renderOrder = -10; plan.visible = false;
  scene.add(plan);
  // le ciel de nuit (v0.40.0) : un second plan, peint après le voile, à la profondeur du fond (le sol le cache : seul le ciel le reçoit)
  const n = {
    uInvProj: u.uInvProj, uMonde: u.uMonde, uOs: { value: col('o') }, uBrume: { value: col('r') }, uTerre: { value: col('t') },
    uVis: { value: 0 }, uT: { value: 0 }, uCouv: { value: 0.3 }, uLune: { value: new THREE.Vector3(0, 0.5, 0.5) }, uClair: { value: 0 }, uVue: { value: new THREE.Vector2() }, uDer: u.uDer,
  };
  const nuitPlan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: n, vertexShader: SH.nuitCiel.v, fragmentShader: SH.nuitCiel.f, depthTest: true, depthWrite: false, transparent: true }));
  nuitPlan.frustumCulled = false; nuitPlan.renderOrder = 5.6; nuitPlan.visible = false;
  scene.add(nuitPlan);
  // la lumière chaude du soleil bas sur le terrain : un plan plein écran qui MULTIPLIE l'image (après le monde, avant le voile de la nuit), créé à la première fois (un objet three de plus d'emblée décale les identifiants : les images de référence)
  let chaudPlan = null;
  function teinter(k) {
    if (!chaudPlan) {
      if (k <= 0) return;
      chaudPlan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { uK: { value: 0 }, uTeinte: { value: new THREE.Vector3(...CREPUSCULE.teinte) } },
        vertexShader: `void main() { gl_Position = vec4(position.xy, -1.0, 1.0); }`,
        fragmentShader: `uniform float uK; uniform vec3 uTeinte; void main() { gl_FragColor = vec4(mix(vec3(1.0), uTeinte, uK), 1.0); }`,
        transparent: true, premultipliedAlpha: true, blending: THREE.MultiplyBlending, depthTest: false, depthWrite: false,
      }));
      chaudPlan.frustumCulled = false; chaudPlan.renderOrder = 5.4;
      scene.add(chaudPlan);
    }
    chaudPlan.visible = k > 0.002; chaudPlan.material.uniforms.uK.value = k;
  }
  const devant = new THREE.Vector3();
  const eau = { hor: new THREE.Color(), haut: new THREE.Color(), chaud: new THREE.Color() };
  let lis = null;      // l'état de la météo continue (`lisser`)
  const libre = new THREE.Color();
  const melange = (c, liste) => { c.setRGB(0, 0, 0); for (const [k, p] of liste) { const v = k[0] === '#' ? libre.set(k) : col(k); c.r += v.r * p; c.g += v.g * p; c.b += v.b * p; } return c; };
  return {
    // la couleur de l'horizon du temps qu'il fait (le fond, et le bout du champ)
    horizon(nom, c) { return melange(c, (CIELS[nom] || CIELS.sec).hor); },
    // le ciel v2 (session 4) : le soleil, sa direction (monde) et sa couleur (os mêlé d'eau : un mélange continu de la palette), ou null pour l'éteindre
    // rouge : l'aube et le couchant (0 à 1, déjà atténué par un ciel couvert) : le ciel, la couleur du soleil et la teinte du terrain
    // voile : l'obscurité du soir (temps.js), que le ciel défait en partie (« haut » seulement : 0 sinon)
    voile(d) { u.uVoile.value = d; },
    volume(oui) { u.uVol.value = oui ? 1 : 0; },                     // (v0.134.7) les nuages en volume (« haut »)
    crepuscule(rouge) { const k = rouge * CREPUSCULE.force; u.uRouge.value = rouge; u.uTeinteK.value.set(...CREPUSCULE.teinte.map(v => 1 + (v - 1) * k)); teinter(k); },
    soleil(dir, force = 1) { if (!dir) { u.uC2.value = 0; u.uSoleilCoul.value.copy(col('o')).multiplyScalar(0.12); u.uSoleilDir.value.set(0, 1, 0); return; }      // (v0.134.7) sans soleil : une lumière diffuse d'en haut pour les nuages en volume
 u.uC2.value = 1; u.uSoleilDir.value.set(dir[0], dir[1], dir[2]); u.uSoleilCoul.value.copy(col('o')).multiplyScalar(0.55).add(col('e').multiplyScalar(0.1)).lerp(u.uOrange.value.clone().multiplyScalar(0.8), 0.7 * u.uRouge.value).multiplyScalar(0.3 + 0.7 * force); },      // force : la météo continue, un soleil voilé sous un ciel couvert
    // la météo continue (« Éclairage : haut ») : les couleurs du ciel et la couverture glissent vers celles du temps du jour (des fondus de la palette) ; créées à la première fois (un objet de plus d'emblée décale les identifiants de three)
    lisser(nom, dt, t, decalCouv = 0) {
      const C = CIELS[nom] || CIELS.sec;
      if (!lis) { lis = { hor: new THREE.Color(), haut: new THREE.Color(), nuage: new THREE.Color(), cible: new THREE.Color(), couv: couvDe(nom), pret: false }; }
      const a = lis.pret ? 1 - Math.exp(-Math.max(0, dt) * 0.35) : 1;
      for (const k of ['hor', 'haut', 'nuage']) lis[k].lerp(melange(lis.cible, C[k]), a);
      lis.couv += (couvDe(nom) - lis.couv) * a; lis.pret = true;
      u.uHor.value.copy(lis.hor); u.uHaut.value.copy(lis.haut); u.uNuage.value.copy(lis.nuage); u.uCouv.value = Math.max(0, Math.min(1, lis.couv + decalCouv * Math.min(1, lis.couv * 5)));      // (v0.134.6) la respiration est proportionnelle aux nuages : un ciel sans nuage le reste u.uT.value = t;
    },
    // le dégradé du ciel du moment (les mêmes objets, mis à jour à chaque appel) : l'eau y reflète le ciel ; à l'aube et au couchant (« haut »), l'horizon orangé du nuanceur et le zénith qui fonce
    couverture() { return u.uCouv.value; },                         // la part du ciel couverte en ce moment (la météo continue de « haut » comprise) : les ombres au sol la suivent
    couleurs() {
      const r = u.uRouge.value;
      eau.hor.copy(u.uHor.value).lerp(eau.chaud.copy(u.uOrange.value).lerp(col('o'), 0.15), r * 0.75);
      eau.haut.copy(u.uHaut.value).multiplyScalar(1 - 0.18 * r).lerp(eau.chaud, r * 0.3);
      return eau;
    },
    horLisse(c) { return lis ? c.copy(lis.hor) : c; },
    oublier() { if (lis) lis.pret = false; },
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
    // le haut de l'écran regarde-t-il au-dessus de l'horizon ? (le ciel est visible)
    visible() { camera.getWorldDirection(devant); return plan.visible && Math.asin(Math.max(-1, Math.min(1, devant.y))) + THREE.MathUtils.degToRad(camera.fov) / 2 >= 0.01; },
    derive(x, z) { u.uDer.value.set(x, z); },                       // la dérive des nuages, accumulée par le vent (jour et nuit)
    maj(nom, t) {
      const C = CIELS[nom] || CIELS.sec;
      melange(u.uHor.value, C.hor); melange(u.uHaut.value, C.haut); melange(u.uNuage.value, C.nuage); u.uCouv.value = couvDe(nom); u.uT.value = t;
    },
  };
}
