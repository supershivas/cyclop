// Le sujet « Les cartes du soir » du labo (Jérôme, 26 nov. ; docs/chantiers/cartes-wtf.md). Une maquette : rien n'est en jeu.
// La proposition : à chaque tirage, on choisit entre trois paquets (trois familles de cartes) ; un paquet tient 3 à 5 cartes (hasard) ;
// une carte existe en plusieurs raretés, et sa rareté change ses valeurs (commun, rare, mythique). Les termes du jeu sont soulignés et
// s'expliquent au survol (la bulle et la place de son image : le glossaire du document).
// Trois façons de dessiner le paquet, trois ouvertures, trois façons de dessiner la carte. Couleurs : la palette du jeu, plus celles des raretés
// (l'exception des objets parachutés, RARETES_COULEURS) et la brillance du mythique. `prefers-reduced-motion` : tout est posé d'un coup.
import { PALETTE as P, RARETES_COULEURS as RC, RARETES_BRILLANCE } from './palette.js?v=0.170.2';
import { RARETES } from './data/largages.js?v=0.170.2';

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null)); return e; };
const bouton = (texte, f) => { const b = el('button', 'essai', texte); b.type = 'button'; b.onclick = f; return b; };

// ─── Les données de l'exemple ───────────────────────────────────────────────────────────────────────
// Les trois raretés d'une carte (commun, moyen, extrêmement rare) : celles des largages
export const TIERS = ['commun', 'rare', 'relique'];
const NOM_TIER = t => RARETES[t].nom;
const CRANS = { commun: 1, rare: 2, relique: 3 };

export const FAMILLES = {
  musette: { nom: 'La musette', icone: '✹', dit: 'des obus à viser' },
  hommes:  { nom: 'Les hommes', icone: 'R', dit: 'nos régiments' },
  engins:  { nom: 'Les engins', icone: 'C', dit: 'chars, avions, armes' },
};

// `[[terme]]` : un terme du glossaire, souligné, expliqué au survol. `chiffre` : la valeur qui change avec la rareté, en gros.
export const CARTES = {
  depot: { nom: 'Le dépôt', famille: 'musette', r: {
    commun:  { chiffre: '24', unite: 'obus de 75', effet: 'Chaque matin, une [[salve de 75]] dans la [[musette]]' },
    rare:    { chiffre: '12', unite: 'obus de 155', effet: 'Chaque matin, un [[barrage de 155]] dans la [[musette]]' },
    relique: { chiffre: '2×6', unite: 'obus de 220', effet: 'Le matin et à midi, un [[barrage de 220]] dans la [[musette]]' } } },
  roulant: { nom: 'Le barrage roulant', famille: 'musette', r: {
    commun:  { chiffre: '3', unite: 'salves', effet: 'Chaque midi, un [[barrage roulant]] de trois salves' },
    rare:    { chiffre: '5', unite: 'salves', effet: 'Chaque midi, un [[barrage roulant]] de cinq salves' },
    relique: { chiffre: '2×5', unite: 'salves', effet: 'Le matin et à midi, un [[barrage roulant]] de cinq salves' } } },
  quatreCents: { nom: 'Le 400 de Douaumont', famille: 'musette', r: {
    commun:  { chiffre: '6', unite: 'obus de 220', effet: 'Une fois par partie, un [[barrage de 220]] dans la [[musette]]' },
    rare:    { chiffre: '12', unite: 'obus de 220', effet: 'Une fois par partie, deux barrages de 220 au même endroit' },
    relique: { chiffre: '24', unite: 'obus de 220', effet: 'Une fois par partie, l\'[[obus de 400]]' } } },
  renforts: { nom: 'Les renforts du soir', famille: 'hommes', r: {
    commun:  { chiffre: '10', unite: 'hommes', effet: 'Chaque soir, une [[demi-section]] rejoint notre régiment le plus éprouvé' },
    rare:    { chiffre: '20', unite: 'hommes', effet: 'Chaque soir, une section rejoint notre régiment le plus éprouvé' },
    relique: { chiffre: '40', unite: 'hommes', effet: 'Chaque soir, une compagnie rejoint notre régiment le plus éprouvé' } } },
  clairon: { nom: 'Le clairon', famille: 'hommes', r: {
    commun:  { chiffre: '2 h', unite: 'de charge', effet: 'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]]' },
    rare:    { chiffre: '4 h', unite: 'de charge', effet: 'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]]' },
    relique: { chiffre: '2×4 h', unite: 'de charge', effet: 'Chaque matin, les deux premiers régiments ont le [[clairon]] ; ils sont [[sans peur]]' } } },
  flammes: { nom: 'Le lance-flammes', famille: 'hommes', r: {
    commun:  { chiffre: '1', unite: 'homme', effet: 'Au [[premier assaut du jour]], un homme reçoit un [[lance-flammes]] pendant 1 h' },
    rare:    { chiffre: '2', unite: 'hommes', effet: 'Au [[premier assaut du jour]], deux hommes reçoivent un [[lance-flammes]]' },
    relique: { chiffre: '3', unite: 'hommes', effet: 'À chaque assaut, trois hommes reçoivent un [[lance-flammes]]' } } },
  cheddite: { nom: 'La cheddite', famille: 'engins', r: {
    commun:  { chiffre: '60', unite: 'm de fil', effet: 'Chaque matin, leur [[fil de fer]] saute devant notre régiment le plus avancé' },
    rare:    { chiffre: '120', unite: 'm de fil', effet: 'Chaque matin, leur [[fil de fer]] saute devant notre régiment le plus avancé' },
    relique: { chiffre: 'tout', unite: 'le front', effet: 'Chaque matin, leur [[fil de fer]] saute devant toute notre [[première ligne]]' } } },
  mecano: { nom: 'Le mécanicien', famille: 'engins', r: {
    commun:  { chiffre: '1', unite: 'char', effet: 'Chaque matin, un de nos [[chars]] est réparé' },
    rare:    { chiffre: 'tous', unite: 'nos chars', effet: 'Chaque matin, tous nos [[chars]] sont réparés' },
    relique: { chiffre: '2×', unite: 'par jour', effet: 'Le matin et à midi, tous nos [[chars]] sont réparés' } } },
  aasen: { nom: 'Les bombes Aasen', famille: 'engins', r: {
    commun:  { chiffre: '2', unite: 'bombes', effet: 'À chaque vol de nos avions, deux [[bombes Aasen]]' },
    rare:    { chiffre: '4', unite: 'bombes', effet: 'À chaque vol de nos avions, quatre [[bombes Aasen]]' },
    relique: { chiffre: '8', unite: 'bombes', effet: 'À chaque vol de nos avions, huit [[bombes Aasen]]' } } },
};

