# Budget : guide de reprise

Ce fichier permet à quelqu'un (ou à Claude) de reprendre l'appli sans l'historique des échanges qui l'ont construite. À lire en entier avant de modifier quoi que ce soit.

## En bref

- **Quoi** : une appli web installable sur iPhone (PWA) pour suivre un budget personnel à partir des exports du compte Boursobank.
- **Où** : hébergée sur GitHub Pages depuis la branche `main` de ce dépôt (`https://<compte>.github.io/budget-maylis/`). Chaque push sur `main` met l'appli à jour en une à deux minutes.
- **Sans serveur, sans dépendance** : HTML, CSS et JavaScript simples, aucun outil de build, aucune bibliothèque externe.
- **Les données ne sont jamais dans le dépôt.** Elles vivent dans le `localStorage` de Safari sur le téléphone de la propriétaire (clé `budget-maylis`). Le dépôt est public : il ne doit contenir ni montant, ni nom de personne, ni libellé bancaire, ni règle nominative.
- **Langue** : tout est en français (interface, code, commentaires, messages de commit).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 5 onglets, toute la feuille de style (style iOS), en-têtes PWA et Content-Security-Policy. |
| `moteur.js` | Toute la logique : lecture du CSV / zip Boursobank, classement des opérations, calculs, projections, migrations. Aucun accès au DOM. Exposé en `window.Moteur` (et `module.exports` pour des tests sous Node). |
| `app.js` | Stockage local, sauvegarde chiffrée, import, feuilles (dialogues) et dessin de tous les écrans. |
| `sw.js` | Service worker : réseau d'abord, cache en secours. **Incrémenter `VERSION` à chaque mise en ligne**, sinon l'iPhone peut garder l'ancienne version. |
| `manifest.json`, `icons/` | Installation sur l'écran d'accueil. |
| `.gitignore` | Exclut `*.json` (sauf le manifeste), `*.csv`, `*.zip`, `.local/`, `.claude/`. Ne pas l'affaiblir. |

`.local/` (ignoré par git) peut contenir, sur le poste du développeur, un relevé de test, une configuration de départ et une page `preparer.html` qui fabrique la sauvegarde initiale. Rien de ce dossier ne doit être poussé.

## Les écrans

