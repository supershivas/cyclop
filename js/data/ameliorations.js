// Les arbres du camp, troisième jet (Jérôme, 18 nov. ; validé : docs/chantiers/soiree-arbres.md ; EN JEU depuis la v0.150.0 : js/camp.js). data/batiments.js garde les ordres,
// le plan du camp et les effectifs du niveau I (`niveaux[0]`) ; ses niveaux 2 et 3 et leurs choix ne sont plus lus que par les anciennes variantes du labo.
// Sept onglets : le niveau I donné, puis deux pistes de quatre rangs (II à V), plus forts et plus chers à chaque rang (PRIX) ; les deux pistes s'achètent ; un rang demande le rang
// d'avant de sa piste et, s'il a un `lien`, un rang d'un autre onglet ([onglet, piste, rang]). `effets` : les facteurs que lirait `modif(etat, camp, clé)` (ils se multiplient) ;
// une clé `+x` s'ajoute (avions, chars, sections, régiments frais). `chiffre` : ce que le joueur lit, court. L'Infanterie vaut pour tous nos régiments (Jérôme, 18 nov.).
export const PRIX = [2, 3, 4, 5];               // rangs II, III, IV, V (14 par piste, 28 par onglet, 196 pour tout)
export const DOTATION_SOIR = 2;                 // le soir rapporte +2 (Jérôme, 18 nov. : « ~12 rangs par bataille ») : DOTATION.soir de data/batiments.js