// La bulle de chaque terme et la description de son image (docs/chantiers/cartes-wtf.md, « Le glossaire du survol »)
export const GLOSSAIRE = {
  'musette': ['Ce que vous gardez pour plus tard : 3 objets au plus, lancés avec les touches 7, 8, 9 puis un clic sur le terrain', 'les trois emplacements de la musette au-dessus du râtelier'],
  'salve de 75': ['24 petits obus en quelques secondes, là où l\'on clique ; tue les hommes à découvert, abîme peu les tranchées', 'zoom 4 : une salve sur des hommes à découvert'],
  'barrage de 155': ['12 obus moyens ; creuse le sol, abîme les tranchées', 'zoom 4 : des cratères moyens dans le parapet'],
  'barrage de 220': ['6 gros obus ; chacun crève une tranchée et laisse un cratère', 'zoom 4 : une tranchée coupée par un grand cratère'],
  'barrage roulant': ['Des salves de 75 qui avancent de 30 m toutes les 8 s ; une troupe qui marche juste derrière arrive sur des tranchées sonnées', 'zoom 2 : trois lignes d\'explosions, un régiment derrière'],
  'obus de 400': ['L\'obus mythique : quatre barrages de 220 au même endroit', 'zoom 2 : un trou béant au milieu des lignes'],
  'demi-section': ['Dix hommes ; une section en fait vingt, une compagnie quarante', 'planche : 10, 20, 40 silhouettes en rang'],
  'clairon': ['Le régiment court une fois et demie plus vite et n\'a plus peur', 'zoom 4 : un régiment qui charge, l\'icône du clairon'],
  'sans peur': ['Le régiment ne recule jamais sous le feu et ne part pas en déroute', 'la barre de moral d\'un régiment, verrouillée'],
  'premier assaut du jour': ['Le premier régiment envoyé, ce jour-là, au-delà de notre première ligne', 'schéma : la flèche d\'un régiment qui franchit notre ligne'],
  'lance-flammes': ['Le lance-flammes Schilt, l\'arme française de 1915 : un jet de feu à 15 m ; ceux d\'en face brûlent ou fuient', 'zoom 8 : un homme qui crache le feu dans une tranchée'],
  'fil de fer': ['Les barbelés devant leurs tranchées : un homme qui les traverse va au pas, à découvert', 'zoom 8 : les barbelés, une brèche ouverte'],
  'première ligne': ['La tranchée la plus proche de l\'ennemi', 'zoom 2 : notre tranchée la plus avancée, entourée'],
  'chars': ['Nos chars FT : on les envoie depuis le parc vers leurs lignes ; ils tirent au canon', 'zoom 8 : un char FT qui avance'],
  'bombes Aasen': ['Des bombes à main lâchées par nos aviateurs (comme des obus de 155)', 'zoom 4 : un avion qui lâche ses bombes'],
};

// Les trois paquets d'un tirage, et le contenu de chacun (exemple fixe : 3, 4 et 5 cartes ; en jeu, tiré de la graine)
export const TIRAGE = [
  { famille: 'musette', cartes: [['depot', 'commun'], ['roulant', 'rare'], ['depot', 'commun']] },
  { famille: 'hommes', cartes: [['renforts', 'commun'], ['clairon', 'commun'], ['flammes', 'rare'], ['renforts', 'relique']] },
  { famille: 'engins', cartes: [['cheddite', 'commun'], ['mecano', 'commun'], ['aasen', 'rare'], ['cheddite', 'rare'], ['aasen', 'relique']] },
];

