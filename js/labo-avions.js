// Les avions du labo (Jérôme, v0.42.0 : « 4 propositions de gameplay pour les avions (Baron rouge, etc.) », caméra libre). Le jeu n'a pas d'avion : ce sont quatre façons d'en faire une mécanique, jouables sur le moteur
// (les hommes, les obus et les cratères sont ceux du jeu ; les avions, la DCA, les traceurs et les bombes sont dessinés et suivis ici, jamais dans la bataille). Les engins sont en volumes à l'échelle (1 unité = 1 m).
//  A · « L'œil de l'artillerie » : un avion de réglage tourne au-dessus de leur tranchée ; tant qu'il vit, les obus de nos batteries tombent près de la cible (la dispersion de 18 m tombe à 6 m) ; leur DCA le guette ;
//  B · « Le cirque » : le ciel se dispute entre deux patrouilles de chasse (le Fokker Dr.I rouge du « Baron » et deux Albatros contre trois Spad) ; qui tient le ciel prive l'autre de ses yeux (A) et de ses mitraillages (C) ;
//  C · « Mitraillage » : deux appareils d'attaque d'en face passent à dix mètres du sol sur un régiment ; trois réponses (rien, le feu en l'air, se jeter à terre) : on choisit entre tirer et se protéger ;
//  D · « Les bombardiers de nuit » : un Gotha cherche les lampes de l'arrière (v0.39.0) ; lampes éteintes, ses bombes se perdent, mais la nuit de travail aussi ; projecteur et DCA sont un pari.
// Ce qui est vérifié : le Fokker Dr.I (1917-18, triplan, ~7,19 m d'envergure ; Manfred von Richthofen, « le Baron rouge », y a été abattu le 21 avril 1918, dans l'avion rouge qu'on lui connaît) ; le SPAD XIII
// (français, 1917, biplan à moteur en ligne, deux mitrailleuses) ; le Breguet 14 (français, 1917, appareil de reconnaissance et de bombardement, biplan d'une quinzaine de mètres) ; le Gotha G.IV (allemand, 1917, bimoteur
// de bombardement, trois hommes, ~24 m). Les envergures, longueurs et vitesses des autres sont approximatives ; les nombres de jeu sont des propositions. DESIGN.md : aucun compteur de victoires, pas d'« as » à glorifier ;
// les pilotes ont un nom et un état (en vol, touché, abattu), rien de plus.
import { PALETTE as P, ALERTES } from './palette.js?v=0.86.0';
import { loadThree } from './three-lib.js?v=0.86.0';
import { mourir } from './bataille.js?v=0.86.0';
import { impact } from './terrain.js?v=0.86.0';
import { hash2 } from './lib/rng.js?v=0.86.0';
import { ZOOMS } from './rendu3d.js?v=0.86.0';
import { el, svgEl, bouton, scene, maquette, texteSvg } from './labo-arcade.js?v=0.86.0';
import { atelier } from './labo-chars.js?v=0.86.0';

const ROUGE = ALERTES.rouge;

