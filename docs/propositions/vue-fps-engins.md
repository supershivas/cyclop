# La vue à la personne : le soldat, puis le char et l'avion (proposition, 20 nov.)

Jérôme : « regarde la vue FPS et propose des améliorations (vraie visée avec tir dans toutes les directions/hauteurs, course, corps à corps, etc) » ; « préparer l'équivalent pour les chars et les avions (décollage et atterrissage automatiques mais vol, altitude et tirs manuels ou auto) ».

Rien n'est construit : c'est un plan, en lots, avec les décisions à trancher à la fin.

## Ce qui existe (v0.150.1)

- **Le soldat** (`hud/suivi.js`, `tir-joueur.js`, `army.js` `ctx.pilotes`) : œil à 1,6 m (+0,6 sur la banquette), champ de 70°, ZQSD au regard, souris capturée, fusil dessiné par-dessus (`rendu/fusil-vue.js`), un coup toutes les 1,6 s ; le rayon suit le regard (cap et élévation : on tire déjà en haut et en bas), s'arrête au relief, touche le premier homme d'en face à 0,3 m du rayon, **puis un jet de dés** (adresse, distance, peur, fatigue) décide. Interface cachée, mort → fiche du défunt. À deux : `B.pilotes[camp]` passe par le lockstep (`commanderPilote`).
- **Le char** : vue « à la personne » sous le canon, mais **on ne commande rien** : il suit sa route (`chemin`), son canon vise seul (`viser` : la plus forte densité d'ennemis à portée), la souris tourne seulement le regard.
- **L'avion** : vue au bout de l'hélice, **sa trajectoire est une fonction du temps** (`positionDe(v, temps)` : roulage, montée en Dubins, passe, remontée, circuit, finale, roulage). C'est ce qui le rend déterministe, sauvegardable et dessinable sans rien demander ; c'est aussi ce qu'il faut ouvrir pour le piloter.

Ce qui manque au soldat, mesuré dans le code : le jet de dés rend le viseur décoratif (viser à 10 cm de la tête ou dans le ventre donne la même chance) ; pas de course, pas d'accroupi ; le corps à corps est automatique (`army.js`, l'ennemi le plus proche à portée de baïonnette) ; la balle ne touche ni char, ni avion, ni servant de mitrailleuse, ne s'arrête ni sur un arbre ni sur un homme de chez nous ; pas de magasin ; la mort de l'homme rend la vue.

## Le principe commun : un pilote par camp, de genre quelconque

