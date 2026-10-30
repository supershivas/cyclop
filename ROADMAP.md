# Roadmap — Cyclopéen

Les grosses évolutions envisagées ou en cours. Une entrée reste ici jusqu'à
sa livraison complète, puis en sort (le `CHANGELOG.md` garde la trace). Une
idée écartée part dans `docs/archives/` avec sa raison.

Statuts : **à l'étude** · **validé** (Jérôme a tranché) · **en cours** ·
**à mesurer** (livré, attend un playtest).

## En cours

### Retours de playtest du 30 octobre (Jérôme ; rien n'est construit, un lot par session)

**Statut** : validé. Ordre proposé : A (bugs visuels) → B (interface) → C (missions et victoire) → D (renforts, déroute) → E (xp, mitrailleuses) → F (sons). Chaque lot : lire son fichier de domaine, tests ciblés, `stamp`, version.

**A. Visuels**
- **Arbres** : animation de chute sous un bombardement ; feuillage ellipsoïdal (rond) ; même aspect à tous les zooms (on peut simplifier les formes, pas en retirer le nombre).
- **Aérodrome** : le sol du camp est le sol du terrain ; seule la piste a sa couleur (et quelques lignes blanches) ; la piste scintille (sans doute deux faces à la même hauteur : à corriger) ; les avions décollent de l'aérodrome avant leur attaque.
- **Chars** : le char part du parc des chars ; le parc affiche le nombre total, un bouton vers les chars déployés et leur état (un clic centre la vue sur le char). Fenêtre d'ordres du char : décollée des boutons d'artillerie, boutons au design system, ordre en cours, vie du char, comprendre la 2e barre (bleue : cooldown du canon ? elle ne bouge pas : la faire vivre ou la retirer) ; l'artillerie arrête les chars trop difficilement (rééquilibrer par mesure).
- **Fumée** : ellipses (plus de cubes), volutes plus réalistes.
- **Météo** : la pluie est coupée au début du ciel (étrange) ; terre sèche → boue en transition douce et organique ; une pluie continue ne doit plus aplanir les cratères en lacs (l'eau s'y accumule sans raboter le relief).

**B. Interface**
- **Carte** (Jérôme, « les deux ») : un clic sur C2 cadre la vue 3D sur le seul secteur C2 **et** la carte n'affiche plus que C2 en gros plan, avec un retour à la vue d'ensemble.
- **Fiche terrain** : les lignes longues ne sont plus coupées (« cratère 0,75 m de… ») ; chaque pourcentage dit de quoi il parle (« boue 35 % » : de la surface ? de la case ?).
- **Fiche de fin de journée en trois colonnes** : gauche, chiffres clés de la journée ; centre, médailles du jour (`hud/medailles.js` existe) ; droite, ordres aux régiments. Espaces et hiérarchie vérifiés au design system.
- **Divers** : Échap ne doit plus reprendre le jeu en pause ; la musique et les sons se coupent quand l'onglet n'est pas au premier plan.

**D. Renforts et déroute**
- Les renforts s'affichent **dans la caserne** (plus dans le panneau en haut à gauche) et se déploient **à tout moment** s'ils sont disponibles.
- Ils sortent de la caserne et se placent automatiquement dans le **premier secteur allié libre**. Si tout est tenu par l'ennemi ou plein (décision de Jérôme) : **contre-attaque forcée**, en colonne vers le secteur perdu le plus proche.
- **Déroute** : les soldats en fuite se dirigent vers la caserne (ils ne restent plus au bord du terrain) et peuvent former une unité de renforts le lendemain.

