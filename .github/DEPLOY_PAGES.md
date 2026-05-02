# GitHub Pages — activer le site du dépôt

L’URL du projet est :

**`https://<propriétaire-en-minuscules>.github.io/<nom-du-dépôt>/`**

Exemple pour ce repo : **`https://strainus.github.io/DashboardRayls/`**

> La racine **`https://strainus.github.io/`** (sans `/DashboardRayls/`) affiche souvent une **404** tant qu’il n’existe pas de site *user/org* dédié (repo `username.github.io`). C’est **normal**.

## 1. Activer Pages sur le dépôt

1. GitHub → dépôt **DashboardRayls** → **Settings**
2. **Pages** (menu gauche)
3. **Build and deployment** → **Source** : choisir **GitHub Actions** (pas « Deploy from a branch »)
4. Enregistrer si besoin

Sans cette étape, aucun déploiement n’est publié → 404 sur `/DashboardRayls/`.

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
