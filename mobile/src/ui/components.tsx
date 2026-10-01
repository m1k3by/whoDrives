import { HeaderHeightContext } from 'expo-router/react-navigation';
import { type ReactNode, useContext } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeStyles, useColors } from './theme';

// Large type and touch targets: the app is also used by grandparents.
// Colors come from the theme (light/dark, see ./theme).

export function Screen({ children }: { children: ReactNode }) {
  const styles = useStyles();
  // Android draws edge-to-edge, so the window does not shrink for the keyboard: make room
  // below the content instead, so every field can be scrolled above the keyboard.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
        style={styles.fill}
      >
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

export function Body({ children, error }: { children: ReactNode; error?: boolean }) {
  const styles = useStyles();
  return <Text style={[styles.body, error && styles.error]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const styles = useStyles();
  const c = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? c.onPrimary : c.primary} />
      ) : (
        <Text style={[styles.buttonLabel, !primary && styles.buttonLabelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Selectable option in a wrapping grid; `basis` sets how many fit per row (e.g. '30%' = 3). */
export function Chip({
  label,
  a11y,
  selected,
  onPress,
  basis = '15%',
}: {
  label: string;
  a11y?: string;
  selected: boolean;
  onPress: () => void;
  basis?: `${number}%`;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { flexBasis: basis }, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.chipGrid}>{children}</View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const styles = useStyles();
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        placeholderTextColor={c.muted}
        {...props}
      />
    </View>
  );
}

export function Loading() {
  const styles = useStyles();
  const c = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.background },
  fill: { flex: 1 },
  screen: { padding: 24, gap: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },
  title: { fontSize: 32, fontWeight: '700', color: c.text },
  body: { fontSize: 20, lineHeight: 28, color: c.text },
  error: { color: c.error },
  field: { gap: 8 },
  label: { fontSize: 20, fontWeight: '600', color: c.text },
  input: {
    fontSize: 22,
    minHeight: 60,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: c.text,
  },
  button: {
    minHeight: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPrimary: { backgroundColor: c.primary },
  buttonSecondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  buttonLabel: { fontSize: 22, fontWeight: '700', color: c.onPrimary },
  buttonLabelSecondary: { color: c.primary },
  pressed: { opacity: 0.7 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexGrow: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipLabel: { fontSize: 20, color: c.text, fontWeight: '600' },
  chipLabelSelected: { color: c.onPrimary },
}));
