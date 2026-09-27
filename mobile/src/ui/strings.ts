// All user-facing texts (German) live here.
export const t = {
  appName: 'Who Drives?',
  common: {
    loading: 'Lädt …',
    genericError: 'Das hat nicht geklappt. Bitte versuche es noch einmal.',
    retry: 'Nochmal versuchen',
  },
  login: {
    title: 'Anmelden',
    emailLabel: 'Deine E-Mail-Adresse',
    emailPlaceholder: 'name@beispiel.de',
    sendCode: 'Code senden',
    codeSentTo: (email: string) => `Wir haben einen 6-stelligen Code an ${email} geschickt.`,
    codeLabel: 'Code aus der E-Mail',
    verify: 'Anmelden',
    otherEmail: 'Andere E-Mail-Adresse',
    invalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    invalidCode: 'Der Code ist falsch oder abgelaufen.',
  },
  family: {
    noFamilyTitle: 'Noch keine Familie',
    noFamilyText: 'Lege eine Familie an. Weitere Mitglieder lädst du später per Code ein.',
    nameLabel: 'Name der Familie',
    namePlaceholder: 'z. B. Familie Müller',
    create: 'Familie anlegen',
    members: 'Mitglieder',
    unnamedMember: 'Ohne Namen',
    roles: { parent: 'Elternteil', grandparent: 'Großeltern', other: 'Weitere Person' },
  },
  update: {
    title: 'Update nötig',
    text: 'Diese Version wird nicht mehr unterstützt. Bitte aktualisiere die App im Play Store.',
    button: 'Zum Play Store',
  },
} as const;
