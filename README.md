# Dashboard Rayls — moniteur réseau public

[![CI](https://github.com/StrainUS/DashboardRayls/actions/workflows/ci.yml/badge.svg)](https://github.com/StrainUS/DashboardRayls/actions/workflows/ci.yml)
[![Pages](https://github.com/StrainUS/DashboardRayls/actions/workflows/pages.yml/badge.svg)](https://github.com/StrainUS/DashboardRayls/actions/workflows/pages.yml)
[![License](https://img.shields.io/badge/Licence-Propriétaire%20StrainUS-333333.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

> **EN** — Client-side operational dashboard for **Rayls** public mainnet/testnet RPC health, **CoinGecko** market aggregates, optional **MEXC** spot WebSocket (USD), and public **Rayls** API links. **Unofficial**, informational only; not endorsed by Rayls or exchanges.

Tableau de bord **React + Vite** pour suivre la **santé du RPC** Rayls mainnet, les **indicateurs de marché** (CoinGecko, tiers), un **spot USD optionnel** via WebSocket public MEXC, et les **endpoints publics** documentés (`api.rayls.com`, liens officiels). Projet **non officiel**, à vocation **strictement informative** (pas de conseil financier, pas de garantie d’exactitude).

### Démo en ligne (GitHub Pages)

**URL du projet (à utiliser telle quelle) :** [https://strainus.github.io/DashboardRayls/](https://strainus.github.io/DashboardRayls/)

> **404 « There isn't a GitHub Pages site here »** sur `strainus.github.io` **sans** `/DashboardRayls/` : c’est la **racine** du domaine ; le dashboard est uniquement sous **`/DashboardRayls/`**. Si même l’URL complète est en 404 : *Settings → Pages → Source : **GitHub Actions***, puis vérifiez que le workflow **Pages** est vert dans *Actions*. Guide détaillé : [`.github/DEPLOY_PAGES.md`](./.github/DEPLOY_PAGES.md).

Même application que localement : RPC, marché, chaîne, référentiel. Les assets dans `public/` (dont `rayls-feed.json`) et le favicon sont résolus avec **`import.meta.env.BASE_URL`** (ex. `/DashboardRayls/rayls-feed.json`), pas à la racine du domaine.  
**Activation une fois :** *Settings → Pages → Build and deployment → Source : GitHub Actions*. Le workflow [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) exécute lint, tests, validation du flux et `npm audit`, puis build avec `VITE_BASE_PATH=/<nom-du-dépôt>/`, copie `public/.nojekyll` et dépose `404.html` pour le routage SPA.

> Comme pour tout hébergement **statique**, il n’y a pas de proxy Vite : pour des quotas CoinGecko confortables en prod, prévoir `VITE_COINGECKO_API_ROOT` (build) vers votre proxy ou clé côté serveur — voir [Variables d’environnement](#variables-denvironnement).

---

## Sommaire

- [Démo en ligne (GitHub Pages)](#démo-en-ligne-github-pages)
- [Fonctionnalités](#fonctionnalités)
- [Démarrage rapide](#démarrage-rapide)
- [Qualité & CI](#qualité--ci)
- [Variables d’environnement](#variables-denvironnement)
- [Sécurité & confidentialité](#sécurité--confidentialité)
- [Déploiement](#déploiement)
- [Architecture](#architecture)
- [Contribution & sécurité](#contribution--sécurité)
- [Avertissements](#avertissements)

---

## Fonctionnalités

| Zone | Contenu |
|------|---------|
| **Réseau** | Batch JSON-RPC étendu (latence, bloc, gas, syncing, fee history, `totalSupply` USDr & RLS documentés) ; WebSocket `newHeads` si activé |
| **Spot** | Courbes, spot CoinGecko ; option **MEXC** (`VITE_MEXC_SPOT_WS`) pour USD plus réactif |
| **Chaîne** | Contrats mainnet, explorateur, télémétrie testnet |
| **Référentiel** | Supplies `api.rayls.com`, liens documentés, métadonnées CoinGecko |
| **Accueil** | Navigation, cadences de rafraîchissement, actualités (`public/rayls-feed.json` ou URL), résumé de déploiement |

---

## Démarrage rapide

**Prérequis :** Node.js **20+** (LTS recommandé).

```bash
git clone https://github.com/StrainUS/DashboardRayls.git
cd DashboardRayls
npm ci
cp .env.example .env.local   # optionnel — ne jamais committer .env*
npm run dev
```

Build production et prévisualisation locale :

```bash
npm run build
npm run preview
```

---

## Qualité & CI

| Commande | Rôle |
|----------|------|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest (fusion cotations, parse MEXC JSON) |
| `npm run verify:feed` | Valide `public/rayls-feed.json` |
| `npm run ci` | Enchaîne lint → tests → verify:feed → build |
| `npm audit` | Audit des dépendances (la **CI** échoue sur *moderate*+) |

Le workflow GitHub Actions [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) exécute `npm ci` puis `npm run ci` et `npm audit --audit-level=moderate` sur **Ubuntu**, Node **20**.

---

## Variables d’environnement

Copier [`.env.example`](./.env.example) vers `.env` ou `.env.local` (fichiers **ignorés par Git**).

| Variable | Rôle |
|----------|------|
| `VITE_COINGECKO_DEMO_API_KEY` | Clé Demo — en dev, injectée par le **proxy Vite** (pas dans le bundle navigateur) |
| `VITE_COINGECKO_PRO_API_KEY` | Plan Pro (optionnel) |
| `VITE_COINGECKO_API_ROOT` | **Recommandé en prod** : proxy de l’API v3 CoinGecko |
| `VITE_LIVE_SPOT_MS` / `VITE_CG_QUOTE_MIN_GAP_MS` | Cadence spot |
| `VITE_RPC_POLL_MS` / `VITE_RPC_WS_URL` | RPC |
| `VITE_MEXC_SPOT_WS` / `VITE_MEXC_SYMBOL` / `VITE_MEXC_WS_URL` | Spot MEXC optionnel |
| `VITE_RAYLS_PUBLIC_FEED_URL` | Flux JSON actualités (`off` pour désactiver) |

---

## Sécurité & confidentialité

- **Pas de backend** dans ce dépôt : tout s’exécute dans le navigateur.
- Toute variable **`VITE_*`** peut se retrouver dans le **JavaScript buildé** : ne pas y placer de **secrets** en production ; utiliser un **proxy** pour les clés CoinGecko.
- La **CSP** est définie dans [`vercel.json`](./vercel.json) (`connect-src`). Tout nouvel hôte (API, WebSocket) doit y être ajouté.
- Politique de signalement : voir [**SECURITY.md**](./SECURITY.md).

---

## Déploiement

### GitHub Pages

1. Activer **Pages** avec la source **GitHub Actions** (cf. lien *Démo en ligne* ci-dessus).
2. Pousser sur `main` : le workflow **Pages** exécute d’abord `npm run ci`, puis build avec `VITE_BASE_PATH=/<nom-du-repo>/`.
3. Les assets et le flux par défaut `rayls-feed.json` utilisent ce préfixe (logo, fetch du JSON, etc.).

Sous un **autre** sous-chemin ou domaine : définir `VITE_BASE_PATH` au build (slash final recommandé), comme dans le workflow.

### Autres hébergeurs (ex. Vercel)

Build `npm run build`, servir `dist/`, définir `VITE_BASE_PATH` si l’app n’est pas à la racine du domaine. Pour la sécurité, aligner la **CSP** sur [`vercel.json`](./vercel.json) (`connect-src`) si vous réutilisez ce fichier.

---

## Architecture

- **UI** : React 19, React Router 7
- **Données** : fetch JSON-RPC, CoinGecko API v3, `api.rayls.com`, WebSocket RPC / MEXC optionnel
- **Config** : `src/raylsConfig.ts`, constantes dans `src/constants/`
- **Tests** : Vitest, fichiers `src/**/*.test.ts`

---

## Contribution & sécurité

Voir [**CONTRIBUTING.md**](./CONTRIBUTING.md) et [**SECURITY.md**](./SECURITY.md).

---

## Avertissements

- **Indépendant** de Rayls, CoinGecko, MEXC et autres tiers cités.
- Données **agrégées** ou **ponctuelles** : pas de certification, pas de « cours officiel ».
- **Contenu informatif uniquement** — pas un conseil financier, juridique ou en investissement.
- Réseau documenté : [référence chaîne publique Rayls](https://docs.rayls.com/docs/public-chain-reference).

---

## Licence

**Licence propriétaire — StrainUS** ([fichier LICENSE](./LICENSE)) : le code et la documentation sont la **propriété exclusive de StrainUS**. Aucune utilisation, reproduction ou distribution n’est autorisée sans **accord écrit préalable** de StrainUS. Ce dépôt **n’est pas** sous licence open source.
