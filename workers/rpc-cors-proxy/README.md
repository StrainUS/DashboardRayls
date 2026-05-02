# Proxy CORS pour JSON-RPC Rayls (GitHub Pages, etc.)

Le endpoint public `https://mainnet-rpc.rayls.com` renvoie `Access-Control-Allow-Origin` pour `http://localhost:*` en développement, **pas** pour `https://*.github.io`. Les `fetch` POST depuis le navigateur échouent alors (onglet Réseau du dashboard).

Ce Worker Cloudflare relaie les corps POST vers le RPC et ajoute `Access-Control-Allow-Origin: *`.

## Déploiement automatique (recommandé, GitHub Actions)

1. Cloudflare : créer un **API Token** avec permission *Edit Cloudflare Workers* ; noter l’**Account ID** du compte.
2. Dépot GitHub → **Settings** → **Secrets and variables** → **Actions** → **Secrets** :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Onglet **Actions** → workflow **Deploy RPC CORS proxy** → **Run workflow**.
4. Le workflow enregistre la variable **`VITE_RAYLS_RPC_HTTP_URL`** puis : relancer **Pages** (ou pousser sur `main`).

## Déploiement manuel (CLI)

```bash
cd workers/rpc-cors-proxy
npx wrangler@3 login
npx wrangler@3 deploy
```

Puis variable de dépôt **`VITE_RAYLS_RPC_HTTP_URL`** = `https://<name>.<sous-domaine-compte>.workers.dev` (sans slash final), et rebuild **Pages**.

Testnet (optionnel) : déployer une copie du worker avec `TARGET_RPC_URL = https://testnet-rpc.rayls.com` (autre `name` dans `wrangler.toml`), puis variable **`VITE_RAYLS_TESTNET_RPC_HTTP_URL`**.

## Sécurité

Le proxy ne fait qu’relayer vers l’URL configurée ; ne l’exposez pas à des backends sensibles sans rate limiting côté Cloudflare si besoin.
