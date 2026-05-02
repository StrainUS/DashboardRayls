# Proxy CORS pour JSON-RPC Rayls (GitHub Pages, etc.)

Le endpoint public `https://mainnet-rpc.rayls.com` renvoie `Access-Control-Allow-Origin` pour `http://localhost:*` en développement, **pas** pour `https://*.github.io`. Les `fetch` POST depuis le navigateur échouent alors (onglet Réseau du dashboard).

Ce Worker Cloudflare relaie les corps POST vers le RPC et ajoute `Access-Control-Allow-Origin: *`.

## Déploiement (gratuit, compte Cloudflare)

```bash
cd workers/rpc-cors-proxy
npx wrangler@3 deploy
```

Noter l’URL affichée, ex. `https://rayls-dashboard-rpc-proxy.<votre-sous-domaine>.workers.dev`.

## Brancher le dashboard GitHub Pages

1. Dépot GitHub → **Settings** → **Secrets and variables** → **Actions** → onglet **Variables**.
2. Créer **`VITE_RAYLS_RPC_HTTP_URL`** = URL HTTPS du worker (sans slash final).
3. Pousser sur `main` ou relancer le workflow **Pages** : le build injecte la variable.

Testnet (optionnel) : déployer une copie du worker avec `TARGET_RPC_URL = https://testnet-rpc.rayls.com` (autre `name` dans `wrangler.toml`), puis variable **`VITE_RAYLS_TESTNET_RPC_HTTP_URL`**.

## Sécurité

Le proxy ne fait qu’relayer vers l’URL configurée ; ne l’exposez pas à des backends sensibles sans rate limiting côté Cloudflare si besoin.
