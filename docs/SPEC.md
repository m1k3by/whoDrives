# Who Drives? – Tech-Spec Grundgerüst

27. Sept. 2026 · @Michael

## Ziel & Scope

Die App heißt Who Drives? Vor der Veröffentlichung wird der Name auf Markenkonflikte geprüft.

Das Grundgerüst liefert eine lauffähige Android-App mit Login, Familien-Datenmodell, abgesicherter Datenbank und automatisierter Auslieferung über Play Internal Testing. Features werden danach einzeln auf dieses Gerüst gesetzt.

Die App koordiniert Termine in einer Familie: Eltern legen Termine und Fahrdienste an, auch wiederkehrend (z. B. Reiten jeden Dienstag). Großeltern und andere Mitglieder sehen offene Termine und übernehmen sie mit einem Klick. Alle sehen jederzeit, wer wann was macht.

- **Phase 1 (dieses Dokument):** Android, verteilt über Google Play Internal Testing an die eigene Familie.
- **Phase 2:** iOS über TestFlight bzw. App Store. Die Codebasis ist von Anfang an cross-platform, damit Phase 2 nur Accounts, Credentials und Store-Setup braucht.

Nicht im Grundgerüst: Feature-Logik über einen Durchstich hinaus, iOS-Builds, öffentliches Store-Release, Web-Version.

## Tech-Stack

Expo (React Native) als Client, Supabase in Frankfurt als komplettes Backend. Es gibt keinen eigenen Server und keine eigene Infrastruktur.

Alle Datenzugriffe laufen mit dem JWT des eingeloggten Users gegen Postgres. RLS entscheidet dort, was sichtbar ist.

| Baustein | Wahl | Begründung |
| --- | --- | --- |
| Client | Expo SDK (aktuell), React Native, TypeScript strict, Expo Router | Eine Codebasis für Android und später iOS, Builds in der Cloud |
| Dev-Laufzeit | Expo Development Build (nicht Expo Go) | Push-Benachrichtigungen laufen in Expo Go auf Android nicht |
| Datenzugriff | supabase-js + TanStack Query | Caching, Refetch, Offline-tolerant |
| Backend | Supabase, Region eu-central-1 (Frankfurt) | Postgres, Auth, Realtime, Functions aus einer Hand, EU-Standort |
| Auth | Supabase Auth, E-Mail-OTP (6-stelliger Code) | Kein Passwort, kein Deep-Link-Setup nötig |
| Serverlogik | Supabase Edge Functions (TypeScript/Deno) | Einladungen, Push-Versand, Konto löschen |
| Hintergrundjobs | pg_cron | Termine aus Wiederholungsregeln vorberechnen |
| Wiederholungen | RRULE-Strings, Library rrule | Standardformat, kompatibel mit Kalendern |
| Push | expo-notifications, Expo Push Service, FCM v1 | Ein API-Aufruf, Zustellung über Google |
| Build und Release | EAS Build, EAS Submit, EAS Update | Cloud-Builds, Upload in Play Console, OTA-Updates |
| CI | GitHub Actions | Repo liegt schon auf GitHub |
| Lokale Entwicklung | Supabase CLI mit Docker, Android-Emulator oder Handy | Kompletter Backend-Stack lokal |
| Tests | Jest + React Native Testing Library, pgTAP | App-Logik und RLS-Policies getestet |
| Codequalität | ESLint, Prettier, tsc --noEmit | Laufen in CI bei jedem Push |

## Repo-Struktur und Konventionen

Ein Monorepo mit App und Backend nebeneinander. Datenbank-Migrationen, Functions und App-Code ändern sich im selben PR.

