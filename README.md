# FOREXIUM

Application de gestion de bureau de change avec frontend React/Vite, backend Express et base MySQL.

## 1. Architecture

```txt
frontend/  React + Vite
backend/   Node.js + Express + MySQL
database/  Scripts SQL
```

En production souhaitee :

```txt
Vercel Frontend  ->  Vercel Backend  ->  Railway MySQL
```

## 2. Prerequis

- Node.js 18 ou plus recent.
- npm.
- MySQL 8.x ou Railway MySQL.
- Un compte Vercel.
- Un compte Railway.

## 3. Installation locale

### 3.1 Installer les dependances

Depuis la racine du projet :

```bash
npm run install:all
```

Ou manuellement :

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3.2 Creer la base de donnees

Creer une base MySQL vide, par exemple `forexium_v7`, puis executer :

```bash
mysql -u root -p forexium_v7 < database/forexium_v7_railway.sql
```

Le script recommande est :

```txt
database/forexium_v7_railway.sql
```

Important : ce script est base sur le dump `forexium_v7 (1).sql`, mais ajuste pour Railway et pour le backend actuel. Ne pas utiliser les anciens fichiers `PATCH_SQL_*`, `RESET_*` ou `forexium_v7.sql` pour une nouvelle installation.

### 3.3 Configurer le backend

Creer `backend/.env` :

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-moi-en-production

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=forexium_v7
```

Le backend sait aussi lire les variables Railway :

```env
MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
```

### 3.4 Configurer le frontend

En local, le frontend utilise par defaut :

```txt
http://localhost:3000/api
```

Optionnellement, creer `frontend/.env` :

```env
VITE_API_URL=http://localhost:3000/api
```

### 3.5 Demarrer l'application

Depuis la racine :

```bash
npm start
```

Ou separement :

```bash
npm start --prefix backend
npm run dev --prefix frontend
```

Acces local :

```txt
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api/health
```

## 4. Creation des utilisateurs

Au premier demarrage, ouvrir l'application puis creer :

- un compte `porteur`,
- un compte `associe`.

Le backend limite logiquement l'application a un porteur et un associe.

## 5. Manuel d'utilisation

### 5.1 Tableau de bord

Le tableau de bord affiche :

- stock USDT global,
- caisse,
- profit total,
- situation clients,
- situation fournisseurs,
- nombre de transactions.

La carte stock USDT distingue :

- stock positif par fournisseur,
- dette stock par fournisseur,
- stock non attribue si une partie du stock global n'est pas liee a un fournisseur.

### 5.2 Clients

Dans l'onglet `Clients`, l'utilisateur peut :

- creer un client,
- modifier un client,
- supprimer un client,
- consulter l'extrait de compte,
- enregistrer un paiement client,
- telecharger l'extrait en PDF.

Logique client :

```txt
vente client = montant a payer
paiement client = montant recu
reste = montant a payer - montant recu
```

Si le client paye plus que ce qu'il doit, le solde devient un credit/surplus.

### 5.3 Fournisseurs

Dans l'onglet `Fournisseurs`, l'utilisateur peut :

- creer un fournisseur,
- modifier un fournisseur,
- supprimer un fournisseur,
- consulter l'extrait de compte,
- enregistrer un paiement fournisseur,
- telecharger l'extrait en PDF.

Logique fournisseur actuelle :

```txt
achat USDT = paiement au fournisseur
vente devise liee a un fournisseur = dette envers ce fournisseur
paiement fournisseur = reduction de dette
```

Le stock fournisseur est calcule ainsi :

```txt
stock fournisseur = USDT achete chez ce fournisseur - USDT vendu via ce fournisseur
```

Si le resultat est negatif, cela signifie que des ventes ont ete rattachees a un fournisseur qui n'avait pas assez de stock USDT attribue.

### 5.4 Devises

L'onglet `Devises` permet d'ajouter et modifier les devises vendues.

Le taux demande correspond a :

```txt
1 USDT = ? devise
```

### 5.5 Transactions

Types principaux :

- `achat` : achat USDT avec fournisseur obligatoire.
- `vente` : vente de devise avec client et fournisseur obligatoires.
- `depense` : sortie de caisse.
- `retrait` : retrait de caisse.
- `versement` : alimentation caisse.
- `paiement_client` : paiement recu d'un client.
- `paiement_fournisseur` : paiement fait a un fournisseur.

Les ventes et achats restent modifiables tant qu'ils ne sont pas verrouilles.

## 6. Verifications utiles

Verifier le backend :

```bash
node --check backend/routes/transactions.js
node --check backend/routes/accounts.js
node --check backend/config/database.js
```

Verifier le frontend :

```bash
npm run build --prefix frontend
```

Si Vite n'arrive pas a vider `frontend/dist/assets` sur Windows apres un timeout :

```bash
npm run build --prefix frontend -- --emptyOutDir=false
```

## 7. Deploiement Railway MySQL

### 7.1 Creer la base

1. Ouvrir Railway.
2. Creer un nouveau projet.
3. Ajouter une base `MySQL`.
4. Ouvrir l'onglet `Variables` ou `Connect`.
5. Recuperer les informations de connexion :

```txt
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
MYSQL_URL
```

Pour une connexion depuis Vercel, utiliser les informations publiques/TCP Proxy de Railway si elles sont differentes des variables internes.

### 7.2 Importer le schema

Avec un client MySQL :

```bash
mysql -h <HOST_PUBLIC_RAILWAY> -P <PORT_PUBLIC_RAILWAY> -u <MYSQLUSER> -p <MYSQLDATABASE> < database/forexium_v7_railway.sql
```

Ou via un outil comme MySQL Workbench, TablePlus, DBeaver ou l'interface SQL Railway si disponible.

## 8. Deploiement backend sur Vercel

Le backend est dans :

```txt
backend/
```

Le fichier `backend/server.js` est compatible Vercel : il exporte l'application Express et ne lance `app.listen` qu'en local.

### 8.1 Creer le projet Vercel backend

1. Aller sur Vercel.
2. `Add New Project`.
3. Importer le depot GitHub.
4. Definir `Root Directory` sur `backend`.
5. Framework : `Other`.
6. Build Command : laisser vide ou conserver la valeur par defaut.
7. Install Command : `npm install`.
8. Start Command : `npm start`.

### 8.2 Variables d'environnement backend

Ajouter dans Vercel, pour `Production` et `Preview` si necessaire :

```env
JWT_SECRET=une-valeur-longue-et-secrete
FRONTEND_URL=https://votre-frontend.vercel.app

