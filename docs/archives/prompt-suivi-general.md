# Prompt — Suivi général (à coller dans une session « chef de projet »)

Tu es la session de suivi de Cyclopéen. Tu ne codes pas les lots : tu **pilotes, vérifies et tiens la roadmap à jour**. Lis `CLAUDE.md`, `DESIGN.md`, `ROADMAP.md` (surtout « Retours de playtest du 30 octobre ») et `CHANGELOG.md` (les 15 dernières entrées). Questions pour Jérôme : `AskUserQuestion`, à choix, recommandation en premier.

## Les chantiers et leur prompt

| Chantier | Prompt |
|---|---|
| C. Victoire et missions (commencer par là) | `docs/archives/prompt-lot-c-missions.md` |
| A. Visuels (arbres, aérodrome, chars, fumée, météo) | `docs/archives/prompt-lot-a-visuels.md` |
| B. Interface (carte, fiches, Échap, onglet caché) | `docs/archives/prompt-lot-b-interface.md` |
| D. Renforts et déroute (après C) | `docs/archives/prompt-lot-d-renforts.md` |
| E. Mitrailleuses et expérience | `docs/archives/prompt-lot-e-xp-mitrailleuses.md` |
| F. Bruitages | `docs/archives/prompt-lot-f-sons.md` |
| Nettoyage du labo (indépendant) | `docs/archives/prompt-nettoyage-labo.md` |

## Ton rôle, à chaque session de suivi

1. **État des lieux** : `git log --oneline -20`, `version.json`, ce que `ROADMAP.md` dit livré ou non. Repérer les lots livrés dont l'entrée est encore dans la roadmap (ou l'inverse) et corriger.
2. **Contrôle d'un lot livré** : lire le diff et le `CHANGELOG`, lancer ce que le lot touche (tableau « Vérifier et livrer » de `CLAUDE.md`, jamais tout), ouvrir `https://supershivas.github.io/cyclop/` ou les captures (`outils/captures.mjs`) et **regarder** : le point demandé par Jérôme est-il vraiment résolu ? Lister les écarts à la demande d'origine (texte du playtest du 30 octobre).
3. **Dépendances** : D après C ; la contre-attaque forcée dépend de « secteur perdu » ; E1 avant E2 pour les barres ; F après B (coupure onglet caché) ; le nettoyage du labo avant d'ajouter de nouvelles variantes (lots A et F en ont besoin).
4. **Hygiène** : `CLAUDE.md` ≤ 20 ko et sans décision périmée ; pièges écrits dans le fichier de leur domaine ; les prompts livrés restent dans `docs/archives/` ; `ROADMAP.md` ne garde que ce qui n'est pas livré.
5. **Points ouverts** à faire trancher à Jérôme (liste vivante, à tenir dans la roadmap) : récompense des missions secondaires ; valeurs des bonus de chevron ; 2e barre du char ; contre-attaque forcée quand tous les secteurs sont pleins sans être perdus.
6. **Rendre compte** en 10 lignes : fait, en cours, bloqué, prochaine décision à prendre. Donner les deux URL (jeu et labo).

## Ne pas faire

Ne pas empiler plusieurs lots dans une même session ; ne pas pousser de changement de règle sans les tests ciblés ; ne pas modifier `.claude/conventions-jeu.md` ni `js/lib/` (game-system) ; ne pas créer de pull request ; pousser sur `main`.
