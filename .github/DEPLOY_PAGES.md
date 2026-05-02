# GitHub Pages — activer le site du dépôt

L’URL du projet est :

**`https://<propriétaire-en-minuscules>.github.io/<nom-du-dépôt>/`**

Exemple pour ce repo : **`https://strainus.github.io/DashboardRayls/`**

> La racine **`https://strainus.github.io/`** (sans `/DashboardRayls/`) affiche souvent une **404** tant qu’il n’existe pas de site *user/org* dédié (repo `username.github.io`). C’est **normal**.

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

Le RPC public Rayls n’autorise pas les POST navigateur depuis `*.github.io` (CORS).

**Méthode recommandée** : workflow [`.github/workflows/deploy-rpc-proxy.yml`](../.github/workflows/deploy-rpc-proxy.yml) — ajoutez les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, puis *Run workflow*. La variable **`VITE_RAYLS_RPC_HTTP_URL`** est créée automatiquement ; relancez ensuite **Pages**.

Détails : [`workers/rpc-cors-proxy/README.md`](../workers/rpc-cors-proxy/README.md).

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
