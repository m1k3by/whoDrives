import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useChildren } from '@/features/events/hooks';
import { NotUnderstoodError, parseSpokenEvent, toPrefill } from '@/features/events/voice';
import { useMyMembership } from '@/features/family/hooks';
import { Body, Button, Screen } from '@/ui/components';
import { MicIcon } from '@/ui/icons';
import { t } from '@/ui/strings';
import { font, makeStyles, useColors } from '@/ui/theme';

type Problem = 'noPermission' | 'unavailable' | 'nothingHeard' | 'notUnderstood' | 'generic';

/**
 * Say the appointment in one sentence; the server understands it and the normal form
 * opens pre-filled for checking. Nothing is saved without the form.
 */
export default function VoiceEventScreen() {
  const styles = useStyles();
  const c = useColors();
  const { family } = useMyMembership();
  const children = useChildren(family?.id);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [problem, setProblem] = useState<Problem | null>(null);

  const understand = useMutation({
    mutationFn: parseSpokenEvent,
    onSuccess: (parsed) =>
      router.replace({
        pathname: '/event-new',
        params: { prefill: JSON.stringify(toPrefill(parsed, children.data ?? [])) },
      }),
    onError: (e) => setProblem(e instanceof NotUnderstoodError ? 'notUnderstood' : 'generic'),
  });

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => setTranscript(e.results[0]?.transcript ?? ''));
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'aborted') return;
    if (e.error === 'not-allowed') setProblem('noPermission');
    else if (e.error === 'no-speech' || e.error === 'speech-timeout') setProblem('nothingHeard');
    else setProblem('unavailable');
  });

  async function startListening() {
    setProblem(null);
    setTranscript('');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return setProblem('unavailable');
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return setProblem('noPermission');
    ExpoSpeechRecognitionModule.start({ lang: 'de-DE', interimResults: true, continuous: false });
  }

  const heard = transcript.trim();
  return (
    <Screen>
      <Body>{t.voice.intro}</Body>
      <Text style={styles.example}>{t.voice.example}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? t.voice.micStop : t.voice.micStart}
        onPress={() => (listening ? ExpoSpeechRecognitionModule.stop() : startListening())}
        style={({ pressed }) => [
          styles.mic,
          { backgroundColor: listening ? c.open : c.primary },
          pressed && styles.pressed,
        ]}
      >
        <MicIcon color={c.onPrimary} size={52} />
      </Pressable>
      {listening && <Text style={styles.state}>{t.voice.listening}</Text>}

      {heard !== '' && <Text style={styles.transcript}>„{heard}“</Text>}
      {problem && (
        <Body error>{problem === 'generic' ? t.common.genericError : t.voice[problem]}</Body>
      )}

      {heard !== '' && !listening && (
        <>
          <Button
            label={t.voice.next}
            loading={understand.isPending}
            onPress={() => understand.mutate(heard)}
          />
          <Button label={t.voice.again} variant="secondary" onPress={startListening} />
        </>
      )}
      <Button
        label={t.voice.type}
        variant="secondary"
        onPress={() => router.replace('/event-new')}
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  example: { fontSize: font.small, color: c.muted, lineHeight: 22 },
  mic: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: { opacity: 0.8 },
  state: { fontSize: font.body, color: c.muted, textAlign: 'center' },
  transcript: { fontSize: font.heading, color: c.text, textAlign: 'center', lineHeight: 30 },
}));
