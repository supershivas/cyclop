# Prompt — Lot E : mitrailleuses et expérience (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/bataille.md` (tir, moral, `A.exp`, chevrons, postes de mitrailleuse), `docs/domaines/interface.md` (cartes de régiments, chevrons, fiche), `docs/domaines/terrain-engins.md` (chars). Lis le lot E de « Retours de playtest du 30 octobre » dans `ROADMAP.md`. Questions pour Jérôme : `AskUserQuestion`.

## À construire (deux sous-lots, deux versions)

**E1. Mitrailleuses**
- On **sélectionne le poste** (clic, contour, comme un régiment) et on **règle la direction du cône** de tir (deux clics ou glisser, à voix haute si impossible).
- Barre de **vie** et barre de **munitions** (rechargée la nuit : corvée ou automatique ? proposer, faire trancher).
- La mitrailleuse **gagne de l'xp** (voir E2).

**E2. Expérience**
- Quand un régiment gagne de l'xp : **petite animation du chevron** (respecte le mouvement réduit du système).
- Tout ce qui a de l'xp (soldats, régiments, chars, mitrailleuses) a une **barre d'xp** et le **nombre de chevrons affiché au-dessus**.
- **Gagner un chevron est plus difficile** (trop rapide aujourd'hui) : mesurer le rythme actuel sur une bataille entière (skill `equilibrage`), proposer une courbe en `data/`, la valider avec Jérôme.
- **Un chevron donne un bonus passif, différent selon le type d'unité** (décision de Jérôme). Proposition à valider avant de coder, valeurs en `data/` : régiment = moral et précision de tir ; char = blindage ; mitrailleuse = cadence ; soldat seul = rien ou léger. Chaque bonus montré dans la fiche de l'unité.

## Règles

Pas de nombre magique ; hasard par la graine ; le rendu ne modifie pas l'état. Monter `VERSION` de bataille.js (sans migration). Tests : `node outils/test-run.mjs --court test/armee.test.mjs test/stances.test.mjs` puis `test/bataille.test.mjs`, `test/lockstep.test.mjs` + `outils/deux.mjs` (ordres de mitrailleuse via `executerCmd`). Si le dessin change : `rendu-empreinte`, `fumee`, `captures`, `audit-ecran`, `lisibilite` pour toute couleur. Version mineure par sous-lot, `node outils/stamp.mjs`, push sur `main`, deux URL. Mettre à jour `bataille.md` / `interface.md`, sortir le lot E de `ROADMAP.md`.