DB_HOST=<HOST_PUBLIC_RAILWAY>
DB_PORT=<PORT_PUBLIC_RAILWAY>
DB_USER=<MYSQLUSER>
DB_PASSWORD=<MYSQLPASSWORD>
DB_NAME=<MYSQLDATABASE>
```

Alternative si vous copiez directement les noms Railway :

```env
MYSQLHOST=<HOST_PUBLIC_RAILWAY>
MYSQLPORT=<PORT_PUBLIC_RAILWAY>
MYSQLUSER=<MYSQLUSER>
MYSQLPASSWORD=<MYSQLPASSWORD>
MYSQLDATABASE=<MYSQLDATABASE>
```

### 8.3 Tester le backend

Apres deploiement :

```txt
https://votre-backend.vercel.app/api/health
```

La reponse attendue :

```json
{ "status": "ok", "version": "5.6.0+" }
```

## 9. Deploiement frontend sur Vercel

Le frontend est dans :

```txt
frontend/
```

Le fichier `frontend/vercel.json` redirige les routes React vers `index.html`, ce qui evite les erreurs au rechargement d'une page.

### 9.1 Creer le projet Vercel frontend

1. `Add New Project`.
2. Importer le meme depot GitHub.
3. Definir `Root Directory` sur `frontend`.
4. Framework : `Vite`.
5. Build Command : `npm run build`.
6. Output Directory : `dist`.
7. Install Command : `npm install`.

### 9.2 Variables d'environnement frontend

Ajouter :

```env
VITE_API_URL=https://votre-backend.vercel.app/api
```

Important : pour Vite, les variables exposees au frontend doivent commencer par `VITE_`.

### 9.3 Derniere etape CORS

Quand le frontend a son URL finale, revenir dans le projet backend Vercel et mettre :

```env
FRONTEND_URL=https://votre-frontend.vercel.app
```

Puis redeployer le backend.

## 10. Fichiers inutiles ou obsoletes dans ce projet

Ces fichiers/dossiers ne sont pas necessaires pour executer ou deployer la version actuelle.

### 10.1 A ne jamais deployer/commiter

- `node_modules/`
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/dist/`
- `.env`
- `backend/.env`
- `frontend/.env`
- `.vscode/`