// ─── Les avions en volumes ──────────────────────────────────────────────────
// L'avant est à +x, le haut à +y, la droite à +z. Un biplan paramétré (ou triplan), et le Gotha.
import { biplan as biplanJeu, croixPlate } from './rendu/avions-modeles.js?v=0.86.0';
const biplan = (A, o) => biplanJeu(A, { centre: ROUGE, ...o });
const AVIONS = {
  // le chasseur français : un SPAD XIII, olive, cocardes
  spad: A => biplan(A, { L: 6.3, env: 8.1, corde: 1.4, ecart: 1.3, cc: P.w, ca: P.h }),
  // le triplan rouge : un Fokker Dr.I
  dr1: A => biplan(A, { L: 5.77, env: 7.19, corde: 1.15, ecart: 1.5, cc: ROUGE, ca: ROUGE, triplan: true, de: true, rotatif: true, couleurMoteur: P.t }),
  // l'Albatros allemand (un D.V) : gris, croix
  albatros: A => biplan(A, { L: 7.3, env: 9.0, corde: 1.4, ecart: 1.35, cc: P.r, ca: P.h, de: true }),
  // le biplan de reconnaissance français, deux places : un Breguet 14
  breguet: A => biplan(A, { L: 8.87, env: 14.36, corde: 1.9, ecart: 1.8, cc: P.h, ca: P.e, deuxPlaces: true }),
  // l'avion d'attaque allemand à deux places (type Halberstadt CL.II) : gris, croix
  halber: A => biplan(A, { L: 7.3, env: 10.8, corde: 1.5, ecart: 1.4, cc: P.r, ca: P.g, de: true, deuxPlaces: true }),
};
// Le Gotha G.IV : un bimoteur de bombardement allemand
function gotha(A) {
  const { THREE } = A, g = new THREE.Group(), L = 12.4, env = 23.7, corde = 2.3, helices = [];
  A.prisme(g, [[-L * 0.5, 0.1], [-L * 0.15, 0.7], [L * 0.25, 0.8], [L * 0.5, 0.5], [L * 0.5, -0.5], [L * 0.2, -0.8], [-L * 0.15, -0.6]], 1.1, P.r);
  A.cyl(g, 0.5, 0.6, P.s, [L * 0.5 + 0.2, 0.2, 0], 'x', 10);                                    // la tourelle de nez, l'observateur
  A.cyl(g, 0.025, 0.7, P.t, [L * 0.5 + 0.7, 0.35, 0], 'x', 5);
  const x0 = 0.4;
  A.b(g, [corde, 0.1, env], P.h, [x0, -0.9, 0]); A.b(g, [corde, 0.1, env * 0.96], P.h, [x0, 1.4, 0]);
  for (const s of [1, -1]) {
    for (const z of [3.7, 7.6, 11.0]) for (const dx of [-0.8, 0.8]) A.b(g, [0.07, 2.3, 0.07], P.s, [x0 + dx, 0.25, s * z]);
    const nac = new THREE.Group(); nac.position.set(x0 + 0.5, -0.3, s * 3.7); g.add(nac);
    A.cyl(nac, 0.5, 1.9, P.s, [0, 0, 0], 'x', 10); const h = new THREE.Group(); h.position.set(1.1, 0, 0); nac.add(h); A.b(h, [0.07, 3.2, 0.2], P.b, [0, 0, 0]); helices.push(h);
    A.croix(g, [-L * 0.28, 0.1, s * 0.58], 0.9); croixPlate(A, g, x0, 1.5, s * 6.5, 1.3);
    for (const z of [-0.7, 0.7]) A.b(g, [0.4, 0.05, 0.9], P.h, [0, 0, 0], [0, 0, 0], false);
    A.b(g, [1.0, 0.06, 3.1], P.h, [-L * 0.5 + 0.1, 0.8, s * 1.2]);                              // les plans de queue, biplans
  }
  A.prisme(g, [[0, 0], [1.4, 0], [0.8, 1.6], [0.1, 1.6]], 0.1, P.h, [-L * 0.5 - 0.2, 0.3, 0.0]);
  for (const s of [1, -1]) { A.b(g, [0.1, 1.6, 0.1], P.s, [0.7, -1.7, s * 3.0]); A.cyl(g, 0.55, 0.2, P.t, [0.7, -2.5, s * 3.0], 'z', 10); }
  const bombes = []; for (let k = 0; k < 6; k++) { const b = A.b(g, [0.18, 0.18, 0.7], P.t, [-0.4 + k * 0.45, -1.15, k % 2 ? 0.5 : -0.5], [0, 0, 0], false); bombes.push(b); }
  return { groupe: g, helices, bombes, longueur: L, envergure: env };
}

// ─── Les effets : fumées, éclatements, traceurs (cubes et traits, rien dans la bataille) ───
function effets(A, ctx) {
  const { THREE } = A;
  const NF = 500, geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), NF); mesh.count = 0; mesh.frustumCulled = false;
  const traceurs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: new THREE.Color(P.o) })); traceurs.frustumCulled = false;
  ctx.rendu.scene.add(mesh, traceurs);
  const puffs = [], lignes = [], o = new THREE.Object3D(), c = new THREE.Color();
  const api = {
    fumee(x, y, z, s = 1.2, dur = 4, coul = P.t, vz = 0.8) { if (puffs.length < NF) puffs.push({ x, y, z, s, dur, age: 0, coul, vz, rot: hash2(puffs.length, 3, 3) * 6 }); },
    // un éclatement de DCA : un nuage sombre qui gonfle
    archie(x, y, z) { for (let k = 0; k < 5; k++) api.fumee(x + (hash2(k, puffs.length, 4) - 0.5) * 4, y + (hash2(k, puffs.length, 5) - 0.5) * 4, z + (hash2(k, puffs.length, 6) - 0.5) * 3, 1.4 + hash2(k, 1, 4) * 1.6, 3.5, P.s, 0.15); },
    trait(x0, y0, z0, x1, y1, z1) { lignes.push({ p: [x0, y0, z0, x1, y1, z1], age: 0 }); },
    maj(dt) {
      for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.age += dt; if (p.age > p.dur) puffs.splice(i, 1); else p.z += p.vz * dt; }
      let n = 0;
      for (const p of puffs) {
        const u = p.age / p.dur, s = p.s * (0.5 + 0.8 * Math.min(1, u * 2)) * (1 - Math.max(0, u - 0.6) / 0.4);
        o.position.set(p.x, ctx.rendu.hauteurSol(p.x, p.y) + p.z, p.y); o.rotation.set(0, p.rot + p.age, 0); o.scale.set(s, s * 0.85, s); o.updateMatrix();
        mesh.setMatrixAt(n, o.matrix); mesh.setColorAt(n, c.set(p.coul)); n++;
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (let i = lignes.length - 1; i >= 0; i--) { lignes[i].age += dt; if (lignes[i].age > 0.12) lignes.splice(i, 1); }
      const a = new Float32Array(lignes.length * 6); lignes.forEach((l, i) => a.set(l.p, i * 6));
      traceurs.geometry.dispose(); traceurs.geometry = new THREE.BufferGeometry(); traceurs.geometry.setAttribute('position', new THREE.BufferAttribute(a, 3));
    },
  };
  return api;
}

