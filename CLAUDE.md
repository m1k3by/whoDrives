# Who Drives? – Arbeitsregeln

Spec: [docs/SPEC.md](docs/SPEC.md). App in `mobile/` (eigene Regeln in `mobile/AGENTS.md`), Backend in `supabase/`.

- Jedes Feature beginnt mit Migration, RLS-Policies und pgTAP-Tests, erst dann App-Code.
- Nach jeder Schemaänderung `npx supabase gen types typescript --local > mobile/src/types/database.ts` ausführen und das Ergebnis committen. CI prüft, dass die Datei aktuell ist.
- Migrationen nur vorwärts und abwärtskompatibel (Expand/Contract); nie eine bestehende Migration ändern.
- Keine Secrets, kein service_role/secret Key im App-Code.
- Vor jedem Commit: Lint, Typecheck, Tests lokal grün (`npm run lint`, `npm run typecheck`, `npm test` in `mobile/`; `npx supabase test db` im Root).
- UI für ältere Nutzer: große Schrift, große Buttons, Listen statt Kalender-Raster, klare deutsche Texte. Alle Texte in `mobile/src/ui/strings.ts`.
- Code und Bezeichner auf Englisch, Commits nach Conventional Commits.
- Commit und Push macht nur Michael. Claude liefert die Commit-Message.

## Lokal

- Supabase läuft auf Ports **583xx** (543xx ist durch ein anderes Projekt belegt, 549xx–559xx reserviert Windows).
- Mailpit mit den Login-Codes: http://127.0.0.1:58324
- Seed-User: `mama@example.com` (parent), `oma@example.com` (grandparent), `fremd@example.com` (andere Familie).
