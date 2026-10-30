# Prompt — Nettoyage du labo (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/labo-atelier.md` en entier (29 ko : il porte les sujets, les décisions et les pièges du labo), la section 16 de `.claude/conventions-detail.md` (Grep `^## 16\.` puis Read par plages), `docs/archives/`. Questions pour Jérôme : `AskUserQuestion`, en lots (pas une par variante).

## Le problème (Jérôme)

Le labo est très compliqué, peu organisé, et plein de choses obsolètes ou tranchées depuis longtemps. Aujourd'hui : `labo.html`, `js/labo.js` (716 lignes) et une vingtaine de `js/labo-*.js` (~5 300 lignes), un sujet par fichier (barre-temps, barre-vie, batiments, campagne, chars, clic-regiment, design-system, gaz, hud-ux, journal, moral, plaques, ponts, projections, recompenses, satisfaction, son, tranchees…).

## Objectif

Un labo **court, rangé, qui ne montre que ce qui est encore à décider ou ce qui sert de référence**. Ce qui est tranché et construit dans le jeu n'a plus sa place au labo : il part en archive avec la décision.

## Marche à suivre (ne rien supprimer avant l'accord de Jérôme)

1. **Inventaire** : lister chaque sujet et chaque variante avec son état, en croisant `labo-atelier.md`, le journal du labo (`js/labo-journal.js`), `CHANGELOG.md` et `ROADMAP.md` : *tranché et dans le jeu* · *tranché mais pas construit* (garde, c'est un cahier des charges) · *encore ouvert* · *écarté* · *outil de référence* (échelle, design system, lisibilité). Écrire le tableau dans `docs/chantiers/nettoyage-labo.md`.
2. **Proposition d'organisation** : regrouper par grandes familles (par exemple Terrain, Soldats et engins, Interface, Ambiance, Références) avec une navigation claire et un point d'état par sujet ; menu à gauche plutôt qu'une longue page ; un sujet = un fichier, un seul gabarit commun. Montrer une maquette ou une capture, **faire trancher par Jérôme** avant de refondre.
3. **Faire valider le tri** : présenter le tableau à Jérôme par `AskUserQuestion`, famille par famille, avec une action recommandée en premier (supprimer / archiver / garder).
4. **Exécuter** : pour chaque sujet archivé, déplacer sa décision et ses mesures dans `docs/archives/` (une ligne dans le tableau « Ce qui a été retiré » de `CLAUDE.md` si le jeu ne doit pas le reconstruire), supprimer ses fichiers `js/labo-*.js`, ses liens et ses références de test. Ne **jamais** supprimer un module que le jeu importe : chercher les imports (`Grep`) avant ; les modèles `THREE` du labo sortis dans `js/rendu/` restent.
5. **Factoriser** ce qui se répète (gabarit d'une variante, point d'état, accueil) dans le shell du labo (`js/lib/labo-shell.js` est de game-system : ne pas le modifier, proposer le besoin à la place).
6. **Vérifier** : `labo.html` se charge sans erreur console (`node outils/captures.mjs --page labo.html`), `audit-ecran.mjs --page labo.html`, `node outils/fumee.mjs` et `rendu-empreinte.mjs` inchangés (le jeu ne doit pas bouger), `node outils/test-run.mjs --court` si des données partagées bougent. `scripts/` et `outils/` qui visent le labo mis à jour.

## Livrer

Aucun changement pour le joueur : pas de version (le labo n'est pas le jeu), sauf si le labo est listé dans `version.json` ; commit français, push sur `main`, URL du labo. Mettre à jour `docs/domaines/labo-atelier.md` (le raccourcir : seulement ce qui reste vrai), `CLAUDE.md` (structure), `ROADMAP.md`.