### 10.2 Anciens scripts SQL remplaces par le schema Railway

Utiliser maintenant :

```txt
database/forexium_v7_railway.sql
```

Les fichiers suivants sont historiques, dangereux ou redondants pour une installation neuve :

- `forexium_v7.sql`
- `forexium_v7 (1).sql`
- `database/database_setup.sql`
- `database/PATCH_SQL_v7.sql`
- `database/PATCH_SQL_v8_fixes.sql`
- `database/PATCH_SQL_v9_final.sql`
- `database/PATCH_SQL_v10_fournisseur.sql`
- `database/PATCH_SQL_v10b_client.sql`
- `database/PATCH_SQL_numero_paiement.sql`
- `database/migrate-v5.6.1.sql`
- `database/add_payment_tables.sql`
- `database/FIX_stock_double.sql`
- `database/database/migrate-payements.sql`
- `database/migrations/20260506_consolidation_transactions.sql`
- `database/migrations/20260506_add_related_transaction_id.sql`

### 10.3 Scripts de reset a garder seulement en developpement

Ne pas executer en production sans sauvegarde :

- `database/RESET_COMPLET.sql`
- `database/RESET_donnees.sql`
- `database/reset_forexium.sql`
- `backend/scripts/reset_forexium.sql`
- `backend/scripts/reset-db.js`

### 10.4 Documentation ancienne remplacee par ce README

Ces fichiers peuvent etre archives :

- `API_DOCUMENTATION.md`
- `CHECKLIST_IMPLEMENTATION.md`
- `GUIDE_DEMARRAGE_RAPIDE.md`
- `GUIDE_TEST.md`
- `INDEX.md`
- `MODIFICATIONS_COMPLETES.md`
- `MODIFICATIONS_V5.6.1.md`
- `MODIFICATIONS_v5.7.0.md`
- `QUICKSTART.md`
- `README_DEMARRAGE.md`
- `README_MODIFICATIONS.md`
- `RESUME_MODIFICATIONS.md`
- `SYNTHESE_FINALE.md`
- `frontend/README.md`

### 10.5 Scripts backend anciens

Ces scripts ne correspondent plus parfaitement au schema actuel et sont a eviter pour une installation neuve :

- `backend/scripts/init-db.js`
- `backend/scripts/migrate.js`

## 11. Notes de production

- Toujours sauvegarder la base avant une migration.
- Ne jamais mettre `JWT_SECRET`, mots de passe DB ou fichiers `.env` dans Git.
- Sur Vercel, un changement de variable d'environnement necessite un redeploiement.
- Sur Railway, utiliser le TCP Proxy/public connection pour connecter un backend heberge hors Railway.
- Pour limiter les erreurs CORS, garder `FRONTEND_URL` exactement identique au domaine frontend Vercel.

## 12. Sources utiles

- Vercel Vite : https://vercel.com/docs/frameworks/frontend/vite
- Vercel Express : https://vercel.com/docs/frameworks/backend/express
- Vercel variables d'environnement : https://vercel.com/docs/environment-variables
- Railway MySQL : https://docs.railway.com/databases/mysql
