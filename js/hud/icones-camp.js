// Les pictogrammes du camp (Jérôme, 18 nov. : « les cases d'améliorations n'ont pas d'icônes ») : un par palier et par choix de `data/batiments.js`, rangés par leur nom ;
// des SVG de 16 × 16 tracés en `currentColor`, comme ceux du papier de la nuit (`icones-nuit.js`). Un nom inconnu donne un point : rien ne casse si un palier change de nom.
import { iconeCorvee } from './icones-nuit.js?v=0.165.2';

const svg = corps => `<svg class="pic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${corps}</svg>`;

const ICONES = {
  // l'artillerie
  'Batteries de campagne': '<circle cx="5" cy="11.5" r="2.5"/><path d="M6.5 9.5l7-5M5 9v-1M2 14h7"/>',                        // le canon sur sa roue
  'Tir de réglage': '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1.5"/><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15"/>', // la mire
  'Caissons doublés': '<rect x="1.5" y="8" width="6" height="5"/><rect x="8.5" y="8" width="6" height="5"/><path d="M3 8V6h3v2M10 8V6h3v2"/>', // deux caissons
  'Salve longue': '<path d="M3 13V6l1-2.5L5 6v7M7.5 13V6l1-2.5 1 2.5v7M12 13V6l1-2.5L14 6v7"/>',                              // trois obus debout
  'Tube neuf': '<path d="M2 12l9-7M10 3.5l3 3M2.5 14.5h6"/><path d="M12.5 1.5l.8 1.6 1.7.3-1.2 1.2"/>',                        // le tube et son éclat
  // l'aérodrome
  'Terrain et un hangar': '<path d="M1.5 13.5h13M2.5 13.5V8a5.5 5.5 0 0 1 11 0v5.5M6 13.5v-3h4v3"/>',                          // le hangar Bessonneau
  'Passe longue': '<path d="M1.5 11h11M10 8.5l2.5 2.5L10 13.5"/><path d="M3 5h4l2-2 1 2h3" />',                               // l'avion et sa longue passe
  'Blindage du siège': '<path d="M8 1.5l5.5 2v4.5c0 3.5-2.5 5.5-5.5 6.5C5 13.5 2.5 11.5 2.5 8V3.5z"/><path d="M8 5v6M5 8h6"/>', // l'écu
  'Mitrailleuses jumelées': '<path d="M1.5 6h10M1.5 10h10M11.5 4.5v7M13 6h1.5M13 10h1.5"/>',                                   // deux canons côte à côte
  'Moteur de 180 ch': '<circle cx="8" cy="8" r="1.5"/><path d="M8 6.5C7 4 7.5 1.5 8 1.5s1 2.5 0 5M8 9.5c1 2.5.5 5 0 5s-1-2.5 0-5"/>', // l'hélice
  // les chars
  'Abri à char': '<path d="M1.5 12.5h13M2.5 12.5L4 9h8l1.5 3.5M5 9V7h5v2M10 7.5h4"/>',                                          // le Schneider
  'Chenilles larges': '<rect x="1.5" y="6" width="13" height="6" rx="3"/><circle cx="4.5" cy="9" r="1"/><circle cx="8" cy="9" r="1"/><circle cx="11.5" cy="9" r="1"/>', // la chenille
  'Canon à tir rapide': '<path d="M1.5 9h8M9.5 7v4M12 5l2 4h-3l2 4"/>',                                                         // le canon et l'éclair
  'Blindage renforcé': '<rect x="2" y="3" width="12" height="10"/><path d="M2 6.5h12M2 10h12M6 3v3.5M10 6.5V10M6 10v3"/>',       // les plaques rivetées
  'Moteur renforcé': '<circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>', // l'engrenage
  // les sapeurs
  'Baraque du génie': '<path d="M3 14l7.5-7.5M9 3.5l3.5 3.5M8.5 2.5l5 5"/>',                                                    // la pelle
  'Madriers taillés': '<path d="M1.5 5h13v2.5h-13zM1.5 9.5h13V12h-13z"/><path d="M5 5v2.5M10 9.5V12"/>',                       // deux madriers
  'Voiturettes Decauville': '<path d="M2.5 5h11l-1.5 5h-8z"/><circle cx="5" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/><path d="M1 14.5h14"/>', // le wagonnet sur son rail
  'Sections de 30': '<circle cx="4" cy="4.5" r="1.5"/><circle cx="8" cy="4.5" r="1.5"/><circle cx="12" cy="4.5" r="1.5"/><path d="M2 12V8.5h4V12M6 12V8.5h4V12M10 12V8.5h4V12"/>', // trois hommes
  'Équipe de nuit': '<path d="M9.5 2a4.5 4.5 0 1 0 4.5 6 3.5 3.5 0 0 1-4.5-6z"/><path d="M2 14l4-4"/>',                          // la lune et l'outil
  // la caserne
  'Baraquements': '<path d="M1.5 13.5L8 3l6.5 10.5zM8 3v10.5M6 13.5l2-3.5 2 3.5"/>',                                            // la tente
  'Poste de secours': '<rect x="2" y="2" width="12" height="12"/><path d="M8 5v6M5 8h6"/>',                                     // la croix du secours
  'Cuisine roulante': '<path d="M2 6h9v5H2zM11 7.5h2.5M4 6V4.5M8 6V3"/><circle cx="4" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>', // la roulante et sa cheminée
  'Réserve de plus': '<circle cx="6" cy="4.5" r="2"/><path d="M2.5 14v-4a3.5 3.5 0 0 1 7 0v4M12 6.5v5M9.5 9h5"/>',              // un homme de plus
  'Cantine de campagne': '<path d="M2.5 7h11l-1.5 6h-8z"/><path d="M5 7V5a3 3 0 0 1 6 0v2M1.5 15h13"/>',                       // la gamelle sur sa table
  // l'hôpital
  'Infirmerie': '<path d="M1.5 12.5h13M1.5 9.5h13v3M2.5 12.5v2M13.5 12.5v2M1.5 9.5V6.5"/><circle cx="4" cy="7.5" r="1.2"/>',     // le lit de camp
  'Ambulances': '<path d="M1.5 4.5h8v7h-8zM9.5 7h3l2 2.5v2h-5"/><circle cx="4" cy="12.5" r="1.3"/><circle cx="11.5" cy="12.5" r="1.3"/><path d="M5.5 6v3M4 7.5h3"/>', // l'ambulance
  'Chirurgiens': '<path d="M2 14l7.5-7.5 2 2L4 16M9.5 6.5l4-4.5 1 1-4 4.5"/>',                                                // le scalpel
  'Salle d\'opération': '<path d="M8 1.5v3M3 4.5h10l-1.5 3h-7z"/><path d="M5 10l-1 2M8 10.5V13M11 10l1 2"/>',                   // la lampe qui éclaire
  'Convalescence': '<path d="M6 2.5v11M10 2.5v11M4.5 2.5h3M8.5 2.5h3M6 8.5h4M4.5 13.5h3M8.5 13.5h3"/>',                       // les béquilles
  // les paliers sans choix
  'Parc renforcé': '<circle cx="5" cy="11.5" r="2.5"/><path d="M6.5 9.5l7-5M11 3l3 3"/>', 'Parc lourd': '<path d="M1.5 13.5h13M3 13.5V11h10v2.5M4 11l8-7"/>',
  'Deux hangars': '<path d="M1 13.5h14M1.5 13.5V9a3 3 0 0 1 6 0v4.5M8.5 13.5V9a3 3 0 0 1 6 0v4.5"/>', 'Escadrille': '<path d="M2 8h12M8 4v8M5 12.5h6"/>',
  'Deuxième abri': '<path d="M1.5 12.5h13M2.5 12.5V8a3 3 0 0 1 5.5 0v4.5M8 12.5V8a3 3 0 0 1 5.5 0v4.5"/>', 'Atelier de réparation': '<path d="M3 14l6-6M9.5 2.5a3 3 0 0 0 4 4L12 8 8 4z"/>',
  'Chantier': '<path d="M2 14L8 3l6 11zM5 9h6"/>', 'Forge et grue': '<path d="M3 14V3h9M12 3v4M10 7h4v2h-4zM2 14h4"/>',
  'Cantonnement': '<path d="M1.5 13.5h13M2.5 13.5V7l3-3 3 3v6.5M8.5 13.5V7l3-3 3 3v6.5"/>', 'Camp de repos': '<path d="M1.5 13.5h13M3 13.5V6h10v7.5M6 13.5v-4h4v4M3 6l5-3.5L13 6"/>',
  'Hôpital de campagne': '<rect x="2" y="5" width="12" height="9"/><path d="M8 7.5v4M6 9.5h4M5 5l3-3 3 3"/>', 'Grand hôpital': '<rect x="1.5" y="4" width="13" height="10"/><path d="M8 6.5v5M5.5 9h5M1.5 7h2M12.5 7h2"/>',
  // le troisième jet (data/ameliorations.js, au labo) : les rangs II à V des deux pistes
  'Tables de tir': '<rect x="2" y="2.5" width="12" height="11"/><path d="M2 6h12M2 9.5h12M6 2.5v11"/>', 'Repérage au son': '<circle cx="3" cy="8" r="1.2"/><path d="M6 5a4 4 0 0 1 0 6M9 3a7 7 0 0 1 0 10M12 1.5a9.5 9.5 0 0 1 0 13"/>',
  'Réglage par avion': '<path d="M2 4h12M8 2v4"/><circle cx="8" cy="11" r="3"/><path d="M8 8v6M5 11h6"/>', 'Pointeurs aguerris': '<path d="M3 9l5-4 5 4M3 13l5-4 5 4"/>',
  'Le 220 sur rails': '<path d="M1 12.5h14M1 14.5h14M3 12.5v2M7 12.5v2M11 12.5v2M3 10h9l2-6"/>',
  'Deuxième hangar': '<path d="M1 13.5h14M1.5 13.5V9a3 3 0 0 1 6 0v4.5M8.5 13.5V9a3 3 0 0 1 6 0v4.5"/>', 'Troisième hangar': '<path d="M1 13.5h14M1.5 13.5V10a2 2 0 0 1 4 0v3.5M6 13.5V10a2 2 0 0 1 4 0v3.5M10.5 13.5V10a2 2 0 0 1 4 0v3.5"/>',
  'Observateurs': '<circle cx="4.5" cy="10.5" r="2.5"/><circle cx="11.5" cy="10.5" r="2.5"/><path d="M4.5 8V4h2v4M11.5 8V4h-2v4M6.5 6h3"/>', 'Réservoir auto-obturant': '<path d="M8 2c3 4 4.5 6 4.5 8a4.5 4.5 0 0 1-9 0C3.5 8 5 6 8 2z"/><path d="M6 10h4"/>',
  'Vol rasant': '<path d="M2 6h12M8 4v4M6 8h4M1 12.5l2 1 2-1 2 1 2-1 2 1 2-1 2 1"/>',
  'Troisième abri': '<path d="M1 12.5h14M1.5 12.5V10a2 2 0 0 1 4 0v2.5M6 12.5V10a2 2 0 0 1 4 0v2.5M10.5 12.5V10a2 2 0 0 1 4 0v2.5M1 14.5h14"/>', 'Grue de dépannage': '<path d="M3 14V3l10 3M3 3l4 11M13 6v4M12 10h2v2h-2zM1.5 14h4"/>',
  'Cinquième section': '<circle cx="3" cy="6" r="1.3"/><circle cx="8" cy="6" r="1.3"/><circle cx="13" cy="6" r="1.3"/><circle cx="5.5" cy="11" r="1.3"/><circle cx="10.5" cy="11" r="1.3"/>',
  'Sections de 40': '<path d="M2 3.5h12M2 6.5h12M2 9.5h12M2 12.5h12"/>', 'Voie de 60': '<path d="M5 14L7 2M11 14L9 2M4.5 11h7M5.5 7.5h5M6.3 4.5h3.4"/>',
  'Dépôt divisionnaire': '<path d="M1.5 14V6.5L8 3l6.5 3.5V14M1.5 14h13M5 14V9h6v5M5 11.5h6"/>', 'Train de renfort': '<rect x="1.5" y="5" width="8" height="6"/><path d="M9.5 7h3l2 2v2h-5M1 13.5h14"/><circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/>',
  'Foyer du soldat': '<path d="M3 7h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM11 8h1.5a1.5 1.5 0 0 1 0 3H11M5.5 2.5V5M8.5 2.5V5"/>', 'Permissions': '<path d="M1.5 4.5h13V7a1.5 1.5 0 0 0 0 3v2.5h-13V10a1.5 1.5 0 0 0 0-3z"/><path d="M10 5v1.5M10 8v1.5M10 11v1"/>',
  'Poste avancé': '<path d="M3 14.5V2M3 2.5h9v6H3"/><path d="M7.5 3.5v4M5.5 5.5h4"/>', 'Pavillons': '<path d="M1.5 14V7h6v7M8.5 14V5h6v9M1 14h14M4.5 9v3M3 10.5h3M11.5 7v3M10 8.5h3"/>',
  'Lebel et baïonnette': '<path d="M2 14l9-9M11 5l3.5-3.5M3.5 15l-2-2M6 10.5l1.5 1.5"/>', 'Sacs à terre': '<rect x="1.5" y="10" width="6" height="3.5" rx="1.5"/><rect x="8.5" y="10" width="6" height="3.5" rx="1.5"/><rect x="5" y="6" width="6" height="3.5" rx="1.5"/>',
  'Brancardiers aguerris': '<path d="M1 9h14M3 9v3M13 9v3M4 7h8M5 4l3-2 3 2"/>', 'Fusiliers-mitrailleurs': '<path d="M1.5 9h10l3-2M4 9v3M8 9l1 4M6.5 9V6h2"/>',
  'Nettoyeurs de tranchée': '<path d="M2.5 13.5l7-7 3-3.5 1 1-3.5 3-7 7zM5 11l2 2"/>',
};
/* le pictogramme d'un palier ou d'un choix, par son nom (`data/batiments.js`) */
// (les pièces de l'Infanterie gardent l'icône de leur corvée d'avant, `icones-nuit.js`)
const PIECES = { 'Casques Adrian': 'casque', 'Brancardiers': 'brancards', 'Grenadiers': 'grenades', 'Section Hotchkiss': 'hotchkiss' };
export const iconeCamp = nom => PIECES[nom] ? iconeCorvee(`eq-${PIECES[nom]}`) : svg(ICONES[nom] ?? '<circle cx="8" cy="8" r="2"/>');
/* une pièce d'équipement : celle des corvées d'avant (`icones-nuit.js`) */
export const iconeEquipement = cle => iconeCorvee(`eq-${cle}`);
