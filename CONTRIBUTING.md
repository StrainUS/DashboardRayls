# Contribuer

Merci de votre intérêt pour ce tableau de bord.

Le dépôt est sous **licence propriétaire** ; **StrainUS** en est le **seul titulaire des droits** ([LICENSE](./LICENSE)). Toute contribution acceptée est réputée cédée ou concédée selon les conditions fixées par StrainUS (accord écrit le cas échéant).

## Prérequis

- Node.js **20+**
- `npm ci` (pas seulement `npm install` si vous modifiez le lockfile intentionnellement)

## Workflow

1. Forkez le dépôt ou créez une branche depuis `main`.
2. Lancez **`npm run ci`** avant tout commit ou PR (lint, tests, validation `rayls-feed.json`, build).
3. Messages de commit clairs (ex. `feat: …`, `fix: …`, `docs: …`).

## Sécurité

- Ne commitez **jamais** de fichiers `.env*`, clés ou données personnelles.
- Voir [SECURITY.md](./SECURITY.md).

## Tests

- `npm run test` — Vitest (logique marché / parseurs).
- Ajoutez des tests pour toute logique métier nouvelle ou corrigée lorsque c’est pertinent.
