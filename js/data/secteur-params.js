// Ce que l'atelier laisse régler dans un secteur (lot 1 de l'éditeur de carte) : un chemin dans `SECTEURS[id]` (« relief.bosses »), ses bornes, son pas,
// la valeur quand le secteur ne la dit pas. `si` : le chemin qui doit exister dans le secteur (les réglages de la crête n'ont de sens que sur une crête).
// Les chiffres sont ceux que `creerTerrain` et `terrainDuSecteur` lisent : facteurs pour les bosses et l'ondulation, mètres pour la nappe et la crête.
export const PARAMS = [
  { cle: 'relief.bosses', nom: 'Bosses', unite: '×', min: 0, max: 3, pas: 0.05, defaut: 1 },
  { cle: 'relief.ondulation', nom: 'Ondulation', unite: '×', min: 0, max: 3, pas: 0.05, defaut: 1 },
  { cle: 'relief.nappe', nom: 'Nappe (plus haut : plus d\'eau)', unite: 'm', min: -3, max: 3, pas: 0.1, defaut: 0 },
  { cle: 'relief.crete.hauteur', nom: 'Crête : hauteur', unite: 'm', min: 0, max: 15, pas: 0.5, si: 'relief.crete' },
  { cle: 'relief.crete.largeur', nom: 'Crête : largeur', unite: 'm', min: 10, max: 100, pas: 1, si: 'relief.crete' },
  { cle: 'relief.crete.y', nom: 'Crête : distance du haut', unite: 'm', min: 0, max: 300, pas: 1, si: 'relief.crete' },
  { cle: 'arbres', nom: 'Arbres', unite: '', min: 0, max: 400, pas: 5, defaut: 0 },
  { cle: 'bois', nom: 'Bois serrés', unite: '', min: 0, max: 10, pas: 1, defaut: 0 },
  { cle: 'haies', nom: 'Haies', unite: '', min: 0, max: 20, pas: 1, defaut: 0 },
  { cle: 'buissons', nom: 'Buissons épars', unite: '', min: 0, max: 600, pas: 10, defaut: 0 },
  { cle: 'pluieAuMoins', nom: 'Jours de pluie au moins', unite: '', min: 0, max: 6, pas: 1, defaut: 0 },
];
