# Prompt de la session « chantier 3 : des arbres plus variés, des saisons »

À coller au début d'une nouvelle session (modèle moyen, effort moyen). Ordre : après le chantier 2 (cratères), indépendant de lui.

---

Tu travailles sur Cyclopéen. Lis `CLAUDE.md` puis, avant de toucher à un domaine, son fichier : `docs/domaines/rendu.md` (végétation, performances, « Piège » des objets de la scène), `docs/domaines/labo-atelier.md` (le labo), `docs/domaines/terrain-engins.md` (saisons, `data/meteo.js`) et `docs/domaines/tests.md` (les références à réécrire). Réponds en français, pose tes questions avec `AskUserQuestion`, pousse sur `main`. À la fin de chaque réponse, donne le nombre de tokens, le temps passé et le coût estimé.

**Le but : des arbres qui ne se ressemblent plus, et des feuilles qui suivent la saison, sans perdre de vitesse en rendu logiciel.**

## Où l'on en est

- Un arbre (`geometrieArbre(v, abattu, loin)` de `js/rendu/geometries.js`) : un tronc (boîte de 0,55 m, hauteur `6 + v`), quatre branches nues d'une boîte chacune, toutes de la couleur `s` (`arbreMat`, une seule couleur) ; `loin` : le tronc seul ; `abattu` : une souche et un tronc couché. `v` va de 0 à 3 (`T.arbres[k] = { i, j, v, abattu }`, tiré dans `terrain.js` du hachage de la position ; une `v` nouvelle change `terrain.js` et donc la graine du monde : le signaler).
- `js/rendu/vegetation.js` : `preparerArbres` crée **un `InstancedMesh` par (loin, abattu, v)** (16 en tout) ; `majArbres` les trie à chaque image (`dansLaVue`), les arbres de loin (`loin(a)`, ou zooms 1 à 3 : `petit()`) ne sont qu'un tronc sans ombre. `ARBRES_OMBRES` limite les ombres de l'arbre à la hauteur `6 + v`.
- Les arbres abattus par les obus (`a.abattu`) brûlent (`js/rendu/eclats.js`, `allumer`) ; un arbre abattu doit rester lisible.
- Saisons (`SAISONS` de `js/data/meteo.js`, v0.51.0) : `automne` (défaut), `hiver`, `ete`. **Le printemps n'existe pas encore.** L'état de la saison arrive au dessin par `horloge(B).saison`, `.neige`, `.gel`, `.chaud` (`js/bataille.js`).
- Contraintes de palette (voir `CLAUDE.md`) : aucune couleur nouvelle ; verts `v` (mousse) et `w` (sombre), glaise `g`, herbe morte `h`, terre `t`, boue sombre `s`, brume `r`, os `o` (la neige).
- **Pièges du rendu** : ne rien tirer de `Math.random` ni du générateur de la bataille pour le dessin ; **un objet de plus dans la scène change l'ordre des identifiants de three.js et donc l'empreinte** : crée les objets au premier besoin (voir « Piège » de `rendu.md`). Les arbres de loin ne sont qu'un tronc (mesuré : sinon ~40 000 triangles de branches).
- Le sol est déjà au demi-mètre à partir de 4 px/m (v0.52.3) ; `surface(x, z)` rend le cube dessiné, les arbres s'y posent déjà.

## À faire