`B.pilotes[camp] = { genre: 'soldat' | 'char' | 'avion', id, … }`, toujours hors de l'état sauvegardé, toujours posé par des commandes (`commanderPilote`, déjà dans le lockstep). Chaque genre a sa fonction pure qui lit l'entrée au pas suivant (`army.js` pour l'homme, `avancerChars`, `avancerAvions`), et sa caméra dans `suivi.js`. Une partie relue n'a plus de pilote : l'engin repasse en automatique. **Tout ce que l'écran montre de la visée (le balancement, la dispersion) est une fonction pure de l'état et du temps de jeu**, lue par l'écran et par la simulation : à deux, les deux machines tirent la même balle.

## 1. Le soldat

### 1a. Une vraie visée (le viseur décide, plus le dé)
- **La balle part où est le guidon** : le jet de chance est remplacé par un écart du rayon. `balancement(A, i, temps)` (pur, dans `tir-joueur.js`) : une courbe lente (souffle, 0,3 s et 4 s) dont l'amplitude dit la peur, la fatigue des bras, la course qu'on vient de faire, le bras blessé ; l'adresse la réduit. L'écran dessine le fusil et le viseur décalés de cet écart ; la simulation ajoute le même écart au cap et à l'élévation de la commande. Plus une petite dispersion de l'arme (0,15° au Lebel), tirée de la graine.
- **Où l'on touche compte** : la boîte de l'homme est coupée en trois (tête 0,25 m, tronc, jambes) ; la tête tue, le tronc tue ou blesse (`mortelTir`), les jambes blessent aux jambes (`blessure` jambes : il boite), un bras visé blesse au bras. Tapi, il n'a que la tête et le haut du tronc au-dessus du parapet.
- **Épauler** (bouton droit maintenu) : champ 70° → 35°, balancement ×0,5, marche ×0,4. **Coût : le clic droit libère la vue aujourd'hui** ; il passerait à Échap seul (et à « Libérer la vue »).
- **Tout ce qui arrête une balle l'arrête** : le relief (déjà), les troncs (rayon 0,3 m, la liste des arbres du terrain), un homme de chez nous (il est touché : tir fratricide, puni de moral), un char (la coque encaisse, `pv` −0,5 : rien, mais on l'entend), un servant de mitrailleuse (il tombe : la mitrailleuse se tait), un avion bas (sous 60 m, petite chance : `exposition` en compte déjà le principe).
- **La chute de la balle** au-delà de 200 m (hausse du Lebel réglée à 400 m : la balle passe au-dessus d'abord) : on vise plus bas de près. Optionnel, à trancher.
- **Le magasin** : Lebel, 8 dans le tube + 1 dans la chambre ; R recharge cartouche par cartouche (0,5 s chacune, interrompue par un tir) ; en face, le Mauser, lame de 5 (2,5 s d'un coup). Une rangée de cartouches en bas d'écran, rien d'écrit (règle de l'interface). Les nombres : `data/tir-joueur.js`.

### 1b. Le corps
- **Courir** (Maj) : ×1,7, la fatigue des jambes monte, pas de tir (le fusil se baisse), le balancement grimpe et retombe en 3 s. Course longue à bout de fatigue : il ralentit seul.
- **S'accroupir / ramper** (C ou Ctrl, deux crans) : œil à 1,0 puis 0,35 m ; le corps visé par l'ennemi raccourcit (les tirs d'en face lisent déjà la hauteur d'un homme `tapi`) ; marche ×0,5 puis ×0,2.
- **Sauter le parapet** : Espace au pied d'une échelle ou d'une paroi de 2 m (`V.mur`) : il franchit en 1,2 s. **Coût : Espace est la pause** ; dans la vue d'un homme, la pause serait P (à trancher).
- **Être touché se sent** : un liseré rouge du côté d'où vient le coup, le monde qui penche une seconde ; un obus tout près assourdit (son étouffé, 2 s) et voile l'image ; la peur rétrécit le champ (un vignettage qui suit `A.peur`). Coupé si le système demande moins de mouvement, sauf le liseré.
- **Blessé** : jambes, il boite (la vitesse de la règle actuelle) ; bras, il n'épaule plus (déjà refusé).

### 1c. Le corps à corps
- **La baïonnette** (F, ou clic à moins de 2 m d'un ennemi) : un coup dans un cône de 50°, 1,8 m ; la chance est celle de la mêlée de `army.js` (force contre endurance) multipliée par la justesse du coup (l'ennemi au centre du cône : ×1,3 ; au bord : ×0,7). 0,9 s entre deux coups. **La charge** : courir + F = le coup part à l'arrivée, ×1,4.
- **Parer** (bouton droit maintenu sans ennemi à portée de fusil : le fusil en travers) : la chance de l'adversaire ×0,5, plus de coup à soi.
- **Crosse** quand le magasin est vide et l'ennemi au contact : comme la baïonnette, moins mortelle (assomme : il tombe blessé).
- L'automatique de `army.js` se tait pour l'homme piloté (comme le tir aujourd'hui).

### 1d. L'homme dans son régiment
- **« À moi ! »** (V) : les hommes de son régiment à 25 m le suivent (leur but devient sa position, puis sa direction) tant qu'on tient la touche ; c'est le seul ordre du pilote.
- **Mort, un autre** : à la mort de l'homme, au lieu de rendre la vue, une seconde sur le corps puis Tab passe au plus proche de son régiment (Échap rend la vue) ; Tab marche aussi vivant (changer d'homme). La fiche du mort reste celle de la v0.148.0.
- **Grenade** (G, maintenir = la portée) : un arc, 4 s de mèche, un éclat de `75` en plus petit (`calibres` : un calibre `grenade`) ; deux par homme, rendues la nuit. Optionnel.

## 2. Le char

Décollage et atterrissage n'ont pas d'équivalent ; le pendant est **le trajet automatique jusqu'au front et le retour au parc**, la conduite à la main entre les deux.

- **Prendre le volant** (le bouton « À la personne » de la fiche, puis un clic) : `B.pilotes[camp] = { genre: 'char', id, av, tourne, tourelle, tir, mitr, auto }`. Dans `avancerChars`, si le char est piloté, la cible du moment (`vx, vy`) est remplacée par le cap de la main : **Z/S** avance et recule (l'accélération et la vitesse du modèle), **Q/D** fait pivoter la coque (la vitesse de virage de `CHAR_ROUTE.virage` : il ne tourne pas sur place à pleine vitesse). Les cratères, l'eau profonde, l'enlisement, les ponts qui cèdent : **inchangés**.
- **Le canon** suit la souris dans son débattement : le Schneider CA1 a son 75 en casemate à droite, ±20° (à mettre dans `data/chars.js`, `canon.debattement`) ; un modèle à tourelle (Renault FT, s'il vient) aurait 360°. Le point visé est l'intersection du regard avec le sol (`portee`, `minimum` du modèle) ; clic gauche = un obus, dispersion ×0,5 de l'automatique (on vise mieux qu'au hasard) ; la recharge est celle du modèle, montrée par une barre qui se remplit.
- **Les mitrailleuses** (clic droit maintenu) : la rafale part dans le cône du regard (±30°) au lieu de tout le cercle de portée.
- **Manuel ou automatique, séparément** : deux bascules, conduite (A) et tir (T). Tir auto + conduite manuelle : on roule, il tire seul (le `viser` d'aujourd'hui). Conduite auto + tir manuel : il suit sa route, on tire. Le reste du temps, un ordre de la fiche (marche, arrêt, cible) reprend la main.
- **La vue de la fente** (en option) : un cache noir à fente horizontale, le monde vu par la visière de pilotage ; Maj passe à la vue du canon (téléobjectif ×2, déjà dans `suivi.js`).
- **Rentrer** (R) : la route automatique vers le parc (`routeChar` vers `sortieChars`), la vue reste à bord.
- **Coût** : `viser` ne doit plus être appelé pour un char au tir manuel ; la route (`c.chemin`, `c.k`) doit être recalculée quand on rend la main (`ordonnerChar(…, 'marche', tx, ty)` depuis la position).

## 3. L'avion

Le cœur du travail : **un vol qui n'est plus une fonction du temps**.

- **Deux régimes du même vol** : `v.mode = 'trace'` (aujourd'hui, inchangé) ou `'main'`. En main, le vol garde son état (`x, y, h, cap, pente, roulis, t`) dans `etat.mitraillages` (sauvegardé) et `avancerAvions` l'intègre à chaque pas ; `positionDe` lit cet état au lieu de la formule. Le dessin, l'exposition au feu, la chute, l'épave n'ont rien d'autre à changer : ils lisent déjà `positionDe`.
- **Le décollage reste automatique** : on prend la main au plus tôt à la fin de la montée (`s ≥ 0`, l'avion à `croisiere`) ; avant, la commande est refusée à voix haute (« Il décolle »).
- **Le vol à la main** : la souris (ou Q/D) incline (roulis jusqu'à 40°, `circuit.inclinaison`), le virage suit le roulis (le rayon de `rayonVirage`, rien de plus serré) ; Z/S pique et cabre (pente ±0,35 rad), l'altitude bornée de 8 m au-dessus du sol (en dessous : il s'écrase, `ecraser`) à 150 m ; la vitesse est constante (40 m/s), Maj la pousse à 48 en piqué. Hors du terrain + `sortie`, il vire seul vers le centre.
- **Le tir** : manuel, la mitrailleuse tire dans l'axe (clic gauche maintenu) : les balles tombent où l'axe de l'avion rencontre le sol, une bande de 4 m qui avance avec lui, la létalité de `MITRAILLAGE.letal` ; on peut **labourer une tranchée en enfilade** ou rater. Automatique : il tire seul sur ce qui passe sous l'axe à moins de 30 m de hauteur. Les bandes (`balayer`, `labourer`) sont déjà des fonctions d'un segment : il suffit de leur passer le segment parcouru dans le pas.
- **Les munitions et l'essence** : 500 cartouches (trois rangées qui se vident), 4 min d'essence ; vides, ou sur R : **le retour automatique**. On calcule à cet instant le circuit de retour (`raccorder` de la pose courante vers l'axe de la piste, puis la finale et le roulage d'`atterrissageDe`) : le vol repasse en `'trace'` sur ce dernier tronçon. **L'atterrissage est automatique**, comme demandé.
- **La vue** : le roulis et le tangage de l'avion sont enfin suivis par la caméra (aujourd'hui la caméra reste à plat) ; un horizon en bas (une barre), l'altitude en colonne, les munitions en rangées : aucun texte.
- **Coût et risque** : l'intégration du vol doit être déterministe à deux (pas de `Math.sin` d'une valeur qui diffère : les commandes sont arrondies au millième, comme pour le soldat ; l'intégration en `x += v·cos(cap)·dt` est la même sur les deux machines tant que le moteur JS est le même ; à mesurer avec `outils/deux.mjs`). Une partie relue pendant un vol à la main : l'avion repart en retour automatique depuis sa pose sauvegardée.
- **Plus tard, pas dans ce lot** : les avions d'en face qui chassent les nôtres (il n'y a pas de combat aérien aujourd'hui), la DCA.

## Lots proposés, dans l'ordre

| Lot | Contenu | Version | Tests |
|---|---|---|---|
| 1 | Soldat : vraie visée (balancement pur, zones du corps), épauler, magasin — **fait en v0.151.0**, avec la fiche du mort (`interface.md`, « La vraie visée ») | mineure | « le tir du joueur » étendu ; à deux : même balle |
| 2 | Soldat : course, accroupi/ramper, parapet, sensations | correctif | marche et fatigue (`armee.test.mjs`) |
| 3 | Soldat : baïonnette, charge, parade, crosse ; « À moi ! », Tab | mineure | mêlée pilotée, test à deux |
| 4 | Char : conduite et canon à la main, bascules auto, retour au parc | mineure | `bataille.test.mjs` : conduite, enlisement inchangé, relue |
| 5 | Avion : vol à la main, tir dans l'axe, retour et atterrissage automatiques | mineure | positions intégrées, relue en vol, `deux.mjs` |
| 6 | Obstacles aux balles (arbres, amis, chars, servants), chute de la balle, grenades | correctif | rayon contre arbre, fratricide |

Chaque lot : `rendu-empreinte` (le fusil et la caméra), `fumee.mjs` (les boutons de fiche), le test « à deux » de `bataille.test.mjs`. Les nombres vont dans `data/tir-joueur.js`, `data/chars.js`, `data/mitraillage.js` (une section `main`).

## Tranché (Jérôme, 20 nov.)

1. **Le viseur décide** : plus de jet de dés ; l'adresse ne joue que sur le balancement ; la tête tue, les jambes blessent.
2. **Clic droit maintenu : épauler** ; Échap seul libère la vue ; dans la vue d'un homme, Espace saute le parapet et P met en pause.
3. **À sa mort, un camarade** : une seconde sur le corps, puis Tab prend le plus proche de son régiment ; Échap rend la vue et ouvre la fiche du mort.
   **Et la fiche du mort s'améliore** (Jérôme : « le corps n'est pas indemne, on doit avoir la cause, l'endroit de la balle, l'éclat responsable ; vérifier que les infos sont pertinentes ») : la silhouette de la fiche porte la blessure là où elle est (tête, tronc, bras, jambes) ; la cause dit l'arme précise (balle de Mauser, éclat de 77, de 150, mitrailleuse, baïonnette, avion, char, écrasé, noyé) et, s'il se peut, qui (le tireur, la batterie, l'avion) ; il faut donc noter dans `etat.defunts` la zone touchée et la source exacte (aujourd'hui : une cause générale), et relire chaque champ de la fiche d'un mort pour ôter ce qui n'a plus de sens (peur, fatigue, « indemne »).
4. **On commence par le lot 1** (visée et magasin), avec la fiche du mort ci-dessus, puisque les zones du corps la nourrissent.
