# Brancher les animations de l'atelier dans le jeu (plan, 8 novembre)

Demande de Jérôme (8 nov.), à partir de sa pose de tir : « que le soldat n'avance plus quand il tire » ; « que la pose dure (1 s ?) » ; « que le soldat avance avec son fusil dans les deux mains, plutôt droitier (un miroir pour les 10 % de gauchers ?) » ; « savoir comment intégrer l'animation au jeu ».

## Où on en est

- **L'atelier** (`atelier-animation.html`) fabrique des animations : des images clés, chacune une pose (22 + 3 champs d'angles et de déplacements), jouées en boucle, une fois ou en aller-retour ; une bibliothèque, des modèles (`js/anim-modeles.js` : *marche, fusil à deux mains*, *tir de 1 s, pieds plantés*, *repos*), la version gauchère (`miroirAnimation`), l'export JSON. **Rien de cela n'est lu par le jeu.**
- **Le jeu** calcule toutes les poses **dans le nuanceur** (`rendu/soldat-articule.js`, lignes « la pose ») à partir de quatre nombres par homme (`aPose` : vitesse, tir, accroupi, couché) et de la phase de la marche. Il ne connaît pas d'animation : la marche et le tir se **superposent** (un homme qui tire garde ses jambes qui marchent et continue d'avancer ; le tir dure 0,6 s, `tirVal` qui retombe de `1,6 × dt`, `rendu/eclats.js`). Un soldat tire **en moyenne toutes les 5 s** (`R.tir.periode` = 5, tirée entre 2,5 et 7,5 s, `army.js`), et marcher et tirer sont deux choses indépendantes de la logique (`army.js` : la marche suit les ordres, `tirer` n'arrête personne).
- **Seuls les 250 hommes les plus proches** (à 12 px/m et plus) sont articulés ; les autres (boîtes, silhouettes, équipés) gardent leur pose calculée : **on n'anime pas les 8 000**.

## Le principe : l'animation se joue côté processeur, le nuanceur ne fait que plier

Pour 250 hommes, échantillonner une animation en JavaScript coûte presque rien (`echantillon` : une interpolation de 25 nombres). Faire lire les images clés au nuanceur, sommet par sommet, serait plus cher et plus compliqué. Donc :

1. **Chaque homme articulé a, à chaque image, une pose complète** (les 25 nombres), tirée de son animation à son instant.
2. **Le nuanceur lit cette pose au lieu de la calculer.** Il sait déjà le faire : la **pose libre** de l'atelier (`uLibre`, `uP[25]`) est exactement cela, pour un seul homme. Pour 250 hommes, les nombres passent par **une texture** (RGBA flottants, 7 texels de large sur 250 de haut, une ligne par homme, relue par un indice d'instance) : **on ne peut pas ajouter 7 attributs d'instance** (le nuanceur en a déjà 14 sur les 16 que garantit WebGL). Chaque sommet ne lit que les 2 ou 3 texels de son os.
3. **Les poses calculées d'aujourd'hui deviennent des animations** (repos, marche, tir, accroupi, feu retenu, mêlée, couché, blessures) : d'abord on prouve que **l'atelier les rejoue au pixel près** (c'est déjà vrai pour sept d'entre elles ; la mêlée à quelques pixels), puis seulement on supprime le code du nuanceur. Le nuanceur y gagne en simplicité.

## Les étapes