1. **Ce mois-ci** : budget non dépensé (ou ce qu'il reste à dépenser et par jour), jauge dépensé / budget, « À faire » (compte sous le minimum avant le loyer, mise de côté sous le minimum, opérations à classer), **À mettre de côté** (avec déjà viré / reste à virer), carte **Dépenses du mois** (sous-totaux), puis les postes Obligations, Plaisir, Dépenses rares, Charges fixes. Uniquement des euros, pas de pourcentages.
2. **Projections** : 4 scénarios (congés sans solde, baisse de salaire, prêt étudiant, projet). Aucune question n'est obligatoire : une réponse vide est remplacée par une hypothèse affichée en bleu. Calculs sur la moyenne réelle.
3. **Dans la durée** : épargne totale, réserve en mois de dépenses (conseillé : 3 mois), **repère 50 / 30 / 20** sur le réel (sélecteur moyenne / mois dernier), comptes d'épargne, crédit voiture.
4. **Opérations** : recherche, filtres ce mois-ci / mois dernier / tout, « à classer », reclassement d'une opération par une feuille (option « toujours classer ce marchand ici »).
5. **Réglages** : uniquement ce qu'on modifie (revenus, début du mois, budget par poste, charges fixes, épargne min / objectif, minimum sur le compte, crédit, règles, sauvegarde, import). Pas de chiffres d'analyse sur cette page.

## Vocabulaire (à respecter dans l'interface)

- **Budget** : le montant par mois d'un poste.
- **Repère** : le 50 / 30 / 20 (obligations ≤ 50 %, plaisir ≤ 30 %, épargne ≥ 20 % des revenus).
- **Objectif** : réservé à l'épargne (minimum et objectif, en % des revenus du mois).
- **Dépenses rares** : ce qui s'appelait « enveloppes » (cadeaux, voyages, achats rares, entretien voiture). Le code interne utilise encore `enveloppe` / `ENVELOPPES`.
- **À mettre de côté** : l'argent non dépensé du mois. Ce n'est pas un virement : il reste sur le compte courant tant qu'il n'est pas viré.

## Modèle de données (`localStorage['budget-maylis']`)

```js
{
  format: 'budget-maylis', version: 1,
  reglages: {
    salaire_ref, aides: [{ id, nom, montant }], jour_debut,      // jour de paie : le mois va de ce jour au jour d'avant
    epargne_min, epargne_obj, compte_min,                         // fractions (0,1 = 10 %) et euros
    objectifs_depuis: 'AAAA-MM', fenetre: 12                     // fenêtre de la moyenne glissante
  },
  fixes: [{ id, nom, montant, ic }],          // charges fixes ; ids attendus par le moteur : loyer, credit_voiture, assurance_voiture, abonnements, frais
  fenetres: { posteId: 'AAAA-MM' },           // début de moyenne propre à un poste (ex. après un changement de voiture)
  objectifs_depart: { posteId: montant },     // budget de départ tant qu'aucun mois terminé n'est dans la fenêtre du poste
  objectifs_manuels: { posteId: fraction },   // budget fixé à la main, en part des revenus de base
  epargne: { livrets: { valeur, date }, pea: { valeur, date } },
  credit: { nom, poste, mensualite, premiere: 'AAAA-MM', nb },
  regles: [{ motif, sens, min, max, cat, poste }],   // règles de classement de la propriétaire (expressions régulières sur le libellé)
  regles_perso: [{ marchand, poste }],                 // créées par « toujours classer ce marchand ici »
  operations: [{ id, date, libelle, montant, cat, poste, src }],
  soldes: { 'AAAA-MM-JJ': solde },
  export, migrations: [], modifie_le, sauvegarde_le
}
```

Les règles nominatives (personnes, employeur, colocation) sont dans `regles`, donc uniquement sur le téléphone. Ne jamais les recopier dans le code.

## Postes

Définis dans `moteur.js` (`VARIABLES`, `ENVELOPPES`, `REVENUS`, `AUTRES`) ; les charges fixes viennent des données.

- **Obligations** : courses, essence / péages / parking, transports, santé, plus l'entretien voiture.
- **Plaisir** : restos / bars / sorties, achats divers, soins / beauté, vêtements, espèces, loisirs, plus cadeaux, voyages, achats rares.
- **Revenus** : salaire, aides de la famille, CAF, autre revenu (ponctuel).
- **Autres** : épargne (virements vers ou depuis livrets et PEA), hors budget (ex. achat d'une voiture), à classer.

## Ordre de classement d'une opération (`classer`)

1. Règle « marchand » mémorisée (`regles_perso`).
2. Règles des données (`regles`).
3. Règles génériques du code : virements vers ou depuis l'épargne, retrait d'espèces → espèces, remboursements santé, **abonnements reconnus au libellé** (Prime, streaming…), paiement en devise → voyages, petits virements entre amis (< 150 €) → restos (en déduction).
4. Historique appris (marchand déjà classé à 80 % dans le même poste, au moins 2 fois).
5. Catégorie de la banque (`CAT_BANQUE`).
6. Sinon : à classer.

Un import ne reclasse jamais une opération déjà connue (clé date + libellé + montant). Les opérations anciennes absentes du nouvel export sont gardées.

## Règles de calcul (une seule règle partout)

- **Mois budgétaire** : du `jour_debut` au jour d'avant, le mois suivant. La clé du mois est celle où il commence. Un salaire arrivé jusqu'à 5 jours avant le jour de paie compte pour le mois qui commence.
- **Budget d'un poste** : moyenne de ses dépenses nettes (remboursements déduits) sur les mois **terminés** de la fenêtre (12 au plus, pas avant `objectifs_depuis` ni la fenêtre du poste). Sinon `objectifs_depart`. Un % manuel remplace la moyenne.
- **Dépenses rares** : même moyenne, sans plafond. Seul ce qui est dépensé dans le mois compte ; pas de réserve cumulée ni de report.
- **Base des pourcentages** : les revenus réels moyens (sans les revenus ponctuels « autre revenu »), ou les revenus de référence s'il n'y a pas encore de mois terminé.
- **Revenus du mois** : ce qui est vraiment arrivé (salaire, aides, CAF), et tant que la paie ou l'aide n'est pas arrivée, le montant de référence.
- **À mettre de côté** = revenus du mois − charges fixes − dépenses des postes − dépenses rares. Pendant le mois, le budget non dépensé compte au prorata des jours restants ; le dernier jour, c'est le réel exact. Il doit correspondre à la variation du compte courant, plus les virements vers l'épargne.
- **Reste / budget non dépensé** = budget total − tout le dépensé (un dépassement sur un poste réduit le reste).
- **Réel moyen et mois dernier** (`repartition`) : mêmes mois que les budgets, mêmes exclusions. Projections, réserve et « Dans la durée » partent de cette moyenne réelle.
- **Épargne (comptes)** : valeur saisie à une date, puis virements vus sur le compte courant. Les livrets sont regroupés (les virements ne disent pas lequel).

Après toute modification de calcul, vérifier la cohérence entre les pages : recalculer à partir des opérations brutes (somme par mois et par famille) et comparer à ce que chaque écran affiche (dépensé, budget, reste, à mettre de côté, moyenne réelle, mois dernier, réserve, projections, totaux d'Opérations).

## Corriger des données déjà sur le téléphone

Les données existent seulement sur l'appareil. Pour corriger un classement ou un montant déjà enregistré, ajouter une étape dans `migrer()` (`moteur.js`) avec une clé unique : elle s'applique une seule fois au chargement et la clé est ajoutée à `migrations`. Ne jamais supposer qu'on peut modifier les données autrement.

## Sauvegarde et import

- Sauvegarde : fichier JSON, chiffré si un mot de passe est donné (AES-GCM 256, clé PBKDF2-SHA256, 310 000 itérations, format `budget-chiffre`). Partage par la feuille iOS (« Enregistrer dans Fichiers »).
- Import : sauvegarde (`.json`, chiffrée ou non) avec confirmation avant de remplacer, ou export Boursobank (`.zip` ou `.csv`). Toute modification manuelle peut être annulée depuis le message qui la confirme.

## Sécurité

- Aucun texte importé n'est inséré comme HTML : uniquement `textContent`. `innerHTML` ne sert qu'à des chaînes fixes du code (icônes, gabarits de feuilles).
- CSP stricte dans `index.html` (`script-src 'self'`, pas de requêtes externes). Ne pas ajouter de script ou de police hébergés ailleurs.

## Tester en local

Servir le dossier avec un serveur statique, par exemple `python -m http.server 8767`, puis ouvrir `http://localhost:8767/`. Le service worker n'est enregistré qu'en HTTPS : en local, pas de cache à vider. Pour charger des données de test, les écrire dans `localStorage['budget-maylis']` (format ci-dessus) ou importer une sauvegarde. Vérifier sur une largeur d'iPhone (375 px), en clair et en sombre.

## Mettre en ligne

1. Vérifier que rien de personnel n'est suivi par git (`git status`, puis chercher montants et noms avec `git grep`).
2. Incrémenter `VERSION` dans `sw.js`.
3. Commit (message en français) puis push sur `main`. GitHub Pages se met à jour seul.
4. Sur l'iPhone : fermer complètement l'appli puis la rouvrir.

## Façon de travailler avec la propriétaire

- Montrer une maquette ou des captures (largeur iPhone) et attendre son accord avant de construire ou de mettre en ligne.
- Style natif iOS : listes groupées, carrés d'icône colorés, feuilles qui montent du bas, barre d'onglets en verre. Pas de tableaux type tableur.
- Pourcentages réservés à Réglages (budget par poste) et à Dans la durée (repère). Ce mois-ci reste en euros.
- Chaque chiffre affiché doit dire ce qu'il est (réel ou budget) et tomber juste avec les autres pages.
- Pas de conseil d'investissement personnalisé : donner les faits et les ordres de grandeur, elle décide.
