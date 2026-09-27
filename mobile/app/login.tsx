import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Body, Button, Field, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError(t.login.invalidEmail);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setError(t.common.genericError);
    setEmail(address);
    setCodeSent(true);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    // On success the session listener in the root layout switches to the home screen.
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(t.login.invalidCode);
  }

  return (
    <Screen>
      <Title>{t.appName}</Title>
      {!codeSent ? (
        <>
          <Field
            label={t.login.emailLabel}
            placeholder={t.login.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={sendCode}
          />
          <Button label={t.login.sendCode} onPress={sendCode} loading={busy} />
        </>
      ) : (
        <>
          <Body>{t.login.codeSentTo(email)}</Body>
          <Field
            label={t.login.codeLabel}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            onSubmitEditing={verify}
          />
          <Button label={t.login.verify} onPress={verify} loading={busy} />
          <Button
            label={t.login.otherEmail}
            variant="secondary"
            onPress={() => {
              setCodeSent(false);
              setCode('');
              setError(null);
            }}
          />
        </>
      )}
      {error && <Body error>{error}</Body>}
    </Screen>
  );
}