**E. Mitrailleuses et expérience**
- **Mitrailleuses** : on sélectionne le poste et on règle la direction du cône ; barre de vie et barre de munitions (rechargée la nuit) ; elles gagnent de l'xp.
- **Expérience** : petite animation du chevron quand un régiment en gagne ; tout ce qui a de l'xp (soldats, régiments, chars, mitrailleuses) a une barre d'xp et un nombre de chevrons affiché au-dessus ; gagner un chevron est plus difficile (trop rapide aujourd'hui, mesurer) ; **un chevron donne un bonus passif, différent selon le type d'unité** (décision de Jérôme ; valeurs en `data/` à proposer : régiment moral et précision, char blindage, mitrailleuse cadence ; à valider avant de coder).

**F. Sons**
- Remplacer le rendu actuel (très mauvais) pour les explosions, tirs, mitraillage et vol des avions, pluie, vent. Piste (Jérôme) : **sons libres de droits (CC0 / domaine public) que je cherche**, en mp3 dans `assets/`, licences notées, écoute et choix au labo avant le jeu. Garder la synthèse en repli. Si le réseau du conteneur bloque le téléchargement, le dire et demander les fichiers.

**Points encore ouverts** : (1) ce que rapportent les missions secondaires ; (2) valeurs exactes des bonus de chevron ; (3) la 2e barre du char (à constater dans le code avant de décider) ; (4) forme de la contre-attaque forcée si aucun secteur n'est perdu mais tous sont pleins.

### Un terrain et une végétation plus soignés (v0.52.3 → ; à continuer dans une nouvelle session)

**Statut** : en cours. Le but (Jérôme) : un jeu plus joli **sans perdre de vitesse en rendu logiciel**. Quatre chantiers dans cet ordre, chacun avec son prompt à coller au début d'une session neuve (`CLAUDE.md` court + le fichier de domaine du chantier ; une session par chantier).

| # | Chantier | État | Prompt |
|---|---|---|---|
| 1 | Le sol au demi-mètre dans le jeu | **livré v0.52.3** : dès 4 pixels par mètre (décision de Jérôme, à la question toujours / dès 4 / dès 6) ; mesures et pièges dans `docs/domaines/rendu.md` | `docs/archives/prompt-session-visuel.md` |
| 2 | Des cratères moins carrés | **livré v0.52.5** : rond, lèvre jetée d'un côté, éclats, choisi au labo parmi six variantes (v0.52.4) ; `VERSION` de bataille.js à 5 (anciennes sauvegardes non relues) ; `docs/domaines/bataille.md` | `docs/archives/prompt-chantier-2.md` |
| 3 | **Des arbres plus variés, des saisons** | **livré v0.53.1** (six formes, feuilles par saison ; v0.59.3 : automne flamboyant, détail à tous les zooms) | `docs/archives/prompt-chantier-3.md` |
| 4 | Des buissons plus variés | **livré v0.63.0** : sept formes, fleurs l'été, teintes de l'automne (sans baies, Jérôme), nus l'hiver ; reste : la densité des bosquets, relevés de triangles avant / après | `docs/archives/prompt-chantier-4.md` |

Règles qui valent pour les deux chantiers restants : **labo avant jeu** (variantes tranchées par `AskUserQuestion`, journal du labo et points d'état à jour) ; mesurer chaque ajout (`scripts/mesure.mjs --soldats 2000`, triangles avant et après) et l'écrire dans `docs/domaines/rendu.md` ; aucun tirage de `Math.random` ni du générateur de la bataille pour le dessin (créer les objets au premier besoin : voir le « Piège » des roseaux dans `docs/domaines/rendu.md`) ; avant de pousser, les tests ciblés de `CLAUDE.md` (« Vérifier et livrer »), `rendu-empreinte`, `fumee`, `captures`, `lisibilite` si une couleur change, puis `stamp-version`. Réécrire `test/rendu.json` seulement après avoir regardé les images.

**Efficacité des sessions** (fait le 22 octobre) : `CLAUDE.md` 152 → 16 ko avec le détail dans `docs/domaines/` ; conventions 28 → 15 ko (`.claude/conventions-detail.md` lu à la demande) ; `permissions.deny` sur `vendor/`, `captures/` et `test/fumee.json` ; sorties courtes (`--court`, `fumee`, `rendu-empreinte`) ; la référence de fumée ne dépend plus de la taille de la fenêtre. **Reste** : (a) ~~`stamp-version.mjs` ajoutait des `?v=` dans les commentaires de `js/lib/`~~ **corrigé le 23 octobre** par `outils/stamp.mjs` (il lance `stamp-version.mjs`, que la synchronisation de game-system réécrit, puis retire les `?v=` des exemples d'import indentés de `js/lib/` ; proposition pour game-system : `stamp-version` saute les exemples d'import indentés des commentaires) ; (b) quelques skills pour les procédures qui reviennent (livrer une version, réécrire les références d'empreinte, ajouter une variante au labo) ; (c) lancer `fewer-permission-prompts` après quelques sessions de travail réel ; (d) mesurer avec `/context` ce qui pèse encore dans une session normale.

### Chars, mitraillage aérien (décidés au labo, v0.45.0 ; pas construits)

**Statut** : décidé par Jérôme sur les maquettes du labo ; rien n'est dans le jeu.

- **Les chars** : les cinq engins sont retenus (Mark IV et sa livrée allemande de Cambrai, Renault FT, Schneider CA 1, Saint-Chamond, A7V). **Une batterie de plus, comme le mitraillage** : un bouton « Char » à très long cooldown, on choisit le modèle disponible, on clique l'objectif, il part de nos lignes. **Français chez nous, allemands en face, selon la bataille** : nous, le Schneider, le Saint-Chamond, le FT et le Mark IV allié ; en face, l'A7V et le Mark IV pris ; la campagne (batailles 1, 2, 3) en débloque un après l'autre.
- **Les avions** : seul **le mitraillage** est retenu, comme un **4e bouton dans le style des batteries** (75, 155, 220) : un clic sur la zone visée, un cooldown plus long (~90 s contre 20-40 s), **une passe en ligne** de 12 m de large sur ~60 m, à 10 m du sol, traceurs et poussière, les effets de la maquette (tir ~35 % par homme dans la bande, peur sur les autres). L'œil de l'artillerie, le cirque du Baron et les bombardiers de nuit sont archivés (`docs/archives/labo-archive.md`).
- **Les gaz** : rien pour le moment, à reproposer plus tard (Jérôme). Les trois variantes sont archivées (`docs/archives/labo-archive.md`).
- **Lots proposés** : 1) le mitraillage (**livré en v0.46.0**, refait en v0.55.0 → v0.58.0 : modèle 3D à l'échelle, passe tracée en deux clics, altitude qui descend, pv, flotte de 3, rafale visible ; mesuré par `scripts/mesure-mitraillage.mjs`) (le plus petit : `ordonnerMitraillage` et son à-sec dans bataille.js, un 4e bouton, la passe dessinée avec le moteur d'éclats, test, mesure) ; 2) le char de nous (**livré en v0.47.0**, un Schneider, mesure d'équilibrage à faire ; v0.59.3 : chemin par les ponts, conduite en douceur ; v0.60.0 : 2 m/s, une demi-journée de trajet ; **idée de Jérôme, à faire** : un abri souterrain à char d'où il sort, qu'on sélectionne pour disposer des options, et un départ plus proche de la tranchée) (un modèle, le Schneider : sa logique d'avance, ses balles qui ricochent, les cratères qui l'arrêtent, l'obus qui le détruit, le modèle `THREE` sorti du labo dans `js/rendu/`) ; 3) les quatre autres engins et leur déblocage par la campagne ; 4) le char d'en face (A7V, IA, affolement) ; chaque lot avec sa version et ses références réécrites.