```
who-drives/
├── mobile/                    # Expo-App
│   ├── app/                   # Expo Router: Screens und Navigation
│   ├── src/
│   │   ├── lib/supabase.ts    # Supabase-Client
│   │   ├── features/<name>/   # Hooks, Komponenten, Logik je Feature
│   │   ├── ui/                # gemeinsame Komponenten
│   │   └── types/database.ts  # generiert: supabase gen types
│   ├── app.config.ts
│   ├── eas.json
│   └── .env.example
├── supabase/
│   ├── config.toml
│   ├── migrations/            # SQL, nur vorwärts
│   ├── functions/             # Edge Functions
│   ├── tests/                 # pgTAP, v. a. RLS
│   └── seed.sql               # Testfamilie für lokal
├── .github/workflows/
├── docs/SPEC.md               # dieses Dokument
├── CLAUDE.md                  # Arbeitsregeln für Claude Code
└── README.md
```

### Konventionen

- Code und Bezeichner auf Englisch, UI-Texte auf Deutsch in einer zentralen Textdatei.
- `main` ist geschützt. Änderungen nur per PR mit grüner CI.
- Ein Feature pro PR: Migration, RLS-Policies, pgTAP-Tests und App-Code zusammen.
- Migrationen sind abwärtskompatibel (Expand/Contract), weil alte App-Versionen im Umlauf bleiben.
- Datenbank-Typen werden generiert, nie von Hand geschrieben.
- Keine Secrets im Repo. Nur `.env.example` mit Platzhaltern; echte Werte in GitHub Secrets und EAS Secrets.
- Commits nach Conventional Commits (`feat:`, `fix:`, `chore:`).

## Datenmodell & Schema-Baseline

Zentral ist die Trennung von `events` (die Regel, z. B. „Reiten jeden Dienstag 15 Uhr“) und `occurrences` (der konkrete Termin, den jemand übernimmt). Jede Tabelle trägt `family_id`, damit RLS einfach bleibt.

| Tabelle | Zweck | Wichtige Spalten | Kommt mit |
| --- | --- | --- | --- |
| profiles | Anzeigename je User | id (= auth.users.id), display_name | Step 0 |
| families | Eine Familie | id, name, created_by | Step 0 |
| family_members | Wer gehört dazu, mit welcher Rolle | family_id, user_id, role (parent, grandparent, other); PK über beide IDs | Step 0 |
| app_config | Mindestversion der App | key, value (z. B. min_app_version) | Step 0 |
| invites | Einladungen in eine Familie | family_id, token_hash, role, expires_at, used_at, used_by | Step 2 |
| children | Kinder der Familie | family_id, first_name, color | Step 3 |
| events | Terminregel | family_id, child_id, title, kind (ride, pickup, care, other), location, start_time, duration_min, timezone, rrule (null = einmalig), first_date, until_date | Step 3 |
| occurrences | Konkreter Termin | event_id, family_id, starts_at, ends_at, status (open, claimed, cancelled), assigned_to, note; unique (event_id, starts_at) | Step 4 |
| push_tokens | Expo-Push-Token je Gerät | user_id, token, platform, updated_at | Step 6 |

### Datenbank-Funktionen

- `is_family_member(family_id)`: security definer, stable. Wird von allen RLS-Policies genutzt.
- `claim_occurrence(occurrence_id)`: setzt `assigned_to = auth.uid()` nur, wenn der Termin noch offen ist. Damit können nicht zwei Personen gleichzeitig zusagen.
- `release_occurrence(occurrence_id)`: gibt einen übernommenen Termin wieder frei, nur durch die zugewiesene Person oder Eltern.
- `generate_occurrences()`: läuft täglich per pg_cron und hält für alle Regeln die nächsten 8 Wochen vorberechnet.

```sql
update occurrences
   set assigned_to = auth.uid(), status = 'claimed', updated_at = now()
 where id = p_occurrence_id
   and status = 'open'
   and is_family_member(family_id)
returning *;
```

Zeitzonen: Regeln werden in Europe/Berlin ausgewertet, konkrete Termine als timestamptz gespeichert. So bleibt „15 Uhr“ auch nach der Zeitumstellung 15 Uhr.

## Auth & Sicherheit

