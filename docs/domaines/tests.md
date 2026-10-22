# Tests, références et mesures

<!-- Sorti de CLAUDE.md : fumée, empreinte du dessin, scripts de mesure. Le texte est celui d'origine, sans changement ; décisions datées, mesures et pièges avec leur coût. Un ajout se range ici, pas dans CLAUDE.md. -->

- Sorties courtes (économie de contexte) : `test-run.mjs --court`, `rendu-empreinte.mjs` et `fumee.mjs` n'impriment qu'une ligne quand tout est bon ; `--detail` rend la liste (Jérôme, demande d'efficacité, v0.52.2). Durées par fichier : bataille 195 s, campagne 46 s, stances 32 s, terrain 13 s, lockstep 9 s, armée 1 s.
- `test/` — `node outils/test-run.mjs` (terrain, foule, bataille, sauvegarde, pureté). `test/fumee.json` (l'empreinte du HUD, `outils/fumee.mjs`) et `test/rendu.json` (celle du dessin, `outils/rendu-empreinte.mjs`) : des références, pas des tests de règles.
- `scripts/mesure.mjs`, `scripts/trois-jours.mjs` — la mesure du critère et la
  bataille de trois jours jouée sans les mains (captures dans `captures/`).
- `lisibilite.config.mjs` — paires de couleurs et tuiles mesurées.

- **Le test de fumée est un test de refonte** (`outils/fumee.mjs`) : l'empreinte du HUD à 13 étapes (`test/fumee.json`) ne doit pas bouger quand on découpe
  du code sans rien changer ; une règle ou un texte qui change exprès demande de la réécrire (`--ecrire`, sur l'ancien code d'abord pour prouver le reste).
  Pièges rencontrés en l'écrivant : la boucle avance d'un nombre de pas qui dépend de la machine avant qu'on l'arrête (d'où `setSeed` et la pause dans le
  même instant) ; un clic à l'écran vise un point qui dépend de la respiration de la caméra, donc de l'horloge (d'où les ordres par `__jeu`) ; un ordre
  fait clignoter trois secondes d'horloge (d'où l'attente). Et (v0.40.0) le clic sur une carte glisse la caméra 0,6 s : le terrain sous la souris à l'étape `fiche-regiment` dépendait de l'instant (« Herbe » ou « Herbe rare » selon la vitesse de la machine) ; on attend 1 s avant l'étape. Et à la découpe de `rendu3d.js` : `geometrieSoldat` lisait `attrsI`, un état du rendu, sans le dire ;
  seul un essai qui compare les formes avant et après (`creerGeometries` contre l'ancien code) l'a vu.
- **L'empreinte du dessin** (`outils/rendu-empreinte.mjs`, `test/rendu.json`) : 37 images (l'écran titre, tous les zooms, obus en vol puis fumée, mêlée, souffle d'un 155, régiments choisis et survolés, tombes, ordre qui clignote et surbrillance de la visée, vue tournée, soir, nuit en trois styles,
  pluie, brouillard, gel, feu retenu de près) dont les pixels ne doivent pas bouger quand on découpe `rendu3d.js`. Elle truque `performance.now` et `requestAnimationFrame` (une image =
  1/30 s = un pas de la simulation) et `Math.random` (graine fixe) : sans cela la respiration de la caméra, la pluie et les éclats changent à chaque lancement. Le budget de ms
  du sol ne coupe plus rien (le temps ne passe pas dans une image). Les pixels sont lus dans le même instant que le dessin (`drawImage` du canvas WebGL : après, il serait vide).
  Mesurée : deux lancements identiques ; un changement de 0,0001 de la respiration change toutes les images. Un changement voulu du dessin demande de réécrire la référence (`--ecrire`) ;
  une autre machine peut donner d'autres pixels (rendu logiciel) : réécrire alors la référence sur l'ancien code avant de découper.
  **Ce que la découpe a appris** : une image que l'empreinte ne dessine pas n'est pas protégée (l'écran titre, le souffle, les anneaux de sélection, les tombes, le clignotement d'un ordre, les trois styles
  de nuit du labo n'y étaient pas : chacun a été ajouté **avant** de découper son morceau, la référence réécrite sur l'ancien code) ; régénérer la référence sans toucher le code fautif prouve le reste
  (`git stash push -- js/rendu3d.js`, `--ecrire`, `stash pop`) ; remplacer dans un fichier un texte qu'on a déjà modifié ne trouve rien (extraire le texte d'origine, le garder, puis le transformer à part).
