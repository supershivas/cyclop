# Prompt — Lot D : renforts et déroute (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/bataille.md` (réserves, relève, moral, déroute, corvée `releve` de `nuit.js`), `docs/domaines/interface.md` (le camp et la caserne), `docs/chantiers/camp-et-ameliorations.md`. Lis le lot D de « Retours de playtest du 30 octobre » dans `ROADMAP.md`. Questions pour Jérôme : `AskUserQuestion`. À faire **après le lot C** (les missions), car la contre-attaque forcée dépend de ce que « secteur perdu » veut dire.

## À construire

1. **Les renforts s'affichent dans la caserne**, plus dans le panneau en haut à gauche (retirer l'affichage d'avant). Le clic sur la caserne montre les régiments frais disponibles.
2. **Déploiement à tout moment** s'ils sont disponibles (pas seulement la nuit) : un ordre refusé à voix haute avec la raison s'il est impossible.
3. **Placement automatique** : le régiment sort de la caserne et prend le **premier secteur allié libre** (définir « libre » : sans régiment allié, ou le moins garni). **Si tous les secteurs sont tenus par l'ennemi ou pleins (décision de Jérôme) : contre-attaque forcée**, en colonne vers le secteur perdu le plus proche. Cas non tranché (aucun secteur perdu mais tous pleins) : le demander à Jérôme.
4. **Déroute** : les soldats en fuite se dirigent vers la caserne (champ de coûts vers elle, pas le bord du terrain) ; arrivés, ils peuvent former une unité de renforts **le jour suivant** (effectif, moral, xp à décider avec Jérôme : proposer des valeurs en `data/`).
5. Jeu à deux : tout passe par `executerCmd` (lockstep), pour les deux camps ; le camp d'en face a sa caserne (v0.92.0).

## Règles

Données dans `data/`, règles en code, hasard par la graine uniquement. Monter `VERSION` de bataille.js si l'état change (sans migration). Tests : `node outils/test-run.mjs --court test/bataille.test.mjs` (`--filtre releve`, `--filtre deroute`), tests « relue au milieu » et « relue après une nuit », puis `test/lockstep.test.mjs` et `node outils/deux.mjs`. Mesure d'équilibrage (skill `equilibrage`) : une bataille entière avec et sans déploiement libre. Puis `fumee.mjs`, `captures.mjs`, `audit-ecran.mjs`. Version mineure, `node outils/stamp.mjs`, push sur `main`, deux URL. Mettre à jour `bataille.md`, `interface.md`, sortir le lot D de `ROADMAP.md`.
