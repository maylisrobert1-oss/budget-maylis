// Tests du moteur, sur des données entièrement inventées (aucun relevé réel, aucun nom réel).
// Navigateur : ouvrir tests/index.html. Node : node tests/moteur.test.js
(function () {
  const M = typeof require !== 'undefined' ? require('../moteur.js') : window.Moteur;
  const resultats = [];
  let groupe = '';
  const dans = (nom) => { groupe = nom; };
  const noter = (nom, ok, detail) => resultats.push({ groupe, nom, ok, detail: ok ? '' : detail });
  const egal = (nom, obtenu, attendu) => noter(nom, obtenu === attendu, 'obtenu ' + JSON.stringify(obtenu) + ', attendu ' + JSON.stringify(attendu));
  const proche = (nom, obtenu, attendu) => noter(nom, typeof obtenu === 'number' && Math.abs(obtenu - attendu) < 0.011, 'obtenu ' + obtenu + ', attendu ' + attendu);
  const somme = (a) => a.reduce((s, x) => s + x, 0);

  // ---------- Jeu de données inventé ----------
  // Mois du 10 au 9. Trois mois terminés (mars, avril, mai), puis juin en cours.
  let n = 0;
  const op = (date, libelle, montant, poste) => ({ id: ++n, date, libelle, montant, cat: '', poste, src: 'test' });
  const operations = [
    // Mars (10 mars au 9 avril)
    op('2026-03-10', 'VIR SEPA EMPLOYEUR FICTIF', 2000, 'salaire'),
    op('2026-03-12', 'VIR SEPA FAMILLE FICTIVE', 200, 'aides'),
    op('2026-03-15', 'PRLV SEPA STREAMING FICTIF', -20, 'abonnements'),
    op('2026-03-18', 'CARTE 17/03/26 SUPERMARCHE FICTIF CB*0000', -300, 'courses'),
    op('2026-03-22', 'CARTE 21/03/26 BISTROT FICTIF CB*0000', -120, 'restos'),
    op('2026-04-01', 'PRLV SEPA BAILLEUR FICTIF', -600, 'loyer'),
    // Avril : la paie arrive 2 jours avant le 10, elle compte pour avril
    op('2026-04-08', 'VIR SEPA EMPLOYEUR FICTIF', 2000, 'salaire'),
    op('2026-04-12', 'VIR SEPA FAMILLE FICTIVE', 200, 'aides'),
    op('2026-04-15', 'PRLV SEPA STREAMING FICTIF', -20, 'abonnements'),
    op('2026-04-18', 'CARTE 17/04/26 SUPERMARCHE FICTIF CB*0000', -330, 'courses'),
    op('2026-04-22', 'CARTE 21/04/26 BISTROT FICTIF CB*0000', -140, 'restos'),
    op('2026-04-24', 'VIR INST CAMILLE EXEMPLE', 20, 'restos'),
    op('2026-04-25', 'CARTE 24/04/26 FLEURISTE FICTIF CB*0000', -90, 'cadeaux'),
    op('2026-05-01', 'PRLV SEPA BAILLEUR FICTIF', -600, 'loyer'),
    // Mai : un revenu ponctuel et un virement vers l'épargne
    op('2026-05-10', 'VIR SEPA EMPLOYEUR FICTIF', 2100, 'salaire'),
    op('2026-05-12', 'VIR SEPA FAMILLE FICTIVE', 200, 'aides'),
    op('2026-05-14', 'VIR SEPA REMBOURSEMENT PONCTUEL', 500, 'revenu_autre'),
    op('2026-05-15', 'PRLV SEPA STREAMING FICTIF', -20, 'abonnements'),
    op('2026-05-18', 'CARTE 17/05/26 SUPERMARCHE FICTIF CB*0000', -270, 'courses'),
    op('2026-05-20', 'VIR VIREMENT VERS LIVRET A', -150, 'epargne'),
    op('2026-05-22', 'CARTE 21/05/26 BISTROT FICTIF CB*0000', -120, 'restos'),
    op('2026-06-01', 'PRLV SEPA BAILLEUR FICTIF', -600, 'loyer'),
    // Juin, en cours : l'aide n'est pas encore arrivée, le loyer non plus, les restos dépassent leur budget
    op('2026-06-10', 'VIR SEPA EMPLOYEUR FICTIF', 2000, 'salaire'),
    op('2026-06-12', 'CARTE 11/06/26 SUPERMARCHE FICTIF CB*0000', -100, 'courses'),
    op('2026-06-14', 'CARTE 13/06/26 BISTROT FICTIF CB*0000', -150, 'restos'),
    op('2026-06-15', 'PRLV SEPA STREAMING FICTIF', -20, 'abonnements'),
    op('2026-06-16', 'CARTE 15/06/26 FLEURISTE FICTIF CB*0000', -50, 'cadeaux')
  ];
  const donnees = (plus) => Object.assign({
    format: 'budget-maylis', version: 1,
    reglages: { salaire_ref: 2000, aides: [{ id: 'famille', nom: 'Famille', montant: 200 }], jour_debut: 10, epargne_min: 0.1, epargne_obj: 0.2, compte_min: 500 },
    fixes: [{ id: 'loyer', nom: 'Loyer', montant: 600 }, { id: 'abonnements', nom: 'Abonnements', montant: 20 }],
    epargne: { livrets: { valeur: 5000, date: '2026-05-01' } },
    regles: [{ motif: 'EMPLOYEUR FICTIF', sens: 'credit', poste: 'salaire' }],
    regles_perso: [], operations, soldes: {}, export: '2026-06-20', migrations: ['abonnements-libelle']
  }, plus || {});
  const poste = (c, id) => c.variables.concat(c.enveloppes).find((p) => p.id === id);

  // ---------- Mois budgétaire ----------
  dans('Mois budgétaire');
  egal('le 9 appartient encore au mois précédent', M.moisDe('2026-06-09', 10), '2026-05');
  egal('le 10 ouvre le nouveau mois', M.moisDe('2026-06-10', 10), '2026-06');
  const c = M.calculer(donnees());
  egal('mois en cours', c.mc, '2026-06');
  egal('début du mois', c.debut, '2026-06-10');
  egal('fin du mois', c.fin, '2026-07-09');
  egal('nombre de jours', c.nbJours, 30);
  egal('jours écoulés', c.ecoules, 11);
  egal('paie arrivée 2 jours avant : comptée pour le mois qui commence', c.operations.find((o) => o.date === '2026-04-08').mois, '2026-04');
  egal('loyer du 1er : compté dans le mois commencé le 10 précédent', c.operations.find((o) => o.date === '2026-04-01').mois, '2026-03');

  // ---------- Budget par poste ----------
  dans('Budget par poste (moyenne des mois terminés)');
  proche('courses : moyenne de 300, 330, 270', poste(c, 'courses').objectif, 300);
  proche('restos : remboursement d’un ami déduit', poste(c, 'restos').objectif, 120);
  proche('dépense rare : moyenne sur 3 mois', poste(c, 'cadeaux').par_mois, 30);
  egal('3 mois dans la moyenne', poste(c, 'courses').mois_objectif.length, 3);
  egal('le mois en cours n’entre pas dans la moyenne', poste(c, 'courses').mois_objectif.includes('2026-06'), false);
  const cFen = M.calculer(donnees({ fenetres: { courses: '2026-05' } }));
  proche('fenêtre propre à un poste : moyenne depuis mai seulement', poste(cFen, 'courses').objectif, 270);
  const cDep = M.calculer(donnees({ fenetres: { courses: '2026-06' }, objectifs_depart: { courses: 250 } }));
  proche('aucun mois terminé dans la fenêtre : budget de départ', poste(cDep, 'courses').objectif, 250);
  const cMan = M.calculer(donnees({ objectifs_manuels: { restos: 0.06 } }));
  proche('budget fixé à la main : % des revenus réels moyens', poste(cMan, 'restos').objectif, 134);
  egal('budget fixé à la main : signalé', poste(cMan, 'restos').manuel, true);
  proche('budget fixé à la main : l’automatique reste connu', poste(cMan, 'restos').auto, 120);

  // ---------- Moyenne réelle ----------
  dans('Moyenne réelle et mois dernier');
  proche('revenus moyens, sans le revenu ponctuel', c.reel.revenus, 2233.33);
  proche('base des pourcentages = revenus réels moyens', c.revenus_base, 2233.33);
  proche('charges fixes', c.reel.fixes, 620);
  proche('obligations', c.reel.obligations, 920);
  proche('plaisir (postes et dépenses rares)', c.reel.plaisir, 150);
  proche('dépenses', c.reel.depenses, 1070);
  proche('épargne = revenus − dépenses', c.reel.epargne, 1163.33);
  proche('les trois parts font 100 %', c.reel.pct.obligations + c.reel.pct.plaisir + c.reel.pct.epargne, 1);
  proche('mois dernier : revenus sans le ponctuel', c.dernier.revenus, 2300);
  proche('mois dernier : dépenses', c.dernier.depenses, 1010);
  proche('mois dernier : épargne', c.dernier.epargne, 1290);
  proche('base des projections = moyenne réelle', c.base.epargne, c.reel.epargne);
  const cVide = M.calculer(donnees({ operations: operations.filter((o) => o.date >= '2026-06-10') }));
  proche('sans mois terminé : base = revenus de référence', cVide.revenus_base, 2200);
  egal('sans mois terminé : base non réelle', cVide.base.reel, false);

  // ---------- Revenus qui ont changé ----------
  dans('Revenus comptés depuis un mois');
  const regl = (plus) => ({ reglages: Object.assign({}, donnees().reglages, plus) });
  const cRev = M.calculer(donnees(regl({ revenus_depuis: '2026-05' })));
  proche('base des % : revenus moyens depuis ce mois seulement', cRev.revenus_base, 2300);
  proche('le repère garde tout l’historique', cRev.reel.revenus, 2233.33);
  proche('les budgets automatiques ne changent pas', poste(cRev, 'courses').objectif, 300);
  proche('projections : épargne = nouveaux revenus − dépenses moyennes', cRev.base.epargne, 1230);
  proche('projections : salaire moyen depuis ce mois', cRev.base.salaire, 2100);
  const cRevMan = M.calculer(donnees(Object.assign(regl({ revenus_depuis: '2026-05' }), { objectifs_manuels: { restos: 0.06 } })));
  proche('budget fixé à la main : % de la nouvelle base', poste(cRevMan, 'restos').objectif, 138);
  const cRevRef = M.calculer(donnees(regl({ revenus_depuis: '2026-06' })));
  proche('aucun mois terminé depuis le changement : revenus de référence', cRevRef.revenus_base, 2200);
  proche('aucun mois terminé depuis le changement : épargne attendue', cRevRef.base.epargne, 1130);
  proche('sans ce réglage : base = moyenne de tous les mois', c.revenus_base, c.reel.revenus);

  // ---------- Mois en cours ----------
  dans('Mois en cours');
  proche('revenus du mois : paie reçue + aide de référence (pas encore arrivée)', c.mois.revenus, 2200);
  proche('charges fixes du mois : loyer attendu compté', c.mois.fixes, 620);
  proche('dépensé sur les postes', c.mois.depense, 250);
  proche('reste : le dépassement des restos est déduit', c.mois.reste, 170);
  proche('par jour sur les 19 jours restants', c.mois.par_jour, 8.95);
  proche('à mettre de côté, budget restant au prorata des jours', c.mois.epargne, 1153.33);
  proche('déjà viré', c.mois.vire, 0);
  proche('reste à virer', c.mois.reste_a_virer, 1153.33);
  // Recalcul indépendant, à partir des opérations brutes
  const brut = (id) => -somme(operations.filter((o) => o.date >= '2026-06-10' && o.poste === id).map((o) => o.montant));
  const frac = 19 / 30;
  const attendu = 2200 - 620 - (brut('courses') + (300 - brut('courses')) * frac) - brut('restos') - brut('cadeaux');
  proche('à mettre de côté : recalcul depuis les opérations brutes', c.mois.epargne, Math.round(attendu * 100) / 100);
  const cFin = M.calculer(donnees({ export: '2026-07-09' }));
  egal('dernier jour : tous les jours écoulés', cFin.ecoules, 30);
  proche('dernier jour : à mettre de côté = revenus − fixes − dépensé réel', cFin.mois.epargne, 2200 - 620 - 250 - 50);
  const cVire = M.calculer(donnees({ operations: operations.concat([op('2026-06-18', 'VIR VIREMENT VERS LIVRET A', -400, 'epargne')]) }));
  proche('virement vers l’épargne : déjà viré', cVire.mois.vire, 400);
  proche('virement vers l’épargne : reste à virer', cVire.mois.reste_a_virer, 753.33);
  proche('virement vers l’épargne : ne change pas le montant à mettre de côté', cVire.mois.epargne, c.mois.epargne);

  // ---------- Épargne ----------
  dans('Épargne et réserve');
  proche('livrets : valeur saisie + virement vu après la date', c.epargne.livrets, 5150);
  proche('réserve en mois de dépenses réelles', c.epargne.reserve, 4.8);

  // ---------- Cohérence entre les pages ----------
  dans('Cohérence entre les pages');
  const budgets = somme(c.variables.map((v) => v.objectif)), depenses = somme(c.variables.map((v) => v.depense));
  proche('Ce mois-ci : reste = budget total − dépensé', c.mois.reste, Math.max(0, budgets - depenses));
  proche('Ce mois-ci : dépensé = somme des postes', c.mois.depense, depenses);
  proche('Réglages : somme des budgets = obligations + plaisir du plan', budgets, c.plan.obligations_var + c.plan.plaisir_var);
  proche('Opérations : total d’un poste = dépensé affiché', brut('courses'), poste(c, 'courses').depense);
  proche('Dans la durée : épargne moyenne = base des projections', c.reel.epargne, c.base.epargne);

  // ---------- Lecture du relevé et classement ----------
  dans('Lecture du relevé et classement');
  const csv = [
    'Date opération;Date valeur;Libellé;Catégorie;Catégorie parent;Montant;Solde',
    '10/06/2026;10/06/2026;"VIR SEPA EMPLOYEUR FICTIF";"Virements reçus";"";"2 000,00";"2 500,00"',
    '11/06/2026;11/06/2026;"CARTE 10/06/26 SUPERMARCHE FICTIF CB*0000";"Alimentation";"";"-42,50";"2 457,50"',
    '12/06/2026;12/06/2026;"RETRAIT DAB 11/06/26 VILLE FICTIVE CB*0000";"";"";"-20,00";"2 437,50"',
    '13/06/2026;13/06/2026;"CARTE 12/06/26 AMAZON PRIME FR CB*0000";"Vie quotidienne";"";"-6,99";"2 430,51"',
    '14/06/2026;14/06/2026;"CARTE 13/06/26 CAFE LONDON 12,00 GBP CB*0000";"Restaurants";"";"-14,10";"2 416,41"',
    '15/06/2026;15/06/2026;"VIR INST CAMILLE EXEMPLE";"";"";"25,00";"2 441,41"',
    '16/06/2026;16/06/2026;"VIR VIREMENT VERS LIVRET A";"";"";"-150,00";"2 291,41"',
    '17/06/2026;17/06/2026;"CARTE 16/06/26 BOUTIQUE INCONNUE CB*0000";"";"";"-30,00";"2 261,41"'
  ].join('\n');
  const vide = donnees({ operations: [], export: '' });
  const imp = M.importer(vide, csv, 'export-operations-17-06-2026_10-00-00.csv');
  const lu = (bout) => imp.bundle.operations.find((o) => o.libelle.includes(bout));
  egal('8 opérations lues', imp.stats.lues, 8);
  egal('date au format AAAA-MM-JJ', lu('EMPLOYEUR').date, '2026-06-10');
  proche('montant avec espace des milliers', lu('EMPLOYEUR').montant, 2000);
  egal('date de l’export lue dans le nom du fichier', imp.bundle.export, '2026-06-17');
  proche('solde de fin de journée', imp.bundle.soldes['2026-06-17'], 2261.41);
  egal('règle des données : salaire', lu('EMPLOYEUR').poste, 'salaire');
  egal('catégorie de la banque : courses', lu('SUPERMARCHE').poste, 'courses');
  egal('retrait : espèces', lu('RETRAIT').poste, 'especes');
  egal('abonnement reconnu au libellé, malgré la catégorie de la banque', lu('AMAZON PRIME').poste, 'abonnements');
  egal('paiement en devise : voyages', lu('LONDON').poste, 'voyages');
  egal('petit virement d’un ami : en déduction des restos', lu('CAMILLE').poste, 'restos');
  egal('virement vers un livret : épargne', lu('LIVRET').poste, 'epargne');
  egal('marchand inconnu : à classer', lu('INCONNUE').poste, 'non_classe');
  egal('une opération à classer comptée', imp.stats.aClasser, 1);
  const recl = M.reclasser(imp.bundle, lu('INCONNUE').id, 'vetements', true);
  egal('reclassement à la main', recl.operations.find((o) => o.libelle.includes('INCONNUE')).poste, 'vetements');
  egal('marchand mémorisé', recl.regles_perso.length, 1);
  const imp2 = M.importer(recl, csv + '\n18/06/2026;18/06/2026;"CARTE 17/06/26 BOUTIQUE INCONNUE CB*0000";"";"";"-12,00";"2 249,41"', 'export-operations-18-06-2026_10-00-00.csv');
  egal('nouvel import : une seule opération nouvelle', imp2.stats.nouvelles, 1);
  egal('nouvel import : le classement fait à la main est gardé', imp2.bundle.operations.find((o) => o.montant === -30).poste, 'vetements');
  egal('nouvel import : le marchand mémorisé est appliqué', imp2.bundle.operations.find((o) => o.montant === -12).poste, 'vetements');
  let erreur = '';
  try { M.lireExport('a;b;c\n1;2;3'); } catch (e) { erreur = e.message; }
  egal('fichier qui n’est pas un relevé : refusé', erreur !== '', true);

  // ---------- Corrections des données déjà enregistrées ----------
  dans('Corrections des données (migrer)');
  const avant = donnees({ migrations: [], operations: [
    Object.assign(op('2026-06-13', 'CARTE 12/06/26 AMAZON PRIME FR CB*0000', -8, 'achats'), { src: 'catégorie banque' }),
    Object.assign(op('2026-05-13', 'CARTE 12/05/26 AMAZON PRIME FR CB*0000', -8, 'achats'), { src: 'manuel' })
  ] });
  const apres = M.migrer(avant);
  egal('abonnement classé en achats : reclassé', apres.operations[0].poste, 'abonnements');
  egal('choix fait à la main : respecté', apres.operations[1].poste, 'achats');
  proche('montant fixe des abonnements complété', apres.fixes.find((f) => f.id === 'abonnements').montant, 28);
  egal('la correction ne s’applique qu’une fois', M.migrer(apres), apres);

  // ---------- Projections ----------
  dans('Projections');
  const projet = M.projeter('projet', { montant: 1200, mois: '2027-06' }, c);
  egal('projet : 12 mois avant l’échéance', projet.res.n, 12);
  proche('projet : à mettre de côté par mois', projet.res.par_mois, 100);
  proche('projet : épargne restante = moyenne réelle − effort', projet.res.epargne_reste, 1063.33);
  egal('projet : réponse donnée, pas d’hypothèse', projet.hyp.montant, false);
  const projetVide = M.projeter('projet', {}, c);
  egal('projet sans réponse : hypothèse signalée', projetVide.hyp.montant, true);
  const baisse = M.projeter('baisse', {}, c);
  proche('baisse sans réponse : 80 % du salaire réel moyen', baisse.res.salaire, 1626.66);
  proche('baisse : épargne = nouveaux revenus − dépenses réelles', baisse.res.epargne, baisse.res.revenus - c.reel.depenses);
  const pret = M.projeter('pret', { montant: 6000, taux: 0, ans: 5 }, c);
  proche('prêt à taux nul : mensualité = montant / durée', pret.res.mensualite, 100);
  proche('prêt à taux nul : coût nul', pret.res.cout, 0);
  const pret3 = M.projeter('pret', { montant: 10000, taux: 3, ans: 5 }, c);
  proche('prêt à 3 % sur 5 ans : mensualité', pret3.res.mensualite, 179.69);

  // ---------- Bilan ----------
  const ko = resultats.filter((r) => !r.ok);
  if (typeof document === 'undefined') {
    resultats.forEach((r) => console.log((r.ok ? 'ok    ' : 'ÉCHEC ') + r.groupe + ' : ' + r.nom + (r.ok ? '' : ' (' + r.detail + ')')));
    console.log('\n' + (resultats.length - ko.length) + ' / ' + resultats.length + ' vérifications justes');
    if (ko.length && typeof process !== 'undefined') process.exitCode = 1;
    return;
  }
  window.RESULTATS = { total: resultats.length, echecs: ko };
  const bilan = document.getElementById('bilan'), liste = document.getElementById('liste');
  bilan.textContent = ko.length ? ko.length + ' échec(s) sur ' + resultats.length + ' vérifications' : resultats.length + ' vérifications justes';
  bilan.className = ko.length ? 'ko' : 'ok';
  let ul = null, dernierGroupe = '';
  resultats.forEach((r) => {
    if (r.groupe !== dernierGroupe) {
      const h = document.createElement('h2'); h.textContent = r.groupe; liste.appendChild(h);
      ul = document.createElement('ul'); liste.appendChild(ul); dernierGroupe = r.groupe;
    }
    const li = document.createElement('li'); li.className = r.ok ? 'ok' : 'ko';
    li.textContent = r.nom + (r.ok ? '' : ' : ' + r.detail); ul.appendChild(li);
  });
})();
