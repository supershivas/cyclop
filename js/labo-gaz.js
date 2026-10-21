// Les gaz du labo (Jérôme, v0.42.0 : « 3 variations du gaz, avec la caméra libre pour voir les détails »). Trois façons de faire un nuage, en volumes (des cubes translucides, comme le reste du jeu), posés sur le moteur :
//  A · « Les bouteilles » (chlore, Ypres, 22 avril 1915) : des cylindres alignés sur le parapet d'en face, ouverts à la main ; la nappe jaune-verte avance au vent, haute de trois à quatre mètres ;
//  B · « Les obus à gaz » (phosgène, croix verte, 1916 ; ypérite, croix jaune, juillet 1917) : une salve tombe sur nos lignes ; le phosgène couvre un instant le sol puis se dissipe, l'ypérite reste : des flaques brunes au sol, qui brûlent ceux qui y passent ;
//  C · « Dans les creux » : plus lourd que l'air, le gaz suit le relief : on voit la nappe se vider dans les tranchées et les cratères, qui deviennent des fosses (une grille de colonnes qui coule).
// Historique vérifié : le 22 avril 1915 les Allemands lâchent ~170 t de chlore de plus de 5 700 bouteilles sur ~6 km de front, à la main (Second Ypres) ; l'ypérite (obus à croix jaune) date de juillet 1917 à Ypres et persiste dans le sol (non vérifié par la recherche, connaissance du domaine).
// Les dégâts sont ceux de la maquette d'avant (toux et peur, brûlures, morts) ; les masques divisent la dose par cinq. Les nombres sont des propositions. Tout le dessin vient d'une grille de doses de 3 m : rien n'est dans la bataille.
import { PALETTE as P } from './palette.js?v=0.52.0';
import { loadThree } from './three-lib.js?v=0.52.0';
import { ordonnerMarche, mourir } from './bataille.js?v=0.52.0';
import { hash2 } from './lib/rng.js?v=0.52.0';
import { ZOOMS } from './rendu3d.js?v=0.52.0';
import { el, svgEl, bouton, scene, maquette, texteSvg } from './labo-arcade.js?v=0.52.0';
import { atelier } from './labo-chars.js?v=0.52.0';

const CELLULE = 3;                                               // la grille de doses (m)
const VENT = 3;                                                  // m/s, vers le sud (y croissant)
const LARGEUR = 70;                                              // demi-largeur de la nappe (m)
const Y_ENNEMI = 118, Y_NOUS = 214;                              // les deux lignes, en m depuis le haut du secteur

