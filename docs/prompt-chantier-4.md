# Prompt de la session « chantier 4 : des buissons plus variés »

À coller au début d'une nouvelle session (modèle moyen, effort moyen). À faire **après** le chantier 3 (arbres, saisons) : il réutilise ses choix de saisons et de couleurs de feuillage.

---

Tu travailles sur Cyclopéen. Lis `CLAUDE.md` puis, avant de toucher à un domaine, son fichier : `docs/domaines/rendu.md` (végétation, performances, « Piège » des objets de la scène, et l'entrée du chantier 3 si elle existe), `docs/domaines/labo-atelier.md` (le labo), `docs/domaines/terrain-engins.md` (saisons, haies) et `docs/domaines/tests.md` (les références à réécrire). Réponds en français, pose tes questions avec `AskUserQuestion`, pousse sur `main`. À la fin de chaque réponse, donne le nombre de tokens, le temps passé et le coût estimé.

**Le but : des buissons plus variés (forme, taille, densité, fleurs ou baies selon la saison, haies brisées), sans perdre de vitesse en rendu logiciel.**

## Où l'on en est

- Un buisson (`geometrieBuisson(v)` de `js/rendu/geometries.js`) : deux ou trois boîtes basses (`v` de 0 à 2 : taille, une boîte de plus si `v > 0`), couleurs de sommets : dessus `g` (glaise), flancs `b` (boue). `T.buissons[k] = { i, j, v, detruit }` (`js/terrain.js` : en haies, en bosquets épars et par les objets de l'atelier ; `v` tiré du hachage de la position ; changer le nombre de `v` change `terrain.js`, donc la graine du monde : le signaler).
- `js/rendu/vegetation.js` : `preparerBuissons` crée un `InstancedMesh` par `v` ; `majBuissons` les trie à chaque image (`dansLaVue`) ; aux zooms 1 à 3 (`petit()`) **aucun buisson n'est dessiné** (deux pixels ; mesuré : tout le champ ~25 000 triangles). Les obus arrachent les buissons (`detruit`, `impact` de `terrain.js` ; il n'en reste rien) et les font brûler (`eclats.js`).
- Les haies (`haies` du secteur, outil « haie » de l'atelier, `js/data/carte-outils.js`) sont des lignes de buissons serrés avec des trous.
- Saisons (`SAISONS` de `js/data/meteo.js`) : `automne`, `hiver`, `ete` ; au dessin, `horloge(B).saison`, `.neige`, `.gel`, `.chaud`. Pas de printemps (voir le chantier 3 : regarde ce que Jérôme a décidé et reprends-le tel quel).
- Contraintes de palette (voir `CLAUDE.md`) : aucune couleur nouvelle ; verts `v` et `w`, glaise `g`, herbe morte `h`, terre `t`, boue `b` et `s`, brume `r`, os `o` (la neige). Fleurs et baies : à choisir parmi ces lettres (os pour des fleurs claires, glaise ou boue sombre pour des baies) ; une teinte qui n'est pas dans la palette est refusée.
- **Pièges du rendu** : ne rien tirer de `Math.random` ni du générateur de la bataille pour le dessin (hachage de la position seulement) ; un objet de plus dans la scène change les identifiants de three.js et l'empreinte (créer au premier besoin, voir `rendu.md`) ; le sol fin du jeu (v0.52.3) fait que `surface(x, z)` rend le cube dessiné.

## À faire

**Labo d'abord, jamais directement dans le jeu.** Dans `js/labo.js`, un sujet « Des buissons plus variés » (`depuis`: la version courante + 1), variantes `a-trancher` avec relevé de coût, entrée de `js/labo-journal.js`, points d'état à jour. Le labo montre un champ de haies et de bosquets dans les saisons existantes, aux zooms 4, 6 et 8 px/m (rappel : le paramètre `zoom` de `moteur()` est un **indice** de `ZOOMS`, pas des pixels par mètre ; les captures du canvas sont noires, compter les pixels clairs dans le même instant que le dessin, voir `rendu.md`).

1. **Les formes** : plus de familles que trois (rond, étalé, haut et mince, en touffes, ajonc, ronces tombantes), chaque famille une géométrie ; forme, taille et orientation tirées du hachage de la position (une variante par `v`, plus une rotation de 0, 90, 180, 270° par hachage pour ne pas multiplier les `InstancedMesh`). Garder le nombre d'`InstancedMesh` raisonnable.
2. **La densité** : des bosquets qui se serrent en touffes et s'éclaircissent sur les bords ; une haie qui alterne buissons hauts et bas (par hachage, sans changer `terrain.js` si possible : la densité est celle de `T.buissons`, pas de nouveaux buissons).
3. **Fleurs et baies par saison** : de petites boîtes claires (os `o`, ou herbe morte `h`) au printemps (si retenu) et en été, des baies sombres en automne, rien l'hiver (neige `o` sur le dessus quand `horloge.neige`) ; feuillage vert `v`/`w` l'été, glaise `g`/herbe morte `h` l'automne, branches nues l'hiver (même logique que les arbres du chantier 3 : mêmes lettres pour une même saison).
4. **Épineux brisé pour une haie** : une variante cassée, penchée, à moitié dégarnie, tirée du hachage pour une fraction des buissons d'une haie (dans le dessin seulement ; le jeu ne change pas qui est buisson).
5. **Les buissons arrachés** : rien ne reste (comme aujourd'hui), ou peut-être une souche à proposer au labo ; le feu des buissons (`eclats.js`) reste.

Mesure chaque variante (rendu logiciel, dessin attendu : `node scripts/mesure.mjs --soldats 2000 --zooms 3,4,5` et le relevé du labo) : donne le nombre de triangles **avant et après**, pour les buissons seuls et pour la scène ; les buissons de la vue seulement coûtent (~25 000 triangles pour tout le champ), c'est la raison du tri à chaque image. Écris les relevés dans `docs/domaines/rendu.md`.

Puis **une question par sujet** à Jérôme avec `AskUserQuestion` (une variante par choix, « garder l'actuel » toujours parmi eux, la recommandée en premier). Rien n'entre dans le jeu avant sa réponse. Une fois la variante retenue : la brancher dans `geometries.js` et `vegetation.js`, vérifier que les buissons se posent sur le sol fin, que les obus les arrachent et que le feu marche, que `lisibilite.mjs` passe (neige, baies, fleurs sur chaque sol), et que les haies de l'atelier (`apercu-3d.js`) se dessinent encore. Réécris `test/rendu.json` (`node outils/rendu-empreinte.mjs --ecrire`) **seulement après avoir regardé les images** (`--png --sortie captures/…`, avant et après) et dis quelles images changent. Note la décision datée, les mesures et les pièges dans `docs/domaines/rendu.md`, mets à jour `version.json`, `CHANGELOG.md`, puis `node outils/stamp-version.mjs`.

## Avant de pousser

`node outils/test-run.mjs --court test/terrain.test.mjs` (si `terrain.js` a changé), `node outils/rendu-empreinte.mjs`, `node outils/fumee.mjs`, `node outils/captures.mjs --page index.html --page labo.html --page atelier.html`, `node outils/lisibilite.mjs`, `node scripts/mesure.mjs` avant et après (deux fois : ±10 %), `node outils/stamp-version.mjs`. Pousse sur `main` ; si le push est refusé : `git fetch`, `git rebase origin/main`, et en cas de conflit sur `js/lib/` prends la version d'origine puis relance `stamp-version`.

## Conseils de tokens

Ne lis que les fichiers de ce chantier ; `geometries.js` et `vegetation.js` sont courts, lis-les entiers.
