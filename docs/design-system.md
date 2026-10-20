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
