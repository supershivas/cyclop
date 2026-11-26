// Le sujet « Les cartes du soir » du labo (Jérôme, 26 nov. ; docs/chantiers/cartes-wtf.md). Une maquette : rien n'est en jeu.
// La proposition : à chaque tirage, on choisit entre trois paquets (trois familles de cartes) ; un paquet tient 3 à 5 cartes (hasard) ;
// une carte existe en plusieurs raretés, et sa rareté change ses valeurs (commun, rare, mythique). Les termes du jeu sont soulignés et
// s'expliquent au survol (la bulle et la place de son image : le glossaire du document).
// Trois façons de dessiner le paquet, trois ouvertures, trois façons de dessiner la carte. Couleurs : la palette du jeu, plus celles des raretés
// (l'exception des objets parachutés, RARETES_COULEURS) et la brillance du mythique. `prefers-reduced-motion` : tout est posé d'un coup.
import { PALETTE as P, RARETES_COULEURS as RC, RARETES_BRILLANCE } from './palette.js?v=0.170.4';
import { RARETES } from './data/largages.js?v=0.170.4';

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null)); return e; };
const bouton = (texte, f) => { const b = el('button', 'essai', texte); b.type = 'button'; b.onclick = f; return b; };

// ─── Les données de l'exemple ───────────────────────────────────────────────────────────────────────
// Les six raretés d'une carte : celles des largages (Jérôme, 26 nov. : un foil et une texture par rareté)
export const TIERS = ['commun', 'peuCommun', 'rare', 'epique', 'legendaire', 'relique'];
const NOM_TIER = t => RARETES[t].nom;
const CRANS = { commun: 1, peuCommun: 2, rare: 3, epique: 4, legendaire: 5, relique: 6 };

export const FAMILLES = {
  musette: { nom: 'La musette', icone: '✹', dit: 'des obus à viser' },
  hommes:  { nom: 'Les hommes', icone: 'R', dit: 'nos régiments' },
  engins:  { nom: 'Les engins', icone: 'C', dit: 'chars, avions, armes' },
};