// ─── L'inclinaison au survol : l'objet penche vers le curseur, un reflet suit (--mx, --my) ─────────
// Le cadre est mesuré à l'entrée du curseur (avant l'inclinaison) : sinon il bouge avec elle et l'objet tremble.
export function inclinable(e, max = 16) {
  let r = null;
  e.classList.add('cs-incl');
  const poser = ev => {
    if (e.dataset.fige || reduit()) return;
    r ??= e.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    e.style.transform = `perspective(800px) rotateX(${((0.5 - y) * max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg) scale(1.05)`;
    e.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); e.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    e.classList.add('is-survol');
  };
  e.addEventListener('pointerenter', ev => { r = null; poser(ev); });
  e.addEventListener('pointermove', poser);
  e.addEventListener('pointerleave', () => { r = null; if (e.dataset.fige) return; e.style.transform = ''; e.classList.remove('is-survol'); });
  return e;
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// ─── Le style (une feuille pour tout le sujet) ─────────────────────────────────────────────────────
const [M0, M1] = RARETES_BRILLANCE.relique;
// Le booster : brillant (des bandes de reflet aux tons de la palette, un éclat d'os qui suit le curseur), dentelé en haut et en bas, la bande du haut se déchire.
// Le foil du mythique : des bandes rouge et rose (la brillance du mythique, RARETES_BRILLANCE) et des paillettes d'os, qui glissent avec le curseur.
const W_BO = 184, H_BO = 292, H_HAUT = 34;
const dents = (n, h, enHaut) => {     // un bord dentelé (clip-path) : n dents de h px, en haut ou en bas
  const pts = [];
  for (let i = 0; i <= n * 2; i++) { const x = (i / (n * 2) * 100).toFixed(2); pts.push(enHaut ? `${x}% ${i % 2 ? 0 : h}px` : `${x}% calc(100% - ${i % 2 ? 0 : h}px)`); }
  return enHaut ? `polygon(${pts.join(',')},100% 100%,0 100%)` : `polygon(0 0,100% 0,${pts.reverse().join(',')})`;
};
const CSS_BOOSTER = `
.cs-incl{transition:transform .14s ease-out;will-change:transform;transform-origin:50% 50%}
.cs-reflet{position:absolute;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .2s;
  background:radial-gradient(circle at var(--mx,50%) var(--my,50%),${rgba(P.o, .5)},transparent 55%);mix-blend-mode:soft-light}
.is-survol>.cs-reflet{opacity:1}
.cs-foil{position:absolute;inset:0;pointer-events:none;z-index:3;mix-blend-mode:hard-light;opacity:.42;
  background:repeating-linear-gradient(115deg,transparent 0 6%,${rgba(M0, .75)} 9%,${rgba(P.o, .85)} 12%,${rgba(M1, .75)} 15%,transparent 19% 26%),
    radial-gradient(circle,${rgba(P.o, .95)} 0 .8px,transparent 1.4px) 0 0/7px 7px;
  background-size:300% 300%,7px 7px;background-position:var(--mx,50%) var(--my,50%),0 0;animation:cs-foil 7s linear infinite alternate}
.is-survol>.cs-foil{animation:none;opacity:.6}
@keyframes cs-foil{from{background-position:0% 30%,0 0}to{background-position:100% 70%,0 0}}
.bo{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px}
.bo:focus-visible .bo-corps{outline:2px solid ${P.n};outline-offset:6px}
.bo .cs-nom{font-weight:600}.bo .cs-nb{color:${P.r};font-size:12px}
.bo.is-on .cs-nom{color:${P.n}}
.bo-corps{position:relative;width:${W_BO}px;height:${H_BO}px;filter:drop-shadow(0 8px 6px rgba(0,0,0,.5))}
.bo-metal{background:linear-gradient(160deg,var(--fam) 0%,${P.s} 38%,${P.b} 55%,var(--fam) 78%,${P.s} 100%)}
.bo-metal::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(115deg,transparent 30%,${rgba(P.o, .28)} 44%,transparent 52%,${rgba(P.o, .12)} 60%,transparent 68%);
  background-size:260% 100%;background-position:var(--mx,30%) 0;animation:bo-lustre 5s ease-in-out infinite alternate}
.bo.is-survol .bo-metal::after,.bo-corps.is-survol .bo-metal::after{animation:none}
@keyframes bo-lustre{from{background-position:0% 0}to{background-position:100% 0}}
.bo-haut{position:absolute;left:0;right:0;top:0;height:${H_HAUT}px;z-index:3;clip-path:${dents(18, 5, true)};transform-origin:100% 100%}
.bo-haut::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,${rgba(P.t, .28)} 0 2px,transparent 2px 5px)}
.bo-haut span{position:absolute;left:8px;bottom:3px;font-size:9px;letter-spacing:.1em;color:${P.o};opacity:.8;z-index:1}
.bo-face{position:absolute;left:0;right:0;top:${H_HAUT}px;bottom:0;z-index:2;clip-path:${dents(18, 5, false)};overflow:hidden}
.bo-face::before{content:"";position:absolute;left:0;right:0;bottom:0;height:26px;background:repeating-linear-gradient(90deg,${rgba(P.t, .28)} 0 2px,transparent 2px 5px)}
.bo-pointilles{position:absolute;left:0;right:0;top:${H_HAUT - 1}px;height:0;border-top:2px dashed ${rgba(P.o, .45)};z-index:4;pointer-events:none}
.bo-logo{position:absolute;top:12px;left:0;right:0;text-align:center;font-weight:800;letter-spacing:.22em;font-size:15px;color:${P.o};text-shadow:0 2px 0 ${P.t};z-index:1}
.bo-medaillon{position:absolute;left:50%;top:48px;width:118px;height:118px;margin-left:-59px;border-radius:50%;display:grid;place-items:center;z-index:1;
  background:repeating-conic-gradient(${rgba(P.o, .16)} 0 6deg,transparent 6deg 15deg),radial-gradient(circle,var(--fam) 0 48%,${P.s} 49% 52%,transparent 53%);
  box-shadow:inset 0 0 0 3px ${rgba(P.o, .35)}}
.bo-medaillon i{font-style:normal;font-size:52px;line-height:1;color:${P.t};text-shadow:0 1px 0 ${rgba(P.o, .5)}}
.bo-bandeau{position:absolute;left:-6px;right:-6px;top:176px;background:${P.o};color:${P.t};text-align:center;font-weight:800;letter-spacing:.12em;font-size:13px;padding:5px 0;z-index:1;
  transform:rotate(-4deg);box-shadow:0 3px 0 ${P.t}}
.bo-info{position:absolute;left:0;right:0;bottom:32px;text-align:center;font-size:10px;color:${P.o};letter-spacing:.08em;z-index:1}
.bo-cartes{position:absolute;inset:0;z-index:1}
.bo-cartes .cs-carte{position:absolute;left:${(W_BO - 150) / 2}px;top:${H_HAUT + 14}px}
.bo-dechirure{position:absolute;left:0;top:${H_HAUT - 2}px;height:3px;width:0;background:${P.t};z-index:5;pointer-events:none}
.bo-table{position:relative;height:580px;overflow:hidden}
.bo-table>.bo{position:absolute;left:50%;top:276px;margin-left:-${W_BO / 2}px}
.bo-place{position:absolute;left:0;top:0}
.cs-eclat{z-index:6}
@media (prefers-reduced-motion: reduce){.cs-foil,.bo-metal::after{animation:none}.cs-incl{transition:none}}
`;
const CSS = `
.cs{font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;color:${P.o};background:${P.s};padding:20px;min-height:100%;box-sizing:border-box;position:relative}
.cs h3{margin:0 0 4px;font-size:15px;font-weight:600;letter-spacing:.04em}
.cs .cs-sous{color:${P.r};margin:0 0 16px}
.cs-rang{display:flex;flex-wrap:wrap;gap:22px;align-items:flex-end;justify-content:center;margin:10px 0 18px}
.cs .labo-x,.cs button.essai{color:${P.t}}
.cs button.essai[aria-pressed=true]{background:${P.n};border-color:${P.n}}
.cs-pied{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px}
.cs-legende{text-align:center;color:${P.r};margin-top:8px;font-size:12px}
.cs-terme{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px;cursor:help}
.cs-bulle{position:fixed;z-index:50;max-width:260px;background:${P.t};color:${P.o};border:1px solid ${P.g};padding:8px;font-size:12px;pointer-events:none;box-shadow:0 4px 0 rgba(0,0,0,.4)}
.cs-bulle b{display:block;margin-bottom:4px}
.cs-bulle .cs-img{border:1px dashed ${P.g};color:${P.r};padding:14px 6px;margin-bottom:6px;text-align:center;font-size:11px;background:${P.s}}
/* le paquet : un bouton (on le choisit) */
.cs-paquet{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:transform .15s}
.cs-paquet:hover,.cs-paquet:focus-visible{transform:translateY(-6px)}
.cs-paquet:focus-visible{outline:2px solid ${P.n};outline-offset:6px}
.cs-paquet .cs-nom{font-weight:600}
.cs-paquet .cs-nb{color:${P.r};font-size:12px}
.cs-paquet.is-on .cs-nom{color:${P.n}}
/* A · le paquet ficelé : la pile (une tranche par carte), la ficelle, l'étiquette */
.cs-pile{position:relative;width:132px;height:184px}
.cs-dos{position:absolute;inset:0;background:${P.b};border:2px solid ${P.t};border-radius:6px;
  background-image:repeating-linear-gradient(45deg,rgba(228,223,208,.07) 0 2px,transparent 2px 8px)}
.cs-ficelle-h,.cs-ficelle-v{position:absolute;background:${P.h};box-shadow:0 1px 0 ${P.t}}
.cs-ficelle-h{left:-4px;right:-4px;top:50%;height:3px}
.cs-ficelle-v{top:-4px;bottom:-4px;left:50%;width:3px}
.cs-etiquette{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg);background:${P.o};color:${P.t};padding:6px 10px;border-radius:2px;text-align:center;box-shadow:0 2px 0 ${P.t}}
.cs-etiquette i{font-style:normal;font-size:22px;display:block;line-height:1}
/* B · l'enveloppe et son cachet */
.cs-enveloppe{position:relative;width:184px;height:124px;background:${P.o};border-radius:3px;box-shadow:0 3px 0 ${P.t};perspective:600px}
.cs-enveloppe::before{content:"";position:absolute;inset:0;background:linear-gradient(150deg,transparent 49%,rgba(22,19,15,.18) 50%,transparent 51%),linear-gradient(30deg,transparent 49%,rgba(22,19,15,.18) 50%,transparent 51%)}
.cs-rabat{position:absolute;left:0;right:0;top:0;height:70px;transform-origin:top;background:${P.r};clip-path:polygon(0 0,100% 0,50% 100%);z-index:2}
.cs-cachet{position:absolute;left:50%;top:58px;width:38px;height:38px;margin-left:-19px;border-radius:50%;background:${P.b};color:${P.o};display:grid;place-items:center;font-size:18px;z-index:3;
  box-shadow:inset 0 0 0 3px ${P.s},0 2px 0 ${P.t}}
.cs-tranche{position:absolute;bottom:-4px;left:6px;right:6px;height:4px;background:${P.r};border-radius:0 0 3px 3px}
/* C · la caisse de largage */
.cs-caisse{position:relative;width:170px;height:130px;background:${P.g};border:3px solid ${P.b};box-sizing:border-box;
  background-image:repeating-linear-gradient(0deg,transparent 0 30px,${P.b} 30px 32px)}
.cs-caisse::after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(to top right,transparent 48%,${P.b} 48% 52%,transparent 52%)}
.cs-couvercle{position:absolute;left:-8px;right:-8px;top:-16px;height:16px;background:${P.b};border:2px solid ${P.s};box-sizing:border-box;z-index:2}
.cs-pochoir{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${P.o};font-weight:700;letter-spacing:.1em;z-index:2;text-shadow:0 1px 0 ${P.t}}
.cs-pochoir i{font-style:normal;display:block;font-size:24px}
/* la carte : face commune (la variante d'ouverture prend la A) */
.cs-carte{position:relative;width:150px;height:232px;border-radius:7px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;flex:none}
.cs-carte .cs-titre{font-weight:700;font-size:13px;line-height:1.2}
.cs-carte .cs-effet{font-size:11.5px;line-height:1.35}
/* A · le liseré */
.cs-a{background:${P.o};color:${P.t};border:var(--ep) solid var(--rc);padding:9px}
.cs-a .cs-tete{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}
.cs-a .cs-fam{width:24px;height:24px;border-radius:50%;background:${P.t};color:${P.o};display:grid;place-items:center;font-size:13px;flex:none}
.cs-a .cs-gros{flex:none;padding:8px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-top:1px solid ${P.r};border-bottom:1px solid ${P.r};margin-bottom:8px}
.cs-a .cs-gros b{font-size:30px;line-height:1}
.cs-a .cs-gros span{font-size:11px}
.cs-a .cs-rar{position:absolute;left:0;right:0;bottom:0;background:var(--rc);color:${P.t};text-align:center;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:2px 0}
.cs-a .cs-effet{flex:1;margin-bottom:18px}
/* B · le tampon : une carte sombre, un papier inséré, le tampon de la rareté et ses crans */
.cs-b{background:${P.b};color:${P.o};border:2px solid ${P.t};padding:10px}
.cs-b .cs-titre{padding-right:40px;min-height:32px}
.cs-b .cs-tampon{position:absolute;right:7px;top:7px;width:36px;height:36px;border-radius:50%;border:2px solid var(--rc);color:var(--rc);display:grid;place-items:center;transform:rotate(-12deg);font-size:15px;font-weight:700}
.cs-b .cs-papier{background:${P.o};color:${P.t};flex:1;margin-top:8px;padding:8px;border-radius:2px;display:flex;flex-direction:column;gap:6px}
.cs-b .cs-papier b{font-size:22px;line-height:1;display:block}
.cs-b .cs-papier small{font-size:11px}
.cs-b .cs-crans{display:flex;gap:4px;margin-top:8px;justify-content:center}
.cs-b .cs-crans i{width:18px;height:6px;background:${P.s};clip-path:polygon(0 0,50% 100%,100% 0,100% 40%,50% 140%,0 40%)}
.cs-b .cs-crans i.on{background:var(--rc)}
/* C · l'étiquette : le chiffre d'abord, l'icône en grand, le bandeau de rareté en haut */
.cs-c{background:${P.s};color:${P.o};border:2px solid var(--rc)}
.cs-c .cs-bande{background:var(--rc);color:${P.t};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:3px 0}
.cs-c .cs-scene{position:relative;height:96px;display:grid;place-items:center;background:${P.b};border-bottom:1px solid ${P.t}}
.cs-c .cs-scene i{font-style:normal;font-size:64px;color:${P.g};line-height:1}
.cs-c .cs-scene b{position:absolute;right:8px;bottom:4px;font-size:26px;color:${P.o};text-shadow:0 2px 0 ${P.t}}
.cs-c .cs-scene span{position:absolute;right:8px;bottom:-14px;font-size:10px;color:${P.r};background:${P.s};padding:0 4px}
.cs-c .cs-corps{padding:14px 9px 8px;display:flex;flex-direction:column;gap:6px}
/* la brillance du mythique (comme la flèche des largages) */
.cs-carte.is-myth{animation:cs-briller 2.4s ease-in-out infinite}
@keyframes cs-briller{0%,100%{--rc:${M0};box-shadow:0 0 0 0 ${M0}}50%{--rc:${M1};box-shadow:0 0 14px 2px ${M1}}}
@property --rc{syntax:'<color>';inherits:true;initial-value:${RC.commun}}
.cs-carte.is-garde{outline:3px solid ${P.n};outline-offset:4px}
.cs-carte.is-ecartee{opacity:.35;filter:grayscale(1)}
/* l'ouverture */
.cs-table{position:relative;height:420px;display:flex;justify-content:center;align-items:center}
.cs-table .cs-paquet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.cs-table .cs-paquet:hover{transform:translate(-50%,calc(-50% - 6px))}
.cs-volet{position:absolute;inset:0;pointer-events:none}
.cs-volet .cs-place{position:absolute;left:50%;top:50%;pointer-events:auto;perspective:800px}
.cs-face,.cs-verso{backface-visibility:hidden}
.cs-tourne{position:relative;transform-style:preserve-3d;width:150px;height:232px}
.cs-tourne>.cs-verso{position:absolute;inset:0;transform:rotateY(180deg)}
.cs-tourne>.cs-verso.cs-dos{border-radius:7px}
.cs-eclat{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:3px solid ${M1};pointer-events:none}
@media (prefers-reduced-motion: reduce){.cs-carte.is-myth{animation:none}.cs-paquet{transition:none}}
${CSS_BOOSTER}
`;

