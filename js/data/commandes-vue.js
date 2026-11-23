// Les commandes des vues à la personne (Jérôme, 21 nov., v0.158.0 : « ajoute les infos pour les commandes dans une fenêtre discrète (hiérarchisation) ») : la fenêtre `#aide-vue` (hud/aide-vue.js).
// Par vue, des groupes rangés par niveau : 1 l'essentiel (toujours là), 2 ce qu'on fait en combattant, 3 le reste ; H montre ou cache les niveaux 2 et 3 (ouverts quelques secondes à la première entrée).
// Une entrée : [touches, ce qu'elles font, bascule] ; `bascule` (facultative) : le nom d'un état que l'écran allume (la touche est alors marquée « en marche »). Les touches sont celles d'un clavier AZERTY.
export const COMMANDES_VUE = {
  soldat: { titre: 'Soldat', groupes: [
    { niveau: 1, items: [[['Z', 'Q', 'S', 'D'], 'marcher'], [['souris'], 'viser'], [['clic'], 'tirer'], [['clic droit'], 'épauler']] },
    { niveau: 2, titre: 'Le corps', items: [[['Maj'], 'courir', 'course'], [['C'], 'accroupi', 'accroupi'], [['X'], 'couché', 'couche'], [['Espace'], 'franchir']] },
    { niveau: 2, titre: 'Le combat', items: [[['R'], 'recharger'], [['F'], 'baïonnette'], [['G'], 'grenade'], [['clic droit'], 'parer, de près']] },
    { niveau: 3, titre: 'Les autres', items: [[['V'], 'à moi !', 'amoi'], [['Tab'], 'un autre homme'], [['P'], 'pause'], [['Échap'], 'revenir']] },
  ] },
  char: { titre: 'Char', groupes: [
    { niveau: 1, items: [[['Z', 'Q', 'S', 'D'], 'conduire'], [['souris'], 'regarder'], [['clic'], 'canon'], [['clic droit'], 'mitrailleuses']] },
    { niveau: 2, titre: 'À bord', items: [[['Maj'], 'lunette'], [['C'], 'conduite automatique', 'conduiteAuto'], [['T'], 'tir automatique', 'tirAuto'], [['R'], 'rentrer au parc']] },
    { niveau: 3, titre: 'Les autres', items: [[['Espace'], 'pause'], [['Échap'], 'revenir']] },
  ] },
  avion: { titre: 'Avion', groupes: [
    { niveau: 1, items: [[['Q', 'D'], 'tourner'], [['Z'], 'monter'], [['S'], 'descendre'], [['clic'], 'tirer']] },
    { niveau: 2, titre: 'À bord', items: [[['T'], 'tir automatique', 'tirAuto'], [['R'], 'rentrer à la base, il se pose seul']] },
    { niveau: 3, titre: 'Les autres', items: [[['Espace'], 'pause'], [['Échap'], 'revenir']] },
  ] },
  nid: { titre: 'Mitrailleuse', groupes: [
    { niveau: 1, items: [[['souris'], 'regarder'], [['seul'], 'il tire sur qui entre dans son cône']] },
    { niveau: 3, titre: 'Les autres', items: [[['Espace'], 'pause'], [['Échap'], 'revenir']] },
  ] },
};
export const AIDE_VUE = { ouverte: 8 };      // s : la fenêtre s'ouvre en entier à la première entrée dans chaque vue, puis se replie sur l'essentiel