### L'éditeur de carte de l'atelier

**Statut** : lots 0 à 3 faits (Jérôme : format « retouches sur la génération ») ; reste à mesurer sur une vraie carte retouchée et publiée

Principe : un secteur garde sa graine et son bruit (`creerTerrain`) ; l'éditeur ajoute des retouches déclaratives (formes de relief, objets), jamais une carte de hauteurs entière (fichier lourd, diffs illisibles, déterminisme perdu).

- [x] Lot 0 — l'onglet « Carte » de l'atelier, en lecture seule (`atelier-carte.js`, `secteur-terrain.js`)
- [x] Lot 1 — curseurs de `relief`, d'arbres, de bois, de haies, de buissons, de pluie ; brouillon `secteurs`, publication dans `assets/design/secteurs.json`, fusion au lancement (`appliquerSecteurs`). Reste, avec le lot 2 : garder les retouches dans `etat` pour qu'une partie sauvegardée refasse son sol, pas celui d'une carte republiée
- [x] Lot 2 — retouches de relief (bosse, creux, crête, plateau, gomme), annuler / rétablir, appliquées dans `creerTerrain` (`formes.js`) ; la partie garde son sol dans `etat.sol`
- [x] Lot 3 — objets posés (arbre, buisson, bois, haie, dégager), lignes de tranchées au curseur, contrôle à voix haute (`validerSecteur`) qui refuse la publication d'un secteur invalide ; la partie garde aussi ses tranchées et ses objets (`secteurDuJeu`)
- [x] Lot 4 — « Essayer dans le jeu » : `?essai=<secteur>&graine=<n>`, une bataille d'essai sans sauvegarde avec le brouillon de ce navigateur ; coût de la simulation mesuré sur quatre cartes retouchées : inchangé
- [x] Éditeur visuel (Jérôme : chiffres nommés et décrits, outils de construction) — boîte à outils à icônes, scène large, inspecteur ; Sélectionner (déplacer, redimensionner, supprimer) ; chaque champ avec son nom, son unité et sa description
- [x] Vue 3D dans l'atelier (le moteur du jeu, lumière au choix) ; on y pose des formes et des objets d'un clic
- [x] **Créer et dupliquer une carte** (Jérôme, v0.38.0) : « Nouvelle carte… » (copie ou vierge), nom et résumé, suppression, publiée dans `cartes.json` et ajoutée à la liste des nouvelles parties. La carte de chaque bataille de la campagne se choisit dans l'éditeur (v0.42.0). Reste : choisir la taille d'une carte (400 × 300 partout)
- [x] **Un lac et un fleuve** (Jérôme, v0.43.0) : eau profonde, infranchissable, outils du groupe « Eau »
- [x] **Des ponts** (Jérôme, v0.44.0) : un tablier sur l'eau, qu'on traverse à pied sec ; un obus le coupe. Reste : reconstruire un pont la nuit, refuser à voix haute un ordre sans passage
- [ ] Plus tard (non décidé) — export / import JSON d'un secteur, copier-coller d'une forme, déplacer et redimensionner à la souris dans la vue 3D