// ─── Le survol : la bulle d'un terme (une seule par sujet) ─────────────────────────────────────────
function brancherBulles(racine) {
  const bulle = el('div', 'cs-bulle'); bulle.hidden = true; racine.append(bulle);
  const montrer = (t, x, y) => {
    const g = GLOSSAIRE[t]; if (!g) return;
    bulle.replaceChildren(el('div', 'cs-img', `image : ${g[1]}`), el('b', '', t), g[0]);
    bulle.hidden = false;
    const w = 270, h = bulle.offsetHeight;
    bulle.style.left = `${Math.min(innerWidth - w - 8, x + 12)}px`;
    bulle.style.top = `${y + h + 20 > innerHeight ? y - h - 12 : y + 16}px`;
  };
  racine.addEventListener('pointerover', e => { const u = e.target.closest?.('.cs-terme'); if (u) montrer(u.dataset.terme, e.clientX, e.clientY); });
  racine.addEventListener('pointerout', e => { if (e.target.closest?.('.cs-terme')) bulle.hidden = true; });
  racine.addEventListener('focusin', e => { const u = e.target.closest?.('.cs-terme'); if (u) { const r = u.getBoundingClientRect(); montrer(u.dataset.terme, r.left, r.bottom); } });
  racine.addEventListener('focusout', () => { bulle.hidden = true; });
}
// « Chaque matin, une [[salve de 75]] » → du texte et des termes soulignés (focalisables au clavier)
function texte(s) {
  const f = document.createDocumentFragment();
  s.split(/(\[\[[^\]]+\]\])/).forEach(m => {
    if (!m.startsWith('[[')) { f.append(m); return; }
    const t = m.slice(2, -2), u = el('u', 'cs-terme', t); u.dataset.terme = t; u.tabIndex = 0; f.append(u);
  });
  return f;
}