export function maquetteGaz(stage, R, cle) {
  if (ZOOMS.length === 8) ZOOMS.push(24, 32, 48);
  const nettoyer = maquette(stage, ui => {
    let ctx0 = null, THREE = null, AT = null, masques = false, rapide = null;
    let nuage = null, rampe = null;                              // A, B : le système de particules ; C : la grille
    const dose = new Map();
    const bilan = { toussent: 0, blesses: 0, morts: 0, brules: 0 };
    ui.haut.append(bouton('Masques', () => { masques = !masques; }),
      bouton('Reculer d\'une ligne', () => { if (ctx0) ordonnerMarche(ctx0.B, [1], ctx0.X, ctx0.M.y + 238, 'bloc'); }));
    rapide = el('label', {}, el('input', { type: 'checkbox' }), ' ×3 ');
    let pause = false;
    const vues = { 'Vue d\'ensemble': [0.35, 0.6], 'De côté': [Math.PI / 2, 0.25], 'Au ras du sol': [0.15, 0.08], 'De dessus': [0.15, 1.5] };
    const sujet = cle === 'cylindres' ? 'Ouvrir les bouteilles' : cle === 'obus' ? null : 'Lâcher la nappe';
    if (sujet) ui.haut.append(bouton(sujet, () => { if (ctx0 && nuage) nuage.lacher(ctx0); if (ctx0 && rampe) rampe.lacher(); }));
    if (cle === 'obus') ui.haut.append(
      bouton('Salve de phosgène (croix verte)', () => ctx0 && nuage.salve(ctx0, 'phosgene')),
      bouton('Salve d\'ypérite (croix jaune)', () => ctx0 && nuage.salve(ctx0, 'yperite')));
    for (const [nom, [yaw, tg]] of Object.entries(vues)) ui.haut.append(bouton(nom, () => { if (!ctx0) return; ctx0.rendu.placerCamera(yaw, tg); }));
    ui.haut.append(bouton('Zoom −', () => ctx0?.rendu.zoomer(-1)), bouton('Zoom +', () => ctx0?.rendu.zoomer(1)), bouton('Pause', () => { pause = !pause; }), rapide, bouton('Rejouer', ui.rejouer));

    // ─── un nuage de particules cubiques (A et B) ───
    const fabriquerNuage = () => {
      const NMAX = 1500, geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false });
      const mesh = new THREE.InstancedMesh(geo, mat, NMAX); mesh.count = 0; mesh.frustumCulled = false;
      const pl = [], flaques = [], obus = [], cyl = [];
      const o = new THREE.Object3D(), c = new THREE.Color();
      const sol = (ctx, x, y) => ctx.rendu.hauteurSol(x, y);
      const grille = new Map();                                    // la dose, par cellule de 3 m
      const cle2 = (x, y) => ((x / CELLULE) | 0) * 4096 + ((y / CELLULE) | 0);
      const emettre = (ctx, x, y, z, vx, vy, vz, s, dur, couleur, masse) => { if (pl.length < NMAX) pl.push({ x, y, z, vx, vy, vz, s, s0: s, age: 0, dur, couleur, masse, rot: hash2(pl.length, ctx.run, 5) * 6.28, ph: hash2(pl.length, 2, 5) * 6.28 }); };
      const api = {
        // A : les bouteilles s'ouvrent à la main, l'une après l'autre, sur le parapet d'en face
        lacher(ctx) { if (cle === 'cylindres' && !api.ouvert) { api.ouvert = ctx.t; } },
        // B : une salve : douze obus, étalés sur six secondes, sur notre ligne
        salve(ctx, genre) {
          for (let k = 0; k < 12; k++) {
            const x = ctx.X + (hash2(k, ctx.run + pl.length, 3) - 0.5) * 100, y = ctx.M.y + Y_NOUS - 4 + hash2(k, ctx.run, 4) * 18;
            obus.push({ x0: x + (hash2(k, 8, 4) - 0.5) * 20, y0: ctx.M.y + Y_ENNEMI, x, y, t0: ctx.t + k * 0.5, vol: 1.7, genre });
          }
        },
        pas(dt, ctx) {
          if (pause) return;
          // A : une bouteille s'ouvre toutes les 0,25 s, pendant vingt secondes d'émission
          if (cle === 'cylindres' && api.ouvert !== undefined) {
            const t = ctx.t - api.ouvert;
            cyl.forEach((cy, k) => {
              if (t < k * 0.25 || t > k * 0.25 + 20) return;
              if (hash2(Math.floor(ctx.t * 30), k + ctx.run * 7, 9) < 1.1 * dt * 30) {
                const s = 2.0 + hash2(pl.length, k, 6) * 1.6;
                emettre(ctx, cy.x + (hash2(pl.length, 1, 6) - 0.5) * 1.2, cy.y + 0.5, 0.4 + hash2(pl.length, 2, 6) * 0.6, (hash2(pl.length, 3, 6) - 0.5) * 0.6, VENT * (0.7 + hash2(pl.length, 4, 6) * 0.5), 0.25 + hash2(pl.length, 5, 6) * 0.3, s, 36, hash2(pl.length, 6, 6) < 0.5 ? P.x : P.v, 1);
              }
            });
          }
          // B : les obus qui volent, puis éclatent
          for (let i = obus.length - 1; i >= 0; i--) {
            const b = obus[i], u = (ctx.t - b.t0) / b.vol;
            if (u < 0) continue;
            if (u >= 1) {
              if (b.m) ctx.rendu.scene.remove(b.m);
              obus.splice(i, 1);
              if (b.genre === 'phosgene') for (let k = 0; k < 26; k++) { const a = hash2(k, i + pl.length, 7) * 6.28, v = 0.8 + hash2(k, 3, 7) * 2.4; emettre(ctx, b.x, b.y, 0.3, Math.cos(a) * v + 0.4, Math.sin(a) * v + 0.5, 0.2 + hash2(k, 4, 7) * 0.5, 1.2, 18 + hash2(k, 5, 7) * 10, P.r, 1); }
              else { for (let k = 0; k < 14; k++) { const a = hash2(k, i + pl.length, 7) * 6.28, v = 0.5 + hash2(k, 3, 7) * 1.4; emettre(ctx, b.x, b.y, 0.2, Math.cos(a) * v, Math.sin(a) * v, 0.15 + hash2(k, 4, 7) * 0.3, 1.0, 10 + hash2(k, 5, 7) * 6, P.h, 0.6); }
                flaques.push({ x: b.x, y: b.y, r: 3 + hash2(i, pl.length, 5) * 2.5, t0: ctx.t, mesh: null }); }
            }
          }
          // les particules
          for (let i = pl.length - 1; i >= 0; i--) {
            const p = pl[i]; p.age += dt;
            if (p.age > p.dur) { pl.splice(i, 1); continue; }
            const turbu = Math.sin(ctx.t * 0.9 + p.ph) * 0.35;
            p.x += (p.vx + turbu * 0.4) * dt; p.y += p.vy * dt; p.z = Math.max(0.1, p.z + p.vz * dt);
            p.vz += (cle === 'obus' ? -0.5 : (p.z > 3.5 ? -0.6 : 0.05)) * dt;       // plus lourd que l'air : il retombe et colle au sol
            p.vx *= 1 - 0.3 * dt; if (cle === 'obus') p.vy *= 1 - 0.4 * dt;
            p.s = p.s0 + Math.min(1, p.age / p.dur) * (cle === 'obus' ? 3.8 : 4.2);
          }
          // la dose
          grille.clear();
          for (const p of pl) { const k = cle2(p.x, p.y); grille.set(k, (grille.get(k) || 0) + p.masse * (p.z < 2.5 ? 1 : 0.2) * (1 - p.age / p.dur) * 0.55); }
          api.grille = grille;
          // les flaques d'ypérite : elles restent (les secondes de la maquette, des jours dans la vie)
          api.cle2 = cle2;
        },
        dose(x, y, ctx) {
          let d = grille.get(cle2(x, y)) || 0;
          for (const f of flaques) if (Math.hypot(x - f.x, y - f.y) < f.r) d += 0.5;
          return d;
        },
        brule(x, y) { return flaques.some(f => Math.hypot(x - f.x, y - f.y) < f.r); },
        dessiner(ctx) {
          // les particules
          let n = 0;
          for (const p of pl) {
            if (n >= NMAX) break;
            const fin = Math.max(0, Math.min(1, (p.dur - p.age) / (p.dur * 0.3)));
            const s = p.s * (0.4 + 0.6 * fin), h = sol(ctx, p.x, p.y);
            o.position.set(p.x, h + p.z * (cle === 'obus' ? 1 : 1) + s * 0.4, p.y); o.rotation.set(0, p.rot + p.age * 0.35, 0); o.scale.set(s, s * (cle === 'obus' ? 0.55 : 0.8), s); o.updateMatrix();
            mesh.setMatrixAt(n, o.matrix); mesh.setColorAt(n, c.set(p.couleur)); n++;
          }
          mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          // les obus en vol : un cube d'os qui suit un arc
          for (const b of obus) {
            if (!b.m) { b.m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(b.genre === 'phosgene' ? P.x : P.h) })); ctx.rendu.scene.add(b.m); }
            const u = Math.max(0, Math.min(1, (ctx.t - b.t0) / b.vol)), x = b.x0 + (b.x - b.x0) * u, y = b.y0 + (b.y - b.y0) * u, hz = sol(ctx, x, y) + 4 * Math.sin(u * Math.PI) * 14;
            b.m.position.set(x, hz, y); b.m.rotation.y = Math.atan2(b.x - b.x0, b.y - b.y0); b.m.rotation.x = 0.6 * (u < 0.5 ? 1 : -1) * Math.cos(u * Math.PI);
          }
          for (const b of obus) if (ctx.t < b.t0) b.m && (b.m.visible = false); else if (b.m) b.m.visible = true;
          // les flaques d'ypérite : un plateau brun posé sur le sol
          for (const f of flaques) {
            if (!f.mesh) { f.mesh = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * 1.05, 0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.g), transparent: true, opacity: 0.75, depthWrite: false })); ctx.rendu.scene.add(f.mesh); }
            f.mesh.position.set(f.x, sol(ctx, f.x, f.y) + 0.08, f.y); f.mesh.material.opacity = 0.55 + 0.2 * Math.sin(ctx.t * 1.5 + f.x);
          }
        },
        installer(ctx) {
          ctx.rendu.scene.add(mesh);
          if (cle === 'cylindres') {
            // les bouteilles : une rangée de cylindres sur le parapet d'en face (la tête vers le haut, un tuyau vers le no man's land)
            const g = new THREE.Group();
            for (let k = 0; k < 29; k++) {
              const x = ctx.X - LARGEUR + k * (2 * LARGEUR / 28), y = ctx.M.y + Y_ENNEMI;
              const cg = new THREE.Group(); cg.position.set(x, sol(ctx, x, y) + 0.05, y);
              AT.cyl(cg, 0.16, 1.0, P.r, [0, 0.5, 0], 'y', 8); AT.cyl(cg, 0.07, 0.15, P.s, [0, 1.05, 0], 'y', 6); AT.cyl(cg, 0.025, 1.4, P.t, [0, 1.15, 0.6], 'z', 5);
              g.add(cg); cyl.push({ x, y });
            }
            ctx.rendu.scene.add(g); api.groupe = g;
          }
        },
      };
      return api;
    };

    // ─── la nappe en grille qui coule (C) ───
    const fabriquerRampe = () => {
      const X0 = 0, NX = 76, NY = 80, CS = 2;                      // 152 m × 160 m, cellules de 2 m
      let h0 = null, creux = null, m = new Float32Array(NX * NY), m2 = new Float32Array(NX * NY), ox = 0, oy = 0, actif = null, mesh = null, acc = 0;
      const o = new THREE.Object3D(), c1 = new THREE.Color(P.v), c2 = new THREE.Color(P.x);
      const api = {
        lacher() { actif = ctx0.t; },
        installer(ctx) {
          ox = ctx.X - NX * CS / 2; oy = ctx.M.y + 100;
          h0 = new Float32Array(NX * NY); creux = new Uint8Array(NX * NY);
          const T = ctx.B.terrain;
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const x = ox + (i + 0.5) * CS, y = oy + (j + 0.5) * CS; h0[j * NX + i] = ctx.rendu.hauteurSol(x, y); creux[j * NX + i] = T.diff[(y | 0) * T.W + (x | 0)] <= -2 ? 1 : 0; }
          const geo = new THREE.BoxGeometry(CS * 0.96, 1, CS * 0.96);
          mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }), NX * NY); mesh.count = 0; mesh.frustumCulled = false;
          ctx.rendu.scene.add(mesh);
        },
        pas(dt, ctx) {
          if (pause) return;
          acc += dt; if (acc < 0.1) return; const d = acc; acc = 0;
          m2.fill(0);
          if (actif !== null && ctx.t - actif < 22) for (let i = 4; i < NX - 4; i++) m[1 * NX + i] += 5.5 * d;           // l'émission : une ligne de bouteilles, au nord
          const w = Math.min(0.45, VENT * d / CS);
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const k = j * NX + i, q = m[k]; if (q < 1e-4) continue;
            let reste = q * (creux[k] ? 1 - 0.003 * d : 1 - 0.025 * d);                                   // le gaz se dissipe vite à découvert, très lentement dans un creux
            // le vent le pousse vers le sud, moins dans un creux (il y est à l'abri)
            const vent = reste * w * (creux[k] ? 0.3 : 1); reste -= vent; if (j + 1 < NY) m2[k + NX] += vent; else reste += vent * 0;
            // il coule vers le voisin le plus bas
            const voisins = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (const [di, dj] of voisins) {
              const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
              const dh = h0[k] - h0[nj * NX + ni];
              if (dh > 0.08) { const f = Math.min(0.18, 0.5 * dh) * reste; reste -= f; m2[nj * NX + ni] += f; }
              else { const f = 0.012 * reste; reste -= f; m2[nj * NX + ni] += f; }                       // un peu de diffusion
            }
            m2[k] += reste;
          }
          const t = m; m = m2; m2 = t;
        },
        dose(x, y) { const i = Math.floor((x - ox) / CS), j = Math.floor((y - oy) / CS); if (i < 0 || j < 0 || i >= NX || j >= NY) return 0; return m[j * NX + i] * 0.9; },
        dessiner(ctx) {
          let n = 0;
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const q = m[j * NX + i]; if (q < 0.03) continue;
            const hh = Math.min(6, 0.3 + q * 1.1), x = ox + (i + 0.5) * CS, y = oy + (j + 0.5) * CS;
            o.position.set(x, h0[j * NX + i] + hh / 2, y); o.rotation.set(0, 0, 0); o.scale.set(1, hh, 1); o.updateMatrix();
            mesh.setMatrixAt(n, o.matrix); mesh.setColorAt(n, c1.clone().lerp(c2, Math.min(1, q / 3))); n++;
          }
          mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        },
        get cible() { return null; },
      };
      return api;
    };

    return scene(ui.stage, R, {
      bloc: false, zoom: 3, cz: 166, libre: { yaw: 0.35, tangage: 0.62 },
      crateres: [[-30, 188, '155'], [-12, 198, '155'], [14, 190, '155'], [30, 202, '155'], [0, 176, '220'], [-44, 176, '155'], [42, 182, '155'], [-20, 150, '155'], [22, 140, '220'], [-36, 130, '155']],
      echelle: () => rapide.querySelector('input').checked ? 3 : 1,
      apres: async ctx => {
        ctx0 = ctx; THREE = await loadThree(); AT = atelier(THREE);
        if (cle === 'creux') rampe = fabriquerRampe(); else nuage = fabriquerNuage();
        (nuage || rampe).installer(ctx);
        const lumiere = new THREE.Group(); lumiere.add(new THREE.AmbientLight(0xffffff, 1.6)); const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil); ctx.rendu.scene.add(lumiere);
      },
      pas(dt, ctx) {
        if (!nuage && !rampe) return;
        const sys = nuage || rampe; sys.pas(dt, ctx);
        const { A, B } = ctx;
        for (const i of ctx.mien) {
          const f = (masques ? 0.2 : 1), dd = sys.dose(A.x[i], A.y[i], ctx);
          if (dd <= 0) continue;
          const d = (dose.get(A.id[i]) || 0) + dd * f * dt * (cle === 'creux' ? 1.6 : cle === 'obus' ? 1.2 : 1.4);
          dose.set(A.id[i], d);
          if (d > 1.5) { if (!A.blessure[i] && d < 1.5 + 2 * dt * dd) bilan.toussent++; A.peur[i] = Math.max(A.peur[i], 0.55); }
          if (d > 7 && !A.blessure[i]) { A.blessure[i] = 1; B.etat.blesses[0]++; bilan.blesses++; }
          if (d > 14 && cle !== 'obus') { mourir(B, i, 'gaz'); bilan.morts++; }
        }
      },
      image(dt, ctx) {
        const { svg } = ctx;
        (nuage || rampe)?.dessiner(ctx);
        const w = ctx.rendu.renderer.domElement.clientWidth;
        svg.append(svgEl('path', { d: `M${w - 90} 30 L${w - 50} 30 M${w - 58} 24 L${w - 48} 30 L${w - 58} 36`, stroke: P.o, 'stroke-width': 2, fill: 'none', transform: `rotate(90 ${w - 70} 30)` }));
        texteSvg(svg, w - 70, 70, 'vent', 11);
        const lignes = {
          cylindres: [nuage?.ouvert === undefined ? '29 bouteilles sur le parapet d\'en face : on les ouvre à la main (Ypres, 1915 : 5 730 en tout).' : 'Le nuage avance avec le vent, à 3 m/s.'],
          obus: ['Phosgène : un nuage bas qui couvre le sol un instant. Ypérite : des flaques qui restent.'],
          creux: [rampe && ctx.t > 0 ? 'Le gaz coule dans les tranchées et les cratères : une fosse pleine y reste longtemps.' : 'Une nappe attend, de l\'autre côté.'],
        }[cle];
        ctx.dire([...lignes, `Masques : ${masques ? 'mis (on voit mal, on tire moins bien)' : 'dans les sacs'}`, `Toussent : ${bilan.toussent} · blessés : ${bilan.blesses} · tombés : ${bilan.morts}`]);
      },
    });
  });
  return () => { nettoyer(); ZOOMS.length = 8; };
}
void P; void ordonnerMarche;
