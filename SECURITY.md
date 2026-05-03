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

## Checklist GitHub (propriétaire du dépôt)

À faire dans **Settings** du dépôt (et sur le **compte** GitHub) :

1. **Compte** : activer l’**authentification à deux facteurs (2FA)** ; préférer une clé WebAuthn ou une app TOTP.
2. **Settings → General** : désactiver **Wikis** si non utilisées (surface d’édition publique).
3. **Settings → Code security and analysis** : laisser **Dependency graph** / **Dependabot alerts** actifs ; fusionner ou traiter les alertes Dependabot ; vérifier que **Code scanning** reçoit les résultats du workflow **CodeQL** (`.github/workflows/codeql.yml`).
4. **Settings → Secrets and variables → Actions** : ne stocker que des **secrets** (Cloudflare, clés API) ici — jamais dans le code ; révoquer tout secret exposé par erreur et le recréer.
5. **Settings → Actions → General** : *Fork pull request workflows* en **« Require approval for first-time contributors »** (ou plus strict) si tu acceptes des PR externes.
6. **Settings → Branches** : règle de protection sur **`main`** — au minimum **interdire force-push et suppressions** (déjà appliqué sur ce dépôt). **Attention** : exiger le statut **Verify** (CI) *sans* exiger les PR bloque les **push directs** sur `main` (œuf et poule). Pour une équipe : activer **Require pull request before merging** *puis* exiger **CI / Verify** (et **CodeQL** une fois le workflow vert).
7. **Collaborators** : n’ajouter que des comptes de confiance ; le minimum de droits (**Write** vs **Admin**).
8. **Pages** : si le site est public, garder à l’esprit que tout fichier dans la branche / artefact **Pages** est public — pas de `.env` dans le dépôt.

### Déjà en place dans ce dépôt

- **Dependabot** : mises à jour npm et GitHub Actions (`.github/dependabot.yml`).
- **Alertes de vulnérabilité** (Dependabot security) : activées sur le dépôt GitHub.
- **CI** : `npm run ci` + `npm audit --audit-level=moderate` (`.github/workflows/ci.yml`).
- **CodeQL** : analyse JS/TS planifiée (`.github/workflows/codeql.yml`).
- **Branche `main`** : protection légère — **pas** de force-push ni de suppression de branche ; pas de checks obligatoires sur push direct (voir point 6 ci-dessus).