// ─── La carte, en trois dessins ─────────────────────────────────────────────────────────────────────
export function carte(id, tier, style = 'a') {
  const C = CARTES[id], v = C.r[tier], F = FAMILLES[C.famille];
  const c = el('div', `cs-carte cs-${style}${tier === 'relique' ? ' is-myth' : ''}`);
  c.style.setProperty('--rc', RC[tier]);
  c.style.setProperty('--ep', `${CRANS[tier] + 1}px`);
  c.setAttribute('aria-label', `${C.nom}, ${NOM_TIER(tier)}`);
  if (style === 'a') {
    c.append(el('div', 'cs-tete', el('span', 'cs-titre', C.nom), el('span', 'cs-fam', F.icone)),
      el('div', 'cs-gros', el('b', '', v.chiffre), el('span', '', v.unite)),
      el('div', 'cs-effet', texte(v.effet)),
      el('div', 'cs-rar', NOM_TIER(tier)));
  } else if (style === 'b') {
    c.append(el('div', 'cs-titre', C.nom), el('div', 'cs-tampon', F.icone),
      el('div', 'cs-papier', el('div', '', el('b', '', v.chiffre), el('small', '', v.unite)), el('div', 'cs-effet', texte(v.effet))),
      el('div', 'cs-crans', ...[1, 2, 3].map(k => el('i', k <= CRANS[tier] ? 'on' : ''))));
  } else {
    c.append(el('div', 'cs-bande', NOM_TIER(tier)),
      el('div', 'cs-scene', el('i', '', F.icone), el('b', '', v.chiffre), el('span', '', v.unite)),
      el('div', 'cs-corps', el('div', 'cs-titre', C.nom), el('div', 'cs-effet', texte(v.effet))));
  }
  c.append(el('div', 'cs-reflet'));
  if (tier === 'relique') c.append(el('div', 'cs-foil'));
  return inclinable(c);
}

