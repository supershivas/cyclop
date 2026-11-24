// Les chars d'assaut dessinés (Jérôme, v0.47.0) : un volume par char de `B.etat.chars` (engins.js : le Schneider), posé sur le sol, incliné selon la pente sous lui,
// tourné vers sa route ; les chenilles défilent quand il avance, une épave fume. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit.
// Fabrique `creerChars({ THREE, scene, bataille: () => B, hauteur, fumer })` : la bataille change à chaque partie, on la lit à chaque image.
import { atelier, schneider } from './engins.js?v=0.169.0';
import { monterEpaveChar } from './epaves.js?v=0.169.0';
import { PALETTE as P } from '../palette.js?v=0.169.0';
import { CHARS, CHAR_MAIN } from '../data/chars.js?v=0.169.0';

const FABRIQUES = { schneider };
const COULEUR = [P.n, P.x];      // la caisse à la couleur de son armée : nous, en face

export function creerChars({ THREE, scene, bataille, hauteur, fumer, effets = null }) {
  let A = null, lumiere = null;
  const modeles = new Map();              // id du char → { pivot, modele, fumee }
  const lampe = () => {                   // les volumes sont éclairés (une lumière ambiante et un soleil bas) ; une seule pour la scène, partagée avec les ponts (`scene.userData.lumiere`)
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  // les obus tirés à la main, en vol (v0.165.0 : « on doit bien voir l'obus partir ») : un trait clair d'os (`o`) et sa traînée de brume, sur un arc du canon à l'impact ; une réserve de quelques-uns
  const obus = [], tempsVu = { t: -1 };
  function unObus() {
    const g = new THREE.Group(), tete = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.o) }));
    const queue = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.e), transparent: true, opacity: 0.6 }));
    queue.position.z = 4.9; g.add(tete, queue); g.visible = false; scene.add(g); return g;
  }
  function majObus(B, dt) {
    const T = B.etat.temps; tempsVu.t = tempsVu.t < 0 || Math.abs(tempsVu.t - T) > 0.1 ? T : Math.min(T + 1 / 30, Math.max(T - 1 / 30, tempsVu.t + dt));      // (une horloge lissée entre deux pas de la simulation)
    let n = 0;
    for (const c of B.etat.chars ?? []) for (const o of c.vol ?? []) {
      const f = Math.max(0, Math.min(1, (tempsVu.t - o.t0) / Math.max(0.01, o.t - o.t0))); if (f >= 1) continue;
      const g = obus[n] ?? (obus[n] = unObus()); n++;
      const L = Math.hypot(o.x - o.x0, o.y - o.y0), h0 = hauteur(o.x0, o.y0) + 2.1, h1 = hauteur(o.x, o.y), bosse = L * 0.012;      // (presque tendu : un obus qui fuse, v0.167.0 ; 5 % avant, il tombait comme un mortier)
      const y = f2 => h0 + (h1 - h0) * f2 + 4 * bosse * f2 * (1 - f2);
      const x = o.x0 + (o.x - o.x0) * f, z = o.y0 + (o.y - o.y0) * f, f2 = Math.min(1, f + 0.02);
      g.position.set(x, y(f), z); g.lookAt(o.x0 + (o.x - o.x0) * f2, y(f2), o.y0 + (o.y - o.y0) * f2); g.rotateY(Math.PI); g.visible = true;
    }
    for (let k = n; k < obus.length; k++) obus[k].visible = false;
  }
  // les mitrailleuses du char, qu'on voie tirer (v0.167.0 : « on doit voir la mitrailleuse, plusieurs tirs par seconde ») : à la main, tant que le bouton est tenu, dans le regard ;
  // seul, une courte rafale vers l'homme d'en face le plus proche à chaque rafale de la règle (`c.tire` qui retombe). Le dessin seulement : la règle reste `avancerChars`.
  function mitrailler(B, c, m, dt) {
    const K = B.conduites?.[c.camp], main = !!(K && K.id === c.id && K.tirMain), M = CHARS[c.modele];
    if (!M) return;
    if (!main && (c.tire ?? 0) < (m.tirePrec ?? 0)) m.salve = 0.45;      // une rafale de la règle vient de partir
    m.tirePrec = c.tire ?? 0;
    const feu = main ? !!K.rafale : (m.salve = Math.max(0, (m.salve ?? 0) - dt)) > 0;
    if (!feu) return;
    m.coup = (m.coup ?? 0) + dt * CHAR_MAIN.mitrRendu;
    if (m.coup < 1) return;
    m.coup -= Math.floor(m.coup);
    let ang = main ? K.regard : null;
    if (ang === null) {      // seul : vers l'ennemi le plus proche à portée
      const A = B.armee; let bd = M.portee * M.portee, bi = -1;
      for (let i = 0; i < A.n; i++) { if (A.mort[i] || A.camp[i] === c.camp) continue; const d = (A.x[i] - c.x) ** 2 + (A.y[i] - c.y) ** 2; if (d < bd) { bd = d; bi = i; } }
      if (bi < 0) return; ang = Math.atan2(A.y[bi] - c.y, A.x[bi] - c.x);
    }
    const d = M.portee * (0.5 + 0.45 * ((m.coup * 7.3 + c.x) % 1)), co = Math.cos(ang), si = Math.sin(ang);
    const x0 = c.x + co * 1.5, y0 = c.y + si * 1.5, tx = c.x + co * d, ty = c.y + si * d;
    effets.mitraille(x0, hauteur(x0, y0) + 1.4, y0, tx, hauteur(tx, ty) + 0.3, ty);
    effets.gerbeSol(tx, hauteur(tx, ty), ty);
  }
  function vider() { for (const m of modeles.values()) scene.remove(m.pivot); modeles.clear(); for (const g of obus) g.visible = false; }
  function maj(dt, sombre = 0) {
    const B = bataille(); if (!B) return;
    if (obus.length || B.etat.chars?.some(c => c.vol)) majObus(B, dt);
    const chars = B.etat.chars ?? [];
    if (!chars.length) { if (modeles.size) vider(); return; }
    A ??= atelier(THREE);
    if (!lumiere) lampe();
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    const vus = new Set();
    for (const c of chars) {
      vus.add(c.id);
      let m = modeles.get(c.id);
      if (!m) {
        const modele = FABRIQUES[c.modele](A, COULEUR[c.camp]), pivot = new THREE.Group(); pivot.add(modele.groupe); scene.add(pivot);
        m = { pivot, modele, fumee: 0 }; modeles.set(c.id, m);
      }
      const L = m.modele.longueur, cap = c.cap ?? (c.camp === 0 ? -Math.PI / 2 : Math.PI / 2);
      const hF = hauteur(c.x + Math.cos(cap) * L / 3, c.y + Math.sin(cap) * L / 3), hB = hauteur(c.x - Math.cos(cap) * L / 3, c.y - Math.sin(cap) * L / 3);
      m.pivot.position.set(c.x, (hF + hB) / 2 + 0.05, c.y);
      m.pivot.rotation.set(0, -cap, 0);
      // plus vivant (Jérôme, v0.59.3) : il tangue au démarrage et au freinage, la coque tremble et roule sur ses chenilles ; le dessin seulement
      const vit = c.etat === 'avance' ? c.v : 0, acc = dt > 0 ? (vit - (m.vp ?? vit)) / dt : 0;
      m.vp = vit; m.t = (m.t ?? 0) + dt; m.lean = (m.lean ?? 0) + (Math.max(-0.05, Math.min(0.05, -acc * 0.05)) - (m.lean ?? 0)) * Math.min(1, dt * 5);
      const k = Math.min(1, vit);
      m.pivot.position.y += Math.sin(m.t * 11) * 0.03 * k;
      m.modele.groupe.rotation.z = Math.atan2(hF - hB, 2 * L / 3) + m.lean;
      m.modele.groupe.rotation.x = Math.sin(m.t * 7) * 0.018 * k;
      if (c.etat === 'detruit') {
        // Jérôme, 1er novembre : « les chars détruits ont des dégâts visibles, la destruction est différente pour chaque char » : l'épave d'une graine (chenilles cassées, flanc ou ventre ouvert, coupole arrachée, brûlures…)
        if (!m.epave) {
          m.pivot.remove(m.modele.groupe);
          m.epave = monterEpaveChar(THREE, A, (B.etat.graine ^ Math.imul(c.id + 1, 6151)) | 0, COULEUR[c.camp]);
          m.pivot.add(m.epave.racine); m.epave.racine.rotation.z = Math.atan2(hF - hB, 2 * L / 3);
          m.epave.poser((x, z) => hauteur(x, z));
        }
        m.fumee -= dt; if (m.fumee <= 0) { m.fumee = 0.25; fumer(c.x, c.y); }
        continue;
      }
      if (m.epave) { m.pivot.remove(m.epave.racine); m.epave = null; m.pivot.add(m.modele.groupe); }      // l'épave relevée par le génie (v0.132.0) : le char revient
      m.modele.maj(dt, vit);
      if (effets && dt > 0) mitrailler(B, c, m, dt);
    }
    for (const [id, m] of modeles) if (!vus.has(id)) { scene.remove(m.pivot); modeles.delete(id); }
  }
  return { maj, vider, casteurs() { return [...modeles.values()].map(m => m.pivot); } };      // les chars projettent dans la carte d'ombre (session 3)
}
