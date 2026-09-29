# Google Play: Store-Reife (Step 8)

Vorschläge aus dem, was die App technisch tut. Vor dem Eintragen in der Play Console
prüfen – die Einordnung in Googles Kategorien ist eine Einschätzung, keine Rechtsberatung.

## Links

| Zweck | URL (Quelle im Repo) |
| --- | --- |
| Datenschutzerklärung | https://michael-stoecker.com/whodrives/datenschutz.html (`docs/web/datenschutz.html`) |
| Konto löschen (Web-Link) | https://michael-stoecker.com/whodrives/konto-loeschen.html (`docs/web/konto-loeschen.html`) |

Die URLs stehen auch in `mobile/src/lib/links.ts`. Ändert sich der Pfad, dort mit anpassen.

## Data Safety – Vorschlag

**Erhebt oder teilt die App Nutzerdaten?** Ja.
**Werden alle Daten bei der Übertragung verschlüsselt?** Ja (HTTPS zu Supabase, Expo, Google).
**Können Nutzer das Löschen ihrer Daten anfordern?** Ja – in der App und über den Web-Link.

| Datentyp (Play-Kategorie) | Was konkret | Erhoben | Geteilt¹ | Optional | Zweck |
| --- | --- | --- | --- | --- | --- |
| Personenbezogene Daten → E-Mail-Adresse | Login-Adresse | ja | nein | nein | App-Funktionalität, Kontoverwaltung |
| Personenbezogene Daten → Name | Anzeigename | ja | nein | nein | App-Funktionalität |
| App-Aktivität → Sonstige nutzergenerierte Inhalte | Termine, Vornamen der Kinder, wer was übernimmt | ja | nein | nein | App-Funktionalität |
| Geräte- oder andere IDs | Expo-Push-Token | ja | nein | ja (nur mit Benachrichtigungen) | App-Funktionalität |

¹ Supabase, Expo und Google (FCM) verarbeiten Daten im Auftrag. Google zählt
Auftragsverarbeiter („service providers“) nach eigener Definition nicht als „Teilen“ –
bitte in der aktuellen Play-Hilfe gegenprüfen.

Nicht erhoben: Standort, Kontakte, Fotos, Finanzdaten, Gesundheitsdaten, Analyse-/Absturzdaten,
Werbe-IDs.

## Zielgruppe

Die App wird von Erwachsenen bedient (Eltern, Großeltern). Kinder sind nur als Vorname und
Farbe erfasst und nutzen die App nicht selbst. Vorschlag für „Zielgruppe und Inhalte“:
18 Jahre und älter. **[PRÜFEN]**

## Offene Punkte vor Closed Testing

- [ ] `docs/web/*.html`: Platzhalter ausfüllen, rechtlich prüfen, auf michael-stoecker.com hochladen.
- [ ] Auftragsverarbeitungsvertrag (DPA) im Supabase-Dashboard abschließen (laut Spec).
- [ ] SMTP-Dienst festlegen und in der Datenschutzerklärung eintragen.
- [x] Entscheidung 29.09.2026: Push-Texte bleiben ausführlich (Termin, Uhrzeit von–bis, Ort,
      Vorname des Kindes, Name des Auslösers), obwohl sie über Expo und Google (USA) laufen.
- [ ] Closed Test: mindestens 12 Tester über 14 Tage (neue private Developer-Accounts).
