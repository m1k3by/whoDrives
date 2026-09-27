# Who Drives?

Familien-App für Termine und Fahrdienste: Eltern legen Termine an, Großeltern und andere übernehmen sie.
Expo (React Native) + Supabase (Frankfurt). Details: [docs/SPEC.md](docs/SPEC.md).

## Voraussetzungen

Node 22, Docker Desktop, Android-Handy mit USB-Debugging oder Android-Emulator.

## Lokal starten

```bash
npx supabase start                 # Backend in Docker, wendet Migrationen + seed.sql an
npx supabase status                # zeigt API-URL und Publishable Key
cd mobile
cp .env.example .env.local         # URL und Publishable Key eintragen
npm install
npx eas-cli build --profile development --platform android   # einmalig: Development Build aufs Handy
npm start                          # Metro, Dev Build verbindet sich
```

Login-Codes landen lokal in Mailpit: http://127.0.0.1:58324

## Prüfen

```bash
cd mobile && npm run lint && npm run typecheck && npm test
npx supabase test db               # pgTAP, im Repo-Root
```

## Auslieferung

| Auslöser | Workflow | Wirkung |
| --- | --- | --- |
| Pull Request / Push auf `main` | `ci.yml` | Lint, Typecheck, Jest, pgTAP, Typen-Drift |
| Push auf `main` mit `supabase/**` | `deploy-backend.yml` | `supabase db push`, Functions deployen |
| Push auf `main` mit `mobile/**` | `ota-update.yml` | `eas update` auf Channel `production` (nach Backend-Deploy) |
| Tag `v*` | `release-android.yml` | EAS Build + Submit in Play Internal Testing |

Native Änderungen (neue Library, Berechtigung, SDK-Upgrade) brauchen einen neuen Tag.