const r = (nom, chiffre, effets, lien = null) => ({ nom, chiffre, effets, lien });
export const ARBRES = {
  artillerie: { nom: 'Parc d\'artillerie', court: 'Artillerie', i: { nom: 'Batteries de campagne', chiffre: 'Le 75, le 155 et le 220 prêts' },
    pistes: [
      { nom: 'Justesse', rangs: [r('Tir de réglage', 'Dispersion −10 %', { 'artillerie.dispersion': 0.9 }), r('Tables de tir', 'Dispersion −10 %', { 'artillerie.dispersion': 0.9 }),
        r('Repérage au son', 'Dispersion −15 %', { 'artillerie.dispersion': 0.85 }), r('Réglage par avion', 'Dispersion −20 %', { 'artillerie.dispersion': 0.8 }, ['aerodrome', 1, 1])] },
      { nom: 'Cadence', rangs: [r('Caissons doublés', 'Recharge −10 %', { 'artillerie.recharge': 0.9 }), r('Pointeurs aguerris', 'Recharge −10 %', { 'artillerie.recharge': 0.9 }),
        r('Tube neuf', 'Recharge du 220 −25 %', { 'artillerie.recharge220': 0.75 }), r('Le 220 sur rails', 'Salve du 220 : 10 coups au lieu de 6', { 'artillerie.salve220': 10 / 6 }, ['sapeurs', 1, 3])] },
    ] },
  aerodrome: { nom: 'Aérodrome', court: 'Aérodrome', i: { nom: 'Terrain et un hangar', chiffre: '3 avions' },
    pistes: [
      { nom: 'Escadrille', rangs: [r('Deuxième hangar', '+1 avion', { '+avions': 1 }), r('Moteur de 180 ch', 'Recharge −20 %', { 'aerodrome.recharge': 0.8 }),
        r('Troisième hangar', '+1 avion', { '+avions': 1 }), r('Mitrailleuses jumelées', 'Chaque passe touche +25 %', { 'aerodrome.letal': 1.25 })] },
      { nom: 'Observateurs', rangs: [r('Blindage du siège', 'Points de vie +20 %', { 'aerodrome.pv': 1.2 }), r('Observateurs', 'Passe +30 % plus longue', { 'aerodrome.longueur': 1.3 }),
        r('Réservoir auto-obturant', 'Points de vie +20 %', { 'aerodrome.pv': 1.2 }), r('Vol rasant', 'Passe +15 %, touche +10 %', { 'aerodrome.longueur': 1.15, 'aerodrome.letal': 1.1 }, ['artillerie', 0, 1])] },
    ] },
  chars: { nom: 'Parc des chars', court: 'Chars', i: { nom: 'Abri à char', chiffre: '2 chars, recharge 240 s' },
    pistes: [
      { nom: 'Le parc', rangs: [r('Deuxième abri', '+1 char', { '+chars': 1 }), r('Atelier de réparation', 'Recharge −20 %', { 'chars.recharge': 0.8 }),
        r('Troisième abri', '+1 char', { '+chars': 1 }), r('Grue de dépannage', 'Recharge −20 %, épave relevée à 3/4', { 'chars.recharge': 0.8, 'chars.releve': 1.5 }, ['sapeurs', 1, 2])] },
      { nom: 'Le char', rangs: [r('Chenilles larges', 'Franchit des cratères +33 %', { 'chars.franchit': 1.33 }), r('Canon à tir rapide', 'Le canon recharge −25 %', { 'chars.canon': 0.75 }),
        r('Blindage renforcé', 'Points de vie +30 %', { 'chars.pv': 1.3 }), r('Moteur renforcé', 'Vitesse +15 %', { 'chars.vitesse': 1.15 })] },
    ] },
  sapeurs: { nom: 'Maison des sapeurs', court: 'Sapeurs', i: { nom: 'Baraque du génie', chiffre: '2 sections de 20, les ponts' },
    pistes: [
      { nom: 'Sections', rangs: [r('Chantier', '+2 sections, les nids se refont', { '+sections': 2 }), r('Sections de 30', '30 hommes par section', { 'sapeurs.hommes': 1.5 }),
        r('Cinquième section', '+1 section', { '+sections': 1 }), r('Sections de 40', '40 hommes par section', { 'sapeurs.hommes': 4 / 3 })] },
      { nom: 'Matériel', rangs: [r('Madriers taillés', 'Travail −15 %', { 'sapeurs.travail': 0.85 }), r('Voiturettes Decauville', 'Marche +25 %', { 'sapeurs.vitesse': 1.25 }),
        r('Forge et grue', 'Travail −15 %', { 'sapeurs.travail': 0.85 }), r('Voie de 60', 'Marche +20 %, deux réparations par jour', { 'sapeurs.vitesse': 1.2, 'sapeurs.reparations': 2 })] },
    ] },
  caserne: { nom: 'Caserne', court: 'Caserne', i: { nom: 'Baraquements', chiffre: '2 régiments frais' },
    pistes: [
      { nom: 'Réserve', rangs: [r('Cantonnement', '+2 régiments frais', { '+reserves': 2 }), r('Camp de repos', '+2 régiments frais', { '+reserves': 2 }),
        r('Dépôt divisionnaire', '+1 régiment frais', { '+reserves': 1 }), r('Train de renfort', 'Un renfort se déploie deux fois plus vite', { 'caserne.deploiement': 0.5 })] },
      { nom: 'Ordinaire', rangs: [r('Cuisine roulante', 'Vivres pour 4 nuits', { 'caserne.vivres': 4 / 3 }), r('Foyer du soldat', 'Le repos rend +20 % de moral', { 'caserne.repos': 1.2 }),
        r('Cantine de campagne', 'Vivres pour 5 nuits', { 'caserne.vivres': 1.25 }), r('Permissions', 'La relève ne coûte plus de régiment frais', { '+releve': 1 }, ['hopital', 1, 2])] },
    ] },
  hopital: { nom: 'Hôpital', court: 'Hôpital', i: { nom: 'Infirmerie', chiffre: 'La moitié des évacués revient' },
    pistes: [
      { nom: 'Sauver', rangs: [r('Hôpital de campagne', 'Blessés laissés morts −15 %', { 'hopital.mort': 0.85 }), r('Ambulances', 'Blessés laissés morts −15 %', { 'hopital.mort': 0.85 }),
        r('Salle d\'opération', 'Blessés laissés morts −15 %', { 'hopital.mort': 0.85 }), r('Poste avancé', 'Blessés laissés morts −20 %', { 'hopital.mort': 0.8 }, ['infanterie', 0, 1])] },
      { nom: 'Guérir', rangs: [r('Chirurgiens', 'Évacués guéris +10 %', { 'hopital.retour': 1.1 }), r('Pavillons', 'Évacués guéris +10 %', { 'hopital.retour': 1.1 }),
        r('Convalescence', 'Évacués guéris +15 %', { 'hopital.retour': 1.15 }), r('Grand hôpital', 'Guéris +15 %, de retour dès l\'aube', { 'hopital.retour': 1.15, 'hopital.delai': 0 })] },
    ] },
  infanterie: { nom: 'Infanterie', court: 'Infanterie', i: { nom: 'Lebel et baïonnette', chiffre: 'Tous nos régiments' },
    pistes: [
      { nom: 'Protéger', rangs: [r('Casques Adrian', 'Tués par obus −20 %', { 'infanterie.obus': 0.8 }), r('Brancardiers', 'Blessés laissés morts −30 %', { 'infanterie.mortBlesse': 0.7 }),
        r('Sacs à terre', 'En tranchée, tués par obus −15 %', { 'infanterie.tranchee': 0.85 }), r('Brancardiers aguerris', 'Blessés morts −30 %, guéris +25 %', { 'infanterie.mortBlesse': 0.7, 'infanterie.retour': 1.25 }, ['hopital', 0, 1])] },
      { nom: 'Frapper', rangs: [r('Grenadiers', 'Corps à corps +15 %', { 'infanterie.melee': 1.15 }), r('Section Hotchkiss', 'Portée du tir +10 %', { 'infanterie.portee': 1.1 }),
        r('Fusiliers-mitrailleurs', 'Portée +5 %, tir +10 %', { 'infanterie.portee': 1.05, 'infanterie.tir': 1.1 }), r('Nettoyeurs de tranchée', 'Corps à corps +25 %', { 'infanterie.melee': 1.25 }, ['chars', 1, 1])] },
    ] },
};
export const ORDRE_ARBRES = ['artillerie', 'aerodrome', 'chars', 'sapeurs', 'caserne', 'hopital', 'infanterie'];
// le nom d'un rang par son adresse [onglet, piste, rang] (rang 0 = II … 3 = V)
export const nomRang = ([o, p, k]) => ARBRES[o].pistes[p].rangs[k].nom;
export const ROMAINS = ['II', 'III', 'IV', 'V'];
// Le plan d'en face (iaBatir de camp.js) : ses pistes par ordre de préférence, rang par rang (II partout, puis III…) ; il n'a ni char ni avion à employer
const PISTES_IA = [['artillerie', 0], ['caserne', 0], ['artillerie', 1], ['sapeurs', 0], ['infanterie', 0], ['hopital', 0], ['infanterie', 1], ['caserne', 1], ['sapeurs', 1], ['hopital', 1]];
export const IA_PLAN = [0, 1, 2, 3].flatMap(k => PISTES_IA.map(([o, p]) => [o, p, k]));
