# Dashboard Rayls — moniteur réseau public

[![CI](https://github.com/StrainUS/DashboardRayls/actions/workflows/ci.yml/badge.svg)](https://github.com/StrainUS/DashboardRayls/actions/workflows/ci.yml)
[![Pages](https://github.com/StrainUS/DashboardRayls/actions/workflows/pages.yml/badge.svg)](https://github.com/StrainUS/DashboardRayls/actions/workflows/pages.yml)
[![License](https://img.shields.io/badge/Licence-Propriétaire%20StrainUS-333333.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

Tableau de bord **React + Vite** pour suivre la **santé du RPC** Rayls mainnet, les **indicateurs de marché** (CoinGecko, tiers), un **spot USD optionnel** via WebSocket public MEXC, et les **endpoints publics** documentés (`api.rayls.com`, liens officiels). Projet **non officiel**, à vocation **strictement informative** (pas de conseil financier, pas de garantie d’exactitude). **Édition** : interface et métadonnées **principalement en français** (FR par défaut, EN au choix).

> **EN** — Client-side operational dashboard for **Rayls** public **mainnet** RPC health, **CoinGecko** market aggregates, optional **MEXC** spot WebSocket (USD), and public **Rayls** API links. **Unofficial**, informational only; not endorsed by Rayls or exchanges.

### Démo en ligne (GitHub Pages)

**URL du projet (à utiliser telle quelle) :** [https://strainus.github.io/DashboardRayls/](https://strainus.github.io/DashboardRayls/)

> **404 « There isn't a GitHub Pages site here »** sur `strainus.github.io` **sans** `/DashboardRayls/` : c’est la **racine** du domaine ; le dashboard est uniquement sous **`/DashboardRayls/`**. Si même l’URL complète est en 404 : *Settings → Pages → Source : **GitHub Actions***, puis vérifiez que le workflow **Pages** est vert dans *Actions*. Guide détaillé : [`.github/DEPLOY_PAGES.md`](./.github/DEPLOY_PAGES.md).

> **RPC sur `*.github.io`** : sans proxy Cloudflare, CORS bloque le RPC mainnet. **Une fois** : *Actions* → **Deploy RPC CORS proxy** (remplit `VITE_RAYLS_RPC_HTTP_URL`), puis **Pages** (souvent relancé tout seul). Build Pages : WebSocket RPC désactivé, batch HTTP via proxy. URL du site : `/DashboardRayls/`. Détails : [`.github/DEPLOY_PAGES.md`](./.github/DEPLOY_PAGES.md). En local : `npm run dev`.

Même application que localement : RPC, marché, chaîne, référentiel. Les assets dans `public/` (dont `rayls-feed.json`) et le favicon sont résolus avec **`import.meta.env.BASE_URL`** (ex. `/DashboardRayls/rayls-feed.json`), pas à la racine du domaine.  
**Activation une fois :** *Settings → Pages → Build and deployment → Source : GitHub Actions*. Le workflow [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) exige **`VITE_RAYLS_RPC_HTTP_URL`** (proxy Cloudflare, voir ci‑dessous) pour éviter de publier un site avec l’onglet Réseau cassé ; exécute lint, tests, `npm audit`, build avec `VITE_BASE_PATH=/<nom-du-dépôt>/`, `404.html` SPA.

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
| **Réseau** | Batch JSON-RPC étendu (latence, bloc, gas, syncing, fee history, `totalSupply` USDr & RLS documentés) ; WebSocket `newHeads` si activé ; **coordination multi-onglets** (BroadcastChannel : un seul onglet pilote HTTP + WS), **Page Visibility** (pause en arrière-plan), **IndexedDB** (reprise du dernier snapshot OK au chargement) |
| **Spot** | Courbes, spot CoinGecko ; option **MEXC** (`VITE_MEXC_SPOT_WS`) pour USD plus réactif |
| **Chaîne** | Contrats mainnet officiel, explorateur |
| **Référentiel** | Supplies `api.rayls.com`, liens documentés, métadonnées CoinGecko |
| **Accueil** | Accès rapide vers les vues, cadences, actualités (`public/rayls-feed.json` ou URL), configuration de déploiement, sources |

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
| `npm run build:pages` | Build avec `base` `/DashboardRayls/` (même logique que le workflow Pages — à adapter si fork) |
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
- Si vous imposez une **CSP** devant l’app, étendez `connect-src` pour chaque nouvel hôte (API, WebSocket, proxy RPC).
- Politique de signalement : voir [**SECURITY.md**](./SECURITY.md).

---

## Déploiement

### GitHub Pages

1. Activer **Pages** avec la source **GitHub Actions** (cf. lien *Démo en ligne* ci-dessus).
2. Pousser sur `main` : le workflow **Pages** exécute d’abord `npm run ci`, puis build avec `VITE_BASE_PATH=/<nom-du-repo>/`.
3. Les assets et le flux par défaut `rayls-feed.json` utilisent ce préfixe (logo, fetch du JSON, etc.).

Sous un **autre** sous-chemin ou domaine : définir `VITE_BASE_PATH` au build (slash final recommandé), comme dans le workflow.

### Autres hébergeurs

Build `npm run build`, servir `dist/`, définir `VITE_BASE_PATH` si l’app n’est pas à la racine du domaine. Prévoir un proxy RPC (`VITE_RAYLS_RPC_HTTP_URL`) si l’hébergeur statique n’est pas autorisé en CORS par le nœud Rayls.

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

### Informations légales (interface)

L’application expose une page **Informations légales** (`/legal`, FR/EN) structurée pour un usage **professionnel** : **mentions légales** (référence **LCEN**, identification éditeur à compléter, hébergement, **médiation conso** — lien [economie.gouv](https://www.economie.gouv.fr/mediation-conso)), **CGU** (obligations utilisateur, PI, responsabilité, droit français, force majeure, nullité partielle), **politique de confidentialité** (responsable de traitement, finalités et bases légales type **RGPD**, transferts hors UE, droits, DPO, sécurité). Les textes sont dans `src/legal/copy.ts`. **Validation par un avocat et/ou DPO** reste indispensable avant de vous présenter comme pleinement conforme (RCS/SIRET, directeur de publication, médiateur désigné si obligatoire, registre des traitements, etc.).

---

## Licence

**Licence propriétaire — StrainUS** ([fichier LICENSE](./LICENSE)) : le code et la documentation sont la **propriété exclusive de StrainUS**. Aucune utilisation, reproduction ou distribution n’est autorisée sans **accord écrit préalable** de StrainUS. Ce dépôt **n’est pas** sous licence open source.
