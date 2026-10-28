# Le design system du jeu (v0.31.3)

Une échelle déclarée une fois, dans `:root` de `css/style.css` : tout le reste en est une valeur. Aucun nombre au cas par cas (conventions, section 5). Les couleurs sont dans `js/palette.js` (variables `--jeu-*`) ; ici, tout le reste.

| Rôle | Variable | Valeur | Où |
|---|---|---|---|
| Texte, libellé | `--texte-petit` | 12 px | notes, compteurs, légendes, nom des tronçons |
| Texte courant | `--texte` | 14 px | papiers, boutons, carnet |
| Titre de papier | `--texte-moyen` | 16 px | `.fiche h2`, `.nuit h2` |
| Grand | `--texte-grand` | 20 px | titre de dialogue, calibre des batteries, numéro de carte |
| Filet | `--e0` | 2 px | entre deux cases d'une grille, sous un titre |
| Petit espace | `--e1` | 4 px | |
| Pas | `--pas` | 8 px | l'espacement par défaut d'un papier |
| Moyen | `--e3` | 12 px | marge horizontale d'un papier |
| Grand espace | `--e4` | 16 px | sous un titre de dialogue |
| Hauteur d'un bouton | `--jeu-cible` | 44 px | **tout** bouton du HUD, au moins |
| Trait | `--trait` | 1 px | liserés |
| Ombre | `--ombre-papier` | `3px 3px 0` terre | l'ombre portée d'un cran, la seule |
| Titres | `--titre-lettres` | .08 em | tous les `h2` |

Règles :
- Une valeur qui n'est pas dans l'échelle est un défaut : on la ramène à l'échelle, ou on propose d'ajouter un cran (avec sa raison).
- Les titres : un seul style (`h2` : texte normal, lettres espacées) en deux tailles : le titre d'un papier (`--texte-moyen`), le titre d'un dialogue (`--texte-grand`, majuscules).
- **Des boutons empilés ont tous la même largeur** (Jérôme, v0.38.3) : les ordres d'un régiment (formes, postures, Marcher, Regagner sa tranchée) et les corvées de la nuit sont une grille de colonnes égales (`.reg-ouvert .actions`, `--cols` : 2, et 4 pour les quatre formes qui tiennent sur une ligne), jamais des rangées de boutons à la largeur de leur texte ; un mot trop long passe à la ligne dans son bouton. Un nouveau groupe de boutons dans un papier prend la même grille.
- Les boutons du haut (Menu, Réglages, le temps) : même hauteur (`--jeu-cible`) et même habillage (papier clair, ombre d'un cran). La barre du temps, dessous, a la largeur de leur rangée.
- Les hauteurs de mise en page qui dépendent d'une ligne de texte (le drapeau de la frise) se calculent de l'échelle, ou se disent en commentaire.

Ce qui a été arrondi à l'échelle (v0.31.3, `css/style.css`) : textes de 10, 11, 13 → 12 ; 15 → 16 ; 18 → 20 (dialogues) ou 16 (papiers) ; espacements de 3, 5 → 4 ; 6 → 8 ; 9 → 8 ; 10 → 12 ; 14 → 16. Les papiers prennent 2 à 4 px de plus.

**Les états d'un bouton de papier (Jérôme, v0.98.0)** : repos (contour glaise), survol (brume sous l'encre, 7 : 1), focus clavier (anneau bleu horizon), choisi (encre sous l'os), refusé (glaise en pointillé), refusé au survol (plein, encré, sans fond : le texte ne disparaît jamais). Une couleur de texte n'est jamais celle du fond qu'elle a au survol. **Les infobulles** : une seule, `data-info` (# titre, ## sous-titre, corps, **gras**) ; un `title` du navigateur est adopté, jamais laissé. Tout cela se voit au labo, onglet « Design system » (les vraies feuilles du jeu).

**Deuxième jet (Jérôme, v0.98.1 ; EN JEU depuis la v0.98.2 : `css/ds-v2.css`, chargée après `css/style.css` par index.html et par les cadres du labo, onglet « Design system », « Révision (v2) »)** : (1) les titres (jeu, fenêtres, dialogues) en condensé fin et haut, dans le style de Cast Iron : **Antonio** (OFL, `vendor/fonts/`, graisses 100 et 300) faute de Cast Iron libre ; trois tailles de titre (40, 28, 22), capitales, `--titre-lettres` .1em ; le texte courant reste en mono. (2) **Un titre n'est jamais coupé** (ni points de suspension ni débordement ; retour entre mots, équilibré) : s'il l'est, un élément y est qui n'est pas un titre ; la fenêtre météo a pour titre « Météo », ses lignes sont des libellés (`.libelle`, 12, glaise). (3) **Marges d'un cran de plus** : papier 16 × 24 (était 8 × 12), dialogue 32, bouton 40 de haut avec 16 de souffle, 8 entre boutons (était 4), échelle prolongée à 24 et 32. (4) **Un bouton refusé se lit impossible** : hachuré, pointillé, curseur interdit, rien ne change au survol. Adapté en v0.98.2 : l'infobulle météo a pour titre « Météo » (lignes en gras = libellés), les en-têtes de la carte, du secteur et du carnet prennent la police des titres (« en face au nord » devient un libellé), l'infobulle a son titre en condensé, les quatre formes d'un régiment gardent un petit souffle (sinon « Colonne » se coupait), la fenêtre d'un bâtiment passe à 58 ch. Piège (coût : une erreur à chaque clic sur Menu, les vitesses, « À l'aube », depuis la v0.98.0) : le rebond d'un bouton (`surRebond`, main.js) bâtissait un sélecteur avec le premier `data-*` du bouton, devenu `data-info` (du texte sur plusieurs lignes) ; il saute maintenant `info` et `titre`. Les cartes de régiment gardent leur nom coupé (`.reg-carte .l1`, une étiquette de largeur fixe, pas un titre).
