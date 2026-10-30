# Prompt — Lot F : bruitages (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/interface.md` (section son, `js/audio.js`) et `docs/domaines/labo-atelier.md` (sujet « Son » du labo, `js/labo-son.js`). Lis le lot F de « Retours de playtest du 30 octobre » dans `ROADMAP.md`. Questions pour Jérôme : `AskUserQuestion`.

## Problème (Jérôme)

Le son synthétisé actuel est « très mauvais » : explosions, tirs, mitraillage et vol des avions, pluie, vent.

## Décision

Des **mp3 libres de droits (CC0 / domaine public) que Claude cherche** (Freesound, etc.), copiés dans `assets/sons/` (jamais de CDN au lancement du jeu : conventions 21 et 22). Chaque fichier : nom clair, **licence, auteur et URL notés** dans `assets/sons/LICENCES.md`. **Aucune dépendance de code nouvelle** (Web Audio décode les mp3). Garder la synthèse en repli si un fichier manque.

## Marche à suivre

1. Vérifier d'abord que le conteneur atteint les sites de sons (`read_documentation` sujet `environment.network` si l'hôte est refusé). **Si le téléchargement est impossible : le dire à Jérôme** (`AskUserQuestion`) et lui demander de déposer les fichiers, ne pas inventer de sons.
2. Pour chaque famille (explosion 75 / 155 / 220, tir de fusil, mitrailleuse, mitraillage aérien, vol d'avion, pluie en boucle, vent en boucle) : 2 ou 3 candidats courts, **écoutés et choisis par Jérôme au labo** (sujet « Son ») avant le jeu.
3. Taille : mp3 mono, courts, boucles sans clic ; peser le total (viser quelques Mo, `weight` du chargement) ; chargement paresseux au premier clic (autoplay des navigateurs).
4. Brancher dans `js/audio.js` : variantes tirées par la graine du **rendu** (pas du générateur de la bataille), volume selon la distance au point visé et le zoom, plafond de voix simultanées, coupure quand l'onglet est caché (si le lot B ne l'a pas déjà fait) et respect du réglage de volume.
5. Aucun changement de l'état de jeu : empreintes de rendu et tests de règles inchangés.

## Vérifier et livrer

`node outils/test-run.mjs --court` (pureté : le son n'entre pas dans la logique), `fumee.mjs`, `captures.mjs`. Version correctif, `node outils/stamp.mjs`, push sur `main`, deux URL. Mettre à jour `interface.md` (son) et le journal du labo, sortir le lot F de `ROADMAP.md`.
