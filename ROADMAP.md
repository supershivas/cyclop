# Roadmap — Cyclopéen

Les grosses évolutions envisagées ou en cours. Une entrée reste ici jusqu'à
sa livraison complète, puis en sort (le `CHANGELOG.md` garde la trace). Une
idée écartée part dans `docs/archives/` avec sa raison.

Statuts : **à l'étude** · **validé** (Jérôme a tranché) · **en cours** ·
**à mesurer** (livré, attend un playtest).

## En cours

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

- **Tranchées, la suite** (le lot 1, v0.4.0, a livré 4 lignes, les boyaux, les
  tronçons qui se prennent, la protection à l'envers, les assauts d'en face) : 3
  lignes en secteur calme, 5 en secteur fortifié ; les réparer la nuit (corvées) ;
  les montrer tenues ou perdues sur le terrain lui-même ; abris profonds.
- **La nuit, la suite** (v0.6.0 a livré repos, réparer, caillebotis, inhumer,
  évacuer) : les abris profonds, la relève (des régiments de réserve), le
  ravitaillement, les coups de main de nuit, les tombes dessinées sur le terrain.
- **Corps** : ils restent (v0.3.3) ; à venir : l'inhumation la nuit, leur poids
  sur le moral près des lignes.
- **Moral et expérience, la suite** (v0.5.0 a livré le moral par régiment, la
  déroute, l'expérience, les promotions) : la fuite feinte (les Horaces et les
  Curiaces), la contagion de la déroute aux voisins, le Discours de la servitude
  volontaire (un régiment qui refuse tout un jour), les corps près des lignes qui
  pèsent sur le moral, l'expérience gardée d'une bataille à l'autre (le Mémorial).
- **Évacuer les blessés, la suite** : de jour, sous le feu ; la boue qui ralentit les brancardiers.
- **Lignes de vue** (une crête cache), mêlées de tranchées rares.
- **Hors de vue, les soldats comptés** au lieu d'être simulés un par un.
- **Champs de coûts recalculés par morceaux** quand le terrain change (aujourd'hui :
  le résumé du terrain est refait en entier toutes les 3 s, par bandes).
- **Mines** de 1916-17 : un événement rare, −10 m, un champ à part.
- **Méta** : le Mémorial, l'état-major (doctrines), les trophées déclaratifs.
- **Bataille de 10 à 15 jours** (le lot minimal en fait trois).
- **Son**, police d'identité auto-hébergée.
- **Soldats en sprites** (poses, atelier de dessin) : essayés en v0.1.1, non retenus pour l'instant (`docs/archives/`).