Die Sicherheit liegt vollständig in der Datenbank: RLS auf jeder Tabelle, Standard ist „kein Zugriff“. Die App enthält nur den öffentlichen Key und ist nicht vertrauenswürdig.

### Keys

- App: nur Supabase-URL und anon/publishable Key, als `EXPO_PUBLIC_*`-Variablen. Beide dürfen öffentlich sein.
- service_role/secret Key: nur als Secret in Edge Functions. Niemals in der App, niemals im Repo.
- GitHub Actions: `SUPABASE_ACCESS_TOKEN` und DB-Passwort für Migrationen, `EXPO_TOKEN` für EAS. Alles als GitHub Secrets.

### Login

- Supabase Auth mit E-Mail-OTP: Mail-Adresse eingeben, 6-stelligen Code eintippen, fertig.
- Session wird in expo-secure-store gespeichert und automatisch erneuert.
- Ein neuer User ohne Familie sieht nur zwei Optionen: Familie anlegen oder Einladungscode eingeben.

### RLS-Regeln

| Tabelle | Lesen | Schreiben |
| --- | --- | --- |
| families | Mitglieder | Anlegen: jeder eingeloggte User; ein Trigger trägt ihn als parent ein |
| family_members | Mitglieder derselben Familie | Nur über Einladungs-Function; austreten selbst, entfernen durch Eltern |
| children, events | Mitglieder | Nur Rolle parent |
| occurrences | Mitglieder | Kein direktes Update; nur über claim_occurrence und release_occurrence |
| invites | Eltern der Familie | Anlegen durch Eltern; einlösen nur über Edge Function |
| push_tokens | Nur eigene | Nur eigene |
| profiles | Mitglieder gemeinsamer Familien | Nur eigenes Profil |

### Einladungen

- Eltern erzeugen einen Einladungscode (8 Zeichen, ohne verwechselbare Zeichen wie 0/O) und teilen ihn über das Android-Teilen-Menü.
- Gespeichert wird nur der SHA-256-Hash. Der Code gilt 7 Tage und ist einmalig einlösbar.
- Die Edge Function `redeem-invite` prüft Hash, Ablauf und Nutzung und legt dann die Mitgliedschaft an.

### Pflicht-Tests (pgTAP)

- Ein User aus Familie A sieht keine einzige Zeile von Familie B.
- Eine Person mit Rolle grandparent kann keine Events anlegen oder ändern.
- Ein zweites claim_occurrence auf denselben Termin ändert nichts.
- Ein abgelaufener oder benutzter Einladungscode wird abgelehnt.

## Umgebungen, CI/CD und Distribution

Zwei Umgebungen reichen für Phase 1: lokal und Produktion. Alles nach `main` geht automatisch raus; native Builds nur per Git-Tag.

### Umgebungen

| Umgebung | Backend | App-Build | Zweck |
| --- | --- | --- | --- |
| Lokal | `supabase start` (Docker) mit seed.sql | EAS-Profil development (Development Build, Hot Reload) | Entwicklung, Tests |
| Produktion | Supabase-Cloud-Projekt, Region Frankfurt | EAS-Profil production (AAB für Play) | Familie |

Ein Staging-Projekt kann später dazukommen; der Free-Plan erlaubt zwei Projekte.

### Pipelines (GitHub Actions)

| Auslöser | Workflow | Was passiert |
| --- | --- | --- |
| Pull Request | ci.yml | ESLint, tsc --noEmit, Jest; supabase start, supabase db reset, pgTAP-Tests |
| Push auf main, Änderung in supabase/ | deploy-backend.yml | supabase db push, supabase functions deploy |
| Push auf main, Änderung in mobile/ | ota-update.yml | eas update --channel production; läuft nach dem Backend-Deploy |
| Git-Tag v* | release-android.yml | eas build -p android --profile production --auto-submit in den Track Internal Testing |

### Regeln für Updates

