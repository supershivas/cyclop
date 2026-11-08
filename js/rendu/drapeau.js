// Les drapeaux de décor du camp (Jérôme, v0.130.0 : « dans la base, les drapeaux de décor sont encore blancs : ils doivent avoir les couleurs de l'armée et le même comportement que les autres drapeaux »).
// Même drapeau que les fanions du front (`fanMatVent` de troncons.js : cinq bandes, le bord du mât en x = 0, le haut en y = 0, plié par le nuanceur : au calme il pend le long du mât, plus le vent monte plus il se lève
// dans son sens, une onde court du mât vers le bout), mais une matière sans lumière : les volumes du camp sont éclairés (lumière ambiante forte, lueur propre) et le bleu horizon ou le kaki clair y saturaient en blanc.
// Un mesh par drapeau ; `rendu/camp.js` règle `DRAPEAU_U` (force du vent, horloge du dessin) et tourne chaque drapeau vers l'aval.
export const DRAPEAU_U = { uForce: { value: 0 }, uTV: { value: 0 } };
const matieres = new Map();      // THREE → { couleur → matière }
function matiere(THREE, couleur) {
  let par = matieres.get(THREE); if (!par) matieres.set(THREE, par = new Map());
  if (par.has(couleur)) return par.get(couleur);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur), side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uForce = DRAPEAU_U.uForce; sh.uniforms.uTV = DRAPEAU_U.uTV;
    sh.vertexShader = 'attribute vec3 aTaille; attribute float aPh; uniform float uForce; uniform float uTV;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float s = position.x;
        vec2 q = vec2(position.x * aTaille.x, (position.y - 1.0) * aTaille.y);
        float pend = max(1.0 - smoothstep(0.0, 0.4, uForce), aTaille.z);
        float d = pend * 1.2;
        q = vec2(q.x * cos(d) + q.y * sin(d), -q.x * sin(d) + q.y * cos(d));
        float ph = uTV * (2.5 + uForce * 10.0) - s * (4.0 + uForce * 4.0) + aPh;
        q.y += sin(ph * 0.7 + 1.3) * s * (0.03 + uForce * 0.12);
        vec3 transformed = vec3(q.x, q.y, sin(ph) * s * (0.05 + uForce * 0.35 + aTaille.z * 0.2) * (1.0 - pend * 0.5));`);
  };
  m.customProgramCacheKey = () => 'drapeau-camp';
  par.set(couleur, m); return m;
}
/* Un drapeau de `w` × `h` m, de la couleur `couleur` (une valeur de la palette), à poser au haut de son mât ; `ph` décale sa phase (deux drapeaux ne battent pas ensemble) */
export function drapeau(THREE, couleur, w, h, ph = 0) {
  const geo = new THREE.PlaneGeometry(1, 1, 5, 1).translate(0.5, 0.5, 0), n = geo.attributes.position.count, t = new Float32Array(n * 3), p = new Float32Array(n);
  for (let i = 0; i < n; i++) { t[i * 3] = w; t[i * 3 + 1] = h; p[i] = ph; }
  geo.setAttribute('aTaille', new THREE.BufferAttribute(t, 3)); geo.setAttribute('aPh', new THREE.BufferAttribute(p, 1));
  const m = new THREE.Mesh(geo, matiere(THREE, couleur)); m.frustumCulled = false; m.userData.drapeauVent = true;
  return m;
}