// `[[terme]]` : un terme du glossaire, souligné, expliqué au survol. `image` : ce que montrera l'image de la carte (une place vide pour l'instant).
// `r` : la description à chaque rareté (les six des largages) ; la valeur est dans la phrase (Jérôme, 26 nov. : « les gros chiffres ne sont pas clairs »).
// `[[terme|texte]]` : le texte montré, si ce n'est pas le terme lui-même.
export const CARTES = {
  depot: { image: "une caisse d'obus de 75, couvercle ouvert", nom: 'Le dépôt', famille: 'musette', r: {
    commun:     'Chaque matin, une [[salve de 75]] dans la [[musette]]',
    peuCommun:  'Chaque matin, deux [[salve de 75|salves de 75]] dans la [[musette]]',
    rare:       'Chaque matin, un [[barrage de 155]] dans la [[musette]]',
    epique:     'Chaque matin, un [[barrage de 220]] dans la [[musette]]',
    legendaire: 'Le matin et à midi, un [[barrage de 155]] dans la [[musette]]',
    relique:    'Le matin et à midi, un [[barrage de 220]] dans la [[musette]]' } },
  roulant: { image: "une ligne d'explosions qui avance sur le no man's land", nom: 'Le barrage roulant', famille: 'musette', r: {
    commun:     'Chaque midi, un [[barrage roulant]] de trois salves',
    peuCommun:  'Chaque midi, un [[barrage roulant]] de quatre salves',
    rare:       'Chaque midi, un [[barrage roulant]] de cinq salves',
    epique:     'Chaque midi, un [[barrage roulant]] de cinq salves de 155',
    legendaire: 'Le matin et à midi, un [[barrage roulant]] de cinq salves',
    relique:    'Le matin et à midi, un [[barrage roulant]] de cinq salves de 155' } },
  quatreCents: { image: "l'obus de 400 debout, plus grand qu'un homme", nom: 'Le 400 de Douaumont', famille: 'musette', r: {
    commun:     'Une fois par partie, un [[barrage de 220]] dans la [[musette]]',
    peuCommun:  'Une fois par partie, deux barrages de 220 au même endroit',
    rare:       'Une fois par partie, trois barrages de 220 au même endroit',
    epique:     'Une fois par partie, l\'[[obus de 400]]',
    legendaire: 'Deux fois par partie, l\'[[obus de 400]]',
    relique:    'Trois fois par partie, l\'[[obus de 400]]' } },
  renforts: { image: "des hommes qui montent en ligne, le barda sur le dos", nom: 'Les renforts du soir', famille: 'hommes', r: {
    commun:     'Chaque soir, une [[demi-section]] (10 hommes) rejoint notre régiment le plus éprouvé',
    peuCommun:  'Chaque soir, 15 hommes rejoignent notre régiment le plus éprouvé',
    rare:       'Chaque soir, une section (20 hommes) rejoint notre régiment le plus éprouvé',
    epique:     'Chaque soir, 30 hommes rejoignent notre régiment le plus éprouvé',
    legendaire: 'Chaque soir, une compagnie (40 hommes) rejoint notre régiment le plus éprouvé',
    relique:    'Chaque soir, une compagnie rejoint chacun de nos deux régiments les plus éprouvés' } },
  clairon: { image: "le clairon de la charge, son fanion", nom: 'Le clairon', famille: 'hommes', r: {
    commun:     'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 1 h',
    peuCommun:  'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 2 h',
    rare:       'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 4 h',
    epique:     'Chaque matin, les deux premiers régiments ont le [[clairon]] pendant 4 h',
    legendaire: 'Chaque matin, les trois premiers régiments ont le [[clairon]] pendant 4 h',
    relique:    'Toute la journée, tous nos régiments ont le [[clairon]]' } },
  flammes: { image: "le lance-flammes Schilt, ses deux réservoirs", nom: 'Le lance-flammes', famille: 'hommes', r: {
    commun:     'Au [[premier assaut du jour]], un homme reçoit un [[lance-flammes]] pendant 1 h',
    peuCommun:  'Au [[premier assaut du jour]], un homme reçoit un [[lance-flammes]] pendant 2 h',
    rare:       'Au [[premier assaut du jour]], deux hommes reçoivent un [[lance-flammes]]',
    epique:     'Au [[premier assaut du jour]], trois hommes reçoivent un [[lance-flammes]]',
    legendaire: 'Aux deux premiers assauts du jour, deux hommes reçoivent un [[lance-flammes]]',
    relique:    'À chaque assaut, trois hommes reçoivent un [[lance-flammes]]' } },
  cheddite: { image: "des pétards de cheddite glissés sous les barbelés", nom: 'La cheddite', famille: 'engins', r: {
    commun:     'Chaque matin, leur [[fil de fer]] saute sur 60 m devant notre régiment le plus avancé',
    peuCommun:  'Chaque matin, leur [[fil de fer]] saute sur 90 m devant notre régiment le plus avancé',
    rare:       'Chaque matin, leur [[fil de fer]] saute sur 120 m devant notre régiment le plus avancé',
    epique:     'Chaque matin, leur [[fil de fer]] saute sur 180 m devant notre régiment le plus avancé',
    legendaire: 'Chaque matin, leur [[fil de fer]] saute devant nos deux régiments les plus avancés',
    relique:    'Chaque matin, leur [[fil de fer]] saute devant toute notre [[première ligne]]' } },
  mecano: { image: "une caisse d'outils devant un char FT", nom: 'Le mécanicien', famille: 'engins', r: {
    commun:     'Chaque matin, un de nos [[chars]] est réparé',
    peuCommun:  'Chaque matin, deux de nos [[chars]] sont réparés',
    rare:       'Chaque matin, tous nos [[chars]] sont réparés',
    epique:     'Le matin et à midi, tous nos [[chars]] sont réparés',
    legendaire: 'Chaque matin, tous nos [[chars]] sont réparés, et un char détruit revient au parc',
    relique:    'Le matin et à midi, tous nos [[chars]] sont réparés, et un char détruit revient au parc' } },
  aasen: { image: "une bombe Aasen à ailettes", nom: 'Les bombes Aasen', famille: 'engins', r: {
    commun:     'À chaque vol de nos avions, deux [[bombes Aasen]]',
    peuCommun:  'À chaque vol de nos avions, trois [[bombes Aasen]]',
    rare:       'À chaque vol de nos avions, quatre [[bombes Aasen]]',
    epique:     'À chaque vol de nos avions, six [[bombes Aasen]]',
    legendaire: 'À chaque vol de nos avions, huit [[bombes Aasen]]',
    relique:    'À chaque vol de nos avions, douze [[bombes Aasen]]' } },
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

// Les trois paquets d'un tirage, et le contenu de chacun (exemple fixe : 3, 4 et 5 cartes ; en jeu, tiré de la graine).
// La rareté du paquet (Jérôme, 26 nov.) : commun (mat), brillant, rose (brillant, et toujours une carte mythique dedans).
export const TIRAGE = [
  { famille: 'musette', rarete: 'commun', cartes: [['depot', 'commun'], ['roulant', 'peuCommun'], ['quatreCents', 'commun']] },
  { famille: 'hommes', rarete: 'brillant', cartes: [['renforts', 'commun'], ['clairon', 'peuCommun'], ['flammes', 'rare'], ['renforts', 'epique']] },
  { famille: 'engins', rarete: 'rose', cartes: [['cheddite', 'commun'], ['mecano', 'peuCommun'], ['aasen', 'rare'], ['cheddite', 'legendaire'], ['aasen', 'relique']] },
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
.bo-haut{position:absolute;inset:0;z-index:3;transform-origin:100% ${H_HAUT}px}
.bo-haut::before,.bo-face::before{content:"";position:absolute;left:0;right:0;height:26px;background:repeating-linear-gradient(90deg,${rgba(P.t, .28)} 0 2px,transparent 2px 5px);z-index:1}
.bo-haut::before{top:0}.bo-face::before{bottom:0}
.bo-face{position:absolute;inset:0;z-index:2;overflow:hidden}
.bo-pointilles{position:absolute;left:6px;right:6px;top:${H_HAUT - 1}px;height:0;border-top:2px dashed ${rgba(P.o, .35)};z-index:4;pointer-events:none}
.bo-jeu{position:absolute;top:${H_HAUT + 16}px;left:0;right:0;text-align:center;font-family:'Antonio','Arial Narrow',sans-serif;font-weight:300;font-size:12px;letter-spacing:.32em;color:${P.o};opacity:.75;z-index:2}
.bo-set{position:absolute;left:10px;right:10px;top:50%;transform:translateY(-50%);text-align:center;font-family:'Antonio','Arial Narrow',sans-serif;font-weight:300;font-size:38px;line-height:1.02;letter-spacing:.1em;text-transform:uppercase;color:${P.o};
  text-shadow:0 2px 0 ${P.t},0 0 12px ${rgba(P.t, .5)};z-index:2}
.bo-mat{background:linear-gradient(170deg,var(--fam),${P.b} 70%);}
.bo-mat .bo-set{text-shadow:0 2px 0 ${P.t}}
.bo-rosee{background:linear-gradient(160deg,${M1} 0%,${P.s} 40%,${M0} 62%,${P.s} 82%,${M1} 100%)}
.bo-rosee .cs-foil{opacity:.5;z-index:1}
.bo-eclat{position:absolute;z-index:6;pointer-events:none}
.bo-cartes{position:absolute;inset:0;z-index:1}
.bo-cartes .cs-carte{position:absolute;left:${(W_BO - 150) / 2}px;top:${H_HAUT + 18}px}
.bo-dechirure{position:absolute;left:0;top:${H_HAUT - 2}px;height:3px;width:0;background:${P.t};z-index:5;pointer-events:none}
.bo-table{position:relative;height:580px;overflow:hidden}
.bo-table>.bo{position:absolute;left:50%;top:276px;margin-left:-${W_BO / 2}px}
.bo-place{position:absolute;left:0;top:0}
.bo-place:hover{z-index:40!important}
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
.cs-six{display:grid;grid-template-columns:repeat(3,150px);gap:64px 70px;justify-content:center;padding:34px 0 24px}
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
.cs-carte{position:relative;width:150px;height:232px;border-radius:7px;box-sizing:border-box;display:flex;flex-direction:column;flex:none;--ligne:${rgba(P.t, .11)}}
.cs-carte>*{position:relative;z-index:2}
.cs-carte .cs-titre{font-family:'Antonio','Arial Narrow',sans-serif;font-weight:300;font-size:19px;line-height:1.05;letter-spacing:.1em;text-transform:uppercase}
.cs-carte .cs-effet{font-size:11.5px;line-height:1.35}
/* A · le liseré */
.cs-image{position:relative;flex:none;height:92px;margin:7px 0;display:grid;place-items:center;background:${P.s};border:1px dashed ${P.g};border-radius:3px;overflow:hidden}
.cs-image i{font-style:normal;font-size:44px;line-height:1;color:${P.b}}
.cs-image span{position:absolute;left:4px;right:4px;bottom:3px;font-size:9px;line-height:1.2;color:${P.r};text-align:center}
.cs-carte>.cs-rar{position:absolute;z-index:2;border-radius:0 0 4px 4px;left:0;right:0;bottom:0;background:var(--rc);color:${P.t};text-align:center;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:2px 0}
/* A · le liseré */
.cs-a{background:${P.o};color:${P.t};border:var(--ep) solid var(--rc);padding:9px}
.cs-a .cs-effet{flex:1;margin-bottom:18px}
.cs-a .cs-image,.cs-b .cs-image{height:76px}
/* B · le tampon : une carte de boue, le tampon de la rareté (une à trois étoiles), un papier inséré */
.cs-b{background:${P.b};color:${P.o};border:2px solid ${P.t};padding:9px;--ligne:${rgba(P.o, .09)}}
.cs-b .cs-titre{padding-right:42px;min-height:32px}
.cs-carte>.cs-tampon{position:absolute;right:6px;top:6px;width:38px;height:38px;border-radius:50%;border:2px solid var(--rc);color:var(--rc);display:grid;place-items:center;transform:rotate(-12deg);font-size:10px;letter-spacing:-1px}
.cs-b .cs-image{margin-top:2px}
.cs-b .cs-papier{background:${P.o};color:${P.t};flex:1;margin-bottom:18px;padding:6px;border-radius:2px}
/* C · l'étiquette : le bandeau de rareté en haut, l'image en grand */
.cs-c{background:${P.s};color:${P.o};border:2px solid var(--rc);--ligne:${rgba(P.o, .09)}}
.cs-c .cs-bande{border-radius:4px 4px 0 0;background:var(--rc);color:${P.t};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:3px 0}
.cs-c .cs-image{height:104px;margin:0;border:0;border-bottom:1px solid ${P.t};border-radius:0;background:${P.b}}
.cs-c .cs-image i{color:${P.g}}
.cs-c .cs-corps{padding:8px 9px;display:flex;flex-direction:column;gap:6px}
.cs-c .cs-corps,.cs-b>.cs-titre{text-shadow:0 1px 1px ${P.t},0 0 3px ${P.t}}
.t-relique .cs-corps,.t-relique>.cs-titre{text-shadow:none}
/* les matières de chaque rareté : la texture et le foil sous le texte (.cs-tex), le reflet qui passe par-dessus (.cs-lustre) */
.cs-carte>.cs-tex,.cs-carte>.cs-lustre,.cs-carte>.cs-reflet{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.cs-carte>.cs-tex{z-index:1;background-position:0 0,var(--mx,50%) var(--my,50%),0 0;background-size:auto,260% 260%,auto}
.t-peuCommun>.cs-tex{background:repeating-linear-gradient(0deg,var(--ligne) 0 1px,transparent 1px 4px)}
.t-rare>.cs-tex{background:repeating-linear-gradient(90deg,${rgba(RC.rare, .28)} 0 1px,transparent 1px 4px),
  linear-gradient(115deg,transparent 22%,${rgba(RC.rare, .38)} 40%,${rgba(P.o, .5)} 50%,${rgba(RC.rare, .38)} 60%,transparent 78%),${rgba(RC.rare, .13)};
  background-size:auto,260% 260%;background-position:0 0,var(--mx,30%) var(--my,30%)}
.t-epique>.cs-tex{background:repeating-linear-gradient(45deg,${rgba(P.r, .42)} 0 1px,transparent 1px 5px),
  linear-gradient(115deg,transparent 20%,${rgba(P.r, .5)} 38%,${rgba(P.o, .7)} 50%,${rgba(P.e, .45)} 62%,transparent 80%),${rgba(P.r, .2)};
  background-size:auto,260% 260%;background-position:0 0,var(--mx,30%) var(--my,30%)}
.t-legendaire>.cs-tex{background:radial-gradient(circle,${rgba(RC.legendaire, .55)} 0 1px,transparent 1.6px) 0 0/6px 6px,
  linear-gradient(115deg,transparent 20%,${rgba(RC.legendaire, .45)} 38%,${rgba(P.o, .65)} 50%,${rgba(RC.legendaire, .45)} 62%,transparent 80%) var(--mx,30%) var(--my,30%)/260% 260%,${rgba(RC.legendaire, .16)}}
.t-relique>.cs-tex{background:radial-gradient(ellipse 40% 28% at 20% 25%,${rgba(P.o, .45)},transparent 70%),radial-gradient(ellipse 45% 30% at 75% 40%,${rgba(M1, .7)},transparent 70%),
  radial-gradient(ellipse 50% 32% at 35% 70%,${rgba(P.o, .35)},transparent 70%),radial-gradient(ellipse 38% 26% at 85% 85%,${rgba(M0, .6)},transparent 70%),
  radial-gradient(ellipse 30% 22% at 55% 10%,${rgba(M1, .55)},transparent 70%);background-size:200% 200%;animation:cs-nuages 9s ease-in-out infinite alternate}
@keyframes cs-nuages{from{background-position:0% 0%}to{background-position:100% 100%}}
.cs-carte>.cs-lustre{z-index:3;background:linear-gradient(105deg,transparent 42%,${rgba(P.o, .22)} 50%,transparent 58%) 0 0/300% 100%;animation:cs-lustre 4.5s linear infinite}
.t-relique>.cs-lustre{background-image:linear-gradient(105deg,transparent 38%,${rgba(P.o, .55)} 48%,${rgba(M1, .3)} 52%,transparent 62%);animation-duration:2.4s}
@keyframes cs-lustre{from{background-position:150% 0}to{background-position:-50% 0}}
/* légendaire : le halo doré, la carte qui flotte */
.t-legendaire{animation:cs-halo-or 2.6s ease-in-out infinite,cs-flotte 3.2s ease-in-out infinite}
@keyframes cs-halo-or{0%,100%{box-shadow:0 0 6px 1px ${rgba(RC.legendaire, .5)}}50%{box-shadow:0 0 18px 4px ${rgba(RC.legendaire, .8)}}}
@keyframes cs-flotte{0%,100%{translate:0 0}50%{translate:0 -6px}}
/* mythique : rose partout, le halo rose, les étincelles */
.cs-carte.t-relique{background:linear-gradient(160deg,${M1},${M0} 55%,${M1});color:${P.t};border-color:${P.o};animation:cs-halo-rose 2.2s ease-in-out infinite,cs-flotte 3s ease-in-out infinite}
.t-relique .cs-papier{background:${rgba(P.o, .82)}}
.t-relique .cs-terme{text-decoration-thickness:2px}
.cs-carte.t-relique>.cs-rar,.t-relique .cs-bande{background:${P.t};color:${M1}}
.t-relique>.cs-tampon{border-color:${P.t};color:${P.t}}
@keyframes cs-halo-rose{0%,100%{box-shadow:0 0 10px 2px ${rgba(M1, .55)}}50%{box-shadow:0 0 26px 7px ${rgba(M0, .85)}}}
.cs-carte>.cs-orbite{position:absolute;left:50%;top:50%;width:0;height:0;z-index:5;transform:scaleX(.68);pointer-events:none}
.cs-anneau{position:absolute;left:0;top:0;animation:cs-tourne 9s linear infinite}
@keyframes cs-tourne{to{rotate:360deg}}
.cs-etinc{position:absolute;left:-2px;top:-2px;width:4px;height:4px}
.cs-etinc::before{content:"";position:absolute;inset:0;background:${P.o};rotate:45deg;box-shadow:0 0 5px 1px ${M1};animation:cs-scintille 1.6s ease-in-out infinite;animation-delay:inherit}
.cs-etinc:nth-child(2n)::before{background:${M1};box-shadow:0 0 5px 1px ${P.o}}
@keyframes cs-scintille{0%,100%{opacity:.15;scale:.5}50%{opacity:1;scale:1.3}}
.cs-carte.is-garde{outline:3px solid ${P.n};outline-offset:6px}
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
@media (prefers-reduced-motion: reduce){.cs-carte.t-relique,.cs-carte.t-legendaire,.t-relique>.cs-tex,.cs-lustre,.cs-anneau,.cs-etinc::before{animation:none}.cs-paquet{transition:none}}
@font-face{font-family:'Antonio';font-weight:300;font-style:normal;src:url(vendor/fonts/Antonio-300.ttf) format('truetype')}
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
    const [t, vu = t] = m.slice(2, -2).split('|'), u = el('u', 'cs-terme', vu); u.dataset.terme = t; u.tabIndex = 0; f.append(u);
  });
  return f;
}

