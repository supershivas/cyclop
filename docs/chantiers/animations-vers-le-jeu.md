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

1. **Publier les animations** : l'atelier les écrit dans `assets/design/animations.json` (le même chemin que les réglages : `createPublisher` de `js/lib/gh-publish.js`, un commit sur `main`) ; le jeu les charge au démarrage comme il charge le reste du contenu publié. Ajouter à `data/` un jeu d'animations **d'origine**, pour que le jeu marche sans fichier publié. (Une session.)
2. **Le lecteur d'animations**, logique pure et testée : pour un homme, *quelle animation, à quel instant* (`etatAnimation`), avec **un fondu de ~0,2 s** entre deux animations (sinon la pose saute au coup de feu) et des **couches par canaux** (`CANAUX` de `data/poses-soldat.js` : les jambes d'une animation, les bras et le fusil d'une autre). (Une session.)
3. **Le nuanceur et la texture de poses** (`soldat-articule.js`, `soldats.js`) ; mesure du coût sur 250 hommes (CPU : échantillonnage ; GPU : 2 à 3 lectures de texture par sommet, **le rendu logiciel paie déjà +24 à +48 ms pour les articulés**, à mesurer avant de promettre). `test/rendu.json` : les images d'articulés seront réécrites. (Une à deux sessions.)
4. **Qui joue quoi** : la table *état du jeu → animation* (`soldats.js`, là où `aPose` est écrit aujourd'hui) :
   - vitesse > 0 → *marche, fusil à deux mains*, à une vitesse de lecture proportionnelle à la vitesse ;
   - à l'arrêt → *repos* ;
   - un coup de feu (`tirVal` passe à 1) → *tir*, **une fois, 1 s**, qu'on laisse finir (l'homme qui tire encore pendant 1 s enchaîne : la pose dure) ;
   - feu retenu, accroupi, couché, mêlée, blessures → leurs animations (à fabriquer à l'atelier : pour l'instant calculées).
5. **Les gauchers** : `gaucher = hash(numéro) < 0,1` (le même homme est toujours gaucher, rien n'est sauvegardé, les deux joueurs voient pareil) ; sa pose est **le miroir** de celle de l'animation (`miroir` de `pose-soldat.js`, côté processeur : aucun coût GPU, aucune animation en double). Le fusil passe à l'épaule gauche (`fusilX` retourné de 0,79). L'équipement porté (gourde, cartouchières) ne se retourne pas : à regarder de près.
6. **Vérifier** : `test/` (le lecteur, le miroir, les modèles : fait pour les trois premiers), `outils/rendu-empreinte.mjs`, une mesure `scripts/mesure.mjs` à 12, 16 et 24 px/m, la fumée du HUD ne bouge pas.

## Ce qui reste à décider (par Jérôme) : le soldat qui tire s'arrête-t-il ?

Le **modèle *tir*** a les pieds plantés pendant toute la seconde ; c'est l'animation. Mais **l'homme se déplace tant que la logique le déplace** : si elle ne s'arrête pas, il glisse. Trois réponses possibles :

- **A. Le tir est visuel seulement** : jambes de la marche, bras du tir (couches par canaux) tant qu'il avance ; pieds plantés s'il est déjà à l'arrêt. Aucun changement de règle, aucun rééquilibrage. Ce n'est pas « il n'avance plus quand il tire ».
- **B. Il s'arrête pour tirer** (règle) : 1 s d'arrêt par coup, soit **jusqu'à ~20 % du temps d'un homme qui tire sans cesse**. Un assaut à travers le no man's land est ralenti d'autant ; **tout l'équilibrage du mouvement et de l'esquive** (`mouvement`, `tir.precision`, la durée des assauts) est à refaire par des mesures (`docs/domaines/bataille.md`). Plus réaliste (on ne tire pas debout en courant en 1914), plus lourd.
- **C. Il s'arrête seulement s'il est à portée d'un ennemi et sans ordre de marche pressé** (un ordre de marche prime) : intermédiaire, une règle de plus.

## Les risques

- Le coût en rendu logiciel (voir plus haut) ; le plafond de 250 hommes articulés peut baisser.
- La mêlée et les blessures déplacent tout le corps (pas seulement des angles) ; leur animation est à fabriquer avant d'enlever le code du nuanceur.
- Les poses se mélangent mal quand deux animations ont des fusils à des endroits très différents (le fondu passe par une pose bizarre) : des images de transition à fabriquer à l'atelier.
