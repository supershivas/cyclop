// Les sujets « Un point de dotation », « La partie gagnée » et « La fiche de fin de journée » du labo (Jérôme, v0.98.0 : « proposer 4 versions de l'animation lors du gain d'un point de dotation, de l'animation lors du gain de la partie,
// et de la modale de la fiche de fin de journée, plus claire, toujours développée, centrée, avec le nom des régiments dont l'ordre n'a pas été modifié »). Rien n'est dans le jeu : des maquettes qui jouent sur des données d'exemple,
// avec la palette du jeu seulement (une couleur de plus, une alerte, serait écrite dans `docs/domaines/rendu.md`). Le ton est celui du jeu (DESIGN.md) : la danse macabre, la catastrophe peinte avec calme : ni confettis ni éclats, un
// geste de papier, de tampon, de jour qui se lève. `prefers-reduced-motion` : le nombre change, un éclair de brume le dit, rien ne bouge.
import { PALETTE as P } from './palette.js?v=0.99.2';
import { DOTATION } from './data/batiments.js?v=0.99.2';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;';
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const attendre = ms => new Promise(r => setTimeout(r, ms));
const bouton = (texte, f) => Object.assign(el('button', `${MONO}height:36px;padding:0 14px;margin:0 8px 8px 0;color:${P.o};background:${P.s};border:1px solid ${P.g};cursor:pointer`), { textContent: texte, onclick: f });
const NS = 'http://www.w3.org/2000/svg';
const svg = (viewBox, css, html) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', viewBox); s.style.cssText = css; s.innerHTML = html; return s; };
// une animation qui s'efface d'elle-même ; sans mouvement, elle ne joue pas (l'état final est déjà posé)
const jouer = (e, images, opts) => reduit() ? { finished: Promise.resolve() } : e.animate(images, { fill: 'both', ...opts });

// ─── Un point de dotation ───
// Le bouton du camp tel que le jeu le dessine (« Le camp · 5 pts »), dans un coin du champ ; `gains` : ce que l'aube verse, [raison, points]
const GAINS = {
  'Une aube : +1': [['L\'aube', DOTATION.aube]],
  'Lignes tenues : +2': [['L\'aube', DOTATION.aube], ['Nos lignes tiennent', DOTATION.tenue.points]],
  'Une ligne prise : +4': [['L\'aube', DOTATION.aube], ['Nos lignes tiennent', DOTATION.tenue.points], ['Leur 1re ligne prise', DOTATION.ligne]],
};
function sceneGain(stage, jouerGain, { gauche = false } = {}) {
  const champ = el('div', `position:relative;height:min(62vh,470px);overflow:hidden;background:${P.t};border:1px solid ${P.s};${MONO}color:${P.o}`);
  // le champ : un horizon de boue, pour que la maquette ne flotte pas dans le noir
  champ.append(el('div', `position:absolute;left:0;right:0;bottom:0;height:34%;background:${P.b}`), el('div', `position:absolute;left:0;right:0;bottom:34%;height:2px;background:${P.g}`));
  const camp = el('div', `position:absolute;right:16px;top:16px;width:312px;height:44px;display:flex;align-items:center;padding:0 8px;background:${P.o};color:${P.t};box-shadow:3px 3px 0 ${P.t};cursor:default`);
  const texte = el('span', 'transform-origin:20% 50%', 'Le camp · ');
  const n = el('b', 'font-weight:normal;display:inline-block;transform-origin:50% 60%', '5'), suite = el('span', '', ' pts');
  texte.append(n, suite); camp.append(texte);
  const etat = { total: 5, camp, n, champ, texte };
  const poser = v => { etat.total = v; n.textContent = String(v); };
  etat.poser = poser;
  // le papier de l'aube, à gauche : les lignes qui versent des points (certaines variantes les lisent)
  const aube = el('div', `position:absolute;left:16px;top:16px;width:230px;padding:8px 12px;background:${P.o};color:${P.t};box-shadow:3px 3px 0 ${P.t};display:${gauche ? 'block' : 'none'}`);
  champ.append(aube, camp); etat.aube = aube;
  const barre = el('div', 'margin:0 0 10px');
  let en = false;
  for (const [nom, g] of Object.entries(GAINS)) barre.append(bouton(nom, async () => {
    if (en) return; en = true;
    aube.replaceChildren(el('b', 'font-weight:normal;display:block;border-bottom:1px solid ' + P.g, 'L\'aube du 3e jour'), ...g.map(([r, p]) => el('div', 'display:flex;justify-content:space-between;padding:2px 0', el('span', '', r), el('span', 'font-weight:bold', `+${p}`))));
    poser(5); await jouerGain(etat, g); en = false;
  }));
  barre.append(bouton('Remettre à 5', () => { poser(5); aube.replaceChildren(); }));
  stage.append(barre, champ);
  return etat;
}
// le nombre qui prend un point : un petit rebond (le bouton « s'enfonce » : le geste du clic, v0.41.3)
const rebond = e => jouer(e.n, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)', offset: .3 }, { transform: 'scale(.92)', offset: .65 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
const eclair = camp => jouer(camp, [{ background: P.o }, { background: P.r, offset: .2 }, { background: P.o }], { duration: 420 });
const total = g => g.reduce((s, [, p]) => s + p, 0);

