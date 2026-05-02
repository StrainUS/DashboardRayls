# Politique de sécurité

## Portée

Application **100 % frontale** (React / Vite) : pas de serveur applicatif ni de base de données dans ce dépôt. Les risques principaux concernent la **configuration** (clés exposées dans le bundle), la **politique de contenu (CSP)** et les **dépendances** npm.

## Signaler un problème

- Ouvrez une **[issue privée de sécurité](https://github.com/StrainUS/DashboardRayls/security/advisories/new)** sur GitHub *ou* une issue publique en **ne publiant aucun secret** (tokens, clés, cookies).
- Incluez : version du code (commit), étapes de reproduction, impact estimé.

## Bonnes pratiques pour les contributeurs

1. **Ne jamais committer** `.env`, `.env.local`, clés API, certificats ou mots de passe.
2. Les variables `VITE_*` sont **injectées dans le JavaScript client** : ne pas y mettre de secrets en production ; préférer un **proxy backend** pour CoinGecko (`VITE_COINGECKO_API_ROOT`).
3. Après ajout d’un domaine (API, WebSocket), mettre à jour **`vercel.json`** (`Content-Security-Policy` → `connect-src`).
4. Exécuter `npm audit` avant une release ; la CI échoue sur les vulnérabilités **moderate** et plus.

## Divulgation responsable

Nous traitons les signalements en priorité et publions des correctifs ou mitigations dans la mesure du possible pour un projet open source sans garantie de SLA.
