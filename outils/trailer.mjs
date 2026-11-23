// Le trailer, tourné dans le moteur du jeu (Jérôme, 23 nov.) : une bataille préparée, une caméra écrite plan par plan, une image capturée par pas d'horloge.
// Le conteneur n'a pas de carte graphique (1 à 2 images/s) : l'horloge du navigateur est truquée comme dans `rendu-empreinte.mjs` (elle n'avance que
// d'une image à la fois), donc la lenteur ne se voit pas et chaque plan se rejoue à l'identique. Les plans sont de la donnée : `outils/trailer-plans.mjs`.
//
//   node outils/trailer.mjs                    → toutes les images dans captures/trailer/images/, puis captures/trailer/trailer.mp4 (ffmpeg)
//   node outils/trailer.mjs --essai            → seulement la première, le milieu et la dernière image de chaque plan (captures/trailer/essai/), pour cadrer vite
//   node outils/trailer.mjs --plan aube        → un seul plan (avec --essai ou non)
//   node outils/trailer.mjs --ips 24           → images par seconde (24 par défaut)
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { servir, lancerChromium, options } from './navigateur.mjs';
import { PLANS, BATAILLE, MUSIQUE } from './trailer-plans.mjs';

const o = options(process.argv.slice(2), { ips: '24', sortie: 'captures/trailer', plan: '' });
const IPS = +o.ips, ESSAI = process.argv.includes('--essai');
const plans = o.plan ? PLANS.filter(p => p.nom === o.plan) : PLANS;
const dossier = `${o.sortie}/${ESSAI ? 'essai' : 'images'}`;
if (!ESSAI && !o.plan) await rm(dossier, { recursive: true, force: true });
await mkdir(dossier, { recursive: true });

const srv = await servir('.');
const nav = await lancerChromium();
const contexte = await nav.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });      // (mouvement réduit : la caméra ne respire pas, c'est le script qui la mène)
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`exception : ${e.message}`));
page.on('console', m => { if (m.type() === 'error') erreurs.push(`console : ${m.text()}`); });

await page.addInitScript(([ips]) => {
  let a = 0x2545f491;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let maintenant = 0, file = [];
  performance.now = () => maintenant;
  window.requestAnimationFrame = f => { file.push(f); return file.length; };
  window.cancelAnimationFrame = () => {};
  window.__images = (n, png) => {
    for (let k = 0; k < n; k++) { maintenant += 1000 / ips; const f = file; file = []; for (const g of f) g(maintenant); }
    return png ? document.getElementById('canvas').toDataURL('image/png') : null;
  };
}, [IPS]);

await page.goto(`${srv.base}index.html?debug=1&seed=${BATAILLE.graine}`);
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('nouvelle').click());
await page.waitForTimeout(500);
await page.evaluate(() => window.__images(2));
await page.evaluate(B => {
  const b = __jeu.bataille(), r = __jeu.rendu();
  b.etat.meteo[0] = B.meteo; b.etat.camp.batiments.artillerie.niveau = 3;
  r.decor = true; r.eclairage = 'haut';      // (la lumière la plus riche : l'aube et le couchant orangés, les ombres des soldats)
                                             // ni lettre de capitaine ni repère : une illustration
  document.body.classList.add('tournage');
  const s = document.createElement('style'); s.textContent = '#hud, #etiquettes, #retours, #chars-etiq, #visee, #equerres, #repere, #bulle, #toast, .infobulle { display: none !important; }'; document.head.append(s);
}, BATAILLE);

// la pose de la caméra : interpolée entre les clés du plan (t de 0 à 1, adouci), posée à chaque image
const doux = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
function pose(plan, t) {
  const C = plan.camera, u = (plan.adoucir === false ? t : doux(t)) * (C.length - 1), k = Math.min(C.length - 2, Math.floor(u)), f = u - k;
  const a = C[k], b = C[k + 1] ?? a, r = {};
  for (const cle of Object.keys(a)) r[cle] = lerp(a[cle], b[cle] ?? a[cle], f);
  return r;
}

let numero = 0;
for (const plan of plans) {
  const n = Math.round(plan.duree * IPS);
  if (plan.avant) await page.evaluate(plan.avant);
  const essais = new Set([0, Math.floor(n / 2), n - 1]);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0, P = pose(plan, t);
    if (plan.pendant) await page.evaluate(plan.pendant, { i, n, t, ips: IPS });
    await page.evaluate(P => {
      const v = __jeu.rendu().vue, m = __jeu.bataille().etat.marges;
      v.cx = P.x + m.x; v.cz = P.y + m.y; v.dist = P.dist; v.haut = P.haut ?? 0; v.fov = P.fov ?? 30; v.portee = P.portee ?? 900; v.garde = 0.6;
      if (P.zoom !== undefined) v.zoom = Math.round(P.zoom);
      v.cible.yaw = v.yaw = P.yaw; v.cible.tangage = v.tangage = P.tangage;
    }, P);
    const garder = !ESSAI || essais.has(i);
    const png = await page.evaluate(g => window.__images(1, g), garder);
    if (png) await writeFile(ESSAI ? `${dossier}/${plan.nom}-${String(i).padStart(4, '0')}.png` : `${dossier}/${String(numero).padStart(5, '0')}.png`, Buffer.from(png.split(',')[1], 'base64'));
    numero++;
    if (i % 24 === 0) process.stdout.write(`\r${plan.nom} ${i + 1}/${n}   `);
  }
  console.log(`\r✓ ${plan.nom} : ${n} images`);
}
await nav.close(); await srv.close();
if (erreurs.length) console.log('✗ erreurs :', [...new Set(erreurs)].slice(0, 5));

if (!ESSAI && !o.plan) {
  // l'assemblage : le pixel agrandi sans lissage jusqu'au 1080p, des fondus au noir au début et à la fin, la musique du jeu
  const total = numero / IPS, sortie = `${o.sortie}/trailer.mp4`;
  const vf = `scale=1920:1080:flags=neighbor,fade=t=in:st=0:d=1.2,fade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5`;
  const args = ['-y', '-loglevel', 'error', '-framerate', String(IPS), '-i', `${dossier}/%05d.png`];
  if (MUSIQUE) args.push('-ss', String(MUSIQUE.debut), '-i', MUSIQUE.fichier, '-af', `afade=t=in:d=1.5,afade=t=out:st=${(total - 2).toFixed(2)}:d=2`, '-shortest', '-c:a', 'aac', '-b:a', '192k');
  args.push('-vf', vf, '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', sortie);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(`✓ ${sortie} : ${total.toFixed(1)} s`);
}