// Un appareil dans le ciel : sa position (x, z du terrain), son altitude, son cap (0 : vers l'est, π/2 : vers le nord), son inclinaison
function volant(A, ctx, modele) {
  const { THREE } = A;
  const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ'; pivot.add(modele.groupe); ctx.rendu.scene.add(pivot);
  const ombre = new THREE.Mesh(new THREE.CylinderGeometry(modele.envergure * 0.5, modele.envergure * 0.5, 0.05, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.t), transparent: true, opacity: 0.38, depthWrite: false }));
  ombre.scale.set(0.9, 1, 0.35); ctx.rendu.scene.add(ombre);
  return {
    x: 0, y: 0, alt: 40, h: 0, bank: 0, pitch: 0, v: 28, vie: 1, etat: 'vol', modele, pivot, ombre, t: 0,
    placer() {
      const sol = ctx.rendu.hauteurSol(this.x, this.y);
      pivot.position.set(this.x, sol + this.alt, this.y); pivot.rotation.set(this.bank, this.h, this.pitch);
      ombre.position.set(this.x + this.alt * 0.25, sol + 0.12, this.y); ombre.rotation.y = this.h; ombre.visible = this.alt < 200 && this.etat !== 'abattu';
      if (modele.helice) modele.helice.rotation.x += 0.9; modele.helices?.forEach(h => { h.rotation.x += 0.8; });
    },
    avancer(dt) { this.x += Math.cos(this.h) * this.v * dt; this.y -= Math.sin(this.h) * this.v * dt; },
    // virer vers un cap, au taux `omega` (rad/s) au plus ; l'avion s'incline dans le virage
    virer(cap, omega, dt) {
      let d = cap - this.h; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      const r = Math.max(-omega * dt, Math.min(omega * dt, d)); this.h += r; this.bank += (-Math.sign(d) * Math.min(1, Math.abs(d) * 2) * 0.9 - this.bank) * Math.min(1, dt * 4);
      return d;
    },
    retirer() { ctx.rendu.scene.remove(pivot, ombre); if (ctx.cible === this) { ctx.cible = null; ctx.suivre = false; } },
  };
}

const lumiere = (THREE, ctx) => { const g = new THREE.Group(); g.add(new THREE.AmbientLight(0xffffff, 1.6)); const s = new THREE.DirectionalLight(0xffffff, 1.7); s.position.set(-6, 12, 5); g.add(s); ctx.rendu.scene.add(g); return g; };
const lieu = (ctx, dy) => ({ x: ctx.X, y: ctx.M.y + dy });