// ─── Le paquet, en trois dessins ────────────────────────────────────────────────────────────────────
export function paquet(p, style = 'a', { nb = true } = {}) {
  const F = FAMILLES[p.famille], n = p.cartes.length;
  const b = el('button', 'cs-paquet'); b.type = 'button';
  b.setAttribute('aria-label', `Paquet : ${F.nom}, 3 à 5 cartes`);
  let corps;
  if (style === 'a') {
    // une tranche décalée par carte : l'épaisseur dit le nombre, sans le chiffre
    corps = el('div', 'cs-pile', ...Array.from({ length: n }, (_, k) => { const d = el('div', 'cs-dos'); d.style.transform = `translate(${(n - 1 - k) * 3}px,${(n - 1 - k) * 3}px)`; return d; }),
      el('div', 'cs-ficelle-h'), el('div', 'cs-ficelle-v'), el('div', 'cs-etiquette', el('i', '', F.icone), F.nom));
  } else if (style === 'b') {
    corps = el('div', 'cs-enveloppe', el('div', 'cs-rabat'), el('div', 'cs-cachet', F.icone),
      ...Array.from({ length: n - 2 }, (_, k) => { const t = el('div', 'cs-tranche'); t.style.bottom = `${-4 - k * 4}px`; t.style.opacity = 1 - k * 0.25; return t; }));
  } else {
    corps = el('div', 'cs-caisse', el('div', 'cs-couvercle'), el('div', 'cs-pochoir', el('i', '', F.icone), F.nom.toUpperCase()));
  }
  b.append(...[corps, el('span', 'cs-nom', F.nom), nb ? el('span', 'cs-nb', `${F.dit} · 3 à 5 cartes`) : null].filter(Boolean));
  return b;
}

function cadre(stage, titre, sous) {
  const st = el('style', '', CSS), r = el('div', 'cs', st, el('h3', '', titre), el('p', 'cs-sous', sous));
  stage.append(r); brancherBulles(r);
  return r;
}

// ─── Les variantes : le choix entre trois paquets ─────────────────────────────────────────────────
export function choixPaquets(stage, style) {
  const r = cadre(stage, 'Le soir : choisissez un paquet', 'Trois familles de cartes ; chaque paquet en tient 3 à 5, tirées au hasard. Cliquez un paquet.');
  const rang = el('div', 'cs-rang'), dit = el('p', 'cs-legende', 'Aucun paquet choisi');
  TIRAGE.forEach(p => {
    const b = paquet(p, style);
    b.onclick = () => { rang.querySelectorAll('.cs-paquet').forEach(x => x.classList.toggle('is-on', x === b)); dit.textContent = `Choisi : ${FAMILLES[p.famille].nom} (dans cet exemple, ${p.cartes.length} cartes)`; };
    rang.append(b);
  });
  r.append(rang, dit);
}

// ─── Les variantes : la carte, la même en trois raretés ───────────────────────────────────────────
export function cartesRaretes(stage, style) {
  const r = cadre(stage, 'Une carte, trois raretés', 'La même carte : sa rareté change ses valeurs (le chiffre en gros). Survolez un terme souligné.');
  const ids = ['depot', 'renforts', 'cheddite'];
  let k = 0;
  const rang = el('div', 'cs-rang'), pied = el('div', 'cs-pied');
  const dessiner = () => {
    rang.replaceChildren(...TIERS.map(t => carte(ids[k], t, style)));
    pied.replaceChildren(...ids.map((id, j) => { const b = bouton(CARTES[id].nom, () => { k = j; dessiner(); }); b.setAttribute('aria-pressed', j === k); return b; }));
  };
  dessiner();
  r.append(pied, rang, el('p', 'cs-legende', `${TIERS.map(NOM_TIER).join(' · ')} : en jeu, la chance d'une rareté est celle des caisses (${TIERS.map(t => RARETES[t].poids).join(', ')} sur 100)`));
}

// ─── Les variantes : l'ouverture d'un paquet ──────────────────────────────────────────────────────
// Les places des cartes en rang (centrées), puis la plus rare se retourne en dernier.
const places = (n, ecart = 162) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * ecart);
const anim = (e, kf, o) => reduit() ? (Object.assign(e.style, kf[kf.length - 1]), { finished: Promise.resolve() }) : e.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)', ...o });
const attendre = ms => new Promise(res => setTimeout(res, reduit() ? 0 : ms));

