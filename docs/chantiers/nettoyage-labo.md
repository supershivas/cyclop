# Nettoyage du labo — inventaire (étape 1, rien n'est supprimé)

Source : `js/labo.js` (statuts des variantes), `labo-atelier.md`, `ROADMAP.md`. Légende : **JEU** tranché et en jeu (A actuelle, le reste ancienne : archiver) · **CDC** tranché, pas construit (garder : cahier des charges) · **OUVERT** `a-trancher` / `essai` / sans statut · **REF** outil de référence ou de mesure.

| Famille proposée | Sujet (`js/labo-*.js`) | État | Action recommandée |
|---|---|---|---|
| Références | Échelle, Sols et cratères, Palette (labo.js) | REF | garder |
| Références | Design system : fondations, boutons, révision v2, fenêtres (`labo-design-system`) | REF (en jeu v0.98.2) | garder |
| Références | Champ de bataille, Calibres (labo.js) | REF (moteur en direct) | garder |
| Interface | Plaques et journal (`plaques`), La barre de vie (`barre-vie`), Le clic sur un régiment (`clic-regiment`), La fenêtre d'ordres, Le clic sur un bouton / Un ordre sur un secteur / Le coup d'obus (`satisfaction`), Le nom d'un régiment / Les toasts / La carte d'ordre (`hud-ux`), Le bord de la carte, La barre du temps (`barre-temps`), Le papier de campagne (`campagne`), Attaque d'une tranchée (`assaut`) | JEU | archiver (décision + notes) puis supprimer |
| Interface | Le moral sur le champ (`moral`) | OUVERT (v0.67.2, jamais tranché) | garder |
| Interface | Un point de dotation, La partie gagnée, La fiche de fin de journée (`recompenses`) | OUVERT (v0.98.0, 12 propositions) | garder |
| Terrain | Les tranchées (selon le zoom, en jeu v0.88.1) | JEU + REF de mesure (`scripts/mesure-tranchees-labo.mjs`) | garder le banc, archiver les « anciennes » |
| Terrain | Les tranchées de près | JEU (v0.95.0) | archiver, sauf le banc de mesure |
| Terrain | Les ponts (`ponts`) | JEU (v0.47.2) | archiver |
| Arcade | Caisses, obus ratés, sapes | OUVERT sans statut (v0.38.2, jamais tranchés) | **question** : archiver comme écartés ? |
| Arcade | Les gaz | OUVERT ; ROADMAP : « rien pour le moment, à reproposer » | garder ou archiver (question) |
| Arcade | Les chars | CDC (Schneider en jeu ; 4 autres engins à construire, ROADMAP) | garder |
| Arcade | Les avions | mitraillage JEU ; 3 autres écartés | archiver |
| Camp | Le camp et ses bâtiments (`batiments`) | CDC (retenu v0.85.0, pas construit) | garder |
| Ambiance | Le son (`son`) | JEU ; ROADMAP : écoute de sons libres à venir | garder (écoute) |
| Moteur | Sol en cubes plus fins, Des cratères moins carrés, Des arbres plus variés, Les grades se voient, Des buissons plus variés, Le sol vert, La nuit sans trame, Visée d'un obus, Soldats de près, Cadavres, Effets, Caméra | JEU | archiver |
| Moteur | La lumière dans le relief, Une journée en dix secondes | `essai` ; le soleil est en jeu depuis v0.68.1 | archiver (probable) |
| Moteur | Des angles adoucis | `essai` (v0.92.0), non adopté | question |
| Moteur | Projections | JEU (A) + variantes B–D écartées | archiver |
| Transverse | Accueil et journal (`labo-journal`) | REF | garder, élaguer les entrées des sujets archivés |

Poids : une vingtaine de sujets JEU/écartés ≈ 60 % des 5 300 lignes. Dépendances à vérifier avant toute suppression : `scripts/mesure-*-labo.mjs`, `outils/captures.mjs`, `labo-arcade.js` (`scene()`, partagé par chars/gaz/avions/tranchées), modèles `THREE` déjà dans `js/rendu/`.