// ─── La carte, en trois dessins : seulement le nom, l'image, la description et la rareté (Jérôme, 26 nov.) ──────────
// Chaque rareté a sa matière (Jérôme, 26 nov.) : peu commun, des lignes horizontales ; rare, un foil bleu à lignes verticales ; épique, un foil
// d'argent à lignes obliques ; légendaire, un foil doré à points, un halo doré, la carte qui flotte, un reflet léger ; mythique, la carte rose
// partout, un foil rose en nuages, un halo rose, des étincelles qui tournent autour, la carte qui flotte, un reflet appuyé.
const image = C => el('div', 'cs-image', el('i', '', FAMILLES[C.famille].icone), el('span', '', `image : ${C.image}`));
const etincelles = () => el('div', 'cs-orbite', ...[[7, 128, 9], [5, 112, -13]].map(([n, rayon, tour]) => {
  const anneau = el('div', 'cs-anneau'); anneau.style.animationDuration = `${Math.abs(tour)}s`; if (tour < 0) anneau.style.animationDirection = 'reverse';
  for (let k = 0; k < n; k++) {
    const e = el('i', 'cs-etinc');
    e.style.transform = `rotate(${(k * 360 / n + rayon).toFixed(0)}deg) translateX(${rayon + (k % 3) * 6}px)`;
    e.style.animationDelay = `${(k * 0.37).toFixed(2)}s`;
    anneau.append(e);
  }
  return anneau;
}));
export function carte(id, tier, style = 'a') {
  const C = CARTES[id], effet = C.r[tier] ?? C.r.commun;
  const c = el('div', `cs-carte cs-${style} t-${tier}${tier === 'relique' ? ' is-myth' : ''}`);
  c.style.setProperty('--rc', RC[tier]);
  c.style.setProperty('--ep', `${Math.min(4, CRANS[tier] + 1)}px`);
  c.setAttribute('aria-label', `${C.nom}, ${NOM_TIER(tier)}`);
  if (tier !== 'commun') c.append(el('div', 'cs-tex'));
  if (style === 'a') {
    c.append(el('div', 'cs-titre', C.nom), image(C), el('div', 'cs-effet', texte(effet)), el('div', 'cs-rar', NOM_TIER(tier)));
  } else if (style === 'b') {
    c.append(el('div', 'cs-titre', C.nom), el('div', 'cs-tampon', '★'.repeat(CRANS[tier])), image(C),
      el('div', 'cs-papier', el('div', 'cs-effet', texte(effet))), el('div', 'cs-rar', NOM_TIER(tier)));
  } else {
    c.append(el('div', 'cs-bande', NOM_TIER(tier)), image(C), el('div', 'cs-corps', el('div', 'cs-titre', C.nom), el('div', 'cs-effet', texte(effet))));
  }
  if (tier === 'legendaire' || tier === 'relique') c.append(el('div', 'cs-lustre'));
  c.append(el('div', 'cs-reflet'));
  if (tier === 'relique') c.append(etincelles());
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
  const r = cadre(stage, 'Une carte, six raretés', 'La même carte : sa rareté change sa description et sa matière. Survolez une carte, puis un terme souligné.');
  const ids = ['depot', 'renforts', 'cheddite'];
  let k = 0;
  const rang = el('div', 'cs-rang cs-six'), pied = el('div', 'cs-pied');
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

// ─── Le booster (Jérôme, 26 nov. : « un paquet style Pokémon, même si pas historique ; effet 3D au survol » ; puis « seulement le nom du set, et en
// petit le nom du jeu ; trois raretés : les communs ne sont pas brillants, les moyens sont brillants, les rares sont brillants, roses, et ont toujours
// une carte rose ») ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const COULEUR_FAMILLE = { musette: P.g, hommes: P.n, engins: P.h };
export const RARETES_PAQUET = { commun: 'Paquet commun (mat)', brillant: 'Paquet brillant', rose: 'Paquet rose (toujours un mythique)' };
// un petit hasard à graine (le labo dessine la même déchirure à chaque graine)
const alea = graine => { let x = graine >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; };
// la ligne de déchirure : irrégulière, un peu en biais, en px dans le paquet
function ligneDechirure(u) {
  const n = 22, pente = (u() - 0.5) * 10, pts = [];
  for (let i = 0; i <= n; i++) {
    const x = i / n * W_BO, y = H_HAUT + pente * (i / n - 0.5) + (u() - 0.5) * 9 + (i % 3 === 0 ? (u() - 0.5) * 6 : 0);
    pts.push([+(i === 0 ? 0 : i === n ? W_BO : x + (u() - 0.5) * 4).toFixed(1), +y.toFixed(1)]);
  }
  return pts;
}
const dentsHaut = (n, h) => Array.from({ length: n * 2 + 1 }, (_, i) => `${(i / (n * 2) * W_BO).toFixed(1)}px ${i % 2 ? 0 : h}px`);
const dentsBas = (n, h) => Array.from({ length: n * 2 + 1 }, (_, i) => `${((1 - i / (n * 2)) * W_BO).toFixed(1)}px ${H_BO - (i % 2 ? 0 : h)}px`);

export function booster(p, { nb = true, graine = 7 } = {}) {
  const F = FAMILLES[p.famille], rar = p.rarete || 'brillant';
  const b = el('button', `bo bo-${rar}`); b.type = 'button';
  b.setAttribute('aria-label', `Paquet : ${F.nom}, ${RARETES_PAQUET[rar]}, 3 à 5 cartes`);
  const ligne = ligneDechirure(alea(graine + p.famille.length * 977));
  const L = ligne.map(([x, y]) => `${x}px ${y}px`);
  const fini = rar === 'commun' ? 'bo-mat' : rar === 'rose' ? 'bo-metal bo-rosee' : 'bo-metal';
  const face = el('div', `bo-face ${fini}`, el('div', 'bo-jeu', 'CYCLOPÉEN'), el('div', 'bo-set', F.nom));
  const haut = el('div', `bo-haut ${fini}`);
  face.style.clipPath = `polygon(${[...L, ...dentsBas(18, 5)].join(',')})`;
  haut.style.clipPath = `polygon(${[...dentsHaut(18, 5), ...[...L].reverse()].join(',')})`;
  if (rar === 'rose') { face.append(el('div', 'cs-foil')); haut.append(el('div', 'cs-foil')); }
  const corps = el('div', 'bo-corps', el('div', 'bo-cartes'), face, haut, el('div', 'bo-pointilles'), rar === 'commun' ? null : el('div', 'cs-reflet'));
  corps.style.setProperty('--fam', rar === 'rose' ? RC.relique : COULEUR_FAMILLE[p.famille]);
  corps._ligne = ligne;
  inclinable(corps, 22);
  b.append(...[corps, el('span', 'cs-nom', F.nom), nb ? el('span', 'cs-nb', `${RARETES_PAQUET[rar]} · 3 à 5 cartes`) : null].filter(Boolean));
  return b;
}

export function choixBoosters(stage) {
  const r = cadre(stage, 'Le soir : choisissez un paquet', 'Trois familles, trois raretés de paquet : mat, brillant, rose (toujours un mythique). Survolez un paquet : il penche vers le curseur.');
  const rang = el('div', 'cs-rang'), dit = el('p', 'cs-legende', 'Aucun paquet choisi');
  rang.style.gap = '40px';
  TIRAGE.forEach(p => {
    const b = booster(p);
    b.onclick = () => { rang.querySelectorAll('.bo').forEach(x => x.classList.toggle('is-on', x === b)); dit.textContent = `Choisi : ${FAMILLES[p.famille].nom} (dans cet exemple, ${p.cartes.length} cartes)`; };
    rang.append(b);
  });
  r.append(rang, dit);
}

// Les éclats de papier : de petits morceaux qui sautent de la déchirure, retombent en tournant et s'effacent
function eclats(parent, x, y, couleurs, u, n = 3) {
  for (let k = 0; k < n; k++) {
    const e = el('div', 'bo-eclat'), w = 2 + u() * 4, h = 2 + u() * 3;
    e.style.cssText = `left:${x}px;top:${y}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:${couleurs[Math.floor(u() * couleurs.length)]}`;
    parent.append(e);
    const vx = (u() - 0.35) * 70, haut = 22 + u() * 40, chute = 50 + u() * 70, rot = (u() - 0.5) * 900, d = 650 + u() * 450;
    anim(e, [
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${(vx * .5).toFixed(1)}px,${(-haut).toFixed(1)}px) rotate(${(rot * .4).toFixed(0)}deg)`, opacity: 1, offset: .35, easing: 'ease-in' },
      { transform: `translate(${vx.toFixed(1)}px,${chute.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`, opacity: 0 }], { duration: d, easing: 'ease-out' })
      .finished.then(() => e.remove());
  }
}

// ─── L'ouverture : au clic, le haut du paquet se déchire (une ligne irrégulière, des éclats de papier) ; les cartes sortent par le haut,
// une à une, de face, de la plus commune à la plus rare ─────────────────────────────────────────────────────────────────────
export function dechirer(stage) {
  const r = cadre(stage, 'L\'ouverture : on déchire le paquet', 'Cliquez le paquet pour le déchirer ; les cartes sortent une à une, la plus rare en dernier. Cliquez ensuite celle à garder.');
  const table = el('div', 'bo-table'), dit = el('p', 'cs-legende', ' '), choix = el('div', 'cs-pied');
  let jeton = 0, quel = 2, tour = 0;
  const jouer = () => {
    const ce = ++jeton, vivant = () => ce === jeton, p = TIRAGE[quel], u = alea(1234 + tour++ * 7919);
    choix.querySelectorAll('button[data-k]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.k === quel));
    table.replaceChildren(); dit.textContent = ' ';
    const cartes = p.cartes.map(([id, t], i) => ({ id, t, i })).sort((a, b) => CRANS[a.t] - CRANS[b.t] || a.i - b.i);
    const b = booster({ ...p, cartes: cartes.map(c => [c.id, c.t]) }, { nb: false, graine: tour * 31 + 5 });
    const corps = b.querySelector('.bo-corps'), haut = b.querySelector('.bo-haut'), ligne = corps._ligne;
    table.append(b);
    const couleurs = [P.o, P.r, getComputedStyle(corps).getPropertyValue('--fam').trim() || P.g];
    let ouvert = false;
    b.onclick = async () => {
      if (ouvert) return; ouvert = true;
      corps.dataset.fige = '1'; corps.style.transform = ''; corps.classList.remove('is-survol'); b.style.cursor = 'default';
      b.querySelector('.bo-pointilles').remove();
      // 1. la déchirure court de gauche à droite : la bande se soulève à mesure, des éclats sautent là où le papier cède
      const pas = reduit() ? 1 : 9;
      for (let k = 1; k <= pas; k++) {
        if (!vivant()) return;
        const q = k / pas, j = Math.min(ligne.length - 1, Math.round(q * (ligne.length - 1)));
        haut.style.transform = `translateY(${(-q * 4).toFixed(1)}px) rotate(${(q * 7 + (u() - 0.5) * 1.5).toFixed(1)}deg)`;
        if (!reduit()) eclats(corps, ligne[j][0], ligne[j][1], couleurs, u, 3);
        await attendre(40 + u() * 30);
      }
      if (!reduit()) eclats(corps, W_BO - 4, ligne[ligne.length - 1][1], couleurs, u, 7);
      await anim(haut, [{ transform: haut.style.transform, opacity: 1 }, { transform: `translate(${120 + u() * 50}px,-${100 + u() * 40}px) rotate(${40 + u() * 25}deg)`, opacity: 0 }], { duration: 520, easing: 'ease-in' }).finished;
      await attendre(120);
      b.style.zIndex = 60;     // la carte qui sort passe au-dessus de celles déjà posées
      // 2. les cartes montent hors du sachet, une à une, de face, puis se posent dans le rang
      const n = cartes.length, boite = table.getBoundingClientRect();
      // le léger éventail : les cartes se chevauchent, penchent du centre vers les bords et descendent un peu sur les côtés ; la dernière sortie est dessus
      const eventail = k => { const d = k - (n - 1) / 2; return { x: d * 104, y: d * d * 7, a: d * 5 }; };
      for (const [k, c] of cartes.entries()) {
        if (!vivant()) return;
        const myth = c.t === 'relique', carteEl = carte(c.id, c.t, 'a');
        carteEl.dataset.fige = '1';
        corps.querySelector('.bo-cartes').append(carteEl);
        if (myth) await attendre(260);
        anim(corps, [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 260 });
        await anim(carteEl, [
          { transform: 'translateY(0) rotate(0)' },
          { transform: `translateY(-60px) rotate(${myth ? 0 : (k % 2 ? 1.5 : -1.5)}deg)`, offset: .35 },
          { transform: `translateY(-${H_HAUT + 14 + 232 + 16}px) rotate(0)` }], { duration: myth ? 760 : 360, easing: 'cubic-bezier(.3,.1,.3,1)' }).finished;
        if (!vivant()) return;
        const rc = carteEl.getBoundingClientRect(), place = el('div', 'bo-place');
        place.style.left = `${rc.left - boite.left}px`; place.style.top = `${rc.top - boite.top}px`;
        carteEl.getAnimations().forEach(a => a.cancel());
        carteEl.style.position = 'static';
        place.append(carteEl); place.style.zIndex = 10 + k; table.append(place);
        const f = eventail(k), cx = boite.width / 2 + f.x - 75 - (rc.left - boite.left), cy = 30 + f.y - (rc.top - boite.top);
        anim(place, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) rotate(${f.a}deg)` }], { duration: 320 });
        if (myth) {
          const e = el('div', 'cs-eclat'); place.append(e);
          anim(e, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(16)', opacity: 0 }], { duration: 800, easing: 'ease-out' });
        }
        await attendre(myth ? 260 : 110);
      }
      if (!vivant()) return;
      anim(b, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(120px)', opacity: 0 }], { duration: 500, easing: 'ease-in' });
      b.style.pointerEvents = 'none';
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
  };
  choix.append(...TIRAGE.map((p, k) => { const x = bouton(RARETES_PAQUET[p.rarete], () => { quel = k; jouer(); }); x.dataset.k = k; return x; }), bouton('Rejouer', jouer));
  jouer();
  r.append(choix, table, dit);
  return () => { jeton++; };
}