export function ouverture(stage, style) {
  const p = TIRAGE[1];   // les hommes, 4 cartes, dont un mythique
  const noms = { a: 'Le ruban coupé', b: 'Le cachet brisé', c: 'Le couvercle qui saute' };
  const r = cadre(stage, `L'ouverture : ${noms[style]}`, 'Cliquez le paquet pour l\'ouvrir, puis une carte pour la garder.');
  const table = el('div', 'cs-table'), volet = el('div', 'cs-volet'), dit = el('p', 'cs-legende', ' ');
  const jouer = () => {
    table.replaceChildren(); volet.replaceChildren(); dit.textContent = ' ';
    const b = paquet(p, style, { nb: false });
    table.append(b, volet);
    b.onclick = async () => {
      b.onclick = null; b.disabled = true;
      // 1. le paquet s'ouvre
      if (style === 'a') {
        b.querySelectorAll('.cs-ficelle-h,.cs-ficelle-v,.cs-etiquette').forEach((f, i) => anim(f, [{ opacity: 1 }, { opacity: 0, transform: f.classList.contains('cs-etiquette') ? 'translate(-50%,40px) rotate(20deg)' : (i ? 'scaleY(0)' : 'scaleX(0)') }], { duration: 300 }));
        await attendre(260);
      } else if (style === 'b') {
        const cachet = b.querySelector('.cs-cachet');
        await anim(cachet, [{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-20deg)', opacity: 1 }, { transform: 'translate(30px,60px) rotate(60deg)', opacity: 0 }], { duration: 420 }).finished;
        await anim(b.querySelector('.cs-rabat'), [{ transform: 'rotateX(0)' }, { transform: 'rotateX(-180deg)' }], { duration: 380 }).finished;
      } else {
        await anim(b.querySelector('.cs-couvercle'), [{ transform: 'none' }, { transform: 'translate(-30px,-90px) rotate(-35deg)', opacity: 1, offset: .6 }, { transform: 'translate(-60px,40px) rotate(-80deg)', opacity: 0 }], { duration: 640, easing: 'ease-in' }).finished;
      }
      // 2. les cartes sortent, face cachée
      const xs = places(p.cartes.length), rangs = p.cartes.map(([, t]) => CRANS[t]);
      const ordre = p.cartes.map((_, i) => i).sort((i, j) => rangs[i] - rangs[j] || i - j);     // la plus rare se retourne en dernier
      const tournes = p.cartes.map(([id, t], i) => {
        const tour = el('div', 'cs-tourne', el('div', 'cs-verso cs-dos'), carte(id, t, 'a'));
        tour.lastChild.classList.add('cs-face');
        tour.lastChild.dataset.fige = '1';
        tour.lastChild.style.transform = 'rotateY(180deg)';
        tour.firstChild.style.transform = 'none';
        const place = el('div', 'cs-place', tour);
        place.style.margin = '-116px 0 0 -75px';
        volet.append(place);
        const depart = style === 'a' ? 'translate(0,0) rotate(0)' : style === 'b' ? 'translate(0,-10px) scale(.6)' : 'translate(0,20px) scale(.5)';
        const milieu = style === 'c' ? { transform: `translate(${xs[i] * .5}px,-150px) rotate(${(i - 1.5) * 8}deg)`, offset: .55 } : null;
        const kf = [{ transform: depart, opacity: style === 'a' ? 1 : 0 }, ...(milieu ? [{ ...milieu, opacity: 1 }] : []), { transform: `translate(${xs[i]}px,0) rotate(${style === 'a' ? (i - 1.5) * 3 : 0}deg)`, opacity: 1 }];
        anim(place, kf, { duration: style === 'c' ? 700 : 480, delay: i * 110 });
        return { tour, place, t: p.cartes[i][1] };
      });
      b.style.visibility = style === 'a' ? 'hidden' : 'visible';
      if (style !== 'a') anim(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 300 });
      await attendre(480 + p.cartes.length * 110 + 150);
      // 3. elles se retournent une à une ; la plus rare en dernier, avec un éclat
      for (const i of ordre) {
        const { tour, place, t } = tournes[i];
        if (t === 'relique') await attendre(350);
        anim(tour, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(180deg)' }], { duration: 380 });
        if (t === 'relique') {
          const e = el('div', 'cs-eclat'); place.append(e);
          anim(e, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(14)', opacity: 0 }], { duration: 700, easing: 'ease-out' });
        }
        await attendre(t === 'commun' ? 260 : 420);
      }
      // 4. on en garde une
      dit.textContent = 'Cliquez la carte à garder';
      tournes.forEach(({ tour }, i) => {
        const face = tour.lastChild; face.style.cursor = 'pointer'; face.tabIndex = 0; face.setAttribute('role', 'button');
        const garder = () => {
          tournes.forEach(({ tour: x }, j) => { x.lastChild.classList.toggle('is-garde', j === i); x.lastChild.classList.toggle('is-ecartee', j !== i); });
          const [id, t] = p.cartes[i]; dit.textContent = `Gardée : ${CARTES[id].nom} (${NOM_TIER(t)})`;
        };
        face.onclick = e => { if (!e.target.closest('.cs-terme')) garder(); };
        face.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); garder(); } };
      });
    };
  };
  jouer();
  r.append(el('div', 'cs-pied', bouton('Rejouer', jouer)), table, dit);
}

// ─── Le booster (Jérôme, 26 nov. : « un paquet style Pokémon, même si pas historique ; effet 3D au survol ») ─────────────────
const COULEUR_FAMILLE = { musette: P.g, hommes: P.n, engins: P.h };
export function booster(p, { nb = true } = {}) {
  const F = FAMILLES[p.famille];
  const b = el('button', 'bo'); b.type = 'button';
  b.setAttribute('aria-label', `Paquet : ${F.nom}, 3 à 5 cartes`);
  const corps = el('div', 'bo-corps',
    el('div', 'bo-cartes'),
    el('div', 'bo-face bo-metal', el('div', 'bo-logo', 'CYCLOPÉEN'), el('div', 'bo-medaillon', el('i', '', F.icone)),
      el('div', 'bo-bandeau', F.nom.toUpperCase()), el('div', 'bo-info', '3 À 5 CARTES · 1914-1918')),
    el('div', 'bo-haut bo-metal', el('span', '', '◂ DÉCHIRER ICI ▸')),
    el('div', 'bo-pointilles'), el('div', 'cs-reflet'));
  corps.style.setProperty('--fam', COULEUR_FAMILLE[p.famille]);
  inclinable(corps, 22);
  b.append(...[corps, el('span', 'cs-nom', F.nom), nb ? el('span', 'cs-nb', `${F.dit} · 3 à 5 cartes`) : null].filter(Boolean));
  return b;
}

export function choixBoosters(stage) {
  const r = cadre(stage, 'Le soir : choisissez un paquet', 'Trois familles ; chaque paquet tient 3 à 5 cartes, tirées au hasard. Survolez un paquet : il penche vers le curseur.');
  const rang = el('div', 'cs-rang'), dit = el('p', 'cs-legende', 'Aucun paquet choisi');
  rang.style.gap = '40px';
  TIRAGE.forEach(p => {
    const b = booster(p);
    b.onclick = () => { rang.querySelectorAll('.bo').forEach(x => x.classList.toggle('is-on', x === b)); dit.textContent = `Choisi : ${FAMILLES[p.famille].nom} (dans cet exemple, ${p.cartes.length} cartes)`; };
    rang.append(b);
  });
  r.append(rang, dit);
}