- `runtimeVersion` mit Policy `fingerprint`. Ein OTA-Update landet so nur auf Builds mit passendem nativen Code.
- Native Änderungen (neue Library, Berechtigung, SDK-Upgrade) brauchen immer einen neuen Tag und Build.
- `versionCode` zählt EAS automatisch hoch (`appVersionSource: remote`).
- Die App liest beim Start `min_app_version` aus `app_config` und zeigt bei Bedarf „Bitte im Play Store aktualisieren“.

### Play-Store-Anbindung

- Das allererste AAB muss einmal manuell in der Play Console hochgeladen werden. Erst danach funktioniert EAS Submit über die API.
- EAS Submit braucht einen Google-Service-Account mit JSON-Key und Freigabe in der Play Console.
- Tester werden über eine E-Mail-Liste im Track Internal Testing eingetragen (max. 100) und bekommen einen Opt-in-Link.

## Accounts und Schnittstellen

Sieben Accounts und sieben Verbindungen. Für Step 0 reichen GitHub, Supabase und Expo; die Play Console früh beantragen, weil die Identitätsprüfung ein paar Tage dauern kann.

### Accounts

| Account | Wofür | Kosten | Nötig ab |
| --- | --- | --- | --- |
| GitHub | Repo, CI/CD | 0 € | vorhanden |
| Supabase | Backend (DB, Auth, Realtime, Functions) | 0 € | Step 0 |
| Expo | EAS Build, Submit, Update | 0 € | Step 0 |
| Google Play Console | Verteilung über Internal Testing | 25 $ einmalig | Step 0 (erster Build) |
| SMTP-Dienst (Resend oder Brevo) + eigene Domain | Login-Codes per Mail | Free-Tier; Domain ca. 5–15 €/Jahr | Step 2 (erste Person außerhalb des Supabase-Teams) |
| Firebase | Push über FCM | 0 € | Step 6 |
| Apple Developer | iOS | 99 $/Jahr | Phase 2 |

Ohne eigenes SMTP verschickt Supabase Login-Mails nur an Mitglieder des eigenen Supabase-Teams und mit knappem Limit. Großeltern kämen also nicht rein.

### Schnittstellen

| Von → Nach | Einrichtung | Gespeichert in |
| --- | --- | --- |
| GitHub → Supabase | Access Token, DB-Passwort, Project-Ref | GitHub Secrets |
| GitHub → Expo | EXPO_TOKEN | GitHub Secrets |
| App → Supabase | Projekt-URL und anon Key als EXPO_PUBLIC_* | EAS-Umgebungsvariablen |
| Expo → Google Play | Google-Service-Account mit JSON-Key, in der Play Console berechtigt; erstes AAB manuell hochladen | EAS Credentials |
| Expo → Firebase | google-services.json in die App; FCM-v1-Service-Account-Key | Repo bzw. EAS-Datei-Variable; EAS Credentials |
| Supabase → SMTP | Host, User, Passwort; Absender-Domain per SPF und DKIM verifizieren; Mail-Vorlage zeigt den Code statt eines Links | Supabase Auth-Einstellungen |
| Supabase Functions → Expo Push | Expo Access Token, nur falls „Enhanced Push Security“ aktiv ist | Supabase Function Secrets |

Den Android-Signing-Key erzeugt und verwaltet EAS; in der Play Console bleibt Play App Signing aktiv.

### Reihenfolge

1. Supabase- und Expo-Account anlegen, Secrets in GitHub eintragen, Play Console beantragen.
2. Step 0 lokal umsetzen, ersten Build erzeugen und manuell in Internal Testing hochladen.
3. Service-Account für EAS Submit einrichten; ab dann laufen Releases per Tag.
4. Vor der ersten Einladung: SMTP-Dienst und Domain verbinden.
5. Vor Step 6: Firebase-Projekt anlegen und mit Expo verbinden.

## Step 0: Grundgerüst aufsetzen

