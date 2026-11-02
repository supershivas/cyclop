# Proposition pour game-system : `--shard i/n` dans `outils/test-run.mjs`

Destinataire : `supershivas/game-system` (source de `outils/test-run.mjs`).
Origine : cyclop, CI de publication (`.github/workflows/pages.yml`).

## Le problème

`test-run.mjs` enchaîne tous les tests dans un seul processus. Dans cyclop, le
job de tests durait 9 min 36 s (run 290), dont 97 % de la durée du workflow.
Deux fichiers (`bataille.test.mjs`, 98 tests, et `camp.test.mjs`, 38 tests)
pèsent chacun ~3 min en CI. Les mettre en parallèle par fichier (fait, run 293)
ramène le workflow à 4 min 36 s, mais plus bas qu'un fichier entier on ne peut
pas aller sans couper le fichier lui-même.

## La proposition

Une option `--shard i/n` : après `--filtre`, ne lancer que les tests dont le
rang (dans l'ordre d'écriture) vaut `i-1` modulo `n`.

```bash
node outils/test-run.mjs --shard 2/3 test/bataille.test.mjs
```

- Aucun effet sans l'option : les appels actuels ne changent pas.
- Compatible avec `--court` et `--filtre`.
- `--shard` mal formé (`0/3`, `4/3`, `x`) : message et code de sortie 2.
- Affiche `Tranche 2/3 : 33 test(s) sur 98` pour qu'un journal de CI dise ce
  qui a tourné.
- Le round-robin (un test sur n) disperse les tests lourds voisins ; un découpage
  en blocs contigus aurait mis tout un scénario long dans la même tranche.

Le correctif est dans `test-run-shard.patch` (même dossier,  `patch -p1` s'applique
sur la version actuelle de cyclop).

## Condition à connaître

Chaque test doit pouvoir tourner sans que les précédents du fichier aient tourné
(état de module partagé interdit). Vérifié dans cyclop : les 5 tranches ci-dessous
passent isolément.

| Fichier | Tranches | Tests par tranche | Résultat |
|---|---|---|---|
| `bataille.test.mjs` | 3 | 33 / 33 / 32 | 98 sur 98 réussis |
| `camp.test.mjs` | 2 | 19 / 19 | 38 sur 38 réussis |

## Mesure (locale, 5 processus sur 4 cœurs : la contention gonfle tout)

| Tranche | Durée |
|---|---|
| bataille 1/3 | 181 s |
| bataille 2/3 | 227 s |
| bataille 3/3 | 179 s |
| camp 1/2 | 229 s |
| camp 2/2 | 198 s |

Les durées absolues ne valent rien ici (le même fichier entier prenait 380 s et
278 s dans le même contexte concurrent). Ce qui se lit : l'écart entre tranches
d'un même fichier est de l'ordre de 25 %, pas de déséquilibre grave.

Estimation en CI (un job par tranche, un cœur chacun) à partir des durées du run
293 (bataille 199 s, camp 185 s) : ~70 s par tranche de `bataille`, ~95 s par
tranche de `camp`, soit un workflow d'environ **2 min 30 s** au lieu de 4 min 36 s.
À confirmer par un run réel.

## Côté workflow (cyclop, une fois l'option disponible)

```yaml
matrix:
  include:
    - { groupe: bataille-1, fichiers: test/bataille.test.mjs, tranche: 1/3 }
    - { groupe: bataille-2, fichiers: test/bataille.test.mjs, tranche: 2/3 }
    - { groupe: bataille-3, fichiers: test/bataille.test.mjs, tranche: 3/3 }
    - { groupe: camp-1, fichiers: test/camp.test.mjs, tranche: 1/2 }
    - { groupe: camp-2, fichiers: test/camp.test.mjs, tranche: 2/2 }
    - { groupe: campagne-stances, fichiers: 'test/campagne.test.mjs test/stances.test.mjs', tranche: '' }
    - { groupe: reste, fichiers: '', tranche: '' }
# et dans le script : node outils/test-run.mjs ${TRANCHE:+--shard $TRANCHE} $FICHIERS
```

Risque : un test ajouté dans `bataille` change le rang des suivants, donc la
composition des tranches ; sans conséquence tant que chaque test est indépendant
et que les n tranches sont toutes lancées (le total de tranches doit rester le
même dans la matrice et dans l'option `--shard`).

## Pour game-system

Ajouter la ligne d'usage en tête de `test-run.mjs`, le correctif ci-joint, et une
phrase dans la section 19 de `CONVENTIONS.md` : « un test ne dépend pas des
précédents ; les suites lentes se découpent avec `--shard i/n` ».
