# Proxy CORS CoinGecko (GitHub Pages)

L’API publique CoinGecko pose souvent problème depuis le navigateur sur `*.github.io` (prévol `OPTIONS`, quotas). Ce Worker relaie les **GET** vers `api.coingecko.com/api/v3` (ou Pro) et ajoute la clé **côté serveur**.

## Déploiement GitHub Actions

1. Mêmes prérequis Cloudflare que le [proxy RPC](../rpc-cors-proxy/README.md) (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, sous-domaine `workers.dev`).
2. Secret dépôt : **`COINGECKO_DEMO_API_KEY`** (clé [Demo](https://www.coingecko.com/en/api)) **ou** réutilisation de **`VITE_COINGECKO_DEMO_API_KEY`** si déjà définie.
3. Optionnel : **`COINGECKO_PRO_API_KEY`** pour le plan Pro (prioritaire sur la demo).
4. Actions → **Deploy CoinGecko CORS proxy** → *Run workflow*.

Le workflow enregistre **`VITE_COINGECKO_API_ROOT`** = URL du Worker ; **Pages** se relance si configuré.

## Manuel

```bash
cd workers/coingecko-cors-proxy
npx wrangler@3 login
printf '%s' 'votre-clé-demo' | npx wrangler@3 secret put COINGECKO_DEMO_API_KEY
npx wrangler@3 deploy
```

Variable dépôt : **`VITE_COINGECKO_API_ROOT`** = `https://<nom>.<sous-domaine>.workers.dev` (sans `/api/v3` à la fin — le client concatène `/simple/price`, etc.).

## Sécurité

L’URL du Worker est publique : limitez les abus (rate limit Cloudflare) si nécessaire. La clé ne sort pas du Worker.
