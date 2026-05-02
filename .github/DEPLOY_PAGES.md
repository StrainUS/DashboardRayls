# GitHub Pages — activer le site du dépôt

L’URL du projet est :

**`https://<propriétaire-en-minuscules>.github.io/<nom-du-dépôt>/`**

Exemple pour ce repo : **`https://strainus.github.io/DashboardRayls/`**

> La racine **`https://strainus.github.io/`** (sans `/DashboardRayls/`) affiche souvent une **404** tant qu’il n’existe pas de site *user/org* dédié (repo `username.github.io`). C’est **normal**.

## Mise à jour du site (flux normal)

**Modifier le code → commit → push sur `main` (ou `master`)** : le workflow **Pages** rebuild et redéploie automatiquement.

**Important** : le build **Pages** exige la variable **`VITE_RAYLS_RPC_HTTP_URL`** (proxy Cloudflare). Sans elle, le workflow **échoue volontairement** — on ne publie pas un site où l’onglet Réseau serait cassé par CORS. Contournement réservé aux forks : variable **`PAGES_ALLOW_MISSING_RPC_PROXY=true`** (voir *Settings → Variables → Actions*).

## 0. Ordre recommandé (première installation)

1. Secrets Cloudflare + workflow **Deploy RPC CORS proxy** (une fois) — crée **`VITE_RAYLS_RPC_HTTP_URL`**.
2. À la fin de ce workflow, **Pages** se relance **automatiquement** ; sinon lancez **Pages** manuellement ou poussez sur `main`.
3. Activer **Pages** (*Source : GitHub Actions*) si ce n’est pas déjà fait.

## 1. Activer Pages sur le dépôt (obligatoire)

Tant qu’aucun site Pages n’existe pour le repo, le job **deploy** du workflow échoue avec :

`Creating Pages deployment failed` / `Ensure GitHub Pages has been enabled` (HTTP 404 côté API).

### Option A — Interface

1. GitHub → dépôt **DashboardRayls** → **Settings**
2. **Pages** → **Build and deployment** → **Source** : **GitHub Actions**

### Option B — CLI (compte avec droits admin sur le repo)

```bash
gh api -X POST repos/StrainUS/DashboardRayls/pages -f build_type=workflow
```

Puis relancer le workflow **Pages** (*Actions* → run raté → *Re-run failed jobs*, ou nouveau push sur `main`).

Sans cette étape, le build peut être vert mais **aucun site** n’est publié → 404 sur `/DashboardRayls/`.

### RPC Réseau (latence, bloc, gas) sur github.io

Le RPC public Rayls n’autorise pas les POST navigateur depuis `*.github.io` (CORS du navigateur — ce n’est pas un bug du dépôt).

**Une seule fois** (si ce n’est pas déjà fait) :

0. **Cloudflare** → **Workers et Pages** → **Modifier** (*Change*) le sous-domaine **workers.dev** (onboarding du compte). Sans ça, `wrangler deploy` échoue depuis GitHub Actions.
1. Secrets **`CLOUDFLARE_API_TOKEN`** et **`CLOUDFLARE_ACCOUNT_ID`** (*Settings → Secrets and variables → Actions*).  
   **Important** : *Settings → Actions → General → **Workflow permissions*** → cochez **Read and write permissions** (sinon le workflow ne peut pas enregistrer `VITE_RAYLS_*` et échoue après le déploiement Cloudflare).
2. **[Deploy RPC CORS proxy](workflows/deploy-rpc-proxy.yml)** → *Run workflow* : déploie [`workers/rpc-cors-proxy/`](../workers/rpc-cors-proxy/) (proxy POST vers le RPC mainnet) et enregistre **`VITE_RAYLS_RPC_HTTP_URL`**.
3. **Pages** repart tout seul après un proxy réussi ; sinon relancez **Pages** ou poussez sur `main`. Le build Pages désactive le WebSocket RPC (`VITE_RPC_WS_URL=0`) pour éviter des erreurs depuis `github.io` ; les mesures HTTP restent complètes.

Ouvrir le site avec le **chemin du dépôt** (ex. `https://strainus.github.io/DashboardRayls/`), pas seulement la racine `strainus.github.io`.

Détails : [`workers/rpc-cors-proxy/README.md`](../workers/rpc-cors-proxy/README.md).

### CoinGecko / onglet Spot sur `*.github.io`

En production il n’y a **pas** de proxy Vite : les appels directs à l’API publique depuis le navigateur échouent souvent (prévol CORS / quotas). Le workflow **Pages** peut injecter :

1. **Secret** `VITE_COINGECKO_DEMO_API_KEY` — même clé gratuite [CoinGecko Demo API](https://www.coingecko.com/en/api) qu’en local dans `.env` (elle sera présente dans le bundle JS ; pour limiter l’exposition, préférez un proxy).
2. **Variable** `VITE_COINGECKO_API_ROOT` — URL de votre backend qui relaie `/api/v3` CoinGecko (recommandé si vous ne voulez pas publier de clé).

Après ajout : relancer le workflow **Pages** (ou pousser sur `main`).

### Favicon (Safari / cache)

Le logo marque (`rayls-logo-official.png`, fond transparent) sert à l’en-tête ; les favicons sont des dérivés `favicon-16/32.png` et `apple-touch-icon.png`. Si l’onglet montre encore une ancienne image : navigation privée ou supprimer les données du site pour `github.io`.

## 2. Vérifier le workflow

1. Onglet **Actions**
2. Workflow **Pages** — la dernière exécution sur `main` doit être **verte** (build + deploy)
3. Si le job **deploy** est en attente : **Environments** → **github-pages** → retirer des *required reviewers* bloquants, ou approuver la **deployment** en attente dans l’onglet Actions

## 3. Ouvrir le bon lien

- Utiliser l’URL **complète** avec le nom du dépôt et un **slash final** :  
  `https://strainus.github.io/DashboardRayls/`
- Attendre 1–2 minutes après un premier déploiement réussi
- Rafraîchir sans cache (Safari : *Develop* → *Empty Caches* ou navigation privée)

## 4. En cas d’échec du workflow

- Lire les logs du job **build** (lint, tests, `npm audit`, `vite build`)
- Corriger puis pousser à nouveau sur `main`, ou lancer **Run workflow** sur **Pages** (workflow manuel)
