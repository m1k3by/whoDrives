import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Large type and touch targets: the app is also used by grandparents.
export const colors = {
  text: '#1a1a1a',
  muted: '#555',
  primary: '#0b5cad',
  onPrimary: '#fff',
  border: '#999',
  error: '#b00020',
  background: '#fff',
  open: '#a14a00', // "noch offen": needs attention, but not an error
};

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

export function Body({ children, error }: { children: ReactNode; error?: boolean }) {
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
        <ActivityIndicator color={primary ? colors.onPrimary : colors.primary} />
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
  return <View style={styles.chipGrid}>{children}</View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} {...props} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: 24, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  body: { fontSize: 20, lineHeight: 28, color: colors.text },
  error: { color: colors.error },
  field: { gap: 8 },
  label: { fontSize: 20, fontWeight: '600', color: colors.text },
  input: {
    fontSize: 22,
    minHeight: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.text,
  },
  button: {
    minHeight: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { borderWidth: 2, borderColor: colors.primary },
  buttonLabel: { fontSize: 22, fontWeight: '700', color: colors.onPrimary },
  buttonLabelSecondary: { color: colors.primary },
  pressed: { opacity: 0.7 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexGrow: 1,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary },
  chipLabel: { fontSize: 20, color: colors.primary, fontWeight: '600' },
  chipLabelSelected: { color: colors.onPrimary },
});