// ─── La maquette ────────────────────────────────────────────────────────────
export function maquetteAvions(stage, R, cle) {
  if (ZOOMS.length === 8) ZOOMS.push(24, 32, 48);
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, AT = null, FX = null;
    const bilan = { texte: '' };
    const avions = [], bombes = [], obusEnVol = [];
    let t0 = 0, pause = false, vigie = null;
    const etat = { observateur: null, dca: true, mode: 'feu', lampes: true, projecteur: true, cibleImpacts: [], sigma: 18, tir: 0, vise: 0, pres: 0 };
    ui.haut.append(...{
      oeil: [bouton('Envoyer l\'avion de réglage', () => lancerReglage()), bouton('Rappeler l\'avion', () => { if (etat.observateur) etat.observateur.etat = 'retour'; }), bouton('Salve de six 155', () => salve6()), bouton('DCA d\'en face : oui', function () { etat.dca = !etat.dca; this.textContent = `DCA d'en face : ${etat.dca ? 'oui' : 'non'}`; })],
      cirque: [bouton('Lancer les patrouilles', () => lancerCirque()), bouton('Suivre le Baron', () => { if (ctx0) { ctx0.suivre = true; ctx0.cible = vigie; } })],
      mitraillage: [bouton('Mitraillage : deux appareils', () => lancerMitraillage()), bouton('Réponse : le feu en l\'air', function () { etat.mode = etat.mode === 'feu' ? 'terre' : etat.mode === 'terre' ? 'rien' : 'feu'; this.textContent = `Réponse : ${ {feu: 'le feu en l\'air', terre: 'à terre', rien: 'rien'}[etat.mode] }`; })],
      nuit: [bouton('Envoyer le Gotha', () => lancerGotha()), bouton('Lampes : allumées', function () { etat.lampes = !etat.lampes; this.textContent = `Lampes : ${etat.lampes ? 'allumées' : 'éteintes'}`; }), bouton('Projecteur et DCA : oui', function () { etat.projecteur = !etat.projecteur; this.textContent = `Projecteur et DCA : ${etat.projecteur ? 'oui' : 'non'}`; })],
    }[cle]);
    const vues = { 'Vue d\'ensemble': [0.35, 0.65], 'De côté': [Math.PI / 2, 0.2], 'De dessus': [0.15, 1.5] };
    for (const [nom, [yaw, tg]] of Object.entries(vues)) ui.haut.append(bouton(nom, () => { if (!ctx0) return; ctx0.rendu.placerCamera(yaw, tg); }));
    ui.haut.append(bouton('Suivre / libre', () => { if (ctx0) ctx0.suivre = !ctx0.suivre; }), bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)), bouton('Pause', () => { pause = !pause; }), bouton('Rejouer', ui.rejouer));

    // ─── A · l'œil de l'artillerie ───
    const lancerReglage = () => {
      if (etat.observateur && etat.observateur.etat !== 'retour' && etat.observateur.etat !== 'abattu') return;
      const m = volant(AT, ctx0, AVIONS.breguet(AT)), c = lieu(ctx0, 112);
      Object.assign(m, { x: c.x + 80, y: c.y + 100, alt: 70, h: Math.PI * 0.75, v: 26, role: 'observateur', th: 0, nom: 'Breguet 14' }); avions.push(m); etat.observateur = m;
      ctx0.cible = m; ctx0.suivre = true;
    };
    const salve6 = () => {
      const c = lieu(ctx0, 112), vu = etat.observateur && etat.observateur.etat === 'vol' && Math.hypot(etat.observateur.x - c.x, etat.observateur.y - c.y) < 90;
      etat.sigma = vu ? 6 : 18; etat.cibleImpacts = []; etat.tir = 6; etat.vise = c; etat.pres = 0;
      for (let k = 0; k < 6; k++) {
        const a = hash2(k, ctx0.run + Math.floor(ctx0.t), 11) * 6.28, r = etat.sigma * Math.sqrt(-2 * Math.log(Math.max(0.05, hash2(k, ctx0.run, 12)))) * 0.6, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
        ctx0.B.etat.barrages.push({ camp: 0, cal: '155', x, y, reste: 1, prochain: ctx0.B.etat.temps + 1.4 + k * 0.7 }); etat.cibleImpacts.push({ x, y, d: Math.hypot(x - c.x, y - c.y) });
      }
    };

    // ─── B · le cirque ───
    const lancerCirque = () => {
      for (const a of avions) a.retirer(); avions.length = 0;
      const c = lieu(ctx0, 165);
      const equipes = [
        { camp: 0, modele: 'spad', noms: ['Lt Aubry', 'Sgt Marchand', 'Cpl Vidal'], x: c.x - 120, dy: 40, h: 0, omega: 1.1, skill: 0.045 },
        { camp: 1, modele: 'dr1', noms: ['le Baron'], x: c.x + 120, dy: -40, h: Math.PI, omega: 1.5, skill: 0.075 },
        { camp: 1, modele: 'albatros', noms: ['Lt Wolff', 'Vzfw Becker'], x: c.x + 130, dy: -40, h: Math.PI, omega: 1.0, skill: 0.045 },
      ];
      let k = 0;
      for (const e of equipes) for (const nom of e.noms) {
        const m = volant(AT, ctx0, AVIONS[e.modele](AT));
        Object.assign(m, { x: e.x + (hash2(k, 1, 2) - 0.5) * 25, y: c.y + e.dy + (k - 2.5) * 14, alt: 70 + k * 7, h: e.h, v: 30, camp: e.camp, omega: e.omega, skill: e.skill, nom, role: 'chasseur', tir: 0, cible: null }); avions.push(m); k++;
        if (nom === 'le Baron') vigie = m;
      }
      ctx0.cible = vigie; ctx0.suivre = true; t0 = ctx0.t; bilan.texte = '';
    };

    // ─── C · mitraillage ───
    const hommesATerre = new Set();
    const lancerMitraillage = () => {
      for (const a of avions) a.retirer(); avions.length = 0; bilan.tombes = 0; bilan.abattus = 0; hommesATerre.clear();
      const cx = ctx0.X, c0 = ctx0.M.y + 110;
      for (let k = 0; k < 2; k++) {
        const m = volant(AT, ctx0, AVIONS.halber(AT));
        Object.assign(m, { x: cx - 14 + k * 28, y: c0 - k * 30, alt: 45, h: -Math.PI / 2, v: 30, role: 'mitrailleur', passe: 0, pv: 1, nom: `Appareil ${k + 1}` }); avions.push(m);
      }
      ctx0.cible = avions[0]; ctx0.suivre = true;
    };

    // ─── D · les bombardiers de nuit ───
    const lancerGotha = () => {
      for (const a of avions) a.retirer(); avions.length = 0; bombes.length = 0; bilan.tombes = 0; bilan.abattu = false;
      const lampes = ctx0.mien.length ? ctx0.centre(ctx0.mien) : { x: ctx0.X, y: ctx0.M.y + 220 };
      const m = volant(AT, ctx0, gotha(AT));
      const cible = etat.lampes ? lampes.x : ctx0.X + (hash2(ctx0.run, Math.floor(ctx0.t), 5) - 0.5) * 100;
      Object.assign(m, { x: cible, y: ctx0.M.y + 110, alt: 90, h: -Math.PI / 2, v: 34, role: 'bombardier', lache: 0, nb: 0, cible, nom: 'Gotha' }); avions.push(m);
    };

    return scene(ui.stage, R, {
      bloc: true, zoom: cle === 'cirque' || cle === 'nuit' ? 3 : 4, cz: cle === 'nuit' ? 205 : 165, yNous: cle === 'nuit' ? 235 : 205, ennemi: true, libre: { yaw: 0.35, tangage: 0.7 }, soir: cle === 'nuit' ? 17.6 : null,
      apres: async ctx => {
        ctx0 = ctx; const THREE = await loadThree(); AT = atelier(THREE); lumiere(THREE, ctx); FX = effets(AT, ctx); ctx.suivre = false;
        // les lampes de l'arrière (D) : des cubes chauds posés près de nos hommes
        if (cle === 'nuit') {
          const g = new THREE.Group(), ms = [];
          for (let k = 0; k < 14; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.x) })); g.add(m); ms.push(m); }
          ctx.rendu.scene.add(g); ctx.lampes = ms;
        }
      },
      pas(dt, ctx, ev) {
        if (!FX || pause) return;
        const { A, B } = ctx;
        for (const a of avions) a.t += dt;
        // ── A ──
        if (cle === 'oeil') {
          const m = etat.observateur, c = lieu(ctx, 112);
          if (m) {
            if (m.etat === 'vol') {
              m.th += 26 / 45 * dt; m.h = m.th + Math.PI / 2 + 0.0; const px = c.x + Math.cos(m.th) * 45, py = c.y - Math.sin(m.th) * 45; m.x += (px - m.x) * Math.min(1, dt * 2); m.y += (py - m.y) * Math.min(1, dt * 2); m.bank = 0.35;
              m.dcaT = (m.dcaT ?? 1) - dt;
              if (etat.dca && m.dcaT <= 0) {
                m.dcaT = 0.9 + hash2(Math.floor(ctx.t * 7), ctx.run, 7) * 0.6;
                const bx = m.x + (hash2(Math.floor(ctx.t * 5), 2, 7) - 0.5) * 24, by = m.y + (hash2(Math.floor(ctx.t * 5), 3, 7) - 0.5) * 24, bz = m.alt + (hash2(Math.floor(ctx.t * 5), 4, 7) - 0.5) * 14;
                FX.archie(bx, by, bz); if (Math.hypot(bx - m.x, by - m.y, bz - m.alt) < 9) m.vie -= 0.1;
              }
              if (m.vie <= 0) { m.etat = 'abattu'; bilan.texte = 'Le Breguet est touché : il tombe. Les obus retombent à 18 m.'; }
            } else if (m.etat === 'retour') { m.virer(Math.PI * 0.5 + 0.3, 1.2, dt); m.avancer(dt); m.alt += 4 * dt; if (m.y > ctx.M.y + 330) { m.retirer(); avions.splice(avions.indexOf(m), 1); etat.observateur = null; } }
            else if (m.etat === 'abattu') { m.alt -= 22 * dt; m.pitch = -0.7; m.bank += 4 * dt; m.avancer(dt * 0.5); FX.fumee(m.x, m.y, m.alt, 2.2, 4, P.t, 0.3); if (m.alt <= 0) { FX.archie(m.x, m.y, 2); m.retirer(); avions.splice(avions.indexOf(m), 1); etat.observateur = null; } }
          }
          for (const imp of etat.cibleImpacts) if (!imp.compte && ctx.t > 0) { /* le décompte se fait à l'impact (ci-dessous) */ }
          for (const e of ev) if (e.type === 'impact' && etat.tir > 0) { etat.tir--; const d = Math.hypot(e.x - etat.vise.x, e.y - etat.vise.y); if (d < 10) etat.pres++; }
          bilan.texte = bilan.texte || '';
        }
        // ── B ──
        if (cle === 'cirque') {
          const c = lieu(ctx, 165);
          for (const m of avions) {
            if (m.etat === 'abattu') { m.alt -= 28 * dt; m.pitch = -0.9; m.bank += 5 * dt; m.avancer(dt * 0.6); FX.fumee(m.x, m.y, m.alt, 2.0, 4, P.t, 0.3); if (m.alt <= 1) { FX.archie(m.x, m.y, 2); m.etat = 'tombe'; m.retirer(); } continue; }
            if (m.etat === 'tombe') continue;
            if (!m.cible || m.cible.etat !== 'vol' ) m.cible = avions.filter(o => o.camp !== m.camp && o.etat === 'vol').sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0] || null;
            if (m.cible) {
              const T2 = m.cible, d = Math.hypot(T2.x - m.x, T2.y - m.y), tt = d / 60;
              const ax = T2.x + Math.cos(T2.h) * T2.v * tt, ay = T2.y - Math.sin(T2.h) * T2.v * tt;
              const err = m.virer(Math.atan2(-(ay - m.y), ax - m.x), m.omega, dt);
              m.alt += Math.max(-8, Math.min(8, (T2.alt - m.alt) * 0.4)) * dt;
              m.tir -= dt;
              if (Math.abs(err) < 0.14 && d < 48 && m.tir <= 0 && Math.abs(T2.alt - m.alt) < 10) {
                m.tir = 0.11; FX.trait(m.x, m.alt, m.y, T2.x, T2.alt, T2.y);
                if (hash2(Math.floor(ctx.t * 20), m.nom.length + ctx.run, 9) < m.skill * (1.5 - d / 80)) { T2.vie -= 0.17; FX.fumee(T2.x, T2.y, T2.alt, 1.2, 2.5, P.s, 0.3); if (T2.vie <= 0) { T2.etat = 'abattu'; } }
              }
            }
            // un avion qui sort du champ se redresse vers le centre
            if (Math.hypot(m.x - c.x, m.y - c.y) > 170) m.virer(Math.atan2(-(c.y - m.y), c.x - m.x), 1.6, dt);
            m.avancer(dt);
            if (m.vie < 0.45) FX.fumee(m.x, m.y, m.alt, 1.1, 2.6, P.s, 0.2);
          }
          const vivants = [0, 1].map(k => avions.filter(a => a.camp === k && a.etat === 'vol').length);
          if (avions.length && ctx.t - t0 > 3 && (vivants[0] === 0 || vivants[1] === 0)) bilan.texte = vivants[0] === 0 && vivants[1] === 0 ? 'Le ciel est vide : personne ne le tient.' : vivants[1] === 0 ? 'Le ciel est à nous : leurs yeux sont fermés, leurs mitraillages empêchés.' : 'Le ciel est à eux : nos observateurs ne montent plus, leurs appareils passent bas sur nos lignes.';
        }
        // ── C ──
        if (cle === 'mitraillage') {
          for (const m of avions) {
            if (m.etat === 'abattu') { m.alt -= 24 * dt; m.pitch = -0.6; m.avancer(dt * 0.5); FX.fumee(m.x, m.y, m.alt, 1.8, 3.5, P.t, 0.3); if (m.alt <= 0.5) { m.etat = 'tombe'; m.retirer(); FX.archie(m.x, m.y, 1.5); } continue; }
            if (m.etat === 'tombe') continue;
            const yPlongee = ctx.M.y + 170, yPasse = ctx.M.y + 215, y1 = ctx.M.y + 255;
            m.y += (-Math.sin(m.h)) * m.v * dt; m.x += Math.cos(m.h) * m.v * dt;
            m.h = Math.PI * -0.5;                                                   // cap au sud : y croissant
            if (m.y < yPlongee) m.alt = 45 - (m.y - (ctx.M.y + 110)) * 0.05; else if (m.y < yPasse) { m.alt = Math.max(8, m.alt - 14 * dt * 3); m.pitch = -0.2; } else { m.alt += 14 * dt; m.pitch = 0.25; }
            const passe = m.y >= yPlongee && m.y < yPasse;
            if (passe) {
              m.tir = (m.tir || 0) - dt;
              if (m.tir <= 0) {
                m.tir = 0.06; FX.trait(m.x, m.alt, m.y, m.x + (hash2(Math.floor(ctx.t * 30), 1, 8) - 0.5) * 3, 0, m.y + 14); ctx.rendu.fumer && hash2(Math.floor(ctx.t * 20), 2, 8) < 0.2 && FX.fumee(m.x, m.y + 12, 0.3, 1.0, 1.4, P.g, 1.2);
                for (const i of ctx.mien) if (Math.abs(A.x[i] - m.x) < 2.2 && Math.abs(A.y[i] - (m.y + 12)) < 3) {
                  const f = etat.mode === 'terre' ? 0.1 : 0.35;
                  if (hash2(i, Math.floor(ctx.t * 17), ctx.run) < f) { mourir(B, i, 'tir'); bilan.tombes = (bilan.tombes || 0) + 1; }
                  else A.peur[i] = Math.max(A.peur[i], 0.6);
                }
              }
            }
            // la réponse de nos hommes
            if (etat.mode === 'feu' && m.y > yPlongee - 40 && m.y < y1) {
              for (let k = 0; k < 6; k++) if (hash2(Math.floor(ctx.t * 12), k + ctx.run, 6) < 0.5 && ctx.mien.length) {
                const i = ctx.mien[Math.floor(hash2(Math.floor(ctx.t * 12), k, 6) * ctx.mien.length) % ctx.mien.length];
                FX.trait(A.x[i], 1.5, A.y[i], m.x + (hash2(k, 2, 6) - 0.5) * 3, m.alt, m.y);
                if (hash2(Math.floor(ctx.t * 30), k, ctx.run) < 0.02) { m.pv -= 0.08; FX.fumee(m.x, m.y, m.alt, 1.0, 2, P.s, 0.3); if (m.pv <= 0) { m.etat = 'abattu'; bilan.abattus = (bilan.abattus || 0) + 1; } }
              }
            } else if (etat.mode === 'terre') for (const i of ctx.mien) if (Math.hypot(A.x[i] - m.x, A.y[i] - m.y) < 70) A.peur[i] = Math.max(A.peur[i], 0.4);
            if (m.y > y1 + 40) { m.y = ctx.M.y + 110; m.alt = 45; m.pitch = 0; m.passe++; m.x = ctx.X - 14 + (m.passe % 2) * 28 + (hash2(m.passe, ctx.run, 4) - 0.5) * 20; }
          }
        }
        // ── D ──
        if (cle === 'nuit') {
          const g = avions[0];
          if (g && g.etat === 'vol') {
            g.y -= Math.sin(g.h) * g.v * dt; g.x += (g.cible - g.x) * dt * 0.4;
            if (g.y > ctx.M.y + 170 && g.lache < 6 && g.y > ctx.M.y + 170 + g.lache * 14) {
              const sig = etat.lampes ? 5 : 36, x = g.x + (hash2(g.nb, ctx.run, 13) - 0.5) * 2 * sig, y = g.y + 20 + (hash2(g.nb, ctx.run, 14) - 0.5) * sig;
              bombes.push({ x, y, t: 0, dur: 2.6, z0: g.alt, x0: g.x, y0: g.y }); g.lache++; g.nb++;
              g.modele.bombes[g.nb % g.modele.bombes.length].visible = false;
            }
            if (g.y > ctx.M.y + 330) { g.retirer(); avions.length = 0; }
            if (etat.projecteur) {
              for (let k = 0; k < 2; k++) {
                const sx = ctx.X + (k ? 60 : -60), sy = ctx.M.y + 250, d = Math.hypot(g.x - sx, g.y - sy);
                if (d < 90 && hash2(Math.floor(ctx.t * 4), k + ctx.run, 15) < 0.4 * dt * 4) { FX.archie(g.x + (hash2(Math.floor(ctx.t * 4), 4, 4) - 0.5) * 20, g.y + (hash2(Math.floor(ctx.t * 4), 5, 4) - 0.5) * 20, g.alt + (hash2(Math.floor(ctx.t * 4), 6, 4) - 0.5) * 10); if (hash2(Math.floor(ctx.t * 7), k + ctx.run, 16) < 0.035) { g.etat = 'abattu'; bilan.abattu = true; } }
              }
            }
          } else if (g && g.etat === 'abattu') { g.alt -= 30 * dt; g.pitch = -0.6; g.y += 6 * dt; FX.fumee(g.x, g.y, g.alt, 2.5, 4, P.t, 0.3); if (g.alt <= 1) { FX.archie(g.x, g.y, 3); g.retirer(); avions.length = 0; } }
          for (let i = bombes.length - 1; i >= 0; i--) {
            const b = bombes[i]; b.t += dt;
            if (b.t >= b.dur) {
              bombes.splice(i, 1);
              ctx.evts.push({ type: 'impact', x: b.x, y: b.y, cal: '75' }); impact(B.terrain, b.x, b.y, '75', ctx.R, 900 + i);
              for (const j of ctx.mien) if (Math.hypot(A.x[j] - b.x, A.y[j] - b.y) < 5 && hash2(j, i + ctx.run, 17) < 0.4) { mourir(B, j, 'obus'); bilan.tombes = (bilan.tombes || 0) + 1; }
            }
          }
        }
      },
      image(dt, ctx) {
        if (!FX) return;
        const { svg } = ctx;
        if (!pause) FX.maj(dt);
        for (const a of avions) a.placer();
        // le décor propre à chaque sujet
        if (cle === 'oeil') {
          const c = lieu(ctx, 112); ctx.cercle(c.x, c.y, etat.sigma * 1.0, { stroke: P.o, 'stroke-width': 2, 'stroke-dasharray': '6 5' }); ctx.cercle(c.x, c.y, 2, { stroke: P.o, 'stroke-width': 3 });
          for (const imp of etat.cibleImpacts) { const [sx, sy] = ctx.proj(imp.x, imp.y, 0.4); svg.append(svgEl('path', { d: `M${sx - 5} ${sy - 5} L${sx + 5} ${sy + 5} M${sx + 5} ${sy - 5} L${sx - 5} ${sy + 5}`, stroke: imp.d < 10 ? P.o : P.g, 'stroke-width': 3 })); }
          const m = etat.observateur;
          if (m && m.etat === 'vol') { const [sx, sy] = ctx.proj(c.x, c.y, 6); texteSvg(svg, sx, sy - 8, 'régiment d\'en face repéré', 11); }
        }
        if (cle === 'cirque') for (const a of avions) { if (a.etat === 'tombe') continue; const [sx, sy] = ctx.proj(a.x, a.y, a.alt + 4); texteSvg(svg, sx, sy - 6, `${a.nom}${a.etat === 'abattu' ? ' (abattu)' : a.vie < 0.5 ? ' (touché)' : ''}`, 11); }
        if (cle === 'nuit') {
          const m = ctx.mien; for (let k = 0; k < ctx.lampes.length; k++) {
            const i = m.length ? m[(k * 7) % m.length] : -1; const l = ctx.lampes[k];
            l.visible = etat.lampes && i >= 0; if (i >= 0) l.position.set(ctx.A.x[i] + 4, ctx.rendu.hauteurSol(ctx.A.x[i] + 4, ctx.A.y[i] + 6) + 1.2 + Math.sin(ctx.t * 2 + k) * 0.1, ctx.A.y[i] + 6);
          }
          if (etat.projecteur) for (let k = 0; k < 2; k++) {
            const sx = ctx.X + (k ? 60 : -60), sy = ctx.M.y + 250, a = avions[0], ang = a && a.etat === 'vol' ? Math.atan2(a.y - sy, a.x - sx) : Math.PI * 1.5 + Math.sin(ctx.t * 0.6 + k * 2) * 0.5;
            const hx = sx + Math.cos(ang) * 70 * Math.min(1, a ? 1.2 : 1), hy = sy + Math.sin(ang) * 70, [x0, y0] = ctx.proj(sx, sy, 0.5), [x1, y1] = ctx.proj(hx, hy, a && a.etat === 'vol' ? a.alt * Math.min(1, Math.hypot(a.x - sx, a.y - sy) / 70) : 40);
            svg.append(svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: P.o, 'stroke-width': 6, 'stroke-opacity': 0.35, 'stroke-linecap': 'round' }));
          }
        }
        // les bombes en l'air (D)
        for (const b of bombes) { const u = b.t / b.dur, x = b.x0 + (b.x - b.x0) * u, y = b.y0 + (b.y - b.y0) * u, z = b.z0 * (1 - u * u); const [sx, sy] = ctx.proj(x, y, z); svg.append(svgEl('rect', { x: sx - 2, y: sy - 4, width: 4, height: 8, fill: P.t, stroke: P.o, 'stroke-width': 1 })); }
        const lignes = {
          oeil: [etat.observateur ? (etat.observateur.etat === 'vol' ? 'Le Breguet tourne au-dessus de leur tranchée : le réglage est fait.' : etat.observateur.etat === 'abattu' ? 'Le Breguet tombe.' : 'Le Breguet rentre.') : 'Pas d\'avion de réglage : les obus tombent à 18 m de la cible, au hasard.', etat.vise ? `Dernière salve : ${etat.pres} obus sur six à moins de 10 m de la cible (dispersion ${etat.sigma} m).` : 'Une salve de six 155 sur leur tranchée : voyez où ils tombent, avec et sans avion.'],
          cirque: [bilan.texte || (avions.length ? 'Les patrouilles se battent. Rien n\'est compté : on regarde qui tient le ciel.' : 'Trois Spad contre le triplan rouge du Baron et deux Albatros.')],
          mitraillage: [`Réponse : ${ {feu: 'le feu en l\'air (on tire, on reste debout)', terre: 'à terre (on se protège, on ne tire pas)', rien: 'aucune'}[etat.mode] }`, `Tombés sous les mitrailleuses : ${bilan.tombes || 0} · appareils abattus : ${bilan.abattus || 0}`],
          nuit: [avions[0] ? 'Le Gotha cherche les lampes de l\'arrière.' : 'Un Gotha vole la nuit sur nos lignes : lampes, projecteurs et DCA décident.', `Lampes : ${etat.lampes ? 'allumées : il vise juste (5 m)' : 'éteintes : ses bombes se perdent (36 m), mais on travaille moins bien'} · tombés : ${bilan.tombes || 0}${bilan.abattu ? ' · le Gotha est abattu' : ''}`],
        }[cle];
        ctx.dire(lignes);
      },
    });
  });
  return () => { nettoyer(); ZOOMS.length = 8; };
}
void el;