Step 0 ist fertig, wenn die App über Internal Testing auf einem Android-Handy läuft, Login per Code klappt, eine Familie angelegt werden kann und ein OTA-Update ankommt.

### Vorab manuell (Michael), Details unter Accounts und Schnittstellen

- [ ] Package-Name festlegen, z. B. `de.<name>.whodrives`. Er ist dauerhaft und nicht mehr änderbar.
- [ ] Google-Play-Developer-Account anlegen (25 $) und Identitätsprüfung abschließen.
- [ ] Expo-Account anlegen, `EXPO_TOKEN` erzeugen.
- [ ] Supabase-Account anlegen, Projekt in Region Frankfurt erstellen, Access Token erzeugen.
- [ ] Lokal: Node LTS, Docker, Android-Emulator oder Handy mit USB-Debugging.
- [ ] Repo lokal anlegen, nach GitHub pushen, Secrets eintragen: `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.

### Aufgaben für Claude Code

1. Monorepo-Struktur laut Abschnitt Repo-Struktur anlegen, inklusive README.md, CLAUDE.md, .gitignore, .env.example.
2. Expo-App in `mobile/` mit TypeScript strict und Expo Router erzeugen; ESLint, Prettier und Jest einrichten.
3. `supabase init`; Baseline-Migration mit profiles, families, family_members, app_config, `is_family_member()` und allen RLS-Policies dieser Tabellen.
4. Trigger: neues Profil beim Signup; Ersteller einer Familie wird automatisch parent.
5. pgTAP-Tests für die Baseline, inklusive Test „Familie A sieht Familie B nicht“.
6. Supabase-Client in der App, Login-Screen mit E-Mail-OTP, Session in expo-secure-store.
7. Durchstich-Screen: Familie anlegen, eigene Familie mit Mitgliederliste anzeigen.
8. Mindestversions-Check gegen `app_config.min_app_version`.
9. `eas.json` mit Profilen development und production, `app.config.ts` mit Package-Name, runtimeVersion Policy fingerprint, EAS Update auf Channel production.
10. Die vier GitHub-Workflows aus dem Abschnitt CI/CD.
11. Ersten Production-Build erzeugen; Michael lädt das AAB einmal manuell in Internal Testing hoch.

### Inhalt für CLAUDE.md

- Jedes Feature beginnt mit Migration, RLS-Policies und pgTAP-Tests, erst dann App-Code.
- Nach jeder Schemaänderung `supabase gen types` ausführen und das Ergebnis committen.
- Migrationen nur vorwärts und abwärtskompatibel; nie eine bestehende Migration ändern.
- Keine Secrets, kein service_role Key im App-Code.
- Vor jedem Commit: Lint, Typecheck, Tests lokal grün.
- UI für ältere Nutzer: große Schrift, große Buttons, Listen statt Kalender-Raster, klare deutsche Texte.

## Feature-Roadmap

Nach Step 0 folgt ein Feature pro Step, jeweils als eigener PR und eigenes Release. Ab Step 5 ist die App im Familienalltag nutzbar.

| Step | Inhalt | Fertig, wenn |
| --- | --- | --- |
| 1 Profil | Anzeigename setzen und ändern, Logout | Name erscheint in der Mitgliederliste |
| 2 Einladung | invites, Function redeem-invite, Rollen wählen, Code teilen | Oma tritt per Code bei und sieht die Familie; abgelaufener Code wird abgelehnt |
| 3 Kinder und Regeln | children, events; Termine einmalig oder wöchentlich anlegen | Eltern legen „Reiten, jeden Di 15 Uhr“ an; Großeltern können das nicht |
| 4 Termine | occurrences, pg_cron-Job, Liste „nächste 14 Tage“, einzelnen Termin absagen | 8 Wochen vorberechnet; Termine stimmen über die Zeitumstellung hinweg |
| 5 Übernehmen | claim_occurrence, release_occurrence, Status mit Namen, Realtime | Zwei Handys tippen gleichzeitig: nur eins bekommt den Termin, das andere aktualisiert live |
| 6 Push | push_tokens, Function notify, FCM über Expo | Push bei neuem offenem Termin, bei Übernahme und am Vorabend für offene Termine |
| 7 Übersicht | Filter: meine Termine, offene Termine, alle | Jeder sieht auf einen Blick, wer diese Woche was macht |
| 8 Store-Reife | Konto löschen in der App und per Web-Link, Datenschutzerklärung, Data-Safety-Angaben | Voraussetzungen für Closed Testing und öffentliches Release erfüllt |

Phase 2 (iOS): Apple-Developer-Account, EAS-Credentials für iOS, APNs-Key bei Expo, Build und TestFlight. App-Code und Backend bleiben unverändert.

## Kosten

Phase 1 kostet einmalig 25 $ für den Google-Play-Account, laufend nur die Absender-Domain. Alle anderen Dienste reichen im Free-Plan für eine Familie.

| Posten | Phase 1 | Wenn nötig / später |
| --- | --- | --- |
| Google Play Developer | 25 $ einmalig | – |
| Supabase | 0 €: 2 Projekte, 500 MB DB, 1 GB Speicher, 50.000 aktive User/Monat | Pro 25 $/Monat: tägliche Backups, kein Pausieren |
| Expo EAS | 0 €: 15 Android-Builds/Monat, OTA-Updates für 1.000 Geräte | Starter 19 $/Monat |
| Firebase Cloud Messaging | 0 € | – |
| GitHub inkl. Actions | 0 € (Free-Plan, privates Repo) | – |
| Apple Developer (Phase 2) | – | 99 $/Jahr |

Dazu kommt der SMTP-Dienst im Free-Tier und eine eigene Absender-Domain für ca. 5–15 €/Jahr, je nach Endung.

### Zwei Haken im Supabase-Free-Plan

- Projekte ohne Datenbank-Aktivität werden nach 7 Tagen pausiert und müssen manuell reaktiviert werden. Bei täglicher Nutzung passiert das nicht; als Absicherung läuft ein täglicher Keepalive-Workflow in GitHub Actions.
- Es gibt keine automatischen Backups. Ein nächtlicher pg_dump per GitHub Action schließt die Lücke, bis sich Pro lohnt.

Quellen: Supabase Pricing, Supabase: Free Project Pausing, Expo Billing FAQ, Expo Free-Plan-Kontingente (CheckThat). Preise ohne MwSt., Stand siehe Datum oben.

## Play-Store-Pflichten, DSGVO, offene Punkte

Für Internal Testing reicht das Grundgerüst. Die Punkte hier werden erst vor Closed Testing oder einem öffentlichen Release Pflicht und sind in Step 8 gesammelt.

### Google Play

- Neue private Developer-Accounts brauchen vor dem öffentlichen Release einen Closed Test mit mindestens 12 Testern über 14 Tage.
- Apps mit Benutzerkonto müssen das Löschen des Kontos in der App und über einen Web-Link anbieten.
- Datenschutzerklärung als URL und ausgefüllte Data-Safety-Angaben in der Play Console.

### DSGVO

- Datenhaltung ausschließlich in Frankfurt; Auftragsverarbeitungsvertrag (DPA) mit Supabase im Dashboard abschließen.
- Datensparsam bei Kindern: nur Vorname und Farbe, keine Fotos, kein Geburtsdatum.
- Konto löschen entfernt Profil, Mitgliedschaften und Push-Tokens; Termine bleiben mit „ehemaliges Mitglied“ erhalten.

### Offene Punkte

- [ ] Package-Name final festlegen und „Who Drives?“ im Play Store und beim DPMA auf Markenkonflikte prüfen.
- [ ] Reicht der Einladungscode, oder soll zusätzlich ein Link die App direkt öffnen (Android App Links)?
- [ ] Ab wann Supabase Pro für Backups statt eigenem pg_dump?
