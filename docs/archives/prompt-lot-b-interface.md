# Prompt — Lot B : interface (à coller au début d'une session neuve)

Lis `CLAUDE.md`, `docs/domaines/interface.md` (chargé seul dans `js/hud/`), `docs/design-system.md` et `docs/ui-cible.md`. Lis le lot B de « Retours de playtest du 30 octobre » dans `ROADMAP.md`. Questions pour Jérôme : `AskUserQuestion`.

## À construire

1. **Carte** (Jérôme : « les deux ») : un clic sur un secteur (C2) **cadre la vue 3D sur ce seul secteur** (la caméra se centre et se zoome, le reste est hors champ, la caméra ne sort jamais du terrain) **et** la carte n'affiche plus que ce secteur en gros plan (régiments, tronçons, pertes), avec un retour clair à la vue d'ensemble (bouton, Échap ou clic de nouveau). Ce que j'avais compris avant n'était pas ça : relire la demande avant de coder, puis montrer une capture à Jérôme.
2. **Fiche terrain** : les lignes longues ne sont plus coupées (« cratère 0,75 m de… ») : attention à ne pas augmenter la taille de la fiche (prévoir deux lignes dès le début si besoin. une ligne type de terrain, une ligne état du terreain?) ou abréviation lisible ; chaque pourcentage dit de quoi il parle (« boue 35 % » : de la surface ? de la case ? ajouter l'unité ou le libellé).
3. **Fiche de fin de journée en trois colonnes** : gauche, chiffres clés de la journée ; centre, médailles du jour (`js/hud/medailles.js`) ; droite, ordres aux régiments. Espaces et hiérarchie vérifiés au design system ; tenir dans un écran de 1 280 × 800 et plus petit sans débordement (`audit-ecran.mjs`).
4. **Échap ne reprend plus le jeu en pause** (il ferme les modales / annule un ordre seulement) ; vérifier la table des commandes de `interface.md`.
5. **Onglet caché** : la musique et tous les sons se coupent (`visibilitychange`), reprennent au retour ; conforme à la section 9 des conventions (pause onglet caché). Voir `js/audio.js`.
6. **Carnet de bord** : en cliquant dessus, on a tout l'historique. Les noms sont cliquables (soldats, secteurs ou régiments). Les évènements importants (un régiment ennemi lance un assaut, la perte d'un secteur, le gain) sont mis en valeur avec une icone et un unique et léger clignotement.
7. **illustration de l'écran d'accueil** Jamais de son autre que la musique. Pas de HUD, pas de "C" de capitaine ou autres indications d'interface. Uniquement des éléments tangibles.
8. **boutons "pause, réglages, vitesse de jeu "** revoir leur layout. Ils ne sont plus centrés (design system)

## Vérifier et livrer

`node outils/fumee.mjs` (réécrire `test/fumee.json` après avoir regardé les captures), `captures.mjs`, `audit-ecran.mjs`, `lisibilite.mjs` si couleur. Version correctif (mineur si la carte change de comportement), `node outils/stamp.mjs`, commit français, push sur `main`, deux URL. Mettre à jour `interface.md` (commandes, pièges), sortir le lot B de `ROADMAP.md`.