**Labo d'abord, jamais directement dans le jeu.** Dans `js/labo.js`, un sujet « Des arbres plus variés » (`depuis: '0.52.5'`, ou la version courante + 1), chaque variante `a-trancher` avec son relevé de coût et une entrée de `js/labo-journal.js` ; points d'état à jour. Le labo doit montrer les arbres dans les trois saisons existantes (réglage `saison` de la maquette ; voir comment `moteur()` en reçoit une) et, si Jérôme le veut, le printemps (**demande-le avec `AskUserQuestion` avant de l'ajouter à `SAISONS`** : un printemps change la météo, les transitions et l'état du sol, c'est un chantier de règles, pas de dessin ; sinon, montre-le seulement comme une teinte du feuillage au labo, sans règle).

1. **Les formes** (4 à 6 familles) : droit, penché, double tronc, mort et brisé par les obus (sommet cassé, branches pendantes), jeune (petit, fin), grand. Chaque famille est une géométrie à part ; le choix, la taille, le penchant et le nombre de branches se tirent **du hachage de la position** (`hash2(i, j, g)` dans `terrain.js`, déjà déterministe) : pas de `Math.random`. Garder le nombre de variantes d'`InstancedMesh` raisonnable (aujourd'hui 16) et mesurer le coût du tri à chaque image (`majArbres`).
2. **Les feuilles par saison** : été feuillu vert (`v`, `w`) ; printemps clairsemé et clair (si retenu) ; automne en glaise et herbe morte (`g`, `h`), un arbre sur trois plus dégarni ; hiver nu avec neige sur les branches (`o`) quand `horloge.neige`. Le feuillage est de petites boîtes (touffes) tirées du hachage, un second matériau en couleurs de sommets (comme `geometrieBuisson`) ; aux zooms 1 à 3 et de loin, pas de feuilles (tronc seul, comme aujourd'hui). Les feuilles tombent peut-être en automne (par jour de bataille : `horloge.jour`), à proposer au labo, pas en jeu.
3. **Les arbres abattus** restent lisibles : une souche et un tronc couché, du bois sombre, jamais une touffe de feuilles ; ceux qui brûlent gardent leur feu.

Mesure chaque variante (rendu logiciel, dessin attendu, `node scripts/mesure.mjs --soldats 2000 --zooms 3,4,5` et le relevé du labo) : donne le nombre de triangles **avant et après**, pour les arbres seuls (compte les `InstancedMesh` d'arbres dans `renderer.info`) et pour la scène ; les zooms 4 à 16 sont ceux où le feuillage se voit. Écris les relevés dans `docs/domaines/rendu.md`.

Puis **une question par sujet** à Jérôme avec `AskUserQuestion` (une variante par choix, « garder l'actuel » toujours parmi eux, la recommandée en premier). Rien n'entre dans le jeu avant sa réponse. Une fois la variante retenue : la brancher dans `geometries.js` et `vegetation.js` (et `terrain.js` seulement si `v` change), vérifier que les ombres des arbres (`ARBRES_OMBRES`, la hauteur) suivent la nouvelle hauteur, que les arbres posés sur le sol fin s'asseyent bien (`surface`), que le feu et la chute (`allumer`) marchent, et que la neige se lit sur le feuillage (`lisibilite.mjs` pour toute paire de couleurs). Réécris `test/rendu.json` (`node outils/rendu-empreinte.mjs --ecrire`) **seulement après avoir regardé les images** (`--png --sortie captures/…`, avant et après) et dis quelles images changent ; la mesure change-t-elle le test de lisibilité ? `test/fumee.json` ne devrait pas bouger. Note la décision datée, les mesures et les pièges dans `docs/domaines/rendu.md`, mets à jour `version.json` (correctif ou mineur), `CHANGELOG.md`, puis `node outils/stamp-version.mjs`.

## Avant de pousser

`node outils/test-run.mjs --court test/terrain.test.mjs` (si `terrain.js` a changé), `node outils/rendu-empreinte.mjs`, `node outils/fumee.mjs`, `node outils/captures.mjs --page index.html --page labo.html`, `node outils/lisibilite.mjs` (toute couleur), `node scripts/mesure.mjs` avant et après (deux fois : ±10 % d'un lancement à l'autre), `node outils/stamp-version.mjs`. Pousse sur `main` ; si le push est refusé : `git fetch`, `git rebase origin/main`, et en cas de conflit sur `js/lib/` prends la version d'origine puis relance `stamp-version`.

## Conseils de tokens

Ne lis que les fichiers de ce chantier ; `geometries.js` (115 lignes) et `vegetation.js` (200) sont courts, lis-les entiers. Le chantier 4 (buissons) partage `geometries.js` et `vegetation.js` : à faire dans une autre session, après celui-ci.
