# Prompt pour la prochaine session : un terrain et une végétation plus soignés

À coller tel quel au début d'une nouvelle session (Claude Code, dépôt `supershivas/cyclop`, branche `main`).

---

Tu travailles sur Cyclopéen. Lis `CLAUDE.md` puis, avant de toucher à un domaine, son fichier : `docs/domaines/rendu.md` (sol, soldats, végétation, performances), `docs/domaines/labo-atelier.md` (le labo) et `docs/domaines/tests.md` (les références à réécrire). Réponds en français, pose tes questions avec `AskUserQuestion`, pousse sur `main`.

**Le but : un jeu plus joli, sans perdre de vitesse en rendu logiciel.** Quatre chantiers, dans cet ordre. À la fin de chaque réponse, donne le nombre de tokens, le temps passé et le coût estimé.

## 1. Passer le sol au demi-mètre dans le jeu (décidé par Jérôme)

Le labo a déjà `rendu.finesse = 2` (sujet « Le sol en cubes plus fins », v0.52.2) : des cubes de 0,5 m dont la hauteur suit la pente (`hauteurFine`, mur de 1,5 m ou plus gardé net) et des couleurs au demi-mètre (`solTexFin`, `ecrireFin`). Jérôme : « on passe au demi-mètre, c'est mieux ». À faire :

- Brancher `finesse` 2 dans le jeu. Décision à prendre avec lui par `AskUserQuestion` : toujours, ou seulement à partir du zoom 6 (le coût est surtout un sol qui coûte ~5 ms par image côté jeu, et ×1,7 à ×3,4 de triangles ; mesures dans `docs/domaines/rendu.md`). Recommandé : à partir de 4 pixels par mètre, au sol seulement, après mesure au zoom 4 et 8 avec 8 000 soldats (`scripts/mesure.mjs`).
- Vérifier que les soldats, les arbres et les tombes se posent bien sur le sol fin (`surface` et `surfaceLisse` lisent encore les cases de 1 m : écart ≤ 0,25 m, à regarder de près), que la sélection au pointeur (`versTerrain`) tombe juste et que le ralentissement du sol qui se refait (obus) reste dans le budget (`majMorceaux`).
- Réécrire `test/rendu.json` (`node outils/rendu-empreinte.mjs --ecrire`) seulement après avoir regardé les images, et dire dans la réponse quelles images changent.

## 2. Des cratères moins carrés

Aujourd'hui un cratère est un motif 3×3, 5×5 ou 7×7 de `js/data/calibres.js` (en quarts de 25 cm), dessiné par `hauteurVueQ` (cratères au demi-mètre, bosses au mètre) : il se lit comme un carré à gradins. Pistes à proposer **au labo d'abord** (variantes `a-trancher`, chacune avec son relevé de coût, jamais directement dans le jeu) : un motif rond (disque arrondi, lèvre irrégulière, profondeur qui varie avec le numéro de l'impact, sans hasard hors de la graine), avec le sol fin du chantier 1 ; une lèvre de terre jetée plus large et asymétrique ; des éclats autour. Piège : `impact()` fait partie de la partie sauvegardée et rejouée (`rejouerTerrain`) : changer un motif change la partie ; les impacts d'une partie déjà sauvegardée doivent se relire (ou monter `VERSION` de `bataille.js`, ce que Jérôme autorise tant qu'aucune partie réelle n'est en cours).

## 3. Des arbres plus variés, des saisons

`js/rendu/geometries.js` (la forme de l'arbre), `js/rendu/vegetation.js` (`majArbres`, triés à chaque image). Aujourd'hui ils se ressemblent. À proposer au labo : plusieurs formes (au moins 4 à 6 familles : droit, penché, double tronc, mort et brisé par les obus, jeune, grand), taille et nombre de branches tirés du numéro de l'arbre (un hachage de sa position, pas `Math.random`), et **les feuilles par saison** (`SAISONS` de `data/meteo.js` : automne, hiver, été ; le printemps n'existe pas encore comme saison, à demander) : été feuillu vert (`v`, `w`), printemps clairsemé et clair, automne en glaise et herbe morte (`g`, `h`), hiver nu avec neige. Contrainte de palette : aucune couleur nouvelle (voir `CLAUDE.md`), et les arbres de loin ne sont qu'un tronc (coût mesuré). Les arbres abattus par les obus doivent rester lisibles.

## 4. Des buissons plus variés

`geometries.js` et `majBuissons` : plus de variantes (forme, taille, densité, fleurs ou baies à certaines saisons, épineux brisé pour une haie), même contraintes que les arbres.

## Règles de la session

- **Labo avant jeu** : tout nouveau dessin est une variante `a-trancher` du labo (journal `js/labo-journal.js`, `depuis`, points d'état à jour), tranchée par `AskUserQuestion` (une question par sujet, « garder l'actuel » parmi les choix) ; rien n'entre dans le jeu avant la réponse. Les captures du canvas du labo sont noires : compter les pixels clairs dans le même instant que le dessin (`window.requestAnimationFrame` enveloppé, voir `docs/domaines/rendu.md`), et le paramètre `zoom` de `moteur()` est un **indice** de `ZOOMS`, pas des pixels par mètre.
- **Mesurer chaque ajout** (rendu logiciel, dessin attendu : `scripts/mesure.mjs --soldats 2000`) et l'écrire dans `docs/domaines/rendu.md`. Les arbres et les buissons du labo coûtent surtout en triangles : donne le nombre avant et après.
- **Ne rien tirer de `Math.random` ni du générateur de la bataille pour le dessin** (un objet de plus dans la scène change l'ordre des identifiants de three.js et l'empreinte : crée les objets au premier besoin, voir « Piège » de `docs/domaines/rendu.md`).
- Avant de pousser : `node outils/test-run.mjs`, `node outils/rendu-empreinte.mjs`, `node outils/fumee.mjs`, `node outils/captures.mjs --page index.html --page labo.html`, `node outils/lisibilite.mjs` pour toute couleur, `node outils/stamp-version.mjs` après la version. Une décision datée va dans le fichier de domaine, pas dans `CLAUDE.md`.

## Conseil de modèle et de tokens

- Chantier 1 (brancher le sol fin, la sélection, les références) : le plus risqué, à faire avec le modèle le plus fort disponible.
- Chantiers 2 à 4 (formes, variantes du labo, mesures) : un modèle moyen suffit, effort moyen.
- Une session par chantier si possible : `CLAUDE.md` est court (≈ 5 000 tokens), mais chaque fichier de domaine lu coûte ; ne lis que celui du chantier.
