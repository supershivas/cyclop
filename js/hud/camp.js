// Le camp à l'écran (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md). Les ordres de batterie ont leurs boutons permanents en bas à droite (main.js, `#batteries` : v0.97.0, « idem pour avion, chars et
// sapeurs ») ; ici, la fenêtre d'un bâtiment, posée au-dessus de lui quand on le choisit (v0.96.0 : « les options apparaissent au-dessus de chaque bâtiment au clic ; simplifier au maximum »), sur le modèle de la
// fenêtre d'un régiment (`.reg-ouvert` : le titre et son niveau, une ligne de ce qu'il fait, des boutons de même largeur), et le bouton « Le camp » (la dotation, et la touche B). L'amélioration tient en un clic : le
// choix du palier EST le bouton (« Tir de réglage · 3 pts »). Le texte long est dans l'infobulle. Lecture seule de l'état : les ordres passent par les fonctions que main.js donne.
import { BATIMENTS, EQUIPEMENT } from '../data/batiments.js?v=0.129.1';
import { CHARS, CHAR_PAR_DEFAUT, CHAR_DEPART } from '../data/chars.js?v=0.129.1';
import { refusCamp, campDe, charsDispo, modif, pvAvion, patients, renfortsDe, NIVEAU_MAX } from '../camp.js?v=0.129.1';
import { peutDeployer, blessesDe } from '../bataille.js?v=0.129.1';
import { avionsPrets, avionsRestants, positionDe } from '../avions.js?v=0.129.1';
import { avionAbime, reparationFaite } from '../genie.js?v=0.129.1';
import { MITRAILLAGE } from '../data/mitraillage.js?v=0.129.1';
import { METEO } from '../data/meteo.js?v=0.129.1';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// `centrer(x, y)` : la caméra va à ce point (un clic sur un char déployé) ; `reste(cal)` : les secondes avant que la batterie soit prête
// `bouton` : le bouton « Le camp » ; `aller()` : la caméra au camp (la touche B) ; `ameliorer(cle, choix)` : l'ordre de chantier (il dit son refus lui-même)
export function creerCampHud({ moi = () => 0, deployer = () => {}, bouton, papier, aller, ameliorer, centrer = () => {}, choisirChar = null, choisirAvion = null, reparerAvion = null, reste = () => 0, affecter = () => {} }) {
  let cle = null, signature = '';
  bouton.onclick = () => aller();
  const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
  // la fenêtre : refaite quand le bâtiment, son niveau, son chantier ou la caisse changent
  function dessiner(B) {
    const e = B.etat, c = campDe(e, moi()).batiments[cle], Bd = BATIMENTS[cle], niveau = c.niveau, N = Bd.niveaux;
    papier.replaceChildren();
    papier.append(el('div', { className: 'tete' }, el('b', { textContent: Bd.nom }), el('span', { textContent: niveau ? `niveau ${niveau}` : 'à bâtir' })));
    const dit = c.chantier ? `Chantier : ${N[c.chantier.vers - 1].nom}, fini à l'aube${c.chantier.nuits > 1 ? ` (dans ${c.chantier.nuits} nuits)` : ''}.`
      : cle !== 'caserne' ? N[Math.max(0, niveau - 1)].effet
      : `${e.ralliees[moi()].length ? `${e.ralliees[moi()].map(u => u.n).join(' et ')} fuyards ralliés attendent. ` : ''}La relève${niveau >= EQUIPEMENT.niveauCaserne ? " et l'équipement se donnent" : ' se donne'} la nuit, depuis la carte du régiment ; un renfort se déploie à tout moment du jour.`;
    papier.append(el('div', { className: 'compte', textContent: dit }));
    if (cle === 'caserne' && niveau) {      // les régiments frais, en clair (v0.116.0) : combien en reste, combien ont servi, et ce qui les consomme
      const r = renfortsDe(e, moi()), pl = n => `régiment${n > 1 ? 's' : ''}`;
      const fiche = el('div', { className: 'renforts' }, el('b', { textContent: `Régiments frais : ${r.restants} sur ${r.total}` }),
        el('span', { className: 'pastilles', ariaHidden: 'true' }, ...Array.from({ length: r.total }, (_, k) => el('i', { className: k < r.pris ? 'pris' : '' }))),
        el('span', { textContent: r.pris ? `${r.pris} ${pl(r.pris)} déjà engagé${r.pris > 1 ? 's' : ''} (relève ou déploiement).` : 'Aucun n\'a encore servi.' }),
        el('span', { className: 'discret', textContent: `Chaque relève de nuit ou renfort déployé en consomme un, dans la limite de ${r.plafond} par bataille. Il n'en arrive pas un nouveau chaque jour.` }));
      fiche.title = 'Les régiments frais sont tirés de la réserve : la relève de nuit et le déploiement du jour puisent dans la même.';
      papier.append(fiche);
    }
    // les renforts (lot D) : le régiment frais, puis les fuyards ralliés ; le bouton dit où ils iront, ou pourquoi ils ne partent pas
    if (niveau && cle === 'caserne') {
      const liste = el('div', { className: 'actions' }); liste.style.setProperty('--cols', 1);
      const un = (ralliee, texte) => {
        const p = peutDeployer(B, moi(), ralliee), b = el('button', { type: 'button', className: p.ok ? '' : 'refus', textContent: p.ok ? `${texte} → ${p.ou}` : texte, onclick: () => deployer(ralliee) });
        b.dataset.info = `# ${texte}\n${p.ok ? (p.mode === 'contre' ? `Aucun secteur sans défenseur : il contre-attaque **${p.ou}**, que l'ennemi tient.` : `Il sort de la caserne et prend **${p.ou}**, le premier secteur sans défenseur.`) : `**${p.refus}**`}`;
        b.setAttribute('aria-disabled', p.ok ? 'false' : 'true');
        liste.append(b);
      };
      if (renfortsDe(e, moi()).restants > 0) un(false, `Déployer un régiment frais (${renfortsDe(e, moi()).restants})`);
      if (e.ralliees[moi()].length) un(true, `Déployer les ralliés (${e.ralliees[moi()][0].n})`);
      if (!liste.children.length) papier.append(el('div', { className: 'compte discret', textContent: 'Plus de renfort à déployer.' })); else papier.append(liste);
    }
    // le parc et l'aérodrome disent ce qu'ils ont (v0.99.8) : le total, ce qui est sorti et dans quel état ; un clic sur un char y mène la vue
    if (niveau && cle === 'chars') {
      const mes = e.chars.filter(c => c.camp === moi()), vivants = mes.filter(c => c.etat !== 'detruit'), morts = mes.length - vivants.length, r = reste('char');
      papier.append(el('div', { className: 'compte', textContent: `${charsDispo(e, moi()) !== null ? `${charsDispo(e, moi())} au parc · ` : ''}${vivants.length} char${vivants.length > 1 ? 's' : ''} déployé${vivants.length > 1 ? 's' : ''}${morts ? ` · ${morts} détruit${morts > 1 ? 's' : ''}` : ''} · prochain char : ${r > 0 ? `dans ${r} s` : 'PRÊT'}` }));
      // un bouton par char du camp (v0.123.0) : déployé, il mène la vue jusqu'à lui et ouvre sa fiche ; détruit ou encore au parc, il est muet : on n'y voit que ses chiffres et pourquoi on ne peut pas y aller
      const liste = el('div', { className: 'actions' }); liste.style.setProperty('--cols', 1);
      const M = CHARS[CHAR_PAR_DEFAUT], pvParc = Math.round(M.pv * modif(e, moi(), 'chars.pv')), au = charsDispo(e, moi()) ?? 0;
      const fiche = (nom, etat, vie, c) => `# ${nom}\n## ${etat}\nCoque : **${vie}** · canon de ${M.canon.calibre}, un obus tous les ${M.canon.recharge} s, portée ${M.canon.portee} m${c ? `\nVictimes : ${c.tues ?? 0} · réparations : ${c.repar ?? 0} · obus tirés : ${c.obus ?? 0}` : ''}`;
      mes.forEach((c, k) => {
        const mort = c.etat === 'detruit', etat = mort ? 'détruit' : c.etat === 'enlise' ? 'enlisé' : c.etat === 'arrive' ? 'à l\'arrêt' : 'en route', vie = Math.max(0, Math.round(c.pv / (c.pvMax || 1) * 100));
        const b = el('button', { type: 'button', textContent: `Char ${k + 1} · ${etat}${mort ? '' : ` · ${vie} % · ${c.tues ?? 0} victime${(c.tues ?? 0) > 1 ? 's' : ''}`}`, onclick: () => { if (mort) return; centrer(c.x, c.y); choisirChar?.(c.id); } });
        b.dataset.info = `${fiche(`Char ${k + 1}`, etat, `${vie} % (${Math.max(0, Math.round(c.pv))} / ${c.pvMax})`, c)}\n${mort ? '**Détruit : l\'épave reste sur le champ, il ne se répare pas.**' : 'Un clic : la vue va jusqu\'à lui et sa fiche s\'ouvre.'}`;
        b.setAttribute('aria-disabled', mort ? 'true' : 'false');
        liste.append(b);
      });
      const motifParc = e.phase !== 'jour' ? 'La nuit, les ordres attendent l\'aube.' : r > 0 ? `Le prochain char n'est pas prêt : encore ${r} s.` : `Pas encore sorti : touche 5 (ou le bouton Char) puis un clic sur le terrain, à plus de ${CHAR_DEPART} m de nos lignes.`;
      for (let i = 0; i < au; i++) {
        const b = el('button', { type: 'button', textContent: `Char ${mes.length + i + 1} · au parc · pas déployé` });
        b.dataset.info = `${fiche(`Char ${mes.length + i + 1}`, 'au parc', `${pvParc} points`, null)}\n**${i ? 'Il sort après ceux qui le précèdent au parc.' : motifParc}**`;
        b.setAttribute('aria-disabled', 'true');
        liste.append(b);
      }
      if (liste.children.length) papier.append(liste);
    }
    if (niveau && cle === 'aerodrome') {      // le génie remet un avion abîmé en état (v0.115.0) : un avion ou un char par jour
      const a = avionAbime(e, moi()), pris = reparationFaite(e, moi()), au = e.genies.some(g => g.camp === moi() && g.avion !== undefined);
      const b = el('button', { type: 'button', textContent: au ? 'Génie au travail…' : 'Réparer un avion (génie)', onclick: () => reparerAvion?.() });
      b.setAttribute('aria-disabled', au || a < 0 || pris ? 'true' : 'false');
      b.dataset.info = `# Réparer un avion\nLe génie remet en état l'avion abîmé le plus touché, au sol. Une réparation d'avion ou de char par jour. ${au ? 'Les sapeurs sont à l\'œuvre.' : pris ? '**Déjà faite aujourd\'hui.**' : a < 0 ? '**Aucun avion abîmé au sol.**' : ''}`;
      const liste = el('div', { className: 'actions' }); liste.style.setProperty('--cols', 1); liste.append(b); papier.append(liste);
    }
    if (niveau && cle === 'hopital') {      // les blessés évacués (v0.99.11) : combien, de quelle blessure, et où repartent les guéris
      const ps = patients(e, moi()), prets = ps.filter(p => p.pret).length, n = [0, 0, 0, 0];
      for (const p of ps) n[p.blessure]++;
      const lieux = blessesDe(B, moi()), s = k => k > 1 ? 's' : '';
      papier.append(el('div', { className: 'blesses-hopital' },
        el('b', { textContent: `${ps.length} blessé${s(ps.length)} à l'hôpital` }),
        el('span', { textContent: `${lieux.enRoute} en route · ${lieux.champ} sur le champ (à évacuer la nuit)` })));
      papier.append(el('div', { className: 'compte', textContent: ps.length ? `${ps.length} blessé${s(ps.length)} soigné${s(ps.length)} (${n[1]} au bras, ${n[2]} à la jambe, ${n[3]} à la tête) · ${prets} guéri${s(prets)}, prêt${s(prets)} à repartir à l'aube` : 'Aucun blessé à l\'hôpital : ceux qui peuvent marcher y vont d\'eux-mêmes, les autres sont évacués la nuit (corvée « évacuer »).' }));
      const liste = el('div', { className: 'actions' }); liste.style.setProperty('--cols', 2);
      const voulu = e.affectation?.[moi()] ?? null;
      const b0 = el('button', { type: 'button', className: voulu === null ? 'actif' : '', textContent: 'Chacun au sien', onclick: () => affecter(null) }); b0.dataset.info = '# Chacun au sien\nLes guéris retrouvent le régiment qu\'ils ont quitté.'; liste.append(b0);
      for (const r of e.regiments) if (r.camp === moi() && r.effectif > 0) {
        const b = el('button', { type: 'button', className: voulu === r.id ? 'actif' : '', textContent: `Tous au ${r.nom}`, onclick: () => affecter(r.id) });
        b.dataset.info = `# ${r.nom}\nLes guéris repartent dans ce régiment, par l'arrière, à l'aube (s'il tient encore).`; liste.append(b);
      }
      papier.append(liste);
    }
    if (niveau && cle === 'aerodrome') {
      const restants = avionsRestants(e, moi()), prets = avionsPrets(e, moi()), meteo = e.meteo[e.jour - 1], cloue = MITRAILLAGE.cloue.includes(meteo);
      papier.append(el('div', { className: 'compte', textContent: `${restants} avion${restants > 1 ? 's' : ''} (${prets} au sol, ${restants - prets} en vol) · ${e.avions[moi()].map(pv => pv > 0 ? `${pv} pv` : 'perdu').join(', ')}${cloue ? ` · ${METEO[meteo].nom} : les avions restent au sol` : ''}` }));
      // un bouton par avion de l'escadrille (v0.123.0) : en vol, il mène la vue jusqu'à lui et ouvre sa fiche ; au sol ou perdu, il est muet : ses chiffres et pourquoi on ne peut pas y aller
      const liste = el('div', { className: 'actions' }); liste.style.setProperty('--cols', 1); const max = pvAvion(e, moi());
      e.avions[moi()].forEach((pv, k) => {
        const vol = e.mitraillages.find(v => v.camp === moi() && v.k === k && v.etat === 'vol'), perdu = !vol && pv <= 0, vie = Math.round((vol ? vol.pv : pv) / max * 100);
        const etat = vol ? 'en vol' : perdu ? 'perdu' : 'au sol';
        const b = el('button', { type: 'button', textContent: `Avion ${k + 1} · ${etat}${perdu ? '' : ` · ${vie} %`}`, onclick: () => { if (!vol) return; const p = positionDe(vol, B.etat.temps); centrer(p.x, p.y); choisirAvion?.(vol.id); } });
        const motif = vol ? 'Un clic : la vue va jusqu\'à lui et sa fiche s\'ouvre.' : perdu ? 'Abattu ou écrasé : l\'épave reste sur le champ, il ne reviendra pas.' : e.phase !== 'jour' ? 'La nuit, les ordres attendent l\'aube.' : cloue ? `${METEO[meteo].nom[0].toUpperCase()}${METEO[meteo].nom.slice(1)} : les avions restent au sol.` : 'Au sol : il n\'y a rien à suivre tant qu\'il n\'a pas décollé. Touche 4 (ou le bouton Avion), puis deux clics pour tracer sa passe.';
        b.dataset.info = `# Avion ${k + 1}\n## ${etat}\nCellule : **${perdu ? '0 %' : `${vie} %`}** (${Math.max(0, Math.round(vol ? vol.pv : pv))} / ${max} points)${vol ? `\nAltitude : ${Math.round(positionDe(vol, B.etat.temps).h)} m` : ''}${!vol && !perdu && vie < 100 ? '\nAbîmé : le génie peut le réparer (bouton plus bas).' : ''}\n${vol ? motif : `**${motif}**`}`;
        b.setAttribute('aria-disabled', vol ? 'false' : 'true');
        liste.append(b);
      });
      papier.append(liste);
    }
    // l'amélioration : un clic. Au niveau 1, « Bâtir » ; au palier à choix (2 et 3), deux boutons, un par amélioration ; rien au niveau maximal ni pendant un chantier
    if (niveau < NIVEAU_MAX && !c.chantier) {
      const vers = niveau + 1, S = N[vers - 1], options = S.choix ? S.choix.map(([nom, effet], i) => ({ nom, effet, i })) : [{ nom: niveau ? 'Améliorer' : 'Bâtir', effet: S.effet, i: null }];
      const ligne = el('div', { className: 'actions' }); ligne.style.setProperty('--cols', options.length);
      for (const o of options) {
        const refus = refusCamp(e, cle, o.i, moi());
        const b = el('button', { type: 'button', className: refus ? 'refus' : '', textContent: `${o.nom} · ${pts(S.cout)}`, onclick: () => ameliorer(cle, o.i) });
        b.dataset.info = `# ${o.nom}\n## ${S.nom} · niveau ${niveau + 1} · ${pts(S.cout)}\n${o.effet}${refus ? `\n**${refus}**` : ''}`;
        b.setAttribute('aria-disabled', refus ? 'true' : 'false');
        ligne.append(b);
      }
      papier.append(ligne);
    }
  }
  function maj(B) {
    const e = B.etat, camp = campDe(e, moi());
    if (!camp?.bride) { bouton.hidden = true; papier.hidden = true; return; }
    bouton.hidden = false;
    const enChantier = Object.values(camp.batiments).filter(c => c.chantier).length;
    bouton.textContent = `Le camp · ${pts(camp.dotation)}${enChantier ? ` · ${enChantier} chantier${enChantier > 1 ? 's' : ''}` : ''}`;
    bouton.title = `# Le camp (B)\nLa caméra y va. Un bâtiment se choisit d'un clic sur lui : on y dépense la dotation.\n## La dotation (${pts(camp.dotation)})\nElle tombe à l'aube : **+1** ; **+1** si nos lignes tiennent à 75 % ; **+2** la première fois qu'une ligne d'en face est prise.`;
    papier.hidden = !cle;
    if (!cle) { signature = ''; return; }
    const c = camp.batiments[cle], s = [cle, c.niveau, c.chantier?.nuits ?? '', camp.dotation, e.reserves[moi()], renfortsDe(e, moi()).pris, cle === 'hopital' ? (() => { const l = blessesDe(B, moi()); return `${l.enRoute}/${l.champ}`; })() : '', cle === 'chars' ? e.chars.filter(k => k.camp === moi()).map(k => `${k.id}${k.etat}${Math.round(k.pv)}${k.tues ?? 0}`).join() + reste('char') + charsDispo(e, moi()) : '', cle === 'hopital' ? patients(e, moi()).map(p => p.id + (p.pret ? 'p' : '')).join() + (e.affectation?.[moi()] ?? '') : '', cle === 'aerodrome' ? e.avions[moi()].join() + e.mitraillages.filter(v => v.camp === moi() && v.etat === 'vol').map(v => v.id + ':' + Math.round(v.pv)).join() + e.phase + reparationFaite(e, moi()) + e.genies.length + avionsPrets(e, moi()) + e.meteo[e.jour - 1] : '', cle === 'caserne' ? [e.phase, e.ralliees[moi()].map(u => u.n).join(), e.troncons.join(''), e.regiments.filter(r => r.camp === moi() && r.effectif > 0 && !r.deroute).length].join(':') : ''].join('|');
    if (s !== signature) { signature = s; dessiner(B); }
  }
  return { maj, choisi: () => cle, choisirCle(k) { cle = k; signature = ''; } };
}
