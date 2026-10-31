# Prompt — Lot A : visuels (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/rendu.md` (chargé seul dans `js/rendu/`), `docs/domaines/terrain-engins.md` (chars, avions, eaux) et `docs/domaines/interface.md` pour la fenêtre d'ordres. Lis le lot A de « Retours de playtest du 30 octobre » dans `ROADMAP.md`. Questions pour Jérôme : `AskUserQuestion`. **Labo avant jeu** pour toute forme nouvelle (arbres, fumée) : variantes tranchées par Jérôme.

Sans perdre de vitesse en rendu logiciel : mesurer (`scripts/mesure.mjs --soldats 2000`, triangles avant / après) et l'écrire dans `rendu.md`. Aucun `Math.random` ni tirage du générateur de la bataille pour le dessin.

## Ordre conseillé (un commit / une version correctif par sous-lot)

1. **Bugs d'abord** : la piste de l'aérodrome qui scintille (probablement deux faces à la même hauteur : décaler ou supprimer l'une) ; les bâtiments de la base sont toujours sur un plan bien plat, pas de collines qui les feraient léviter étrangemet ; la pluie et la neige sont coupées au début du ciel ; le sol de l'aérodrome qui doit être celui du terrain (seule la piste a sa couleur, plus quelques lignes blanches) ; la pause "temps arrêté" doit arrêter tout ce qu'il se passe à l'écran : nuage, particules, etc (on conserve la caméra libre et la possibilité de donner des ordres), ajouter un effet qui ternit les couleurs pour simuler lq pause. Toute couleur nouvelle : `outils/lisibilite.mjs`.
2. **Météo** : transition terre sèche → boue douce et organique (taches qui grandissent, pas un fondu uniforme) ; une pluie continue  doit  aplanir les cratères et créé des lacs plutôt que plein de petites flaques (l'eau s'y accumule et rabote le relief : lire `eaux.js` et `terrain.js`, tests `test/terrain.test.mjs`, mesurer un cratère avant / après trois jours de pluie).
3. **Aérodrome et chars** : les avions décollent de la piste avant leur attaque ; le char part du parc des chars ; le parc et l'aérodrome affichent le nombre total, un bouton vers les chars déployés avec leur état, un clic centre la vue sur le char.
4. **Fenêtre d'ordres du char** : décollée des boutons d'artillerie, boutons au design system, ordre en cours, vie du char ; dire à quoi sert la 2e barre bleue (cooldown du canon ? elle ne bouge pas) puis la faire vivre ou la retirer ; les chars sont trop durs à arrêter par l'artillerie : **mesurer** (skill `equilibrage`) puis régler dans `data/`.
5. **Arbres** : animation de chute sous un bombardement ; feuillage ellipsoïdal (rond) ; même aspect à tous les zooms (on simplifie les formes, on n'en retire pas le nombre).
6. **Fumée** : ellipses à la place des cubes, volutes plus réalistes (variantes au labo).

## Vérifier et livrer

Tests ciblés de `CLAUDE.md`, `node outils/rendu-empreinte.mjs` (réécrire `test/rendu.json` seulement après avoir regardé les images), `fumee.mjs`, `captures.mjs`, `audit-ecran.mjs` pour la fenêtre d'ordres. Version correctif par sous-lot, `node outils/stamp.mjs`, commit français, push sur `main`, deux URL. Mettre à jour `rendu.md` / `terrain-engins.md`, sortir les points livrés de `ROADMAP.md`.
