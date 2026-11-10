// Moteur du budget : lecture de l'export Boursobank (CSV ou zip), classement des opérations, calculs.
// Aucune donnée personnelle ici : montants, règles nommées et objectifs vivent dans les données de l'appareil.
// Fonctionne dans le navigateur (window.Moteur) et sous Node (module.exports) pour les tests.
(function (root) {
  const r2 = (x) => Math.round(x * 100) / 100;
  const norm = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const moisNom = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const moisLabel = (k) => moisNom(k) + ' ' + k.slice(0, 4);
  const moisDecale = (k, n) => { const d = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const frDate = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  const jour = (iso) => Number(iso.slice(8, 10));
  const versDate = (iso) => new Date(iso + 'T12:00:00Z');
  const isoDe = (d) => d.toISOString().slice(0, 10);
  const plusJours = (iso, n) => { const d = versDate(iso); d.setUTCDate(d.getUTCDate() + n); return isoDe(d); };
  const ecartJours = (a, b) => Math.round((versDate(b) - versDate(a)) / 86400000);
  const dateCourte = (iso) => { const j = jour(iso); return (j === 1 ? '1er' : j) + ' ' + MOIS_C[Number(iso.slice(5, 7)) - 1]; };

  // ---------- Postes ----------
  // groupe : obligations | plaisir (pour la répartition 50 / 30 / 20)
  const VARIABLES = [
    { id: 'courses', nom: 'Courses', groupe: 'obligations', ic: 'panier' },
    { id: 'essence', nom: 'Essence, péages, parking', groupe: 'obligations', ic: 'carburant' },
    { id: 'transports', nom: 'Transports', groupe: 'obligations', ic: 'tram' },
    { id: 'sante', nom: 'Santé', groupe: 'obligations', ic: 'sante' },
    { id: 'restos', nom: 'Restos, bars, sorties', groupe: 'plaisir', ic: 'resto' },
    { id: 'achats', nom: 'Achats divers, maison', groupe: 'plaisir', ic: 'sac' },
    { id: 'soins', nom: 'Soins, beauté', groupe: 'plaisir', ic: 'soin' },
    { id: 'vetements', nom: 'Vêtements', groupe: 'plaisir', ic: 'vetement' },
    { id: 'especes', nom: 'Espèces', groupe: 'plaisir', ic: 'pieces' },
    { id: 'loisirs', nom: 'Loisirs, spectacles', groupe: 'plaisir', ic: 'ticket' }
  ];
  const ENVELOPPES = [
    { id: 'cadeaux', nom: 'Cadeaux', groupe: 'plaisir', ic: 'cadeau' },
    { id: 'voyages', nom: 'Voyages, vacances', groupe: 'plaisir', ic: 'plage' },
    { id: 'rares', nom: 'Achats rares', groupe: 'plaisir', ic: 'etiquette' },
    { id: 'entretien', nom: 'Entretien voiture', groupe: 'obligations', ic: 'cle' }
  ];
  const REVENUS = [
    { id: 'salaire', nom: 'Salaire' }, { id: 'aides', nom: 'Aide de la famille' }, { id: 'caf', nom: 'CAF' }, { id: 'revenu_autre', nom: 'Autre revenu' }
  ];
  const AUTRES = [
    { id: 'epargne', nom: 'Vers ou depuis l’épargne' }, { id: 'hors_budget', nom: 'Hors budget' }, { id: 'non_classe', nom: 'À classer' }
  ];
  // Tous les postes, avec leur famille ; les charges fixes viennent des données
  function catalogue(bundle) {
    const out = [];
    (bundle.fixes || []).forEach((f) => out.push({ id: f.id, nom: f.nom, famille: 'fixe', groupe: 'obligations', ic: f.ic || 'maison' }));
    VARIABLES.forEach((p) => out.push(Object.assign({ famille: 'variable' }, p)));
    ENVELOPPES.forEach((p) => out.push(Object.assign({ famille: 'enveloppe' }, p)));
    REVENUS.forEach((p) => out.push(Object.assign({ famille: 'revenu', ic: 'billet' }, p)));
    AUTRES.forEach((p) => out.push(Object.assign({ famille: 'autre', ic: p.id === 'epargne' ? 'envoi' : 'etiquette' }, p)));
    return out;
  }
  const FAMILLES = { fixe: 'Charges fixes', variable: 'Postes du mois', enveloppe: 'Enveloppes', revenu: 'Revenus', autre: 'Autres' };

  // ---------- Lecture du CSV ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ';') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.length > 1 || r[0]);
  }
  const montant = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));

  // Renvoie [{date, libelle, montant, cat, solde}] depuis l'export Boursobank
  function lireExport(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Fichier vide.');
    const h = rows[0].map((x) => norm(x).toLowerCase());
    const col = (test, def) => { const i = h.findIndex(test); return i >= 0 ? i : def; };
    const iDate = col((x) => x.startsWith('date op'), 0);
    const iLib = col((x) => x === 'libellé' || x === 'libelle', 2);
    const iCat = col((x) => x === 'catégorie' || x === 'categorie', 4);
    const iMt = col((x) => x === 'montant', col((x) => x === 'solde', 6));
    const iSolde = h.lastIndexOf('solde') !== iMt ? h.lastIndexOf('solde') : -1;
    if (!/^date op/.test(h[iDate] || '')) throw new Error('Ce fichier ne ressemble pas à un export Boursobank.');
    const ops = [];
    rows.slice(1).forEach((r) => {
      let d = norm(r[iDate]);
      if (/^\d\d\/\d\d\/\d{4}$/.test(d)) d = d.slice(6) + '-' + d.slice(3, 5) + '-' + d.slice(0, 2);
      const m = montant(r[iMt]);
      if (!/^\d{4}-\d\d-\d\d$/.test(d) || !isFinite(m)) return;
      const so = iSolde >= 0 && norm(r[iSolde]) !== '' ? montant(r[iSolde]) : NaN;
      ops.push({ date: d, libelle: norm(r[iLib]), montant: r2(m), cat: norm(r[iCat]), solde: isFinite(so) ? r2(so) : null });
    });
    if (!ops.length) throw new Error('Aucune opération lisible dans ce fichier.');
    return ops;
  }

  // ---------- Classement ----------
  function marchand(lib) {
    const l = norm(lib).toUpperCase();
    let m = l.match(/^(?:CARTE|AVOIR) \d\d\/\d\d\/\d\d (.*?)(?: \d+,\d+ [A-Z]{3})?(?: CB\*\d+)?$/);
    if (m) return m[1].replace(/ \d+,\d+ [A-Z]{3}$/, '').replace(/ \d+$/, '');
    m = l.match(/^(PRLV SEPA|VIR SEPA|VIR INST|VIR) ?(.*)$/);
    if (m) return m[1] + ' ' + m[2].slice(0, 30);
    if (/^RETRAIT DAB/.test(l)) return 'RETRAIT DAB';
    return l.slice(0, 30);
  }
  // Nom lisible : « CARTE 03/11/26 BOULANGERIE DU PORT CB*1234 » → « Boulangerie Du Port »
  function nomLisible(lib) {
    const l = norm(lib);
    if (/^RETRAIT DAB/i.test(l)) return 'Retrait d’espèces';
    let m = l.match(/^(?:CARTE|AVOIR) \d\d\/\d\d\/\d\d (.*?)(?: CB\*\d+)?$/i);
    let t = m ? m[1] : l.replace(/^(PRLV SEPA|VIR SEPA|VIR INST|VIR)\s*/i, '');
    t = t.replace(/^\*/, '').replace(/ \d+$/, '').replace(/\s{2,}/g, ' ');
    return t.toLowerCase().replace(/(^|[\s\-'’.*(])([a-zà-ÿ])/g, (a, b, c) => b + c.toUpperCase()).slice(0, 40);
  }
  // Date d'achat lue dans le libellé carte (le débit arrive souvent un ou deux jours après)
  function dateAchat(o) {
    const m = norm(o.libelle).match(/^(?:CARTE|AVOIR|RETRAIT DAB) (\d\d)\/(\d\d)\/(\d\d)/i);
    return m ? '20' + m[3] + '-' + m[2] + '-' + m[1] : o.date;
  }

  // Règles des données : {motif (expression régulière sur le libellé en majuscules), sens: 'credit'|'debit', min, max, poste}
  function regleDonnees(o, regles) {
    const L = norm(o.libelle).toUpperCase(), m = o.montant;
    for (const r of regles || []) {
      let re; try { re = new RegExp(r.motif); } catch (e) { continue; }
      if (!re.test(L)) continue;
      if (r.sens === 'credit' && !(m > 0)) continue;
      if (r.sens === 'debit' && !(m < 0)) continue;
      if (r.min !== undefined && Math.abs(m) < Number(r.min)) continue;
      if (r.max !== undefined && Math.abs(m) > Number(r.max)) continue;
      if (r.cat && !new RegExp(r.cat, 'i').test(o.cat || '')) continue;
      return r.poste;
    }
    return null;
  }

  const ABONNEMENTS = /AMAZON PRIME|PRIME VIDEO|NETFLIX|SPOTIFY|DEEZER|DISNEY ?PLUS|CANAL ?\+|APPLE\.COM|YOUTUBE ?PREMIUM|AUDIBLE/;
  // Règles valables pour tout compte Boursobank
  function regleGenerique(o) {
    const L = norm(o.libelle).toUpperCase(), m = o.montant;
    if (/LIVRET|VIREMENT DEPUIS BOURSOBANK|TRADE REPUBLIC/.test(L)) return 'epargne';
    if (/^RETRAIT DAB/.test(L)) return 'especes';
    // Abonnements : reconnus au libellé, car le même marchand peut aussi vendre des achats (Amazon Prime / Amazon)
    if (m < 0 && ABONNEMENTS.test(L)) return 'abonnements';
    if (m > 0 && /CPAM|CAMIEG|MUTUELLE/.test(L)) return 'sante';
    const dev = L.match(/ \d+,\d+ ([A-Z]{3}) CB\*/);
    if (dev && dev[1] !== 'EUR') return 'voyages';
    // Petits virements entre amis : leur part d'une sortie, déduite du poste
    if (m > 0 && /^VIR /.test(L) && !/^VIR SEPA/.test(L) && m < 150) return 'restos';
    if (m < 0 && /^VIR (INST |VIREMENT DE )/.test(L) && -m < 150) return 'restos';
    return null;
  }

  // Catégorie de la banque vers poste, en dernier recours
  const CAT_BANQUE = [
    [/^alimentation/i, 'courses'],
    [/^restaurants/i, 'restos'],
    [/^(carburant|péages|parking)/i, 'essence'],
    [/^(transports quotidiens|transports longue distance)/i, 'transports'],
    [/^hébergement/i, 'voyages'],
    [/^entretien - réparation/i, 'entretien'],
    [/^contraventions/i, 'rares'],
    [/^bien-être/i, 'soins'],
    [/^vêtements/i, 'vetements'],
    [/^(pharmacie|médecins|optique|santé|remboursements frais de santé)/i, 'sante'],
    [/^(loisirs - autres|divertissement|club \/ association|sport)/i, 'loisirs'],
    [/^(livres|mobilier|bricolage|equipements sportifs|vie quotidienne|electronique|impôts|solidarité|cadeaux)/i, 'achats'],
    [/^(téléphonie|multimedia|abonnements)/i, 'abonnements'],
    [/^loyers/i, 'loyer'],
    [/^frais bancaires/i, 'frais'],
    [/^retraits/i, 'especes'],
    [/^assurances \(auto/i, 'assurance_voiture'],
    [/^financement/i, 'credit_voiture'],
    [/^allocations/i, 'caf']
  ];

  // Table apprise : marchand → poste, quand l'historique est net (au moins 2 opérations, 80 % dans le même poste)
  function apprendre(ops) {
    const t = {};
    ops.forEach((o) => {
      if (o.poste === 'non_classe' || o.montant > 0) return;
      const k = marchand(o.libelle);
      if (/^VIR |^PRLV|^RETRAIT/.test(k)) return;
      (t[k] = t[k] || {})[o.poste] = (t[k][o.poste] || 0) + 1;
    });
    const out = {};
    Object.keys(t).forEach((k) => {
      const e = Object.entries(t[k]).sort((a, b) => b[1] - a[1]), n = e.reduce((s, x) => s + x[1], 0);
      if (n >= 2 && e[0][1] / n >= 0.8) out[k] = e[0][0];
    });
    return out;
  }

  function classer(o, ctx) {
    const existe = (p) => ctx.ids.has(p);
    const k = marchand(o.libelle);
    const perso = (ctx.perso || []).find((p) => p.marchand === k);
    if (perso && existe(perso.poste)) return { poste: perso.poste, src: 'règle perso' };
    const d = regleDonnees(o, ctx.regles); if (d && existe(d)) return { poste: d, src: 'règle' };
    const g = regleGenerique(o); if (g && existe(g)) return { poste: g, src: 'règle' };
    if (o.montant < 0 && ctx.appris[k] && existe(ctx.appris[k])) return { poste: ctx.appris[k], src: 'historique' };
    if (!/^VIR /.test(k)) for (const [re, p] of CAT_BANQUE) if (re.test(o.cat || '') && existe(p)) return { poste: p, src: 'catégorie banque' };
    return { poste: 'non_classe', src: 'auto' };
  }

  // Fusionne un export : les opérations déjà connues gardent leur classement
  function importer(bundle, texte, nomFichier) {
    const brut = lireExport(texte);
    const anciens = bundle.operations || [];
    const cle = (o) => o.date + '|' + norm(o.libelle) + '|' + r2(o.montant).toFixed(2);
    const pool = {}; anciens.forEach((o) => { (pool[cle(o)] = pool[cle(o)] || []).push(o); });
    const ctx = { regles: bundle.regles || [], perso: bundle.regles_perso || [], appris: apprendre(anciens), ids: new Set(catalogue(bundle).map((p) => p.id)) };
    let maxId = anciens.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0);
    const fn = (nomFichier || '').match(/(\d\d)-(\d\d)-(\d{4})/);
    const dExport = fn ? fn[3] + '-' + fn[2] + '-' + fn[1] : brut.reduce((m, o) => (o.date > m ? o.date : m), '');
    const vus = new Set(); let nouvelles = 0, aClasser = 0;
    const ops = [];
    brut.forEach((o) => {
      const p = pool[cle(o)];
      if (p && p.length) { const a = p.shift(); vus.add(a); ops.push(a); return; }
      const c = classer(o, ctx);
      nouvelles++; if (c.poste === 'non_classe') aClasser++;
      ops.push({ id: ++maxId, date: o.date, libelle: o.libelle, montant: o.montant, cat: o.cat, poste: c.poste, src: c.src });
    });
    const plusAncien = brut.reduce((m, x) => (x.date < m ? x.date : m), '9999');
    anciens.forEach((o) => { if (!vus.has(o) && o.date < plusAncien) ops.push(o); });
    ops.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    // Solde de fin de journée
    const soldes = Object.assign({}, bundle.soldes || {});
    const avecSolde = brut.filter((o) => o.solde !== null);
    if (avecSolde.length) {
      const desc = avecSolde[0].date >= avecSolde[avecSolde.length - 1].date;
      const vu = new Set();
      (desc ? avecSolde : avecSolde.slice().reverse()).forEach((o) => { if (!vu.has(o.date)) { vu.add(o.date); soldes[o.date] = o.solde; } });
    }
    const exp = bundle.export && bundle.export > dExport ? bundle.export : dExport;
    const out = Object.assign({}, bundle, { operations: ops, soldes, export: exp, maj: new Date().toISOString() });
    return { bundle: out, stats: { lues: brut.length, nouvelles, aClasser } };
  }

  // Reclassement manuel ; avec `toutes`, mémorise le marchand et reclasse ses opérations à classer
  function reclasser(bundle, id, poste, toutes) {
    const ops = bundle.operations.map((o) => Object.assign({}, o));
    const o = ops.find((x) => String(x.id) === String(id)); if (!o) return bundle;
    Object.assign(o, { poste, src: 'manuel' });
    let perso = (bundle.regles_perso || []).slice();
    if (toutes) {
      const k = marchand(o.libelle);
      perso = perso.filter((p) => p.marchand !== k).concat([{ marchand: k, poste }]);
      ops.forEach((x) => { if (x.poste === 'non_classe' && marchand(x.libelle) === k) Object.assign(x, { poste, src: 'règle perso' }); });
    }
    return Object.assign({}, bundle, { operations: ops, regles_perso: perso });
  }

  // ---------- Mois budgétaire : du jour de paie au jour d'avant le mois suivant ----------
  // Clé du mois : celui où il commence (« 2026-11 » = du 10 nov. au 9 déc.)
  const moisDe = (iso, j0) => (jour(iso) >= j0 ? iso.slice(0, 7) : moisDecale(iso.slice(0, 7), -1));
  const debutMois = (k, j0) => k + '-' + String(j0).padStart(2, '0');
  const finMois = (k, j0) => plusJours(debutMois(moisDecale(k, 1), j0), -1);
  // Le salaire arrive autour du jour de paie, parfois la veille : il compte pour le mois qui commence
  const moisOp = (o, j0) => (o.poste === 'salaire' && jour(o.date) >= j0 - 5 && jour(o.date) < j0 ? o.date.slice(0, 7) : moisDe(o.date, j0));

  // ---------- Calculs ----------
  function calculer(bundle) {
    const R = bundle.reglages || {};
    const j0 = Number(R.jour_debut) || 10;
    const ops = (bundle.operations || []).map((o) => Object.assign({ mois: moisOp(o, j0) }, o));
    const exp = bundle.export || ops.reduce((m, o) => (o.date > m ? o.date : m), '');
    const mc = moisDe(exp, j0);
    const somme = (a) => a.reduce((s, x) => s + x, 0);
    const parMois = {};
    ops.forEach((o) => { const k = o.mois + '|' + o.poste; parMois[k] = (parMois[k] || 0) - Number(o.montant); });
    const dep = (m, p) => r2(parMois[m + '|' + p] || 0);
    const premier = ops.length ? ops.reduce((m, o) => (o.mois < m ? o.mois : m), '9999-99') : mc;
    // Le premier mois n'est complet que si les opérations commencent au jour de paie ou avant
    const premierComplet = ops.length && ops[0].date <= debutMois(premier, j0) ? premier : moisDecale(premier, 1);
    const fenetres = bundle.fenetres || {};
    const nMax = Number(R.fenetre) || 12;
    // Mois terminés pris en compte pour un poste : les 12 derniers, pas avant `depuis`
    const moisFenetre = (depuis) => {
      const l = []; const d0 = depuis && depuis > premierComplet ? depuis : premierComplet;
      for (let m = moisDecale(mc, -1); m >= d0 && l.length < nMax; m = moisDecale(m, -1)) l.push(m);
      return l.reverse();
    };
    const revenusRef = r2((Number(R.salaire_ref) || 0) + somme((R.aides || []).map((a) => Number(a.montant) || 0)));

    // Répartition réelle sur une liste de mois terminés (moyenne), sur les vrais revenus.
    // Règle unique pour tout l'appli : les revenus ponctuels (« Autre revenu ») ne comptent pas, ils ne reviennent pas chaque mois ;
    // les enveloppes comptent pour ce qui a été dépensé dans le mois.
    const ids = (l, g) => l.filter((p) => !g || p.groupe === g).map((p) => p.id);
    const repartition = (liste) => {
      const moy = (l) => (liste.length ? r2(somme(liste.map((m) => somme(l.map((id) => dep(m, id))))) / liste.length) : 0);
      const x = {
        mois: liste,
        revenus: -moy(REVENUS.filter((p) => p.id !== 'revenu_autre').map((p) => p.id)),
        salaire: -moy(['salaire']),
        fixes: moy((bundle.fixes || []).map((f) => f.id)),
        obligations_var: moy(ids(VARIABLES, 'obligations')), plaisir_var: moy(ids(VARIABLES, 'plaisir')),
        env_obligations: moy(ids(ENVELOPPES, 'obligations')), env_plaisir: moy(ids(ENVELOPPES, 'plaisir'))
      };
      x.enveloppes = r2(x.env_obligations + x.env_plaisir);
      x.obligations = r2(x.fixes + x.obligations_var + x.env_obligations);
      x.plaisir = r2(x.plaisir_var + x.env_plaisir);
      x.depenses = r2(x.obligations + x.plaisir);
      x.epargne = r2(x.revenus - x.depenses);
      const pr = (v) => (x.revenus > 0 ? v / x.revenus : 0);
      x.pct = { obligations: pr(x.obligations), plaisir: pr(x.plaisir), epargne: pr(x.epargne), fixes: pr(x.fixes), obligations_var: pr(x.obligations_var), plaisir_var: pr(x.plaisir_var), enveloppes: pr(x.enveloppes) };
      return x;
    };
    // Moyenne : les mêmes mois que les objectifs ; mois dernier : le dernier mois terminé
    const reel = repartition(moisFenetre(R.objectifs_depuis));
    const mPrec = moisDecale(mc, -1);
    const dernier = mPrec >= premierComplet ? Object.assign(repartition([mPrec]), { debut: debutMois(mPrec, j0), fin: finMois(mPrec, j0) }) : null;
    // Une seule base pour tous les % de l'appli : les revenus réels moyens (sinon les revenus de référence)
    // Revenus qui ont changé (une aide en moins, un nouveau contrat) : `revenus_depuis` fait repartir la moyenne des revenus de ce mois.
    // Tant qu'aucun mois terminé ne le suit, la base est celle des revenus de référence.
    const moisRev = R.revenus_depuis ? moisFenetre([R.objectifs_depuis, R.revenus_depuis].filter(Boolean).sort().pop()) : reel.mois;
    const revRecents = R.revenus_depuis ? repartition(moisRev) : reel;
    const revBase = moisRev.length && revRecents.revenus > 0 ? revRecents.revenus : revenusRef;
    const pct = (v) => (revBase > 0 ? v / revBase : 0);

    // Objectifs des postes du mois : moyenne glissante des mois terminés.
    // Sans mois terminé dans la fenêtre (poste qui vient de changer), on part du montant de départ convenu.
    const depart = bundle.objectifs_depart || {};
    // Un % saisi à la main (part des revenus réels moyens) remplace la moyenne glissante
    const manuels = bundle.objectifs_manuels || {};
    const manuel = (id) => (manuels[id] !== undefined && manuels[id] !== null && isFinite(Number(manuels[id])) ? Number(manuels[id]) : null);
    const objectifDe = (p) => {
      const l = moisFenetre([R.objectifs_depuis, fenetres[p.id]].filter(Boolean).sort().pop());
      const auto = l.length ? Math.max(0, somme(l.map((m) => dep(m, p.id))) / l.length) : Number(depart[p.id]) || 0;
      const m = manuel(p.id);
      return { objectif: r2(m !== null ? m * revBase : auto), auto: r2(auto), manuel: m !== null, mois: l, depart: !l.length && depart[p.id] !== undefined };
    };
    // Enveloppes : moyenne mensuelle des 12 derniers mois (sans plafond), ou % saisi à la main
    const parMoisEnv = (p) => {
      const l = moisFenetre(fenetres[p.id]);
      const auto = l.length ? r2(Math.max(0, somme(l.map((m) => dep(m, p.id))) / l.length)) : 0;
      const m = manuel(p.id);
      return { par_mois: m !== null ? r2(m * revBase) : auto, auto, manuel: m !== null, mois: l };
    };

    const fixes = (bundle.fixes || []).map((f) => {
      const passe = dep(mc, f.id), mt = Number(f.montant) || 0;
      const derniers = ops.filter((o) => o.poste === f.id && o.montant < 0).sort((a, b) => (a.date < b.date ? 1 : -1));
      const jourHab = derniers.length ? jour(derniers[0].date) : null;
      return { id: f.id, nom: f.nom, ic: f.ic || 'maison', montant: mt, passe, reste: passe >= mt - 0.01 ? 0 : r2(mt - passe), jour: jourHab, pct: pct(mt) };
    });
    const F = r2(somme(fixes.map((f) => f.montant)));

    const debut = debutMois(mc, j0), fin = finMois(mc, j0);
    const nbJours = ecartJours(debut, fin) + 1;
    const ecoules = Math.min(nbJours, Math.max(0, ecartJours(debut, exp) + 1));
    const variables = VARIABLES.map((p) => {
      const o = objectifDe(p), d = dep(mc, p.id);
      return Object.assign({}, p, { objectif: o.objectif, pct: pct(o.objectif), depense: d, reste: r2(o.objectif - d), mois_objectif: o.mois, depart: o.depart, auto: o.auto, manuel: o.manuel });
    });
    const debutSuivi = R.suivi_depuis || mc;
    const enveloppes = ENVELOPPES.map((p) => {
      const e = parMoisEnv(p);
      // Mis de côté depuis le début du suivi, moins ce qui a été dépensé depuis
      let n = 0; for (let m = debutSuivi; m <= mc; m = moisDecale(m, 1)) n++;
      let depuis = 0; for (let m = debutSuivi; m <= mc; m = moisDecale(m, 1)) depuis += dep(m, p.id);
      return Object.assign({}, p, { par_mois: e.par_mois, pct: pct(e.par_mois), depense_mois: dep(mc, p.id), depense_suivi: r2(depuis), de_cote: r2(n * e.par_mois - depuis), mois_objectif: e.mois, auto: e.auto, manuel: e.manuel });
    });
    const sumG = (l, g, k) => r2(somme(l.filter((x) => x.groupe === g).map((x) => x[k])));
    const oblVar = sumG(variables, 'obligations', 'objectif'), plaisirVar = sumG(variables, 'plaisir', 'objectif');
    const oblEnv = sumG(enveloppes, 'obligations', 'par_mois'), plaisirEnv = sumG(enveloppes, 'plaisir', 'par_mois');
    const E = r2(oblEnv + plaisirEnv);
    const epargnePlan = r2(revenusRef - F - oblVar - plaisirVar - E);
    const plan = {
      revenus: revenusRef, fixes: F, obligations_var: oblVar, plaisir_var: plaisirVar, enveloppes: E, epargne: epargnePlan,
      obligations: r2(F + oblVar + oblEnv), plaisir: r2(plaisirVar + plaisirEnv),
      depenses: r2(revenusRef - epargnePlan)
    };
    plan.pct = { obligations: pct(plan.obligations), plaisir: pct(plan.plaisir), epargne: pct(epargnePlan), fixes: pct(F), obligations_var: pct(oblVar), plaisir_var: pct(plaisirVar), enveloppes: pct(E) };

    // Base des projections : les dépenses réelles moyennes et la base des revenus (ou le budget de référence sans mois terminé)
    const salaireBase = moisRev.length && revRecents.salaire > 0 ? revRecents.salaire : Number(R.salaire_ref) || 0;
    const base = reel.mois.length
      ? { revenus: revBase, depenses: reel.depenses, epargne: r2(revBase - reel.depenses), plaisir_var: reel.plaisir_var, salaire: salaireBase, reel: true }
      : { revenus: revenusRef, depenses: plan.depenses, epargne: plan.epargne, plaisir_var: plan.plaisir_var, salaire: Number(R.salaire_ref) || 0, reel: false };
    base.salaire_reel = moisRev.length > 0 && revRecents.salaire > 0;
    base.pct_epargne = base.revenus > 0 ? base.epargne / base.revenus : 0;

    // Mois en cours
    const resteBudget = r2(somme(variables.map((v) => Math.max(0, v.reste))));
    // Ce qui reste à l'échelle du mois : budget total moins tout le dépensé (un dépassement sur un poste réduit le reste)
    const resteNet = r2(Math.max(0, somme(variables.map((v) => v.objectif)) - somme(variables.map((v) => v.depense))));
    const joursRestants = Math.max(1, nbJours - ecoules);
    const salaireRecu = r2(-dep(mc, 'salaire'));
    const surplus = salaireRecu > 0 ? r2(salaireRecu - (Number(R.salaire_ref) || 0)) : 0;
    const fixesMois = r2(somme(fixes.map((f) => Math.max(f.montant, f.passe))));
    // Dépenses du mois attendues : ce qui est déjà dépensé, plus le reste du budget au prorata des jours qui restent
    // (le dernier jour, l'épargne prévue est donc l'épargne réelle)
    const fracRestante = Math.max(0, nbJours - ecoules) / nbJours;
    const attendu = (v) => v.depense + Math.max(0, v.reste) * fracRestante;
    const varMois = r2(somme(variables.map(attendu)));
    // Enveloppes : pas de réserve qui se cumule ; ce qui est dépensé ce mois-ci (ou la part prévue, au prorata des jours restants) sort de l'épargne
    const attenduEnv = (e) => e.depense_mois + Math.max(0, e.par_mois - e.depense_mois) * fracRestante;
    const envMois = r2(somme(enveloppes.map(attenduEnv)));
    // Revenus du mois : ce qui est vraiment arrivé (hors revenus exceptionnels) ; tant que la paie ou l'aide n'est pas arrivée, le montant de référence
    const aidesRef = somme((R.aides || []).map((a) => Number(a.montant) || 0)), aidesRecues = r2(-dep(mc, 'aides'));
    const revMois = r2((salaireRecu > 0 ? salaireRecu : Number(R.salaire_ref) || 0) + (aidesRecues > 0 ? aidesRecues : aidesRef) + Math.max(0, -dep(mc, 'caf')));
    const epargneMois = r2(revMois - fixesMois - varMois - envMois);
    const pm = (v) => (revMois > 0 ? v / revMois : 0);
    const depenseMois = r2(somme(variables.map((v) => v.depense)));
    const repartMois = {
      obligations: pm(fixesMois + somme(variables.filter((v) => v.groupe === 'obligations').map(attendu)) + somme(enveloppes.filter((e) => e.groupe === 'obligations').map(attenduEnv))),
      plaisir: pm(somme(variables.filter((v) => v.groupe === 'plaisir').map(attendu)) + somme(enveloppes.filter((e) => e.groupe === 'plaisir').map(attenduEnv))),
      epargne: pm(epargneMois)
    };

    // Compte courant : solde estimé la veille du prochain 1er du mois, avant le loyer
    const soldes = bundle.soldes || {}, jS = Object.keys(soldes).sort();
    let compte = null;
    if (jS.length) {
      const d0 = jS[jS.length - 1], s0 = soldes[d0];
      const premierSuiv = moisDecale(d0.slice(0, 7), 1) + '-01';
      const veille = plusJours(premierSuiv, -1);
      if (premierSuiv <= fin) {
        const jRest = Math.max(0, ecartJours(d0, veille)), jFin = Math.max(1, ecartJours(d0, fin));
        const varAvant = resteBudget * Math.min(1, jRest / jFin);
        const fixesAvant = somme(fixes.filter((f) => f.reste > 0 && f.jour && f.jour > jour(d0) && f.jour > 1 && d0.slice(0, 7) + '-' + String(f.jour).padStart(2, '0') <= veille).map((f) => f.reste));
        compte = { solde: s0, date: d0, prevu: r2(s0 - varAvant - fixesAvant), le: premierSuiv };
      } else compte = { solde: s0, date: d0, prevu: null, le: null };
    }
    const compteMin = Number(R.compte_min) || 0;

    // Épargne : valeur saisie, puis virements vus sur le compte courant
    const Ep = bundle.epargne || {};
    const flux = (compteId, apres) => r2(-somme(ops.filter((o) => o.poste === 'epargne' && o.date > apres && ((compteId === 'pea') === /TRADE REPUBLIC/i.test(o.libelle))).map((o) => Number(o.montant))));
    const livrets = Ep.livrets ? r2(Number(Ep.livrets.valeur) + flux('livrets', Ep.livrets.date)) : null;
    const pea = Ep.pea ? r2(Number(Ep.pea.valeur) + flux('pea', Ep.pea.date)) : null;
    // Réserve : combien de mois de dépenses réelles moyennes les livrets couvrent
    const reserve = base.depenses > 0 && livrets !== null ? Math.round(livrets / base.depenses * 10) / 10 : 0;
    // Crédit : mensualités passées, puis ce qu'il reste
    const C = bundle.credit;
    let credit = null;
    if (C) {
      const payees = ops.filter((o) => o.poste === C.poste && o.montant < 0 && o.date.slice(0, 7) >= C.premiere).length;
      const restantes = Math.max(0, Number(C.nb) - payees);
      credit = { nom: C.nom, mensualite: Number(C.mensualite), payees, restantes, nb: Number(C.nb), reste: r2(restantes * Number(C.mensualite)), fin: moisLabel(moisDecale(C.premiere, Number(C.nb) - 1)) };
    }

    const nc = ops.filter((o) => o.poste === 'non_classe').length;
    return {
      mc, mois_mc: moisLabel(mc), debut, fin, nbJours, ecoules, exp, j0,
      revenus_ref: revenusRef, revenus_base: revBase, revenus_depuis: R.revenus_depuis || '', mois_revenus: moisRev, salaire_ref: Number(R.salaire_ref) || 0, reel, dernier, base, fixes, variables, enveloppes, plan,
      mois: { revenus: revMois, vire: r2(dep(mc, 'epargne')), reste_a_virer: r2(Math.max(0, epargneMois - dep(mc, 'epargne'))), reste: resteNet, par_jour: r2(resteNet / joursRestants), joursRestants, depense: depenseMois, epargne: epargneMois, salaire: salaireRecu, surplus, repart: repartMois, fixes: fixesMois },
      compte, compte_min: compteMin,
      epargne: { livrets, pea, total: r2((livrets || 0) + (pea || 0)), livrets_date: Ep.livrets ? Ep.livrets.date : '', pea_date: Ep.pea ? Ep.pea.date : '', reserve },
      credit, nc, epargne_min: Number(R.epargne_min) || 0.1, epargne_obj: Number(R.epargne_obj) || 0.2,
      objectifs_depuis: R.objectifs_depuis || '', operations: ops
    };
  }

  // ---------- Projections (questions facultatives : ce qui manque prend une hypothèse) ----------
  const val = (x) => (x === '' || x === null || x === undefined || !isFinite(Number(x)) ? null : Number(x));
  const choix = (x, def) => { const v = val(x); return v === null ? { v: def, hyp: true } : { v, hyp: false }; };
  const moisEntre = (deK, aK) => (Number(aK.slice(0, 4)) - Number(deK.slice(0, 4))) * 12 + Number(aK.slice(5, 7)) - Number(deK.slice(5, 7));
  function projeter(type, rep, c) {
    // Base : moyenne réelle des derniers mois (revenus hors exceptionnels, dépenses, épargne, salaire moyen)
    const P = Object.assign({}, c.base, { pct: { epargne: c.base.pct_epargne } }), S = Math.max(0, Number(c.base.salaire) || 0);
    const reserveDe = (deficit) => (deficit > 0 && c.epargne.livrets ? Math.round(c.epargne.livrets / deficit * 10) / 10 : null);
    const out = { hyp: {} };
    const note = (k, o) => { out.hyp[k] = o.hyp; return o.v; };
    const mcSuiv = moisDecale(c.mc, 1);
    if (type === 'conges') {
      const jours = note('jours', choix(rep.jours, 5));
      const mois = rep.mois && /^\d{4}-\d\d$/.test(rep.mois) ? rep.mois : moisDecale(c.mc, 4); out.hyp.mois = !rep.mois;
      const parJour = note('par_jour', choix(rep.par_jour, r2(S / 21.67)));
      const total = r2(jours * parJour), n = Math.max(1, moisEntre(c.mc, mois));
      const parMois = r2(total / n);
      out.res = { jours, mois, mois_lib: moisLabel(mois), par_jour: parJour, total, n, par_mois: parMois, depuis: moisLabel(mcSuiv),
        epargne_avant: P.pct.epargne, epargne_pendant: (P.epargne - parMois) / P.revenus, sans_rien: r2(P.epargne - total) };
    } else if (type === 'baisse') {
      const nouveau = note('salaire', choix(rep.salaire, r2(S * 0.8)));
      const autres = P.revenus - S;
      const rev = r2(nouveau + autres), ep = r2(rev - P.depenses);
      const plaisir = P.plaisir_var;
      out.res = { salaire: nouveau, revenus: rev, epargne: ep, epargne_pct: rev > 0 ? ep / rev : 0, avant_pct: P.pct.epargne,
        a_reduire: ep < 0 ? r2(-ep) : 0, reduc_plaisir: ep < 0 && plaisir > 0 ? Math.min(1, -ep / plaisir) : 0,
        reserve: reserveDe(-ep), reserve_sans_salaire: reserveDe(r2(P.depenses - autres)) };
    } else if (type === 'pret') {
      const montantP = note('montant', choix(rep.montant, 10000));
      const taux = note('taux', choix(rep.taux, 3));
      const ans = note('ans', choix(rep.ans, 5));
      const etudes = note('etudes', choix(rep.etudes, 12));
      const revEtudes = note('rev_etudes', choix(rep.rev_etudes, r2(P.revenus - S)));
      const n = Math.max(1, Math.round(ans * 12)), t = taux / 100 / 12;
      const mens = t > 0 ? r2(montantP * t / (1 - Math.pow(1 + t, -n))) : r2(montantP / n);
      const cout = r2(mens * n - montantP);
      // Pendant les études : dépenses du mois (hors épargne) moins les revenus d'études, couvert par le prêt et l'épargne
      const besoin = r2(P.depenses - revEtudes);
      const totalEtudes = r2(Math.max(0, besoin) * etudes);
      const apresPct = (P.epargne - mens) / P.revenus;
      out.res = { montant: montantP, taux, ans, n, mensualite: mens, cout, etudes, rev_etudes: revEtudes, besoin, total_etudes: totalEtudes,
        couvert: r2(montantP - totalEtudes), mens_pct: mens / P.revenus, epargne_apres: apresPct };
    } else if (type === 'projet') {
      const montantP = note('montant', choix(rep.montant, 1000));
      const deja = note('deja', choix(rep.deja, 0));
      const mois = rep.mois && /^\d{4}-\d\d$/.test(rep.mois) ? rep.mois : moisDecale(c.mc, 12); out.hyp.mois = !rep.mois;
      const n = Math.max(1, moisEntre(c.mc, mois));
      const parMois = r2(Math.max(0, montantP - deja) / n);
      out.res = { montant: montantP, deja, mois, mois_lib: moisLabel(mois), n, par_mois: parMois, pct: parMois / P.revenus, part_epargne: P.epargne > 0 ? parMois / P.epargne : null, epargne_reste: r2(P.epargne - parMois) };
    }
    return out;
  }

  // ---------- Zip (export bancaire compressé) ----------
  async function lireZip(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let p = 0;
    while (p + 30 <= u8.length && v.getUint32(p, true) === 0x04034b50) {
      const meth = v.getUint16(p + 8, true), flags = v.getUint16(p + 6, true);
      let taille = v.getUint32(p + 18, true);
      const nl = v.getUint16(p + 26, true), xl = v.getUint16(p + 28, true);
      const nom = new TextDecoder().decode(u8.subarray(p + 30, p + 30 + nl));
      const deb = p + 30 + nl + xl;
      if (flags & 8 && taille === 0) taille = tailleDepuisCentral(v, u8, nom);
      const data = u8.subarray(deb, deb + taille);
      if (/\.csv$/i.test(nom)) {
        if (meth === 0) return { nom, texte: new TextDecoder('utf-8').decode(data) };
        if (meth === 8) {
          const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return { nom, texte: await new Response(s).text() };
        }
        throw new Error('Compression du zip non prise en charge.');
      }
      p = deb + taille;
    }
    throw new Error('Pas de fichier CSV dans ce zip.');
  }
  function tailleDepuisCentral(v, u8, nom) {
    for (let p = u8.length - 22; p >= 0; p--) if (v.getUint32(p, true) === 0x06054b50) {
      let c = v.getUint32(p + 16, true);
      while (v.getUint32(c, true) === 0x02014b50) {
        const nl = v.getUint16(c + 28, true), n = new TextDecoder().decode(u8.subarray(c + 46, c + 46 + nl));
        if (n === nom) return v.getUint32(c + 20, true);
        c += 46 + nl + v.getUint16(c + 30, true) + v.getUint16(c + 32, true);
      }
      break;
    }
    return 0;
  }

  // Corrections ponctuelles des données déjà sur le téléphone, appliquées une seule fois chacune
  function migrer(bundle) {
    const faites = new Set(bundle.migrations || []);
    let b = bundle;
    if (!faites.has('abonnements-libelle')) {
      // Abonnements classés en achats (ex. Amazon Prime) : reclassés, sauf choix fait à la main ; le montant fixe prend en compte le dernier prélèvement
      const ids = new Set(catalogue(b).map((p) => p.id));
      if (ids.has('abonnements')) {
        let dernier = null;
        const ops = b.operations.map((o) => {
          if (o.montant < 0 && o.poste !== 'abonnements' && o.src !== 'manuel' && ABONNEMENTS.test(norm(o.libelle).toUpperCase())) {
            if (!/APPLE\.COM|SPOTIFY/.test(norm(o.libelle).toUpperCase()) && (!dernier || o.date > dernier.date)) dernier = o;
            return Object.assign({}, o, { poste: 'abonnements', src: 'règle' });
          }
          return o;
        });
        const ajout = dernier ? -dernier.montant : 0;
        const fixes = (b.fixes || []).map((f) => (f.id === 'abonnements' && ajout ? Object.assign({}, f, { montant: r2(Number(f.montant) + ajout) }) : f));
        b = Object.assign({}, b, { operations: ops, fixes });
      }
      faites.add('abonnements-libelle');
    }
    return faites.size === (bundle.migrations || []).length ? bundle : Object.assign({}, b, { migrations: [...faites] });
  }

  const api = { migrer, lireExport, importer, reclasser, calculer, projeter, lireZip, catalogue, marchand, nomLisible, dateAchat, moisDe, moisLabel, moisDecale, dateCourte, frDate, FAMILLES, VARIABLES, ENVELOPPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Moteur = api;
})(typeof window !== 'undefined' ? window : globalThis);
