# Proxy CORS pour JSON-RPC Rayls (GitHub Pages, etc.)

Le endpoint public `https://mainnet-rpc.rayls.com` renvoie `Access-Control-Allow-Origin` pour `http://localhost:*` en développement, **pas** pour `https://*.github.io`. Les `fetch` POST depuis le navigateur échouent alors (onglet Réseau du dashboard).

Ce Worker Cloudflare relaie les corps POST vers le RPC et ajoute `Access-Control-Allow-Origin: *`.

## Déploiement automatique (recommandé, GitHub Actions)

0. **Première utilisation Cloudflare Workers** : Dashboard → **Workers et Pages** → **Modifier** (*Change*) le sous-domaine **workers.dev** et valider l’onboarding. Sans cette étape, `wrangler deploy` échoue en CI (pas d’invite interactive).
1. Cloudflare : créer un **API Token** avec permission *Edit Cloudflare Workers* ; noter l’**Account ID** du compte.
2. Dépot GitHub → **Settings** → **Actions** → **General** → **Workflow permissions** : **Read and write permissions** (obligatoire pour que le workflow enregistre les variables `VITE_RAYLS_*`).
3. **Settings** → **Secrets and variables** → **Actions** → **Secrets** :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Onglet **Actions** → workflow **Deploy RPC CORS proxy** → **Run workflow**.
5. Le workflow enregistre **`VITE_RAYLS_RPC_HTTP_URL`** (URL du Worker → relais vers le RPC mainnet). **Pages** peut se relancer tout seul ; sinon relancez-le ou poussez sur `main`.

## Déploiement manuel (CLI)

```bash
cd workers/rpc-cors-proxy
npx wrangler@3 login
npx wrangler@3 deploy
```

Variable de dépôt : **`VITE_RAYLS_RPC_HTTP_URL`** = `https://<name>.<subdomain>.workers.dev`, puis rebuild **Pages**.

## Sécurité

Le proxy ne fait qu’relayer vers l’URL configurée ; ne l’exposez pas à des backends sensibles sans rate limiting côté Cloudflare si besoin.
