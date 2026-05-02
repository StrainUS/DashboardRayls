# Politique de sécurité

## Portée

Application **100 % frontale** (React / Vite) : pas de serveur applicatif ni de base de données dans ce dépôt. Les risques principaux concernent la **configuration** (clés exposées dans le bundle), la **politique de contenu (CSP)** et les **dépendances** npm.

## Signaler un problème

- **Utilisateurs du site déployé** : utilisez d’abord les **coordonnées / contact** indiqués dans la page **Informations légales** de l’application (`/legal`) ; **ne publiez pas** de secrets ni de détails d’exploit sur un canal public.
- **Contributeurs / chercheurs (dépôt GitHub)** : ouvrez une **[demande d’avis de sécurité](https://github.com/StrainUS/DashboardRayls/security/advisories/new)** (*GitHub Security Advisories*) *ou*, à défaut, une issue en **évitant tout secret** (tokens, clés, cookies).
- Incluez : référence de version (commit ou déploiement), étapes de reproduction, impact estimé.

## Bonnes pratiques pour les contributeurs

1. **Ne jamais committer** `.env`, `.env.local`, clés API, certificats ou mots de passe.
2. Les variables `VITE_*` sont **injectées dans le JavaScript client** : ne pas y mettre de secrets en production ; préférer un **proxy backend** pour CoinGecko (`VITE_COINGECKO_API_ROOT`).
3. Après ajout d’un domaine (API, WebSocket), mettre à jour la **CSP** (`connect-src`) si vous en servez une devant l’app.
4. Exécuter `npm audit` avant une release ; la CI échoue sur les vulnérabilités **moderate** et plus.

## Divulgation responsable

Nous traitons les signalements en priorité et publions des correctifs ou mitigations dans la mesure du possible, sans garantie de SLA. Le dépôt est **propriétaire** (tous droits réservés à StrainUS) ; la divulgation responsable vise la sécurité des utilisateurs et de l’infrastructure, pas une licence d’usage du code.
