# Proposition pour CONVENTIONS.md (supershivas/game-system) : les infobulles

Règle décidée par Jérôme le 18 nov. 2026, pour tous ses jeux. Cette session n'a accès qu'à
`supershivas/cyclop` : la section est à reporter dans `CONVENTIONS.md` de game-system, au
socle (une ligne) et en section 5 ou 13 (le détail). Construite et mesurée dans Cyclopéen
v0.149.4.

## Une ligne pour le socle

- Infobulles : un liseré sombre, jamais de césure, jamais de bloc de texte (titre, gras, tableaux,
  icônes), une espace insécable avant `: ; ! ?` et dans les « » (13).

## La section

**Les infobulles** (Jérôme, 18 nov. 2026)

- **Un liseré sombre** autour de chaque bulle : une bulle claire posée sur un papier clair ne se
  détache pas sans lui (dans Cyclopéen, `border: 2px solid var(--jeu-fond)`, en plus de l'ombre).
- **Jamais de césure** ni de mot coupé : `hyphens: none ; overflow-wrap: normal ; word-break: normal`
  (un `overflow-wrap: anywhere` hérité coupe « Expé-rience » au milieu).
- **Jamais de bloc de texte.** Une bulle se lit d'un coup d'œil : un titre, puis des rangées
  libellé | valeur, du gras sur le chiffre qui compte, une icône quand elle suffit. Une phrase
  reste permise si elle tient en deux lignes de bulle (environ 76 caractères pour une bulle de
  38 caractères de large) ; trois lignes simples à la suite sont un bloc.
- **La syntaxe** (un seul module de bulle par jeu, qui rend `data-info`) :
  - `# Titre`, `## Sous-titre`, une ligne simple, `**gras**` ;
  - une ligne qui porte ` | ` est une rangée de tableau : `Vivres | **2** sur 3` ; les rangées qui se
    suivent font un seul tableau ; la première cellule est le libellé, en gras ;
  - la première rangée d'un tableau à plusieurs colonnes, sans chiffre, est son en-tête
    (`Hommes | Nous | En face`).
- **La typographie française est posée au rendu**, pas dans les sources : une espace insécable
  avant `: ; ! ? %` et `»`, après `«` ; un deux-points collé à un mot (« Vivres: ») en reçoit une ;
  `12:30`, `x2` et les adresses ne bougent pas. Les textes des sources gardent leurs espaces
  ordinaires (plus simples à écrire et à chercher).
- **Un outil le vérifie** : il ouvre le jeu, relève toutes les bulles de quelques moments, les rend
  comme le jeu et signale les paragraphes trop longs, les blocs et toute ponctuation sans
  insécable (dans Cyclopéen : `node outils/infobulles.mjs`, `--strict` pour un code 1).

**Coût** (pourquoi la règle) : des bulles de trois ou quatre lignes de prose (« 94 debout · 0 blessés
· 0 tombés », « Génie : 2 section(s) au dépôt, 0 en route… ») qu'on ne lisait pas ; un « : » rejeté
seul en début de ligne ; une bulle claire invisible sur le papier clair de la nuit.

## Pour LECONS.md (un piège qui vaut pour tous)

- Une empreinte de HUD qui ne garde que la longueur des gros éléments (au-delà de 4 000
  caractères) ne peut pas dire si une refonte du texte des bulles a changé autre chose : il faut
  retirer `data-info`, `title` et `aria-label` **avant** de mesurer, des deux côtés (Cyclopéen :
  `node outils/fumee.mjs --sans-bulles --ref <empreinte du code d'avant>`).
