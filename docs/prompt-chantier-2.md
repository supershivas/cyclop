# Prompt de la session « chantier 2 : des cratères moins carrés »

À coller au début d'une nouvelle session (modèle moyen, effort moyen : le sol fin est déjà branché).

---

Tu travailles sur Cyclopéen. Lis `CLAUDE.md` puis, avant de toucher à un domaine, son fichier : `docs/domaines/rendu.md` (le sol, surtout l'entrée « Le sol au demi-mètre, en jeu à partir de 4 pixels par mètre »), `docs/domaines/bataille.md` (tir, `impact`, sauvegarde rejouée), `docs/domaines/labo-atelier.md` (le labo) et `docs/domaines/tests.md` (les références à réécrire). Réponds en français, pose tes questions avec `AskUserQuestion`, pousse sur `main`. À la fin de chaque réponse, donne le nombre de tokens, le temps passé et le coût estimé.

**Le but : des cratères qui ne se lisent plus comme des carrés à gradins, sans perdre de vitesse en rendu logiciel.**

## Où l'on en est

- Depuis la v0.52.3, le sol est dessiné en cubes de 0,5 m à partir de 4 pixels par mètre (`finesseDes`, `hauteurFine` de `rendu3d.js`) ; au-dessous, la case de 1 m. Un cratère reste pourtant un carré : sa forme vient de la logique, pas du dessin.
- La forme : `impact(T, x, y, nomCal, R, n, gel)` de `js/terrain.js` creuse le `motif` du calibre (`js/data/calibres.js` : 3×3, 5×5 ou 7×7 cases, en quarts de 25 cm, `T.diff[c]--` quart par quart, la dureté du sol réduisant la profondeur), puis pose une **lèvre** de terre jetée sur l'anneau carré juste autour (`levre`, une case sur quatre sautée par un hachage de `n`, les coins jamais). Les motifs sont déjà arrondis (coins bas), mais à 1 m par case le contour reste en gradins, et la lèvre est un anneau carré.
- `hauteurFine` (sol fin) lisse la hauteur entre les cases voisines, arrondie au quart, mais **garde net un mur de 1,5 m ou plus** ; un cratère de 155 (profondeur 8 quarts = 2 m au centre) a donc encore un fond en marches.
- Pièges déjà connus : `impact()` fait partie de la partie sauvegardée et rejouée (`rejouerTerrain`) : changer un motif change la partie ; les impacts d'une partie déjà sauvegardée doivent se relire, ou on monte `VERSION` de `bataille.js` (Jérôme l'autorise tant qu'aucune partie réelle n'est en cours : pas de `??=` pour l'ancien format, pas de prévenir). Aucun hasard hors de la graine (`hash2(i, j, …)` avec le numéro `n` de l'impact). Les tests « relue au milieu » et « relue après une nuit » doivent passer.

## À faire

**Labo d'abord, jamais directement dans le jeu.** Dans `js/labo.js`, un nouveau sujet « Des cratères moins ronds… » (ou une variante du sujet existant s'il y en a un sur les obus ; cherche-le), avec des variantes `a-trancher` (`depuis: '0.52.4'`), un relevé de coût chacune, et une entrée du journal `js/labo-journal.js`. Le labo doit montrer, sur le sol fin (`finesse: 2`, zoom 6 à 8 px/m, `moteur(…)`, indice de `ZOOMS` et non des pixels par mètre) **et** au mètre (zoom 3 px/m), le même champ labouré par une salve de chaque calibre. Pistes, une variante chacune :

1. **Un motif rond** : un disque défini par le rayon (profondeur `p · (1 − (d/R)²)` ou une cuvette à fond plat), calculé au demi-mètre ou au quart de case, au lieu d'une matrice entière ; la profondeur varie un peu avec le numéro de l'impact (hachage de `n`), pas de `Math.random`.
2. **Une lèvre plus large et asymétrique** : la terre jetée part surtout du côté opposé à l'arrivée de l'obus (ou au hasard de `n`), plus épaisse sur un côté, avec des interruptions, sans coin carré.
3. **Des éclats autour** : de petits creux et de petits monticules d'un quart de mètre sur 2 à 3 anneaux, en nombre croissant avec le calibre.
4. (Au choix, si le coût le permet) un cratère **ovale**, tourné selon `n`.

Chaque variante doit tenir la même logique de jeu : même dureté, même profondeur maximale (`R.terrain.plancher`), même volume de terre creusée à peu près (le motif rond ne doit pas faire plus de victimes : `rayon` et `letal` ne changent pas), même tamis de l'eau (`T.eau[c] *= 0.3`). Mesure : le nombre de cases touchées par impact, le coût de `impact()` (micro-benchmark de 10 000 impacts dans Node, sans navigateur), et les triangles du sol dans le labo (rendu logiciel, dessin attendu : `mesure: true`, compter les pixels clairs dans le même instant que le dessin, voir `docs/domaines/rendu.md` ; une capture d'écran du canvas du labo est noire). Chaque variante affiche ce qu'elle coûte, comme les variantes du sujet « Le sol en cubes plus fins ».

Puis **une question par sujet** à Jérôme avec `AskUserQuestion` (une variante par choix, « garder l'actuel » toujours parmi eux, la recommandée en premier). Rien n'entre dans le jeu avant sa réponse. Une fois la variante retenue :

- la brancher dans `impact()` (ou `data/calibres.js`), monter `VERSION` de `bataille.js` si des impacts rejoués changent, et vérifier `rejouerTerrain` (un test qui sauve, relit et compare le terrain après une salve) ;
- vérifier au sol fin et au mètre que les soldats, tombes et arbres se posent bien sur le nouveau relief (`surface`, `surfaceLisse`), et que l'eau remplit le trou comme avant (`js/eaux.js`) ;
- réécrire `test/rendu.json` (`node outils/rendu-empreinte.mjs --ecrire`) et `test/fumee.json` **seulement après avoir regardé les images** (compare avant/après avec `--png --sortie captures/…` et dis dans la réponse quelles images changent) ; l'équilibrage (`docs/domaines/bataille.md`, skill `equilibrage`) se remesure si les pertes changent ;
- noter la décision datée, la mesure et les pièges dans `docs/domaines/rendu.md` (le dessin) ou `docs/domaines/bataille.md` (la forme), pas dans `CLAUDE.md` ; mettre à jour `version.json` (correctif ou mineur), `CHANGELOG.md`, puis `node outils/stamp-version.mjs`.

## Avant de pousser

`node outils/test-run.mjs`, `node outils/rendu-empreinte.mjs`, `node outils/fumee.mjs`, `node outils/captures.mjs --page index.html --page labo.html`, `node outils/lisibilite.mjs` si une couleur change (aucune couleur nouvelle : voir `CLAUDE.md`), `node scripts/mesure.mjs --soldats 2000 --finesse auto --zooms 3,4,5` avant et après (la mesure varie de ±10 % : lance-la deux fois), `node outils/stamp-version.mjs` après la version. Pousse sur `main` ; si le push est refusé, `git fetch`, `git rebase origin/main`, et en cas de conflit sur `js/lib/`, prends la version d'origine puis relance `stamp-version`.

## Conseils de tokens

Ne lis que les fichiers de ce chantier (`rendu.md`, `bataille.md`, `labo-atelier.md`, `tests.md`) ; `terrain.js` et `data/calibres.js` sont courts, lis-les entiers. Les chantiers 3 (arbres, saisons) et 4 (buissons) auront leur propre session.