### Refonte UX/UI (docs/ui-cible.md)

**Statut** : validé (Jérôme, v0.18.1) — un lot par session, chacun livrable seul ; on se concentre sur l'UX/UI

Décisions : étoiles = chevrons d'expérience (`A.exp`, aucun nouvel état) ; nom d'un régiment = numéro d'ordre + nom du lexique
(« 3 · Viride », jamais de vrais numéros de régiment) ; carte en option C (la grille et ses cases d'ordre, de vraies proportions, des
cercles-régiments par-dessus) et la touche M disparaît (carte toujours visible) ; toujours sur `main`.

- [x] Lot 1 — le râtelier : trois boutons papier 75 / 155 / 220, touches 1 2 3 (v0.18.1)
- [x] Lot 2 — haut de l'écran : réglages et carnet en haut à gauche ; pertes des deux armées en feuille de situation, au centre ; carte
  fixe en haut à droite ; montre, lecture / pause / avance rapide (×1, ×2, ×4 par `setTimeScale`, plafonnée par `perf.sim`, retour à ×1
  à la nuit (v0.41.2 ; avant : sur un assaut, une déroute, un tronçon pris)), météo (aujourd'hui et lendemain, `etat.previsions` : pas de météo dans la journée) ;
  terrain sous la souris réduit à 2 lignes et une barre de vitesse (v0.19.0)
- [x] Lot 3 — la rangée des 8 régiments : cartes compactes (numéro + nom, chevrons, barre debout / blessés / tombés en encres papier :
  plein / hachuré / vide + ✕, pas de vert-orange-rouge), flèches si l'écran est étroit ; la carte choisie s'ouvre vers le haut
  (`actionDe`, actions) (v0.20.0)
- [x] Lot 4 — la sélection sur le terrain : contour des soldats choisis (halo aux zooms 1 et 2), ligne du centre du régiment au curseur
  terminée par une croix (DOM), destinations en surbrillance (`peutOrdonner` : l'ordre à sec, extrait de `ordonnerMarche`), clic droit ;
  mesure du rendu (v0.21.0)
- [x] Lot 5 — le survol global : un régiment (les deux camps) et un tronçon en surbrillance (v0.21.1)
- [x] Hors lots — le clic gauche choisit puis ordonne (v0.21.2), la carte en quatre secteurs A à D (v0.21.3), la marche le long de la tranchée (v0.21.4), les corvées au-dessus des cartes et pas d'évacuation chez l'ennemi (v0.22.0)
- [x] Lot 6 — les formations (bloc, ligne, par deux, colonne) : `ordre.forme` (`foule.formes` de reglages.js, `formation` de bataille.js), choisie par quatre boutons de la carte ouverte pour le prochain ordre en terrain libre ; sur une tranchée, le tracé décide (v0.23.0)
- [x] Plus tard : la fiche à gauche sous le carnet, le papier de la nuit au centre à la place des pertes, le cadran de vue retiré (touche C pour recentrer) (v0.26.0)
- [x] Haut de l'écran allégé, barre du temps, pertes en barres de vie, équerres au clic sur un régiment, visée d'un barrage, design system en variables (v0.30.0 à v0.33.0)
- [x] La fenêtre d'ordres : variante C « Le rabat », au-dessus de la carte du régiment choisi (v0.34.6 ; la variante près des hommes, v0.34.0, essayée puis remplacée)

### Découper `rendu3d.js` (docs/refonte-rendu3d.md)

**Statut** : fait jusqu'à l'étape 6 (v0.22.0, sans effet pour le joueur) — `rendu3d.js` 1 634 → 513 lignes (`js/rendu/` : shaders, formes, météo, tronçons, végétation, temps, éclats, soldats),
`main.js` 1 204 → 867 (`js/hud/`) ; filets : `outils/fumee.mjs` (le HUD) et `outils/rendu-empreinte.mjs` (34 images du canvas). Reste à décider : sortir le sol (`sol.js`) ou le laisser ;
recommandé : le laisser tant qu'aucun besoin n'apparaît. Plus tard, côté `main.js` : la rangée des régiments, le survol et la visée.

### Jeu à deux sur le même réseau

**Statut** : en cours — livré et connecté (v0.34.1 : code court de 6 signes), joué entre deux Mac en Chrome ; Firefox ne se connecte pas

Un joueur par armée (le bleu invite et joue nous, le kaki rejoint et joue en face), chacun sur son ordinateur, sans serveur : le **lockstep** (`js/reseau/lockstep.js` :
les deux machines calculent la même bataille, on n'échange que les ordres) sur un canal WebRTC (`js/reseau/lien.js`) appairé par un code de 6 signes qui passe par le relais public ntfy.sh (`js/reseau/relais.js`, v0.34.1), ou à la main (une invitation, une réponse), avec un STUN pour les adresses (v0.33.1).

- [x] Le test de déterminisme (`js/determinisme.js`, `outils/determinisme.mjs`, `determinisme.html`) : Node 22 et Chromium donnent le même état ; `Math.sin`, `Math.cos` et `x ** 1,5` diffèrent déjà au dernier bit entre les deux (hypot, sqrt : identiques)
- [x] Un second commandant : `planMarche` / `ordonnerMarche` / `peutOrdonner` / `ordonnerBarrage` / `peutBarrage` prennent un camp, `etat.deux` fait taire l'IA d'en face, ses batteries (`etat.batteriesEux`) rechargent comme les nôtres ; l'interface sait quel camp elle joue (`MOI` de main.js : cartes, carte tournée, pertes, nuit, couleurs)
- [x] Une horloge partagée : pause (Espace, le menu), ×2 / ×4 : des ordres du lockstep, appliqués au même cadre chez les deux
- [x] La nuit à deux : chacun ses corvées, l'aube part quand les deux sont prêts (`corvee`, `pret`)
- [x] Mission et fin : l'objectif du kaki est l'inverse de celui du bleu ; la fin dit qui l'emporte (`juger` reste du point de vue du bleu)
- [x] Un test de bout en bout : `outils/deux.mjs` (deux pages s'appairent, jouent, aucune désynchronisation) ; `test/lockstep.test.mjs` (réseau factice qui retarde)
- [x] Deux vrais Mac sur le même Wi-Fi : Chrome se connecte (STUN v0.33.1, code court v0.34.1) ; l'écran d'échec conseille Chrome (v0.34.3)
- [ ] **Firefox ne se connecte pas** (`failed`, cause non trouvée) : pister la permission « Réseau local » de macOS, les adresses `.local` de Firefox, `media.peerconnection.ice.obfuscate_host_addresses`
- [ ] **Lancer `determinisme.html` dans Firefox** (pas dans le conteneur) et jouer une partie Chrome contre Firefox une fois la connexion possible ; si `sin`, `cos` ou `** 1,5` y divergent : les remplacer dans la logique (army.js, terrain.js, tranchees.js) par des opérations exactes
- [ ] Pas testé : Windows, un réseau avec isolation des clients, un réseau lent (le délai de 6 cadres tient jusqu'à ~150 ms d'aller-retour)
- [ ] À mesurer : l'équilibre à deux (attaquant et défenseur humains, skill `equilibrage`), la durée d'une partie
- [x] **Reprendre une partie à deux** (v0.60.0) : un point de reprise toutes les 60 s chez les deux (`surPoint` de lockstep.js, `enregistrerDeux`, clé `partieDeux`, les deux derniers points nommés par l'empreinte de l'état) ; « Reprendre à deux » sur l'écran titre (le bleu invite, le kaki rejoint, chacun avec sa sauvegarde : la poignée de main cherche un point commun) ; la partie reprend en pause. Une coupure fait perdre au plus 60 s. Pas de reconnexion en direct (on repasse par le titre)
- [ ] **Relais de secours** (Jérôme : ntfy) — **écarté tel quel, v0.60.1** : le lockstep échange des messages à 30 cadres par seconde ; ntfy.sh limite chaque visiteur à une rafale de 60 requêtes puis une toutes les 5 s, et à quelques centaines de messages par jour, et ses conditions interdisent de contourner ces limites : une partie y serait jouable avec dix secondes de retard sur chaque ordre, pour vingt minutes. À la place : **un serveur TURN** (le vrai remède quand le chemin direct est bloqué : Firefox, réseaux isolés), à ajouter à `ICE` de `js/reseau/lien.js` avec ses identifiants ; la partie passerait par lui, chiffrée, au même rythme. Décision à prendre (service gratuit limité ou compte à soi)
- [ ] **Handicap et rôles asymétriques** (effectifs par camp, attaquant contre défenseur) : à garder pour la suite (Jérôme) ; mesurer d'abord l'équilibre à deux
- [ ] À trancher dans `DESIGN.md` : brouillard de guerre ou carte ouverte (carte ouverte aujourd'hui)
- Plus tard : le tour à tour sur le même écran (sans réseau)

### Lot minimal : la tranche verticale du terrain

**Statut** : à mesurer (v0.1.0) — attend la décision de Jérôme pour la v1.0.0

- [x] Champ de 400 × 300 cases depuis une graine, bosses, arbres
- [x] 2 000 soldats en deux camps (`army.js`), ordres de marche, tir
- [x] Obus et cratères (75, 155, 220), dureté, plancher, lèvre
- [x] Pluie, boue et eau sur trois jours ; la boue ralentit
- [x] Compteur de pertes
- [x] Critère : simulation sous 8 ms à 8 000 soldats ; rendu sous 8 ms côté jeu
  (comme `pierreStats()`). En attendant la fin du dessin (rendu logiciel), le zoom
  1 tient 7 ms, les zooms 4 et 8 de 8 à 16 ms sur un champ labouré : à trancher
- [x] Lisibilité : cratère, boue, eau, soldat distinguables en gris

## À l'étude (validé dans le principe par le prompt de départ, pas construit)

- **Le camp, ses bâtiments et les améliorations** (Jérôme, 27 octobre ; maquettes au labo en v0.85.0, règle en v0.86.0, camp à l'écran en v0.87.0, choix et effectifs en v0.89.0, équipement en v0.91.0, camp d'en face et campagne en v0.92.0 ; jeu à deux en v0.94.0 : tout est construit ; reste à peser les nombres sur des batailles entières) : cinq bâtiments (artillerie, aérodrome, parc des chars, maison des sapeurs, caserne des renforts) qu'on clique pour ordonner à la place des boutons latéraux, un camp qui se construit au fil des jours dans la marge arrière du terrain (sans l'agrandir), une dotation de l'état-major à l'aube, trois niveaux avec un choix à chaque palier, l'équipement des régiments. Proposition, lots et questions ouvertes : `docs/chantiers/camp-et-ameliorations.md`. Reprend l'idée de l'abri à char (ci-dessus, « Chars »).
- **Des cubes de sol plus petits** (Jérôme, v0.52.1 : améliorer le visuel du terrain). Coût estimé pour des cubes de 0,5 m au lieu de 1 m (le dessin seulement, la logique garde la case de 1 m ; hauteurs interpolées par `surfaceLisse`) : triangles du sol ×4 au plus (mesuré aujourd'hui, 2 000 soldats, rendu logiciel : ~92 000 triangles tout dézoomé, ~68 000 au zoom 4, ~39 000 au zoom 8, dont l'essentiel est le sol ; donc ~350 000 tout dézoomé), texture de couleurs ×4 (537 000 → 2,1 millions de cases, ~17 Mo en RVBA pour le dessus et la paroi), refonte d'un morceau ×4 (le sol coûte 0,3 à 1,3 ms par image aujourd'hui en plein barrage, ~1,5 à 5 ms), dessin attendu 43 à 79 ms aujourd'hui, ~+100 à +250 ms tout dézoomé. Plus raisonnable : cubes plus petits seulement près du point visé (zoom 6 et plus), ou fusionner mieux. À décider avant de construire.
- **Le pas de fin de journée** (v0.34.4 : les saccades en pleine bataille sont réglées) : il reste un pas de 300 à 500 ms quand l'écran passe à la nuit
  (les douze heures d'eau, `hydroLignes`, sur 537 000 cases d'un coup) ; l'étaler demande de découper en rangées dans le même ordre, avec la
  progression dans l'état et dans `etapesRejouer`. Et un pas de 100 ms quand huit régiments partent vers huit buts différents.
- **Équilibre des obus** (v0.34.5 : le 155 et le 220 plus meurtriers que le 75) : à mesurer sur une bataille entière avant de toucher à `precision` ou à `rapport`.
- **Ralentir plutôt que jeter** (v0.32.3) : le jeu ne ralentit personne dans l'anneau du souffle ; à décider d'après les variantes B à D du sujet « Projections » du labo.

- **Carte et ordres, la suite** (v0.14.0 et 0.15.0 : secteurs, carte, mêlée) : un ordre « tenir S3·N2 » depuis la carte (reculer d'une
  ligne), des ordres par secteur voisin, la mêlée dessinée sur le terrain (le nombre d'attaquants au-dessus du tronçon).

- **Tranchées, la suite** (v0.18.0 : traverses, sacs, fil de fer, abris dessinés) : 3 lignes en secteur calme, 5 en secteur fortifié ;
  les ouvrages au labo (variantes) ; le fil de fer qu'on coupe à la pince la nuit.
- **La nuit, la suite** (v0.11.0 : abris, vivres, tombes ; v0.38.3 : le coup de main et ses prisonniers sont retirés, voir
  `docs/archives/corvees-retirees.md`) : l'ambiance de la nuit (Jérôme, v0.39.0 : « ciel et lumière » ; **fait** : la mêlée de nuit, les lampes de l'arrière, les fusées plus présentes (v0.39.1), le ciel de nuit (v0.40.0 : étoiles, lune et ses phases, nuages, étoiles filantes) ;
  **reste** : la lanterne du front à décider).
- **Moral et expérience, la suite** (v0.11.0 : contagion, refus d'un jour,
  poursuite) : la fuite feinte jouée par le joueur (un régiment qui recule exprès
  pour disperser le poursuivant), l'expérience gardée d'une bataille à l'autre
  (le Mémorial).
- **Évacuer les blessés, la suite** (v0.18.0 : ils reviennent, une fois sur deux) : de jour, sous le feu ; la boue qui ralentit les brancardiers.
- **Lignes de vue** (une crête cache), mêlées de tranchées rares.
- **Hors de vue, les soldats comptés** au lieu d'être simulés un par un.
- **Champs de coûts recalculés par morceaux** quand le terrain change (aujourd'hui :
  le résumé du terrain est refait en entier toutes les 3 s, par bandes).
- **Mines** de 1916-17 : un événement rare, −10 m, un champ à part (voir aussi les gaz, « Pistes avancées »).
- **Méta** : le Mémorial, la campagne, l'état-major (doctrines), les trophées déclaratifs (voir « Pistes avancées » : Mémorial et campagne sont développés).
- **D'autres secteurs et d'autres missions** (un seul secteur, deux missions en v0.9.0).
- **Son**, police d'identité auto-hébergée.
- **Soldats en sprites** (poses, atelier de dessin) : essayés en v0.1.1, non retenus pour l'instant (`docs/archives/`).

## Pistes avancées

Déplacées dans `docs/pistes-avancees.md` (brainstorming v0.35.0 : stances, plan de nuit, Mémorial, campagne, gaz, marques, arcade ; rien n'est construit). À lire seulement quand on travaille sur l'une d'elles.
