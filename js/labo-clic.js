// Le clic satisfaisant (Jérôme, v0.144.3 : « prépare dans le labo un effet d'animation lors du clic qui rend le clic satisfaisant »).
// Cinq variantes sur les vrais boutons du jeu (`.bouton`, les feuilles du jeu chargées dans un cadre) : on clique, on regarde. Rien n'est branché dans le jeu : une variante retenue
// remplace `surRebond` de main.js (le rebond de la v0.41.3, archivé : docs/archives/labo-archive.md, « Le clic sur un bouton »). Le dessin seulement ; couleurs de la palette
// (os, terre, glaise) ; des fondus continus (l'onde) comme ceux du ciel et de la nuit.
//   A. Le tampon   : à l'appui le bouton s'enfonce sur son ombre (3 px, l'ombre s'écrase), au relâchement il remonte en dépassant un peu.
//   B. L'onde      : A, plus un anneau qui part du point du clic et s'éteint (clippé dans le bouton).
//   C. Les éclats  : A, plus huit petits cubes (os, glaise, terre) qui jaillissent du point du clic, retombent et s'éteignent.
//   D. L'encrier   : A, plus un éclair inversé (terre sous l'os) de 90 ms et une secousse de 2 px de la planche.
//   E. Le tout     : A + B + C + D.
import { ROLES } from './palette.js?v=0.169.0';

const roles = Object.entries({ ...ROLES }).map(([k, v]) => `--jeu-${k}:${v}`).join(';');

const SCRIPT = `
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = new Set(document.body.dataset.effets.split(' '));
const planche = document.querySelector('.planche');
const ressort = [
  { transform: 'translate(3px,3px)', boxShadow: '0 0 0 var(--jeu-fond)' },
  { transform: 'translate(-1px,-1px)', boxShadow: '4px 4px 0 var(--jeu-fond)', offset: .55 },
  { transform: 'translate(0,0)', boxShadow: '3px 3px 0 var(--jeu-fond)' }];
function onde(b, x, y) {
  const r = b.getBoundingClientRect(), d = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
  const o = document.createElement('i');
  o.style.cssText = 'position:absolute;pointer-events:none;border-radius:50%;border:2px solid var(--jeu-fond);box-sizing:border-box;left:' + (x - d / 2) + 'px;top:' + (y - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px';
  b.append(o);
  o.animate([{ transform: 'scale(0)', opacity: .5 }, { transform: 'scale(1)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.1,.6,.3,1)' }).onfinish = () => o.remove();
}
function eclats(b, x, y) {
  const r = b.getBoundingClientRect(), couleurs = ['var(--jeu-encre)', 'var(--jeu-accent)', 'var(--jeu-fond)'];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * .42 + (Math.random() - .5) * .25, v = 46 + Math.random() * 42, t = 520 + Math.random() * 160, s = 3 + Math.floor(Math.random() * 3);
    const c = document.createElement('i');
    c.style.cssText = 'position:fixed;z-index:9;pointer-events:none;width:' + s + 'px;height:' + s + 'px;background:' + couleurs[i % 3] + ';outline:1px solid var(--jeu-fond);left:' + (r.left + x - s / 2) + 'px;top:' + (r.top + y - s / 2) + 'px';
    document.body.append(c);
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v;
    c.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: 'translate(' + dx * .6 + 'px,' + dy * .6 + 'px) rotate(' + (i % 2 ? 90 : -90) + 'deg)', opacity: 1, offset: .45 },
      { transform: 'translate(' + dx + 'px,' + (dy + 38) + 'px) rotate(' + (i % 2 ? 180 : -180) + 'deg)', opacity: 0 }],
      { duration: t, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => c.remove();
  }
}
function eclair(b) {
  b.animate([{ background: 'var(--jeu-fond)', color: 'var(--jeu-encre)' }, { background: 'var(--jeu-fond)', color: 'var(--jeu-encre)', offset: .6 }, { background: 'var(--jeu-encre)', color: 'var(--jeu-fond)' }], { duration: 150 });
  planche.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(2px,1px)', offset: .25 }, { transform: 'translate(-2px,-1px)', offset: .55 }, { transform: 'translate(1px,0)', offset: .8 }, { transform: 'translate(0,0)' }], { duration: 160 });
}
let appuye = null, ou = [0, 0];
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b || e.button !== 0) return;
  appuye = b; const r = b.getBoundingClientRect(); ou = [e.clientX - r.left, e.clientY - r.top];
  if (!reduit) b.animate([{ transform: 'translate(0,0)', boxShadow: '3px 3px 0 var(--jeu-fond)' }, { transform: 'translate(3px,3px)', boxShadow: '0 0 0 var(--jeu-fond)' }], { duration: 60, fill: 'forwards', easing: 'ease-out' });
});
function relacher(b, x, y) {
  if (reduit) return;
  b.getAnimations().forEach(a => a.cancel());
  b.animate(ressort, { duration: 240, easing: 'cubic-bezier(.2,.8,.3,1)' });
  if (V.has('onde')) onde(b, x, y);
  if (V.has('eclats')) eclats(b, x, y);
  if (V.has('eclair')) eclair(b);
}
document.addEventListener('pointerup', () => { if (appuye) { const b = appuye; appuye = null; relacher(b, ou[0], ou[1]); } });
document.addEventListener('pointercancel', () => { if (appuye) { appuye.getAnimations().forEach(a => a.cancel()); appuye = null; } });
document.addEventListener('click', e => { if (e.detail === 0) { const b = e.target.closest('button'); if (b) relacher(b, b.offsetWidth / 2, b.offsetHeight / 2); } });   // au clavier
`;

const VARIANTES = {
  tampon: ['Le tampon', ''],
  onde: ['L\'onde', 'onde'],
  eclats: ['Les éclats', 'eclats'],
  encrier: ['L\'encrier', 'eclair'],
  tout: ['Le tout', 'onde eclats eclair'],
};
export const NOMS_CLIC = Object.fromEntries(Object.entries(VARIANTES).map(([k, [nom]]) => [k, nom]));

export function clic(stage, cle) {
  const [nom, effets] = VARIANTES[cle];
  const f = Object.assign(document.createElement('iframe'), { title: `Le clic : ${nom}`, loading: 'eager' });
  f.style.cssText = `width:100%;height:60vh;border:1px solid rgba(0,0,0,.2);border-radius:6px;background:${ROLES.fond}`;
  f.srcdoc = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="js/lib/game.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/ds-v2.css">
<style>
  :root { ${roles}; }
  html, body { height: 100%; overflow: hidden; background: var(--jeu-fond); }
  body { margin: 0; display: grid; place-items: center; font: var(--texte)/1.4 var(--jeu-police); color: var(--jeu-encre); }
  .planche { display: grid; gap: var(--e6, 24px); justify-items: center; }
  .note { color: var(--jeu-brume); font-size: var(--texte-petit); max-width: 52ch; text-align: center; margin: 0; }
  .menu { grid-template-columns: 1fr; width: 260px; }
  .bouton { position: relative; overflow: hidden; }
</style></head><body data-effets="${effets}"><div class="planche">
  <div class="titre-menu menu"><button class="bouton">Continuer</button><button class="bouton">Nouvelle partie</button><button class="bouton">Réglages</button></div>
  <p class="note">${nom} : clique (ou Entrée) sur un bouton. À l'appui il s'enfonce, au relâchement il remonte.</p></div>
<script>${SCRIPT}</script></body></html>`;
  stage.append(f);
  return f;
}
