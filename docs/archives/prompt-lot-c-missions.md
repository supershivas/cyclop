# Prompt — Lot C : victoire et missions (à coller au début d'une session neuve)

Lis `CLAUDE.md`, puis `docs/domaines/bataille.md` (mission, `juger`, `etat.issue`, sauvegarde rejouée) et `docs/domaines/interface.md` (haut de l'écran, modales, design system). Lis la section « Retours de playtest du 30 octobre », lot C, de `ROADMAP.md`. Les questions pour Jérôme passent par `AskUserQuestion`.

## Le problème (Jérôme)

Les conditions de victoire ne sont toujours pas claires. Le joueur ne sait pas ce qu'il doit faire ni où il en est.

## À construire

1. **Un bouton de mission** dans la fenêtre en haut à gauche : la condition (« Tenir le secteur »…) devient un bouton. Il ouvre une **modale** et met le jeu en pause (reprise à la fermeture, comme les autres modales ; au design system).
2. **La modale explique** ce qu'il faut faire, avec une **barre de remplissage** de la mission : « 3 jours tenus sur 10 », « tenir leur 1re ligne encore une journée », « encore deux secteurs à conquérir »… Le texte et la progression viennent de données (`data/`) et d'une fonction pure de `bataille.js` (progression 0..1 et phrase), testée.
3. **Une liste de missions tirée au début de chaque partie** : une mission principale et des missions secondaires aléatoires, tirées avec la graine de la partie (jamais `Math.random`), gardées dans `etat` (la sauvegarde relue est la même partie : tests « relue au milieu », « relue après une nuit »). Monter `VERSION` de bataille.js sans migration (exception du `CLAUDE.md`).
4. **Les conditions sont implémentées et cohérentes** avec `juger` : ce que la modale annonce est exactement ce qui fait gagner ou perdre, y compris « prendre » avant la fin (1re ligne ennemie tenue à 75 % deux soirs de suite) et la chute du secteur. Un ordre ou un état impossible se refuse à voix haute.
5. **Jeu à deux** : l'objectif du kaki est l'inverse de celui du bleu ; la modale dit la mission du camp joué (`MOI`). Tester avec `test/lockstep.test.mjs` puis `node outils/deux.mjs`.

## À demander à Jérôme avant de coder (AskUserQuestion)

- Ce que rapportent les **missions secondaires** (une médaille ? des renforts ? de l'xp ? rien, juste un score ?) et leur nombre par partie.
- Si une mission secondaire peut **échouer** ou si elle est seulement « réussie ou non » en fin de bataille.
- Le catalogue de départ (proposer 6 à 8 missions secondaires avec leur texte, lui les trier).

## Règles

- Contenu en données, règle en code ; pas de nombre magique ; le rendu ne modifie pas l'état.
- Vérifier : `node outils/test-run.mjs --court test/bataille.test.mjs` (~195 s, `--filtre mission` pour itérer), puis `node outils/fumee.mjs`, `captures.mjs` et `audit-ecran.mjs` (écran modifié). Réécrire `test/fumee.json` seulement après avoir regardé les captures.
- Version mineure (nouvelle mécanique), `version.json` + `CHANGELOG.md`, puis `node outils/stamp.mjs`. Commit en français qui dit ce que le joueur verra. Pousser sur `main`. Donner les deux URL (jeu et labo).
- Mettre à jour `docs/domaines/bataille.md` et `interface.md` (décisions datées, pièges), `CLAUDE.md` si une décision durable est prise, et sortir le lot C de `ROADMAP.md` une fois livré.