// A : le tampon : « +n » se plaque sur le bouton, le nombre prend son rebond
export const gainTampon = stage => sceneGain(stage, async (e, g) => {
  const t = el('div', `position:absolute;right:48px;top:4px;padding:2px 12px;border:3px double ${P.o};color:${P.o};font-size:28px;letter-spacing:.12em;background:${P.t};transform:rotate(-7deg);pointer-events:none`, `+${total(g)}`);
  e.champ.append(t);
  const a = jouer(t, [{ opacity: 0, transform: 'rotate(-7deg) scale(2.2)' }, { opacity: 1, transform: 'rotate(-7deg) scale(1)', offset: .22 }, { opacity: 1, transform: 'rotate(-7deg) scale(1)', offset: .8 }, { opacity: 0, transform: 'rotate(-7deg) scale(1)' }], { duration: 1500, easing: 'ease-in' });
  await attendre(reduit() ? 0 : 330); e.poser(e.total + total(g)); rebond(e); eclair(e.camp);
  await (a.finished ?? attendre(0)); t.remove();
});
// B : les cachets : un par point, ils tombent du haut de l'écran sur le bouton, l'un après l'autre
export const gainCachets = stage => sceneGain(stage, async (e, g) => {
  const pts = total(g);
  for (let k = 0; k < pts; k++) {
    const c = el('div', `position:absolute;right:${40 + k * 26}px;top:12px;width:22px;height:22px;border:3px double ${P.t};background:${P.r};color:${P.t};font-size:11px;display:grid;place-items:center;pointer-events:none;box-shadow:2px 2px 0 ${P.t}`, '1');
    e.champ.append(c);
    const a = jouer(c, [{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .55 }, { transform: 'translateY(-14px)', offset: .75 }, { transform: 'translateY(0)', offset: .9 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 640, easing: 'cubic-bezier(.4,0,.8,.6)' });
    attendre(reduit() ? 0 : 400).then(() => { e.poser(e.total + 1); rebond(e); eclair(e.camp); });
    await attendre(reduit() ? 0 : 230);
    a.finished?.then(() => attendre(500)).then(() => jouer(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished).then(() => c.remove());
  }
  await attendre(reduit() ? 0 : 900);
});
// C : le fil des points : le papier de l'aube à gauche liste ses lignes ; un jeton part de chacune vers le bouton, en arc
export const gainFil = stage => sceneGain(stage, async (e, g) => {
  const lignes = [...e.aube.children].slice(1), boite = e.champ.getBoundingClientRect(), but = e.camp.getBoundingClientRect();
  const bx = but.left - boite.left + 22, by = but.top - boite.top + 22;
  let k = 0;
  for (const [, p] of g) {
    const l = lignes[k++], r = l.getBoundingClientRect(), x0 = r.right - boite.left - 12, y0 = r.top - boite.top + 8;
    for (let q = 0; q < p; q++) {
      const j = el('div', `position:absolute;left:${x0}px;top:${y0}px;width:14px;height:14px;background:${P.r};border:2px solid ${P.t};pointer-events:none`);
      e.champ.append(j);
      const arc = [{ transform: 'translate(0,0)' }, { transform: `translate(${(bx - x0) * .5}px,${Math.min(0, by - y0) - 70 - q * 14}px)`, offset: .5 }, { transform: `translate(${bx - x0}px,${by - y0}px) scale(.6)`, opacity: .9 }];
      const a = jouer(j, arc, { duration: 720, easing: 'ease-in-out', delay: q * 130 });
      a.finished?.then(() => { j.remove(); e.poser(e.total + 1); rebond(e); eclair(e.camp); });
      if (reduit()) { j.remove(); e.poser(e.total + 1); }
    }
    jouer(l, [{ opacity: 1 }, { opacity: .4 }], { duration: 300, delay: 120 });
    await attendre(reduit() ? 0 : 320);
  }
  await attendre(reduit() ? 0 : 1100);
}, { gauche: true });
// D : la ligne du registre : un bordereau glisse sous le bouton, s'écrit ligne à ligne, puis sa somme monte dans le bouton
export const gainBordereau = stage => sceneGain(stage, async (e, g) => {
  const b = el('div', `position:absolute;right:16px;top:60px;width:312px;padding:6px 12px 8px;background:${P.o};color:${P.t};box-shadow:3px 3px 0 ${P.t};transform-origin:50% 0;pointer-events:none`);
  e.champ.append(b);
  jouer(b, [{ transform: 'scaleY(.1)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
  await attendre(reduit() ? 0 : 280);
  for (const [r, p] of g) { b.append(el('div', 'display:flex;justify-content:space-between;padding:1px 0', el('span', '', r), el('b', 'font-weight:normal', `+${p}`))); jouer(b.lastChild, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 240 }); await attendre(reduit() ? 0 : 360); }
  const s = el('div', `display:flex;justify-content:space-between;margin-top:3px;padding-top:2px;border-top:2px solid ${P.t}`, el('span', '', 'Dotation'), el('b', 'font-weight:normal', `+${total(g)}`));
  b.append(s); await attendre(reduit() ? 0 : 420);
  const a = jouer(s.lastChild, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-70px) scale(1.4)', opacity: 0 }], { duration: 520, easing: 'ease-in' });
  await attendre(reduit() ? 0 : 420); e.poser(e.total + total(g)); rebond(e); eclair(e.camp);
  await (a.finished ?? attendre(0));
  await attendre(reduit() ? 0 : 500);
  await (jouer(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 320 }).finished ?? attendre(0)); b.remove();
});

// ─── La partie gagnée ───
// Un champ plein, le ton du jeu : pas de confettis. `ecrit` : la ligne du papier de fin ; chaque variante la pose à sa façon.
function sceneVictoire(stage, jouerScene, { titre = 'Le secteur est tenu.', sous = 'Neuf jours de bataille. 1 214 des nôtres sont tombés, 2 031 en face.' } = {}) {
  const champ = el('div', `position:relative;height:min(66vh,520px);overflow:hidden;background:${P.t};${MONO}color:${P.o}`);
  const bar = el('div', 'margin:0 0 10px');
  const rejouer = () => { champ.replaceChildren(); jouerScene(champ, { titre, sous }); };
  bar.append(bouton('Rejouer', rejouer));
  stage.append(bar, champ);
  rejouer();
}
const papierFin = (titre, sous) => el('div', `position:absolute;left:50%;bottom:36px;width:min(46ch,86%);transform:translateX(-50%);padding:14px 18px;background:${P.o};color:${P.t};box-shadow:3px 3px 0 ${P.s};text-align:center`,
  el('div', `font-size:20px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px`, titre), el('div', `color:${P.g};font-size:13px`, sous));
const sol = (h = 30) => [el('div', `position:absolute;left:0;right:0;bottom:0;height:${h}%;background:${P.s}`), el('div', `position:absolute;left:0;right:0;bottom:${h}%;height:2px;background:${P.b}`)];

// A : le fanion hissé : un mât, la toile monte en trois temps (à la hampe), puis flotte
export const victoireFanion = stage => sceneVictoire(stage, (champ, { titre, sous }) => {
  champ.append(...sol(26));
  const mat = el('div', `position:absolute;left:50%;bottom:26%;width:4px;height:62%;background:${P.r};transform:translateX(-50%)`);
  const toile = svg('0 0 80 48', `position:absolute;left:calc(50% + 2px);bottom:calc(26% + 56%);width:80px;height:48px;transform-origin:0 50%`, `<polygon points="0,0 80,10 62,24 80,38 0,48" fill="${P.n}"/><rect x="0" y="0" width="6" height="48" fill="${P.o}"/>`);
  champ.append(mat, toile);
  jouer(toile, [{ bottom: 'calc(26% + 2%)' }, { bottom: 'calc(26% + 56%)' }], { duration: 2400, easing: 'steps(12, end)' });
  const vent = jouer(toile, [{ transform: 'skewY(0deg) scaleX(1)' }, { transform: 'skewY(4deg) scaleX(.94)' }, { transform: 'skewY(-3deg) scaleX(1)' }, { transform: 'skewY(0deg) scaleX(1)' }], { duration: 2600, delay: 2400, iterations: 3, easing: 'ease-in-out' });
  const p = papierFin(titre, sous); champ.append(p);
  jouer(p, [{ opacity: 0, transform: 'translate(-50%, 24px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 600, delay: reduit() ? 0 : 2200, easing: 'ease-out' });
  return vent;
});
// B : le tampon : « TENU » claque sur le papier du rapport, il tremble une fois
export const victoireTampon = stage => sceneVictoire(stage, (champ, { titre, sous }) => {
  const feuille = el('div', `position:absolute;left:50%;top:50%;width:min(52ch,88%);transform:translate(-50%,-50%) rotate(-1deg);padding:24px 26px 84px;background:${P.o};color:${P.t};box-shadow:4px 4px 0 ${P.s}`,
    el('div', `letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid ${P.g};padding-bottom:4px;margin-bottom:10px`, 'Rapport du neuvième soir'), el('div', 'font-size:16px;margin-bottom:6px', titre), el('div', `color:${P.g}`, sous), el('div', `color:${P.g};margin-top:14px`, 'Secteur 3 · mission : tenir · 9 jours sur 9'));
  const t = el('div', `position:absolute;right:26px;bottom:20px;padding:2px 18px;border:5px double ${P.t};color:${P.t};font-size:44px;letter-spacing:.18em;text-transform:uppercase;transform:rotate(-9deg);opacity:0`, 'Tenu');
  feuille.append(t); champ.append(feuille);
  jouer(feuille, [{ transform: 'translate(-50%,-50%) rotate(-1deg)' }, { transform: 'translate(-50%,-50%) rotate(-1deg)', offset: .5 }, { transform: 'translate(-50%,-48%) rotate(-1.4deg)', offset: .56 }, { transform: 'translate(-50%,-51%) rotate(-.8deg)', offset: .62 }, { transform: 'translate(-50%,-50%) rotate(-1deg)' }], { duration: 1800 });
  jouer(t, [{ opacity: 0, transform: 'rotate(-9deg) scale(3)' }, { opacity: 0, transform: 'rotate(-9deg) scale(3)', offset: .45 }, { opacity: 1, transform: 'rotate(-9deg) scale(1)', offset: .55 }, { opacity: 1, transform: 'rotate(-9deg) scale(1)' }], { duration: 1800, easing: 'ease-in' });
});
// C : les chevrons : trois chevrons s'allument un à un sous un ciel qui s'éclaircit ; le papier les suit
export const victoireChevrons = stage => sceneVictoire(stage, (champ, { titre, sous }) => {
  const ciel = el('div', `position:absolute;inset:0 0 30% 0;background:${P.s}`); champ.append(ciel, ...sol(30));
  jouer(ciel, [{ background: P.s }, { background: P.b }, { background: P.g }], { duration: 3600, easing: 'steps(6, end)' });
  const rang = el('div', 'position:absolute;left:50%;top:22%;transform:translateX(-50%);display:flex;gap:18px');
  for (let k = 0; k < 3; k++) {
    const c = svg('0 0 12 8', `width:72px;height:48px;fill:none;stroke:${P.n};stroke-width:2;stroke-linecap:square`, '<polyline points="1,7 6,2 11,7"/>'); rang.append(c);
    jouer(c, [{ opacity: .15, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: 500 + k * 700, easing: 'ease-out' });
  }
  champ.append(rang);
  const p = papierFin(titre, sous); champ.append(p);
  jouer(p, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: reduit() ? 0 : 2800 });
});
// D : le lever du jour : le soleil (un disque d'os) monte derrière la silhouette d'une tranchée ; le texte s'écrit
export const victoireAube = stage => sceneVictoire(stage, (champ, { titre, sous }) => {
  const ciel = el('div', `position:absolute;inset:0 0 28% 0;background:${P.s}`);
  const astre = el('div', `position:absolute;left:50%;bottom:28%;width:90px;height:90px;margin-left:-45px;border-radius:50%;background:${P.o}`);
  champ.append(ciel, astre);
  jouer(ciel, [{ background: P.s }, { background: P.g }], { duration: 3800, easing: 'steps(8, end)' });
  jouer(astre, [{ transform: 'translateY(100px)' }, { transform: 'translateY(-70px)' }], { duration: 3800, easing: 'steps(30, end)' });
  // la silhouette : la tranchée et ses sacs, une crête de terre
  const crete = svg('0 0 400 40', `position:absolute;left:0;bottom:0;width:100%;height:32%`, `<path d="M0 40 V22 L30 20 L44 14 L70 16 L96 22 L140 18 L170 10 L210 14 L250 20 L300 15 L340 18 L400 12 V40 Z" fill="${P.t}"/>`);
  crete.setAttribute('preserveAspectRatio', 'none'); champ.append(crete);
  const t = el('div', `position:absolute;left:0;right:0;top:16%;text-align:center;font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:${P.t}`, '');
  const sub = el('div', `position:absolute;left:0;right:0;top:calc(16% + 36px);text-align:center;color:${P.t}`, sous);
  champ.append(t, sub);
  jouer(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: reduit() ? 0 : 3000 });
  // le titre s'écrit lettre à lettre
  if (reduit()) t.textContent = titre; else [...titre].forEach((c, k) => setTimeout(() => { if (t.isConnected) t.textContent += c; }, 1800 + k * 60));
});

// ─── La fiche de fin de journée ───
// Les mêmes données d'exemple pour toutes les variantes : celles que `hud/nuit.js` lit de l'état (les morts du jour, les lignes, les avions, le ciel, la réserve, les régiments et leur corvée)
const JOUR = {
  nuit: 'Nuit du 3e au 4e jour',
  morts: [212, 305], lignes: ['pris 2 tronçons', 'perdu 1 tronçon'], avions: '3 sorties, 1 avion abattu. Il en reste 2, réparés cette nuit.',
  demain: 'du brouillard', ciel: 'Premier quartier, ciel couvert', reserve: 3, points: 4,
  regiments: [
    ['Porphyre', 'Repos', false, 'tient', 41], ['Protogyne', 'Au contact de l\'ennemi', null, 'ébranlé', 38], ['Céruléen', 'Ravitailler', true, 'tient', 52], ['Viride', 'Repos', false, 'tient', 49],
    ['Syzygie', 'La relève', true, 'ébranlé', 27], ['Murmuration', 'Évacuer les blessés', true, 'tient', 44], ['Hapax', 'Repos', false, 'tient', 56], ['Sinople', 'Repos', false, 'en déroute', 19],
  ],
};
const gardes = JOUR.regiments.filter(r => r[2] === false).map(r => r[0]);      // les ordres que le joueur n'a pas modifiés cette nuit : ils gardent la dernière corvée (ou le repos)
const feuille = (css, ...kids) => el('div', `${MONO}background:${P.o};color:${P.t};box-shadow:4px 4px 0 ${P.s};padding:20px 24px;${css}`, ...kids);
const titreFiche = (t, css = '') => el('div', `font-size:16px;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid ${P.g};padding-bottom:4px;margin-bottom:10px;${css}`, t);
const etiquette = t => el('div', `color:${P.g};font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:12px 0 3px`, t);
const ligne = (a, b, css = '') => el('div', `display:flex;justify-content:space-between;gap:12px;padding:2px 0;${css}`, el('span', '', a), el('b', 'font-weight:normal', b));
const aLaube = () => el('button', `${MONO}display:block;width:100%;height:44px;margin-top:14px;color:${P.o};background:${P.t};border:0;border-bottom:4px solid ${P.g};cursor:pointer;font-size:16px`, 'À l\'aube');
const centre = (...kids) => el('div', `display:grid;place-items:center;min-height:min(70vh,560px);background:${P.t};padding:18px`, ...kids);
const pastille = (t, plein = false) => el('span', `display:inline-block;padding:0 6px;border:1px ${plein ? 'solid' : 'dashed'} ${plein ? P.t : P.g};${plein ? `background:${P.t};color:${P.o}` : `color:${P.g}`};font-size:12px`, t);
const humeur = h => h === 'tient' ? '' : h === 'ébranlé' ? '!' : '!!';
const bilanJour = () => [
  ligne('Nos morts', String(JOUR.morts[0])), ligne('Leurs morts', String(JOUR.morts[1])),
  etiquette('Les lignes'), el('div', '', `Nous avons ${JOUR.lignes[0]} et ${JOUR.lignes[1]}.`),
  etiquette('Le ciel'), el('div', '', `${JOUR.avions}`), el('div', `color:${P.g}`, `Demain : ${JOUR.demain}. ${JOUR.ciel}.`),
];
const listeGardes = () => el('div', `border:1px dashed ${P.g};padding:8px 10px;margin:0 0 6px`, el('div', 'margin-bottom:3px', `${gardes.length} régiments gardent leur ordre d'hier :`), el('div', '', ...gardes.map((g, k) => el('span', '', (k ? ', ' : '') + g))), el('div', `color:${P.g};font-size:12px;margin-top:3px`, 'Un clic sur un régiment pour changer sa corvée.'));

// A : deux colonnes : à gauche le jour (ce qui s'est passé), à droite la nuit (ce qu'on décide), le bouton en bas à droite
export const ficheDeuxColonnes = stage => stage.append(centre(feuille('width:min(92ch,96%)',
  titreFiche(JOUR.nuit, 'font-size:20px'),
  el('div', 'display:grid;grid-template-columns:1fr 1.3fr;gap:28px',
    el('div', `padding-right:24px;border-right:1px solid ${P.g}`, el('div', `color:${P.g};letter-spacing:.08em;text-transform:uppercase;font-size:12px;margin-bottom:6px`, 'Le jour'), ...bilanJour(), etiquette('La réserve'), el('div', '', `${JOUR.reserve} régiments frais.`), etiquette('La dotation'), el('div', '', `${JOUR.points} points en caisse.`)),
    el('div', '', el('div', `color:${P.g};letter-spacing:.08em;text-transform:uppercase;font-size:12px;margin-bottom:6px`, 'La nuit : les ordres'), listeGardes(),
      ...JOUR.regiments.filter(r => r[2] !== false).map(r => ligne(`${r[0]}${humeur(r[3]) ? ` ${humeur(r[3])}` : ''}`, r[1], r[2] === null ? `color:${P.g}` : ''))
    )),
  aLaube())));

// B : une colonne en trois étages : le résultat en grands chiffres, ce qu'il reste à décider, le détail
export const ficheEtages = stage => stage.append(centre(feuille('width:min(58ch,96%)',
  titreFiche(JOUR.nuit, 'font-size:20px'),
  el('div', `display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:12px`,
    ...[['nos morts', JOUR.morts[0]], ['leurs morts', JOUR.morts[1]], ['tronçons', '+2 −1']].map(([a, b]) => el('div', `border:1px solid ${P.g};padding:8px 4px`, el('div', 'font-size:28px;line-height:1.1', String(b)), el('div', `color:${P.g};font-size:12px`, a)))),
  etiquette('À décider cette nuit'), listeGardes(), el('div', `color:${P.g}`, `${JOUR.points} points de dotation en caisse ; ${JOUR.reserve} régiments frais en réserve.`),
  etiquette('Le détail du jour'), el('div', `color:${P.g}`, `${JOUR.avions} Demain : ${JOUR.demain}. ${JOUR.ciel}.`),
  aLaube())));

// C : le registre : une ligne par régiment (état, ordre de la nuit), les ordres inchangés en pointillé ; le résumé du jour dans la marge du haut
export const ficheRegistre = stage => stage.append(centre(feuille('width:min(86ch,96%)',
  titreFiche(JOUR.nuit, 'font-size:20px'),
  el('div', `display:flex;gap:18px;flex-wrap:wrap;color:${P.g};margin-bottom:10px`, `Morts : ${JOUR.morts[0]} des nôtres, ${JOUR.morts[1]} en face`, `Lignes : +2 / −1`, `Demain : ${JOUR.demain}`, `Réserve : ${JOUR.reserve}`, `Dotation : ${JOUR.points} pts`),
  el('div', `display:grid;grid-template-columns:2.4ch 14ch 1fr 20ch;gap:4px 12px;align-items:center;border-top:1px solid ${P.g};padding-top:6px`,
    ...['', 'Régiment', 'Hommes', 'Ordre de la nuit'].map(t => el('div', `color:${P.g};font-size:12px;letter-spacing:.08em;text-transform:uppercase`, t)),
    ...JOUR.regiments.flatMap((r, k) => [el('b', 'font-weight:normal', String(k + 1)), el('span', '', `${r[0]}${humeur(r[3]) ? ` ${humeur(r[3])}` : ''}`),
      el('span', `display:block;height:8px;border:1px solid ${P.t}`, el('i', `display:block;height:100%;width:${r[4]}%;background:${P.t}`)),
      r[2] === false ? pastille(`${r[1]} · inchangé`) : r[2] === null ? pastille(r[1], true) : pastille(r[1], true)])),
  el('div', `color:${P.g};font-size:12px;margin-top:8px`, `En pointillé : ${gardes.length} ordres inchangés (${gardes.join(', ')}).`),
  aLaube())));

// D : « d'abord » : ce qu'il faut faire en haut, en gros ; le compte rendu du jour en dessous, lisible mais en retrait
export const ficheDAbord = stage => stage.append(centre(feuille('width:min(62ch,96%);padding:0',
  el('div', `background:${P.b};color:${P.o};padding:14px 24px`, el('div', 'font-size:20px;letter-spacing:.08em;text-transform:uppercase', JOUR.nuit), el('div', `color:${P.r}`, `${JOUR.points} points de dotation · ${JOUR.reserve} régiments frais en réserve`)),
  el('div', 'padding:16px 24px 20px',
    el('div', 'font-size:16px;margin-bottom:6px', `${gardes.length} régiments n'ont pas d'ordre nouveau`), el('div', `color:${P.g};margin-bottom:8px`, 'Ils gardent celui d\'hier (le repos le plus souvent) :'),
    el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px', ...gardes.map(g => pastille(g))),
    el('div', `border-top:1px solid ${P.g};padding-top:8px;color:${P.t}`, el('div', `color:${P.g};letter-spacing:.08em;text-transform:uppercase;font-size:12px;margin-bottom:4px`, 'Ce que le jour a coûté'), ligne('Nos morts · leurs morts', `${JOUR.morts[0]} · ${JOUR.morts[1]}`), ligne('Les lignes', 'pris 2, perdu 1'), el('div', `color:${P.g}`, `${JOUR.avions} Demain : ${JOUR.demain}.`)),
    aLaube()))));