1. **Publier les animations** : l'atelier les écrit dans `assets/design/animations.json` (le même chemin que les réglages : `createPublisher` de `js/lib/gh-publish.js`, un commit sur `main`) ; le jeu les charge au démarrage comme il charge le reste du contenu publié. Ajouter à `data/` un jeu d'animations **d'origine**, pour que le jeu marche sans fichier publié. (Une session.) **Fait (8 nov.)** : `js/animations-store.js` (`fichierAnimations`, `lireAnimations`, `chargerAnimations`, hors du chargement du jeu), `js/data/animations.js` (les trois modèles figés), bouton « Publier » de la bibliothèque (`atelier-frise.js` ; le jeton se colle dans `atelier.html`), `test/design-animations.test.mjs`. Le jeu n'en lit rien.
2. **Le lecteur d'animations**, logique pure et testée : pour un homme, *quelle animation, à quel instant* (`etatAnimation`), avec **un fondu de ~0,2 s** entre deux animations (sinon la pose saute au coup de feu) et des **couches par canaux** (`CANAUX` de `data/poses-soldat.js` : les jambes d'une animation, les bras et le fusil d'une autre). (Une session.)
3. **Le nuanceur et la texture de poses** (`soldat-articule.js`, `soldats.js`) ; mesure du coût sur 250 hommes (CPU : échantillonnage ; GPU : 2 à 3 lectures de texture par sommet, **le rendu logiciel paie déjà +24 à +48 ms pour les articulés**, à mesurer avant de promettre). `test/rendu.json` : les images d'articulés seront réécrites. (Une à deux sessions.) **Fait (8 nov.)** pour la texture : `js/rendu/pose-jeu.js`, `uPoses`/`uTex` dans le nuanceur, le calcul d'avant gardé derrière `ARTICULE.texture` (voir `docs/domaines/rendu.md`) ; les 40 images de `test/rendu.json` sont restées identiques (elles n'ont pas été réécrites) ; le calcul du nuanceur reste à retirer à l'étape 4, et la table état → animation n'est pas branchée.
4. **Qui joue quoi** : la table *état du jeu → animation* (`soldats.js`, là où `aPose` est écrit aujourd'hui) :
   - vitesse > 0 → *marche, fusil à deux mains*, à une vitesse de lecture proportionnelle à la vitesse ;
   - à l'arrêt → *repos* ;
   - un coup de feu (`tirVal` passe à 1) → *tir*, **une fois, 1 s**, qu'on laisse finir (l'homme qui tire encore pendant 1 s enchaîne : la pose dure) ;
   - feu retenu, accroupi, couché, mêlée, blessures → leurs animations (à fabriquer à l'atelier : pour l'instant calculées).
5. **Les gauchers** : `gaucher = hash(numéro) < 0,1` (le même homme est toujours gaucher, rien n'est sauvegardé, les deux joueurs voient pareil) ; sa pose est **le miroir** de celle de l'animation (`miroir` de `pose-soldat.js`, côté processeur : aucun coût GPU, aucune animation en double). Le fusil passe à l'épaule gauche (`fusilX` retourné de 0,79). L'équipement porté (gourde, cartouchières) ne se retourne pas : à regarder de près.
6. **Vérifier** : `test/` (le lecteur, le miroir, les modèles : fait pour les trois premiers), `outils/rendu-empreinte.mjs`, une mesure `scripts/mesure.mjs` à 12, 16 et 24 px/m, la fumée du HUD ne bouge pas.

## Décidé (Jérôme, 8 nov.) : le soldat tire en marchant (réponse A)

**Aucun changement de règle ni d'équilibrage** : la logique du jeu (`army.js`) ne bouge pas, un homme qui tire continue d'avancer comme aujourd'hui. Ce que cela demande au dessin :

- **Des couches par canaux** (`CANAUX` de `data/poses-soldat.js`) : *en marche*, les jambes (et le buste) viennent de l'animation de marche, les **bras et le fusil** de l'animation de tir ; *à l'arrêt*, tout vient du tir (pieds plantés, comme le modèle de l'atelier). Le lecteur d'animations (étape 2) fait donc le mélange canal par canal, avec le fondu de 0,2 s.
- **L'animation de tir est en deux parties à fabriquer à l'atelier** : le modèle d'aujourd'hui (*tir de 1 s, pieds plantés*) sert à l'arrêt ; pour la marche, **seuls les canaux bras et fusil comptent** (le jeu ignore ses jambes : rien à refaire, la couche le fait). À vérifier à l'écran : un fusil à l'épaule pendant que le corps oscille de la marche (le buste penché de la marche se superpose au buste du tir : choisir quel canal « corps » gagne).
- **Le fusil à deux mains de la marche** et **le tir** doivent avoir des fusils proches l'un de l'autre pour que le fondu ne passe pas par une pose étrange (voir « Les risques »).

## Les risques

- Le coût en rendu logiciel (voir plus haut) ; le plafond de 250 hommes articulés peut baisser.
- La mêlée et les blessures déplacent tout le corps (pas seulement des angles) ; leur animation est à fabriquer avant d'enlever le code du nuanceur.
- Les poses se mélangent mal quand deux animations ont des fusils à des endroits très différents (le fondu passe par une pose bizarre) : des images de transition à fabriquer à l'atelier.
