// Sonde du premier plan (v0.143.1, « des soldats surgissent au premier plan, qui passe en basse résolution ») : pour une série de vues de près
// (24 px/m, inclinées, tournées, déplacées vers le bas de l'écran), compte les hommes dont une partie (des pieds à la tête) est dans l'écran contre
// ceux que le moteur dessine, et vérifie que les hommes articulés (le détail) sont les plus proches de la caméra.
//   node outils/sonde-premier-plan.mjs   → une ligne par vue ; code 1 si un homme manque ou si le détail ne va pas aux plus proches
import { servir, lancerChromium } from './navigateur.mjs';
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(String(e)));
await page.goto(`${srv.base}index.html?debug=1&seed=7&soldats=8000`);
await page.waitForTimeout(600);
await page.click('#nouvelle');
await page.waitForTimeout(1200);
await page.evaluate(() => { document.getElementById('temps-pause').click(); });
const res = [];
for (const zoom of [6, 7, 8, 9]) for (const tg of [0.7, 0.95, 1.2]) for (const yaw of [0.15, -0.4]) for (const dz of [-8, -4, 0, 4]) {
  const r = await page.evaluate(async ([zoom, tg, yaw, dz]) => {
    const J = __jeu, B = J.bataille(), R = J.rendu(), A = B.armee, m = B.etat.marges;
    // le centre de nos hommes de la 1re ligne
    let sx = 0, sy = 0, n = 0, ymin = 1e9;
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 0) ymin = Math.min(ymin, A.y[i]);
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.y[i] < ymin + 6) { sx += A.x[i]; sy += A.y[i]; n++; }
    J.zoom(zoom); J.camera(yaw, tg);
    R.vue.cx = sx / n + 20; R.vue.cz = sy / n + dz;
    await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(f))));
    const cv = document.querySelector('canvas'), w = cv.clientWidth, h = cv.clientHeight, oe = R.oeil;
    let attendus = 0; const vis = [];
    const vx = R.vue.cx - oe.x, vy = R.hauteurSol(R.vue.cx, R.vue.cz) - oe.y, vz = R.vue.cz - oe.z, vl = Math.hypot(vx, vy, vz), fx = vx / vl, fy = vy / vl, fz = vz / vl;
    for (let i = 0; i < A.n; i++) {
      const hs = R.hauteurSol(A.x[i], A.y[i]), [px, py] = R.versEcran(A.x[i], A.y[i], hs), [tx, ty] = R.versEcran(A.x[i], A.y[i], hs + 1.7);
      if (px < -1e4 || tx < -1e4) continue;
      const g = 10;      // 10 pixels de bord : on ne compte pas un homme dont on ne voit qu'un bout de casque
      if (Math.max(px, tx) < g || Math.min(px, tx) > w - g || Math.max(py, ty) < g || Math.min(py, ty) > h - g) continue;
      attendus++; vis.push([i, (A.x[i] - oe.x) * fx + (hs - oe.y) * fy + (A.y[i] - oe.z) * fz]);      // la profondeur dans l'axe de la vue (la taille à l'écran en dépend)
    }
    const st = R.stats, sel = R.articulesSel;
    vis.sort((a, b) => a[1] - b[1]);
    // le détail va aux plus proches : aucun homme vu sans détail n'est plus près que 0,9 × le plus lointain des articulés vus (0,9 : la garde d'ARTICULE)
    const dArt = Math.max(0, ...vis.filter(v => sel[v[0]]).map(v => v[1])), passes = vis.filter(v => !sel[v[0]] && v[1] < 0.9 * dArt).length;
    return { dessines: st.soldatsVus + st.articulesVus, attendus, art: st.articulesVus, artVus: vis.filter(v => sel[v[0]]).length, passes };
  }, [zoom, tg, yaw, dz]);
  res.push({ zoom, tg, yaw, dz, ...r });
}
let echec = 0;
for (const r of res) {
  const manque = Math.max(0, r.attendus - r.dessines);
  if (manque > 0 || r.passes > Math.ceil(r.artVus * 0.02)) echec++;      // 2 % : la profondeur de la sonde est approchée (l'axe vers le point visé, les hommes sans leur écart dans le rang)
  if (r.attendus) console.log(`zoom ${r.zoom} tangage ${r.tg} lacet ${r.yaw} dz ${r.dz} : ${r.dessines} dessinés / ${r.attendus} à l'écran (manque ${manque}) ; articulés ${r.art} (${r.artVus} à l'écran) ; plus proches sans détail : ${r.passes}`);
}
if (erreurs.length) console.log('erreurs :', erreurs);
console.log(echec ? `${echec} vues fautives sur ${res.length}` : `les ${res.length} vues sont justes`);
await nav.close(); await srv.close();
process.exit(echec || erreurs.length ? 1 : 0);