// ─── L'ouverture : on déchire le haut du paquet, les cartes sortent par le haut, une à une, de face, de la plus commune à la plus rare ───
export function dechirer(stage) {
  const p = TIRAGE[2];   // les engins : 5 cartes
  const r = cadre(stage, 'L\'ouverture : on déchire le paquet', 'Tirez la bande du haut de gauche à droite (ou cliquez-la) ; les cartes sortent une à une, la plus rare en dernier. Cliquez ensuite celle à garder.');
  const table = el('div', 'bo-table'), dit = el('p', 'cs-legende', ' ');
  let jeton = 0;
  const jouer = () => {
    const ce = ++jeton, vivant = () => ce === jeton;
    table.replaceChildren(); dit.textContent = ' ';
    // la plus rare en dernier : les cartes du paquet sont rangées dans l'ordre de sortie
    const cartes = p.cartes.map(([id, t], i) => ({ id, t, i })).sort((a, b) => CRANS[a.t] - CRANS[b.t] || a.i - b.i);
    const b = booster({ ...p, cartes: cartes.map(c => [c.id, c.t]) }, { nb: false });
    const corps = b.querySelector('.bo-corps'), haut = b.querySelector('.bo-haut'), trait = el('div', 'bo-dechirure');
    corps.append(trait);
    table.append(b);
    let ouvert = false, depart = null;
    const progres = q => { haut.style.transform = `translateY(${(-q * 5).toFixed(1)}px) rotate(${(q * 9).toFixed(1)}deg)`; trait.style.width = `${(q * 100).toFixed(0)}%`; };
    const ouvrir = async () => {
      if (ouvert) return; ouvert = true;
      corps.dataset.fige = '1'; corps.style.transform = ''; corps.classList.remove('is-survol'); b.style.cursor = 'default';
      progres(1);
      await anim(haut, [{ transform: haut.style.transform, opacity: 1 }, { transform: 'translate(140px,-120px) rotate(48deg)', opacity: 0 }], { duration: 520, easing: 'ease-in' }).finished;
      trait.remove(); b.querySelector('.bo-pointilles').remove();
      await attendre(250);
      const xs = places(cartes.length), boite = table.getBoundingClientRect();
      for (const [k, c] of cartes.entries()) {
        if (!vivant()) return;
        const myth = c.t === 'relique', carteEl = carte(c.id, c.t, 'a');
        carteEl.dataset.fige = '1';
        corps.querySelector('.bo-cartes').append(carteEl);
        // 1. elle monte hors du paquet, de face, avec un peu de jeu (le paquet la retient un instant)
        if (myth) await attendre(450);
        anim(corps, [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 260 });
        await anim(carteEl, [
          { transform: 'translateY(0) rotate(0)' },
          { transform: `translateY(-60px) rotate(${myth ? 0 : (k % 2 ? 1.5 : -1.5)}deg)`, offset: .35 },
          { transform: `translateY(-${H_HAUT + 14 + 232 + 16}px) rotate(0)` }], { duration: myth ? 1300 : 650, easing: 'cubic-bezier(.3,.1,.3,1)' }).finished;
        if (!vivant()) return;
        // 2. elle quitte le paquet et va se poser à sa place dans le rang (rangé de la plus commune à la plus rare)
        const rc = carteEl.getBoundingClientRect(), place = el('div', 'bo-place');
        place.style.left = `${rc.left - boite.left}px`; place.style.top = `${rc.top - boite.top}px`;
        carteEl.getAnimations().forEach(a => a.cancel());
        carteEl.style.position = 'static';
        place.append(carteEl); table.append(place);
        const cx = boite.width / 2 + xs[k] - 75 - (rc.left - boite.left), cy = 24 - (rc.top - boite.top);
        anim(place, [{ transform: 'translate(0,0)' }, { transform: `translate(${cx}px,${cy}px)` }], { duration: 480 });
        if (myth) {
          const e = el('div', 'cs-eclat'); place.append(e);
          anim(e, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(16)', opacity: 0 }], { duration: 800, easing: 'ease-out' });
        }
        await attendre(myth ? 500 : 320);
      }
      if (!vivant()) return;
      anim(b, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(120px)', opacity: 0 }], { duration: 500, easing: 'ease-in' });
      // on en garde une : chaque carte penche au survol
      dit.textContent = 'Cliquez la carte à garder';
      const faces = [...table.querySelectorAll('.bo-place .cs-carte')];
      faces.forEach((f, i) => {
        delete f.dataset.fige; f.style.cursor = 'pointer'; f.tabIndex = 0; f.setAttribute('role', 'button');
        const garder = () => {
          faces.forEach((x, j) => { x.classList.toggle('is-garde', j === i); x.classList.toggle('is-ecartee', j !== i); });
          dit.textContent = `Gardée : ${CARTES[cartes[i].id].nom} (${NOM_TIER(cartes[i].t)})`;
        };
        f.onclick = e => { if (!e.target.closest('.cs-terme')) garder(); };
        f.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); garder(); } };
      });
    };
    // la bande du haut se tire de gauche à droite ; un simple clic (ou Entrée) la déchire d'un coup
    haut.style.cursor = 'grab';
    haut.addEventListener('pointerdown', e => { if (ouvert) return; depart = e.clientX; haut.setPointerCapture(e.pointerId); e.preventDefault(); });
    haut.addEventListener('pointermove', e => { if (depart == null || ouvert) return; const q = Math.max(0, Math.min(1, (e.clientX - depart) / W_BO)); progres(q); if (q > 0.8) ouvrir(); });
    haut.addEventListener('pointerup', e => { if (depart == null) return; const dx = e.clientX - depart; depart = null; if (dx < 6) ouvrir(); else if (!ouvert) progres(0); });
    b.onclick = e => { if (e.detail === 0) ouvrir(); };   // le clavier (Entrée, Espace)
  };
  jouer();
  r.append(el('div', 'cs-pied', bouton('Rejouer', jouer)), table, dit);
  return () => { jeton++; };
}
