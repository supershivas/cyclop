# Chantier : refaire le papier de la nuit et l'écran de fin

Retour de Jérôme (15 nov., sur la v0.132.0) : « la carte de nuit ne va pas du tout. On doit toujours éviter les barres de défilement, il y a beaucoup d'espace perdu, la hiérarchie des informations n'est pas claire. » — « L'écran de fin de partie doit suivre la même logique (sans les ordres), avec un tableau de médailles encore plus fourni, des moments clés, etc. »

Ce fichier est le prompt d'une session neuve. À coller tel quel :

---

Refais deux écrans de Cyclopéen : **le papier de la nuit** (`#nuit`, `js/hud/nuit.js`, `js/hud/bilan.js`, `js/hud/medailles.js`, `js/hud/icones-nuit.js`, CSS « La nuit » de `css/style.css`) et **l'écran de fin de partie** (`#fin`, `montrerFin` de `js/main.js`, `#fin-medailles`). Lis d'abord `docs/domaines/interface.md` (entrées v0.124.0, v0.126.0, v0.132.0), `docs/design-system.md` et `DESIGN.md`.

**Ce qui ne va pas aujourd'hui (v0.132.0)** : le papier défile (une barre de défilement dans `#nuit-corps` dès 1280 × 800), il perd beaucoup de place (une rangée de 100 px par régiment, des tuiles à moitié vides, une note de texte sous chaque graphique), et on ne sait pas quoi lire d'abord.

**Ce qu'il faut obtenir** :
1. **Aucune barre de défilement** à 1280 × 800, 1440 × 900 et 1920 × 1080, avec 8 régiments, 4 corvées d'équipement en plus (caserne niveau 2) et des médailles pleines. À 1024 × 640, un défilement est toléré si rien d'autre n'est possible : dis-le et mesure-le. Le papier ne recouvre pas la rangée des régiments du bas.
2. **Une hiérarchie claire**, du plus important au moins important : (a) ce qu'il faut décider cette nuit (les corvées de chaque régiment, la relève, les transferts) ; (b) l'état de chaque régiment (debout, blessés, moral, vivres) ; (c) le bilan du jour (morts, lignes, faits marquants) ; (d) le reste (ciel, lune, avions, médailles). Ce qui est décision se voit d'abord, en grand.
3. **Densité** : un régiment tient sur une ligne (ses corvées comprises, en icônes, sans texte si possible ; le nom de la corvée au survol). Pas de bloc de texte (règle de l'interface, v0.127.1 : on visualise). Tout chiffre a un survol qui en dit plus (le jour après jour, les nuits passées par cause : `mortsParNuit` de `lireJournee` existe déjà).
4. **Ce qui doit rester** (décidé avant, ne pas le perdre) : la loupe qui montre un régiment ou un homme sur le champ sans lancer le jour (`nuit.revenir()`, `#nuit-retour`) ; une corvée donnée au régiment de sa rangée et à tous les choisis ; la rangée « Tous » ; « Gérer les régiments » (`hud/regiments.js`) ; « Relève » sans article ; les médailles avec leurs pictogrammes ; les couleurs uniquement par les variables `--jeu-*` (la palette « Boue et ciel bas », `outils/lisibilite.mjs` pour toute couleur neuve) ; 44 px pour toute cible cliquable (`outils/audit-boutons.mjs`).
5. **L'écran de fin** suit la même logique, sans les ordres : l'issue de la mission en tête, puis la bataille entière (effectifs et morts jour après jour, lignes tenues, les deux camps), **un tableau des médailles plus fourni** (de nouvelles médailles : le régiment qui a tenu le plus longtemps sa ligne, le plus éprouvé qui ne s'est jamais mis en déroute, l'homme qui a survécu le plus de jours, le char ou le poste le plus meurtrier, le génie qui a le plus refait… à proposer), et **les moments clés** de la bataille (tronçons pris et perdus, déroutes, assauts, chars et avions perdus, ponts coupés, la journée la plus meurtrière) sur une frise des jours. Attention : le carnet n'est pas sauvegardé ; il faudra sans doute garder dans l'état un journal court des moments (logique pure dans `bataille.js` ou un module à part, `VERSION` montée, test de sauvegarde relue), à décider avec Jérôme.

**Méthode** :
1. Commence au labo : un sujet « Le papier de la nuit » (et « La fin de partie ») avec 3 ou 4 variantes de mise en page sur des données d'exemple réalistes (`js/labo-donnees.js` fabrique déjà des journées ; conventions, section 16 : variantes, point d'état). Mesure dans chaque variante qu'il n'y a pas de défilement aux tailles ci-dessus. Pose la question du choix à Jérôme par `AskUserQuestion`, avec une capture de chaque variante.
2. Puis porte la variante retenue dans le jeu. Le papier de l'aube (`hud/aube.js`, `#aube-bilan`) doit suivre le même langage.
3. Vérifie : `node outils/fumee.mjs` (réécris `test/fumee.json` avec `--ecrire` une fois le changement voulu ; le scénario clique `.nr:not(.nr-tous) [data-corvee="evacuer"]` : à adapter), `node outils/audit-ecran.mjs --page index.html`, `node outils/audit-boutons.mjs`, `node outils/lisibilite.mjs`, des captures à 1280 × 800 et 1920 × 1080 que tu regardes vraiment (la nuit : `__jeu.nuit()` après `etat.phase = 'nuit'` ; la fin : `__jeu.fin()`), et `node outils/test-run.mjs --court` si l'état ou la sauvegarde changent.
4. Livre en version mineure, avec le changelog, `node outils/stamp.mjs`, la doc de `docs/domaines/interface.md` (la décision datée, ce qui a été retiré, les pièges et leur coût), et les deux URL.

---
